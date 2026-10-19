import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Substitute platform services only; exercise the actual handler's permission logic.
async function handlerFor({ isAdmin = false, ownerHash = null, rows = [] } = {}) {
  const state = { deleted: [], rows: rows.map(row => ({ ...row })) };
  const matches = (row, expr) => !expr || (expr.type === 'and'
    ? expr.args.every(e => matches(row, e))
    : expr.type === 'eq' ? row[expr.column] === expr.value : row[expr.column] < expr.value);
  const database = {
    delete: () => ({ where: expr => ({ returning: async () => {
      const found = state.rows.filter(row => matches(row, expr));
      state.deleted.push(...found);
      state.rows = state.rows.filter(row => !matches(row, expr));
      return found.map(row => ({ id: row.id }));
    } }) }),
    select: () => ({ from: () => ({ where: expr => ({ orderBy: () => ({
      limit: async n => state.rows.filter(row => matches(row, expr)).slice(0, n)
    }) }) }) }),
  };
  globalThis.__rsvpTest = { database, permissions: { isAdmin, ownerHash } };
  const source = (await readFile('netlify/functions/rsvp.mts', 'utf8')).replace(/^import .*;\n/gm, '');
  const preamble = `
    const { database, permissions: access } = globalThis.__rsvpTest;
    const drizzle = () => database;
    const permissions = async () => access;
    const confirmations = new Proxy({}, {get: (_, key) => key});
    const eq = (column, value) => ({type:'eq', column, value});
    const lt = (column, value) => ({type:'lt', column, value});
    const desc = value => value;
    const and = (...args) => ({type:'and', args});
  `;
  const { code } = await transform(preamble + source, { loader: 'ts', format: 'esm' });
  const module = await import('data:text/javascript;base64,' + Buffer.from(code + `\n// ${Math.random()}`).toString('base64'));
  return { handler: module.default, state };
}
const row = (id, ownerHash) => ({ id, ownerHash, name: 'Tamu', attendance: 'hadir', message: 'Doa' });
const request = (id, origin = 'https://invitation.test') => new Request(`https://invitation.test/api/rsvp?id=${id}`, {
  method: 'DELETE', headers: origin ? { Origin: origin } : {},
});

test('sender can delete only their own entry', async () => {
  const { handler, state } = await handlerFor({ ownerHash: 'owner-a', rows: [row(1, 'owner-a'), row(2, 'owner-b')] });
  assert.equal((await handler(request(2), {})).status, 404);
  assert.equal(state.deleted.length, 0);
  assert.equal((await handler(request(1), {})).status, 200);
  assert.deepEqual(state.rows.map(r => r.id), [2]);
});
test('admin can delete old entries without an owner', async () => {
  const { handler, state } = await handlerFor({ isAdmin: true, rows: [row(1, null)] });
  assert.equal((await handler(request(1), {})).status, 200);
  assert.equal(state.rows.length, 0);
});
test('visitor without ownership cannot delete', async () => {
  const { handler, state } = await handlerFor({ rows: [row(1, null)] });
  assert.equal((await handler(request(1), {})).status, 403);
  assert.equal(state.rows.length, 1);
});
test('sender cannot claim an old entry', async () => {
  const { handler } = await handlerFor({ ownerHash: 'owner-a', rows: [row(1, null)] });
  assert.equal((await handler(request(1), {})).status, 404);
});
test('cross-origin and missing-origin requests are rejected even for admin', async () => {
  const { handler, state } = await handlerFor({ isAdmin: true, rows: [row(1, null)] });
  assert.equal((await handler(request(1, 'https://other.test'), {})).status, 403);
  assert.equal((await handler(request(1, null), {})).status, 403);
  assert.equal(state.deleted.length, 0);
});
test('invalid IDs and repeated deletion do not remove another entry', async () => {
  const { handler } = await handlerFor({ isAdmin: true, rows: [row(1, null)] });
  assert.equal((await handler(request('abc'), {})).status, 400);
  assert.equal((await handler(request(0), {})).status, 400);
  assert.equal((await handler(request(1), {})).status, 200);
  assert.equal((await handler(request(1), {})).status, 404);
});
test('public listing hides ownership and grants per-entry permissions', async () => {
  const { handler } = await handlerFor({ ownerHash: 'owner-a', rows: [row(3, 'owner-a'), row(2, 'owner-b'), row(1, null)] });
  const response = await handler(new Request('https://invitation.test/api/rsvp'), {});
  const data = await response.json();
  assert.deepEqual(data.entries.map(e => e.canDelete), [true, false, false]);
  assert.ok(data.entries.every(e => !('ownerHash' in e) && !('submissionId' in e)));
});
