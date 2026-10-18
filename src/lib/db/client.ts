import { Prisma, PrismaClient } from "@prisma/client";

if (!["Notification", "WithdrawalRequest", "ApplicationHistory"].every((name) => Prisma.dmmf.datamodel.models.some((model) => model.name === name))) {
  throw new Error("Prisma Client chưa có schema thông báo/rút tham gia. Chạy npm run db:generate rồi khởi động lại Next.js.");
}

const globalDb = globalThis as unknown as {
  kolviaDb?: PrismaClient;
  kolviaDbSchema?: string;
};
// Next.js preserves globalThis across hot reloads, including after Prisma generate.
// Reuse a connection only when it was created for the current generated schema.
const schema = JSON.stringify({ provider: "mysql", datamodel: Prisma.dmmf.datamodel });
const cached = globalDb.kolviaDb;
const reusable = cached && globalDb.kolviaDbSchema === schema && Prisma.dmmf.datamodel.models.every(
  (model) => Boolean((cached as unknown as Record<string, unknown>)[model.name[0].toLowerCase() + model.name.slice(1)]),
);

export const db = reusable ? cached : new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  globalDb.kolviaDb = db;
  globalDb.kolviaDbSchema = schema;
}
if (cached && cached !== db) {
  // Release the obsolete pool without delaying the first request after a reload.
  void cached.$disconnect().catch(() => {
    console.warn("Không thể đóng kết nối Prisma cũ sau khi cập nhật schema.");
  });
}
