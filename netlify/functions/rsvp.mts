import { drizzle } from "drizzle-orm/netlify-db";
import { desc, eq, lt, and } from "drizzle-orm";
import { confirmations } from "../../db/schema.js";
import { permissions } from "../lib/permissions.js";
import type { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const reply = (body: unknown, status = 200) => Response.json(body, {
    status, headers: { "Cache-Control": "no-store" },
  });
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "DELETE") {
    return new Response(null, { status: 405, headers: { Allow: "GET, POST, DELETE" } });
  }
  try {
    if (req.method !== "GET" && req.headers.get("origin") !== new URL(req.url).origin) {
      return reply({ error: "Permintaan tidak diizinkan." }, 403);
    }
    const { isAdmin, ownerHash } = await permissions(context, req.method !== "DELETE");
    const db = drizzle();
    if (req.method === "DELETE") {
      const id = Number(new URL(req.url).searchParams.get("id"));
      if (!Number.isSafeInteger(id) || id < 1) return reply({ error: "Kiriman tidak valid." }, 400);
      if (!isAdmin && !ownerHash) return reply({ error: "Anda tidak dapat menghapus kiriman ini." }, 403);
      const removed = await db.delete(confirmations).where(isAdmin
        ? eq(confirmations.id, id)
        : and(eq(confirmations.id, id), eq(confirmations.ownerHash, ownerHash!)))
        .returning({ id: confirmations.id });
      if (!removed.length) return reply({ error: "Kiriman tidak ditemukan atau Anda tidak memiliki izin menghapusnya." }, 404);
      return reply({ deleted: true });
    }
    if (req.method === "GET") {
      const before = new URL(req.url).searchParams.get("before");
      if (before !== null && (!/^\d+$/.test(before) || !Number.isSafeInteger(Number(before)) || Number(before) < 1)) {
        return reply({ error: "Halaman tidak valid." }, 400);
      }
      const rows = await db.select({
        ownerHash: confirmations.ownerHash, id: confirmations.id, name: confirmations.name,
        attendance: confirmations.attendance, message: confirmations.message,
        createdAt: confirmations.createdAt,
      }).from(confirmations).where(before ? lt(confirmations.id, Number(before)) : undefined)
        .orderBy(desc(confirmations.id)).limit(21);
      return reply({ entries: rows.slice(0, 20).map(({ ownerHash: entryOwner, ...entry }) => ({
        ...entry, canDelete: isAdmin || (!!ownerHash && entryOwner === ownerHash),
      })), isAdmin, hasMore: rows.length > 20 });
    }
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return reply({ error: "Format kiriman tidak valid." }, 415);
    }
    const raw = await req.text();
    if (raw.length > 10000) return reply({ error: "Kiriman terlalu panjang." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return reply({ error: "Kiriman tidak valid." }, 400); }
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const attendance = body?.attendance;
    const submissionId = body?.submissionId;
    if (!name || name.length > 100 || message.length > 500 ||
        !["hadir", "tidak_hadir"].includes(attendance) ||
        typeof submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
      return reply({ error: "Isi nama (maksimal 100 karakter), pilih kehadiran, dan batasi ucapan hingga 500 karakter." }, 400);
    }
    const [inserted] = await db.insert(confirmations).values({ name, message, attendance, submissionId, ownerHash })
      .onConflictDoNothing({ target: confirmations.submissionId }).returning();
    const entry = inserted ?? (await db.select().from(confirmations)
      .where(eq(confirmations.submissionId, submissionId)))[0];
    return reply({ entry: { id: entry.id, name: entry.name, attendance: entry.attendance,
      message: entry.message, createdAt: entry.createdAt,
      canDelete: isAdmin || (!!ownerHash && entry.ownerHash === ownerHash) } }, 201);
  } catch {
    return reply({ error: "Konfirmasi belum dapat diproses. Silakan coba lagi." }, 503);
  }
};

export const config: Config = { path: "/api/rsvp" };
