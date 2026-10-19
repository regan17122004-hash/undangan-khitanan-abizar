import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Substitute platform services; exercise the actual public deletion handler.
async function handlerFor({ rows = [] } = {}) {
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
    select: fields => ({ from: () => ({ where: expr => ({ orderBy: () => ({
      limit: async n => state.rows.filter(row => matches(row, expr)).slice(0, n).map(row => Object.fromEntries(Object.entries(fields).map(([key, column]) => [key, row[column]])))
    }) }) }) }),
  };
  globalThis.__rsvpTest = { database };
  const source = (await readFile('netlify/functions/rsvp.mts', 'utf8')).replace(/^import .*;\n/gm, '');
  const preamble = `
    const { database } = globalThis.__rsvpTest;
    const drizzle = () => database;
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

test('any visitor can delete entries regardless of their original sender', async () => {
  const { handler, state } = await handlerFor({ rows: [row(1, 'owner-a'), row(2, 'owner-b')] });
  assert.equal((await handler(request(2))).status, 200);
  assert.deepEqual(state.rows.map(r => r.id), [1]);
  assert.equal((await handler(request(1))).status, 200);
  assert.equal(state.rows.length, 0);
});
test('old entries without an owner can also be deleted without login', async () => {
  const { handler, state } = await handlerFor({ rows: [row(1, null)] });
  assert.equal((await handler(request(1))).status, 200);
  assert.equal(state.rows.length, 0);
});
test('cross-origin and missing-origin requests are rejected', async () => {
  const { handler, state } = await handlerFor({ rows: [row(1, null)] });
  assert.equal((await handler(request(1, 'https://other.test'))).status, 403);
  assert.equal((await handler(request(1, null))).status, 403);
  assert.equal(state.deleted.length, 0);
});
test('invalid IDs and repeated deletion do not remove another entry', async () => {
  const { handler, state } = await handlerFor({ rows: [row(1, null), row(2, null)] });
  assert.equal((await handler(request('abc'))).status, 400);
  assert.equal((await handler(request(0))).status, 400);
  assert.equal((await handler(request(1))).status, 200);
  assert.equal((await handler(request(1))).status, 404);
  assert.deepEqual(state.rows.map(r => r.id), [2]);
});
test('listing returns public entries without ownership or admin fields', async () => {
  const { handler } = await handlerFor({ rows: [row(3, 'owner-a'), row(2, 'owner-b'), row(1, null)] });
  const response = await handler(new Request('https://invitation.test/api/rsvp'));
  const data = await response.json();
  assert.equal(data.entries.length, 3);
  assert.ok(!('isAdmin' in data));
  assert.ok(data.entries.every(e => !('ownerHash' in e) && !('submissionId' in e)));
});
