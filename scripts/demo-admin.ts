import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";

const db = new PrismaClient();
async function main() {
  const email = z.email().parse((process.env.DEMO_ADMIN_EMAIL ?? "admin@kolvia.local").trim().toLowerCase());
  const password = z.string().min(10).max(128).parse(process.env.DEMO_ADMIN_PASSWORD);
  await db.$connect();
  const passwordHash = await hashPassword(password);
  const admin = await db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing && existing.role !== "ADMIN") {
      throw new Error("Email này thuộc tài khoản KOL/Organizer; không tự nâng quyền tài khoản đó.");
    }
    const user = await tx.user.upsert({
      where: { email },
      create: { email, name: "Quản trị KOLVIA", role: "ADMIN", passwordHash },
      update: { passwordHash, active: true },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    return user;
  });
  if (!await verifyPassword(password, admin.passwordHash)) throw new Error("Không xác minh được mật khẩu Admin.");
  console.log(`Admin sẵn sàng: ${admin.email}. Mật khẩu lấy từ DEMO_ADMIN_PASSWORD trong .env. Đăng nhập tại /login, quản trị tại /admin.`);
}
main().catch((error: unknown) => {
  const code = error instanceof Error
    ? "code" in error ? String(error.code) : "errorCode" in error ? String(error.errorCode) : undefined
    : undefined;
  console.error(code
    ? `Không tạo được Admin (${code}). Kiểm tra kết nối MySQL và migration.`
    : error instanceof z.ZodError ? "DEMO_ADMIN_EMAIL hoặc DEMO_ADMIN_PASSWORD không hợp lệ. Mật khẩu cần 10–128 ký tự."
    : error instanceof Error ? error.message : "Không tạo được Admin.");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
