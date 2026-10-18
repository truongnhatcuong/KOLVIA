import { createHash } from "node:crypto";
import { db } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { actorSelect } from "@/lib/auth/session";
import { assert } from "@/lib/errors";
import { registerSchema, loginSchema, changePasswordSchema } from "@/lib/validations";
import { authorize } from "@/lib/permissions/guards";
import type { Actor } from "@/types";

export async function register(input: unknown) {
  const data = registerSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  return db.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      passwordHash,
      ...(data.role === "KOL"
        ? { kol: { create: {} } }
        : { organizer: { create: { companyName: data.name } } }),
    },
    select: actorSelect,
  });
}
export async function login(input: unknown) {
  const data = loginSchema.parse(input);
  const key = createHash("sha256").update(data.email).digest("hex");
  await limitCredentialAttempts(key);
  const user = await db.user.findUnique({ where: { email: data.email } });
  // Scrypt is also performed for unknown accounts to avoid a quick email-existence check.
  const valid = user
    ? await verifyPassword(data.password, user.passwordHash)
    : (await hashPassword(data.password), false);
  assert(valid && user?.active, 401, "Email hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.");
  await db.loginAttempt.deleteMany({ where: { key } });
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active };
}

async function limitCredentialAttempts(key: string) {
  await db.$transaction(async (tx) => {
    const now = new Date();
    const attempt = await tx.loginAttempt.upsert({
      where: { key },
      create: { key, count: 1, expiresAt: new Date(now.getTime() + 15 * 60 * 1000) },
      update: { count: { increment: 1 } },
    });
    if (attempt.expiresAt <= now) {
      await tx.loginAttempt.update({ where: { key }, data: { count: 1, expiresAt: new Date(now.getTime() + 15 * 60 * 1000) } });
    } else {
      assert(attempt.count <= 10, 429, "Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.");
    }
  });
}

export async function changePassword(actor: Actor | null, input: unknown) {
  const user = await authorize(actor, ["KOL", "ORGANIZER", "ADMIN"]);
  const data = changePasswordSchema.parse(input);
  const key = createHash("sha256").update(`change-password:${user.id}`).digest("hex");
  await limitCredentialAttempts(key);
  const credentials = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, active: true } });
  assert(credentials?.active, 401, "Tài khoản không còn hoạt động.");
  assert(await verifyPassword(data.currentPassword, credentials.passwordHash), 400, "Mật khẩu hiện tại không đúng.");
  const passwordHash = await hashPassword(data.newPassword);
  await db.$transaction(async (tx) => {
    // Compare the hash as well as ownership: two simultaneous changes cannot both win.
    const updated = await tx.user.updateMany({
      where: { id: user.id, active: true, passwordHash: credentials.passwordHash },
      data: { passwordHash },
    });
    assert(updated.count === 1, 409, "Thông tin tài khoản đã thay đổi. Đăng nhập lại rồi thử lại.");
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.loginAttempt.deleteMany({ where: { key } });
  });
  return { changed: true };
}
