import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

export function isolatedMysqlUrl(source, suffix = randomBytes(8).toString("hex")) {
  if (!source) throw new Error("Thiếu TEST_DATABASE_URL. Cấu hình MySQL dành cho kiểm thử; tài khoản cần quyền CREATE/DROP DATABASE.");
  let url;
  try { url = new URL(source); } catch { throw new Error("TEST_DATABASE_URL không hợp lệ."); }
  if (url.protocol !== "mysql:" || !url.hostname || url.pathname.length < 2) throw new Error("TEST_DATABASE_URL phải dùng MySQL và có tên database gốc.");
  if (!/^[a-f0-9]{16}$/.test(suffix)) throw new Error("Mã database thử nghiệm không hợp lệ.");
  const name = `kolvia_test_${suffix}`;
  if (decodeURIComponent(url.pathname.slice(1)) === name) throw new Error("Database thử nghiệm phải tách biệt database gốc.");
  url.pathname = `/${name}`;
  return { name, url: url.toString() };
}
export async function createTestDatabase() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const source = process.env.TEST_DATABASE_URL;
  const isolated = isolatedMysqlUrl(source);
  const { PrismaClient } = await import("@prisma/client");
  const admin = new PrismaClient({ datasourceUrl: source });
  try { await admin.$executeRawUnsafe(`CREATE DATABASE \`${isolated.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); }
  catch (error) { await admin.$disconnect(); throw new Error(`Không tạo được database MySQL kiểm thử (${error.code ?? error.errorCode ?? "MYSQL_ERROR"}). Kiểm tra kết nối và quyền CREATE DATABASE.`); }
  return {
    url: isolated.url,
    async cleanup() {
      try { await admin.$executeRawUnsafe(`DROP DATABASE \`${isolated.name}\``); }
      finally { await admin.$disconnect(); }
    },
  };
}
