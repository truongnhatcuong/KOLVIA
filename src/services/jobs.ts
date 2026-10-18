import { db } from "@/lib/db/client";
import { assert } from "@/lib/errors";
import { authorize, assertOwner } from "@/lib/permissions/guards";
import { jobSchema, jobStatusSchema, jobManagementFiltersSchema } from "@/lib/validations";
import { lockJob } from "@/lib/db/recruitment";
import { notify, notificationTransaction } from "./notifications";
import { jobPublic, publicJob } from "@/lib/db/queries";
import type { Actor } from "@/types";
import { mediaSelect } from "@/lib/validations/media";
import { activeParticipationCount, activeParticipationFilter } from "@/lib/db/participation";

const jobManagementInclude = {
  media: { where: { slot: { not: null } }, select: mediaSelect },
  _count: { select: { applications: true, invitations: true, ...activeParticipationCount } },
} as const;

export async function ownJobs(actor: Actor | null) {
  const user = await authorize(actor, ["ORGANIZER"]);
  return db.job.findMany({
    where: { organizerId: user.id },
    orderBy: { createdAt: "desc" },
    include: jobManagementInclude,
  });
}
export async function ownJobPage(actor: Actor | null, input: unknown = {}) {
  const user = await authorize(actor, ["ORGANIZER"]);
  const filters = jobManagementFiltersSchema.parse(input);
  const where: import("@prisma/client").Prisma.JobWhereInput = {
    organizerId: user.id,
    ...(filters.status && { status: filters.status }),
    ...(filters.moderation && { moderation: filters.moderation }),
    ...(filters.q && {
      OR: [{ title: { contains: filters.q } }, { location: { contains: filters.q } }],
    }),
  };
  const pageSize = 8;
  const [items, total] = await Promise.all([
    db.job.findMany({
      where,
      include: jobManagementInclude,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (filters.page - 1) * pageSize,
    }),
    db.job.count({ where }),
  ]);
  return { items, total, page: filters.page, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
export async function ownJob(actor: Actor | null, id: string) {
  const user = await authorize(actor, ["ORGANIZER"]);
  const job = await db.job.findUnique({ where: { id } });
  assert(job, 404, "Không tìm thấy Job.");
  assertOwner(job.organizerId, user.id);
  return job;
}
export async function createJob(actor: Actor | null, input: unknown) {
  const user = await authorize(actor, ["ORGANIZER"]);
  const data = jobSchema.parse(input);
  return db.job.create({ data: { ...data, organizerId: user.id } });
}
export async function updateJob(actor: Actor | null, id: string, input: unknown) {
  const user = await authorize(actor, ["ORGANIZER"]);
  const data = jobSchema.parse(input);
  return notificationTransaction(async (tx) => {
    const job = await lockJob(tx, id);
    assertOwner(job.organizerId, user.id);
    assert(!["ARCHIVED", "COMPLETED"].includes(job.status) && !job.completedAt, 409, "Job đã lưu trữ hoặc hoàn thành không thể sửa.");
    assert(data.capacity >= job._count.participations, 409, "Số lượng tuyển không được nhỏ hơn số KOL đã xác nhận.");
    const result = await tx.job.update({
      where: { id },
      data: {
        ...data,
        moderation: job.moderation === "DRAFT" ? "DRAFT" : "PENDING",
        moderationNote: "",
      },
    });
    if (result.moderation === "PENDING") {
      const admins = await tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
      for (const admin of admins) await notify(tx, admin.id, "MODERATION", "Job cập nhật cần kiểm duyệt", result.title, "/admin/moderation");
    }
    const kols = await tx.user.findMany({ where: { role: "KOL", OR: [{ applications: { some: { jobId: id } } }, { invitations: { some: { jobId: id } } }] }, select: { id: true } });
    for (const kol of kols) await notify(tx, kol.id, "JOB_UPDATED", "Nội dung Job đã cập nhật", result.title, `/jobs/${id}`);
    return result;
  }, { isolationLevel: "ReadCommitted" });
}
export async function submitJob(actor: Actor | null, id: string) {
  const user = await authorize(actor, ["ORGANIZER"]);
  return notificationTransaction(async (tx) => {
    const job = await lockJob(tx, id);
    assertOwner(job.organizerId, user.id);
    assert(["DRAFT", "REJECTED"].includes(job.moderation), 409, "Job đã được gửi hoặc duyệt.");
    assert(job.status === "OPEN" && job.deadline > new Date(), 409, "Job đã đóng hoặc hết hạn.");
    const result = await tx.job.update({ where: { id }, data: { moderation: "PENDING", moderationNote: "" } });
    const admins = await tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
    for (const admin of admins) await notify(tx, admin.id, "MODERATION", "Job mới cần kiểm duyệt", job.title, "/admin/moderation");
    return result;
  }, { isolationLevel: "ReadCommitted" });
}
export async function setJobStatus(actor: Actor | null, id: string, input: unknown) {
  const user = await authorize(actor, ["ORGANIZER", "ADMIN"]);
  const { status } = jobStatusSchema.parse(input);
  return notificationTransaction(async (tx) => {
    const job = await lockJob(tx, id);
    if (user.role !== "ADMIN") assertOwner(job.organizerId, user.id);
    assert(job.status !== "ARCHIVED", 409, "Job đã lưu trữ.");
    assert(job.status !== "COMPLETED" && !job.completedAt, 409, "Job đã hoàn thành, không thể đổi trạng thái.");
    if (status === job.status) return job;
    if (status === "OPEN")
      assert(job.deadline > new Date(), 409, "Cần cập nhật hạn ứng tuyển trước khi mở lại Job.");
    if (status === "COMPLETED") {
      assert(job.moderation === "APPROVED", 409, "Chỉ có thể hoàn thành Job đã được duyệt.");
      const pending = await tx.withdrawalRequest.count({ where: { status: "PENDING", participation: { jobId: id } } });
      assert(pending === 0, 409, "Xử lý yêu cầu rút đang chờ trước khi hoàn thành Job.");
    }
    const result = await tx.job.update({ where: { id }, data: { status, ...(status === "COMPLETED" && { completedAt: new Date() }) } });
    const recipients = await tx.user.findMany({ where: { OR: [{ id: job.organizerId }, { applications: { some: { jobId: id } } }, { invitations: { some: { jobId: id } } }, { participations: { some: { jobId: id } } }] }, select: { id: true, role: true } });
    for (const recipient of recipients) await notify(tx, recipient.id, "JOB_STATUS", status === "COMPLETED" ? "Job đã hoàn thành" : status === "CLOSED" ? "Job đã đóng tuyển" : "Job được mở tuyển lại", job.title, recipient.role === "ORGANIZER" ? `/organizer/jobs/${id}` : `/jobs/${id}`);
    return result;
  }, { isolationLevel: "ReadCommitted" });
}
export async function deleteJob(actor: Actor | null, id: string) {
  const user = await authorize(actor, ["ORGANIZER", "ADMIN"]);
  return notificationTransaction(async (tx) => {
    await lockJob(tx, id);
    const job = await tx.job.findUnique({
      where: { id },
      include: {
        _count: { select: { applications: true, invitations: true, participations: true } },
      },
    });
    assert(job, 404, "Không tìm thấy Job.");
    if (user.role !== "ADMIN") assertOwner(job.organizerId, user.id);
    if (job.status === "ARCHIVED") return { archived: true };
    if (job._count.applications || job._count.invitations || job._count.participations) {
      await tx.job.update({ where: { id }, data: { status: "ARCHIVED" } });
      const kols = await tx.user.findMany({ where: { OR: [{ applications: { some: { jobId: id } } }, { invitations: { some: { jobId: id } } }] }, select: { id: true } });
      for (const kol of kols) await notify(tx, kol.id, "JOB_STATUS", "Job được lưu trữ", job.title, `/jobs/${id}`);
      return { archived: true };
    }
    await tx.mediaAsset.updateMany({ where: { jobId: id }, data: { slot: null } });
    await tx.job.delete({ where: { id } });
    return { deleted: true };
  }, { isolationLevel: "ReadCommitted" });
}
export async function participants(actor: Actor | null, id: string) {
  const user = await authorize(actor, ["ORGANIZER"]);
  const job = await ownJob(user, id);
  return db.participation.findMany({
    where: { jobId: job.id, ...activeParticipationFilter },
    select: {
      id: true,
      source: true,
      status: true,
      withdrawals: { orderBy: { requestedAt: "desc" }, take: 1 },
      createdAt: true,
      kol: {
        select: { id: true, name: true, kol: { select: { category: true, location: true } } },
      },
    },
  });
}

export async function jobForViewer(actor: Actor | null, id: string) {
  const published = await publicJob(id);
  if (published || !actor) return published;
  const user = await authorize(actor, ["KOL", "ORGANIZER", "ADMIN"]);
  return db.job.findFirst({
    where: {
      id,
      ...(user.role === "KOL" ? { OR: [{ applications: { some: { kolId: user.id } } }, { invitations: { some: { kolId: user.id } } }, { participations: { some: { kolId: user.id } } }] } : user.role === "ORGANIZER" ? { organizerId: user.id } : {}),
    },
    select: jobPublic,
  });
}
