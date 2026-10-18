import { existsSync, readFileSync } from "node:fs";
import { validateDatasource } from "./database-config.mjs";

if (existsSync(".env")) process.loadEnvFile(".env");
let client;
try {
  const provider = validateDatasource(
    readFileSync("prisma/schema.prisma", "utf8"),
    process.env.DATABASE_URL,
  );
  if (!process.argv.includes("--config-only")) {
    const { Prisma, PrismaClient } = await import("@prisma/client");
    for (const [model, field] of [["Job", "capacity"], ["Job", "completedAt"], ["Participation", "status"], ["WithdrawalRequest", "reason"], ["ApplicationHistory", "action"], ["KolProfile", "experienceYears"], ["User", "notifications"], ["Notification", "readAt"], ["MediaAsset", "deletedAt"]]) {
      if (!Prisma.dmmf.datamodel.models.find((item) => item.name === model)?.fields.some((item) => item.name === field)) {
        throw new Error("Prisma Client đã cũ. Chạy npm run db:generate rồi khởi động lại server.");
      }
    }
    client = new PrismaClient();
    await client.$connect();
    await Promise.all([
      client.user.findFirst({ select: { id: true, active: true } }),
      client.job.findFirst({ select: { id: true, capacity: true, benefits: true, recruitmentVersion: true, media: { select: { id: true, slot: true, deletedAt: true } } } }),
      client.kolProfile.findFirst({ select: { id: true, skills: true, experienceYears: true } }),
      client.notification.count({ where: { readAt: null } }),
      client.mediaAsset.findFirst({ select: { id: true, slot: true, deletedAt: true } }),
      client.job.findFirst({ select: { completedAt: true } }),
      client.participation.findFirst({ select: { status: true, confirmedAt: true, leftAt: true } }),
      client.withdrawalRequest.count(),
      client.applicationHistory.count(),
    ]);
  }
  console.log(`Database ${provider}: ${process.argv.includes("--config-only") ? "cấu hình hợp lệ" : "kết nối và schema hợp lệ"}.`);
} catch (error) {
  // Prisma errors can include connection credentials; only emit our safe messages or an error code.
  const code = error.code ?? error.errorCode ?? "PRISMA_ERROR";
  const message = code === "P1001"
    ? "Không kết nối được server MySQL (P1001). Kiểm tra host, cổng, mạng và cấu hình TLS trong DATABASE_URL."
    : error?.name?.startsWith("Prisma")
    ? `Không thể đọc database (${code}). Kiểm tra kết nối và chạy npm run db:migrate nếu schema chưa được cập nhật.`
    : error.message;
  console.error(message);
  process.exitCode = 1;
} finally {
  await client?.$disconnect();
}
