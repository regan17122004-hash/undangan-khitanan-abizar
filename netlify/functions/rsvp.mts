import { drizzle } from "drizzle-orm/netlify-db";
import { desc, eq, lt } from "drizzle-orm";
import { confirmations } from "../../db/schema.js";
import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  const reply = (body: unknown, status = 200) => Response.json(body, {
    status, headers: { "Cache-Control": "no-store" },
  });
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
  }
  try {
    const db = drizzle();
    if (req.method === "GET") {
      const before = new URL(req.url).searchParams.get("before");
      if (before !== null && (!/^\d+$/.test(before) || !Number.isSafeInteger(Number(before)) || Number(before) < 1)) {
        return reply({ error: "Halaman tidak valid." }, 400);
      }
      const rows = await db.select({
        id: confirmations.id, name: confirmations.name,
        attendance: confirmations.attendance, message: confirmations.message,
        createdAt: confirmations.createdAt,
      }).from(confirmations).where(before ? lt(confirmations.id, Number(before)) : undefined)
        .orderBy(desc(confirmations.id)).limit(21);
      return reply({ entries: rows.slice(0, 20), hasMore: rows.length > 20 });
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
    const [inserted] = await db.insert(confirmations).values({ name, message, attendance, submissionId })
      .onConflictDoNothing({ target: confirmations.submissionId }).returning();
    const entry = inserted ?? (await db.select().from(confirmations)
      .where(eq(confirmations.submissionId, submissionId)))[0];
    return reply({ entry: { id: entry.id, name: entry.name, attendance: entry.attendance,
      message: entry.message, createdAt: entry.createdAt } }, 201);
  } catch {
    return reply({ error: "Konfirmasi belum dapat diproses. Silakan coba lagi." }, 503);
  }
};

export const config: Config = { path: "/api/rsvp" };
