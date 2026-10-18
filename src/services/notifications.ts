import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { authorize } from "@/lib/permissions/guards";
import { assert } from "@/lib/errors";
import type { Actor } from "@/types";
import { collectNotificationRecipient, committedNotifications } from "@/lib/realtime/transaction";
import { PAGE_SIZE } from "@/lib/pagination";
import { publishNotificationChanges } from "@/lib/realtime/pusher";

export async function notify(tx: Prisma.TransactionClient, userId: string, type: string, title: string, message: string, href: string) {
  const item = await tx.notification.create({ data: { userId, type, title, message: message.slice(0, 2000), href } });
  collectNotificationRecipient(tx, userId);
  return item;
}
export async function notificationTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>, options?: { isolationLevel?: Prisma.TransactionIsolationLevel }) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await committedNotifications<T, Prisma.TransactionClient>((callback) => db.$transaction(callback, { timeout: 15000, maxWait: 10000, ...options }), work, publishNotificationChanges);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}
export async function notificationUnread(actor: Actor | null) {
  const user = await authorize(actor, ["KOL", "ORGANIZER", "ADMIN"]);
  return { unread: await db.notification.count({ where: { userId: user.id, readAt: null } }) };
}
export async function notifications(actor: Actor | null, page = 1) {
  const user = await authorize(actor, ["KOL", "ORGANIZER", "ADMIN"]);
  const [items, total, unread] = await Promise.all([
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    db.notification.count({ where: { userId: user.id } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return { items, total, unread, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
export async function readNotification(actor: Actor | null, id?: string) {
  const user = await authorize(actor, ["KOL", "ORGANIZER", "ADMIN"]);
  const result = await db.notification.updateMany({ where: { userId: user.id, ...(id && { id }), readAt: null }, data: { readAt: new Date() } });
  if (id && !result.count) assert(await db.notification.findFirst({ where: { id, userId: user.id } }), 404, "Không tìm thấy thông báo.");
  await publishNotificationChanges([user.id]);
  return { updated: result.count };
}
