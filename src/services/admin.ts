import { db } from "@/lib/db/client";
import { actorSelect } from "@/lib/auth/session";
import { authorize } from "@/lib/permissions/guards";
import { assert } from "@/lib/errors";
import { moderationSchema, userStatusSchema, hideJobSchema } from "@/lib/validations";
import { lockJob } from "@/lib/db/recruitment";
import { notify, notificationTransaction } from "./notifications";
import type { Actor } from "@/types";
import { mediaSelect } from "@/lib/validations/media";
import { activeParticipationCount, activeParticipationFilter } from "@/lib/db/participation";

export async function adminOverview(actor: Actor | null) {
  await authorize(actor, ["ADMIN"]);
  const [users, jobs, pending, collaborations, kols, organizers, applications, invitations] = await Promise.all([
    db.user.count(), db.job.count(), db.job.count({ where: { moderation: "PENDING" } }), db.participation.count({ where: activeParticipationFilter }),
    db.user.count({ where: { role: "KOL" } }), db.user.count({ where: { role: "ORGANIZER" } }), db.application.count(), db.invitation.count(),
  ]);
  return { users, jobs, pending, collaborations, kols, organizers, applications, invitations };
}
export async function adminUsers(actor: Actor | null, role?: "KOL" | "ORGANIZER" | "ADMIN") {
  await authorize(actor, ["ADMIN"]);
  return db.user.findMany({
    where: role ? { role } : {},
    select: { ...actorSelect, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}
export async function adminJobs(actor: Actor | null, pending = false) {
  await authorize(actor, ["ADMIN"]);
  return db.job.findMany({
    where: pending ? { moderation: "PENDING" } : {},
    include: {
      media: { where: { slot: { not: null } }, select: mediaSelect },
      organizer: { select: { id: true, name: true, organizer: { select: { companyName: true } } } },
      _count: { select: { applications: true, ...activeParticipationCount } },
    },
    orderBy: { createdAt: "desc" },
  });
}
export async function moderateJob(actor: Actor | null, id: string, input: unknown) {
  await authorize(actor, ["ADMIN"]);
  const data = moderationSchema.parse(input);
  return notificationTransaction(async (tx) => {
    const job = await lockJob(tx, id);
    assert(job.moderation === "PENDING", 409, "Job không còn ở trạng thái chờ duyệt.");
    if (data.moderation === "APPROVED") {
      assert(job.status === "OPEN" && job.deadline > new Date(), 409, "Job đã đóng hoặc hết hạn.");
      const organizer = await tx.user.findUnique({ where: { id: job.organizerId } });
      assert(organizer?.active, 409, "Organizer đã bị khóa.");
    }
    const result = await tx.job.update({ where: { id }, data: { moderation: data.moderation, moderationNote: data.note } });
    await notify(tx, job.organizerId, "MODERATION_STATUS", data.moderation === "APPROVED" ? "Job đã được duyệt" : "Job bị từ chối", `${job.title}${data.note ? `: ${data.note}` : ""}`, `/organizer/jobs/${id}`);
    return result;
  });
}
export async function hideJob(actor: Actor | null, id: string, input: unknown) {
  await authorize(actor, ["ADMIN"]);
  const { note } = hideJobSchema.parse(input);
  return notificationTransaction(async (tx) => {
    const job = await lockJob(tx, id);
    assert(job.moderation === "APPROVED" && job.status !== "ARCHIVED", 409, "Chỉ có thể ẩn Job đã được duyệt.");
    const result = await tx.job.update({ where: { id }, data: { moderation: "REJECTED", moderationNote: note } });
    const recipients = await tx.user.findMany({ where: { OR: [{ id: job.organizerId }, { applications: { some: { jobId: id } } }, { invitations: { some: { jobId: id } } }, { participations: { some: { jobId: id } } }] }, select: { id: true, role: true } });
    for (const recipient of recipients) await notify(tx, recipient.id, "JOB_HIDDEN", "Job bị ẩn bởi quản trị viên", `${job.title}: ${note}`, recipient.role === "ORGANIZER" ? `/organizer/jobs/${id}` : `/jobs/${id}`);
    return result;
  }, { isolationLevel: "ReadCommitted" });
}
export async function setUserActive(actor: Actor | null, id: string, input: unknown) {
  const admin = await authorize(actor, ["ADMIN"]);
  const data = userStatusSchema.parse(input);
  assert(id !== admin.id, 409, "Bạn không thể khóa tài khoản của chính mình.");
  return notificationTransaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id } });
    assert(target, 404, "Không tìm thấy tài khoản.");
    assert(
      target.role !== "ADMIN",
      403,
      "Tài khoản ADMIN được quản lý qua công cụ quản trị local.",
    );
    if (!data.active) await tx.session.deleteMany({ where: { userId: id } });
    return tx.user.update({ where: { id }, data, select: actorSelect });
  });
}

export async function adminActivity(actor: Actor | null) {
  await authorize(actor, ["ADMIN"]);
  const today = new Date();
  const localDay = new Date(today.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const start = new Date(`${localDay}T00:00:00+07:00`);
  start.setUTCDate(start.getUTCDate() - 29);
  const [jobs, applications, connections, moderation, recent] = await Promise.all([
    db.job.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    db.application.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    db.participation.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    db.job.groupBy({ by: ["moderation"], _count: { _all: true } }),
    db.participation.findMany({ take: 8, orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true, source: true, kol: { select: { name: true } }, job: { select: { id: true, title: true, organizer: { select: { name: true, organizer: { select: { companyName: true } } } } } } } }),
  ]);
  const counts = (records: { createdAt: Date }[]) => records.reduce<Record<string, number>>((acc, record) => {
    const day = new Date(record.createdAt.getTime() + 7 * 3600000).toISOString().slice(0, 10);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});
  const j = counts(jobs), a = counts(applications), c = counts(connections);
  const series = Array.from({ length: 30 }, (_, index) => {
    const day = new Date(start.getTime() + index * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
    return { day, jobs: j[day] ?? 0, applications: a[day] ?? 0, connections: c[day] ?? 0 };
  });
  return { series, moderation: moderation.map((row) => ({ status: row.moderation, count: row._count._all })), recent };
}
