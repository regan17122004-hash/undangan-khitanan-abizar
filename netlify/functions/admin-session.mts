import { login, logout, getUser, acceptInvite, recoverPassword, requestPasswordRecovery, verifyRequestOrigin } from "@netlify/identity";
import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  const reply = (body: unknown, status = 200) => Response.json(body, {
    status, headers: { "Cache-Control": "no-store" },
  });
  if (req.method === "GET") {
    const user = await getUser();
    return reply({ isAdmin: user?.roles?.includes("admin") === true, signedIn: !!user });
  }
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
  try {
    verifyRequestOrigin(req);
  } catch { return reply({ error: "Permintaan tidak diizinkan." }, 403); }
  try {
    if (!req.headers.get("content-type")?.includes("application/json")) return reply({ error: "Format tidak valid." }, 415);
    const raw = await req.text();
    if (raw.length > 10000) return reply({ error: "Kiriman terlalu panjang." }, 413);
    const body = JSON.parse(raw);
    if (body?.action === "logout") { await logout(); return reply({ ok: true }); }
    if (body?.action === "recovery" && typeof body.email === "string") {
      await requestPasswordRecovery(body.email);
      return reply({ ok: true });
    }
    if (typeof body?.password !== "string" || !body.password || body.password.length > 1000) {
      return reply({ error: "Isi kata sandi yang valid." }, 400);
    }
    let user;
    if ((body.action === "invite" || body.action === "reset") && typeof body.token === "string") {
      user = body.action === "invite" ? await acceptInvite(body.token, body.password) : await recoverPassword(body.token, body.password);
    } else if (body.action === "login" && typeof body.email === "string") {
      user = await login(body.email, body.password);
    } else { return reply({ error: "Permintaan tidak valid." }, 400); }
    if (!user.roles?.includes("admin")) {
      await logout();
      return reply({ error: "Akun belum memiliki akses admin. Minta pemilik situs menambahkan peran admin di Netlify Identity." }, 403);
    }
    return reply({ ok: true });
  } catch {
    return reply({ error: "Proses masuk gagal. Periksa data Anda atau gunakan tautan undangan/pemulihan yang masih berlaku." }, 400);
  }
};
export const config: Config = { path: "/api/admin-session" };
