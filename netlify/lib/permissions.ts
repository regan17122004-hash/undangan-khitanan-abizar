import { createHash, randomBytes } from "node:crypto";
import { getUser } from "@netlify/identity";
import type { Context } from "@netlify/functions";

export async function permissions(context: Context, createOwner = false) {
  const user = await getUser();
  const isAdmin = user?.roles?.includes("admin") === true;
  let owner: string | undefined = context.cookies.get("rsvp_owner");
  if (!owner || !/^[a-f0-9]{64}$/.test(owner)) {
    owner = undefined;
    if (createOwner) {
      owner = randomBytes(32).toString("hex");
      context.cookies.set({ name: "rsvp_owner", value: owner, httpOnly: true,
        secure: true, sameSite: "Lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
  }
  return { isAdmin, ownerHash: owner ? createHash("sha256").update(owner).digest("hex") : null };
}
