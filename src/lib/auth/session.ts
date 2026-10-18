import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db/client";
import type { Actor } from "@/types";

export const SESSION_COOKIE = "kolvia_session";
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const actorSelect = { id: true, name: true, email: true, role: true, active: true } as const;

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { tokenHash: tokenHash(token), userId, expiresAt: expires } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.APP_URL?.startsWith("https://") ?? false,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function resolveSession(token: string | undefined): Promise<Actor | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: { expiresAt: true, user: { select: actorSelect } },
  });
  return session && session.expiresAt > new Date() && session.user.active ? session.user : null;
}

export const currentActor = cache(async () =>
  resolveSession((await cookies()).get(SESSION_COOKIE)?.value),
);

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  jar.delete(SESSION_COOKIE);
}
