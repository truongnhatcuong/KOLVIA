import { db } from "@/lib/db/client";
import { authorize, assertOwner } from "@/lib/permissions/guards";
import { assert } from "@/lib/errors";
import { lockJob } from "@/lib/db/recruitment";
import { withdrawalRequestSchema, withdrawalDecisionSchema, withdrawalDepartureSchema } from "@/lib/validations";
import { assertRequestable, assertReviewable, assertCanConfirmDeparture, withdrawalTiming } from "@/lib/withdrawal-policy";
import { notify, notificationTransaction } from "./notifications";
import type { Actor } from "@/types";
import type { Prisma } from "@prisma/client";

export async function withdrawals(actor: Actor | null, jobId?: string) {
  const user = await authorize(actor, ["KOL", "ORGANIZER"]);
  if (jobId) {
    const job = await db.job.findUnique({ where: { id: jobId }, select: { organizerId: true } });
    assert(job, 404, "Không tìm thấy Job.");
    assert(user.role === "ORGANIZER", 403, "Chỉ Organizer xem danh sách theo Job.");
    assertOwner(job.organizerId, user.id);
  }
  return db.withdrawalRequest.findMany({
    where: { participation: { ...(jobId && { jobId }), ...(user.role === "KOL" ? { kolId: user.id } : { job: { organizerId: user.id } }) } },
    include: {
      participation: { select: { id: true, status: true, kol: { select: { id: true, name: true } }, job: { select: { id: true, title: true, status: true, completedAt: true, location: true } } } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { requestedAt: "desc" },
  });
}

async function notifyBoth(tx: Prisma.TransactionClient, kolId: string, organizerId: string, title: string, message: string) {
  await notify(tx, organizerId, "WITHDRAWAL", title, message, "/organizer/withdrawals");
  await notify(tx, kolId, "WITHDRAWAL", title, message, "/kol/withdrawals");
}
export async function requestWithdrawal(actor: Actor | null, input: unknown) {
  const user = await authorize(actor, ["KOL"]);
  const data = withdrawalRequestSchema.parse(input);
  const metadata = await db.participation.findUnique({ where: { id: data.participationId }, select: { jobId: true, kolId: true } });
  assert(metadata, 404, "Không tìm thấy lượt tham gia.");
  assertOwner(metadata.kolId, user.id);
  return notificationTransaction(async (tx) => {
    const job = await lockJob(tx, metadata.jobId);
    const participant = await tx.participation.findUniqueOrThrow({ where: { id: data.participationId } });
    assertOwner(participant.kolId, user.id);
    assertRequestable(job, participant.status);
    const now = new Date();
    const request = await tx.withdrawalRequest.create({ data: {
      participationId: participant.id, activeSlot: participant.id, reason: data.reason,
      timing: withdrawalTiming(job.eventDate, now), requestedAt: now, eventDateAtRequest: job.eventDate, sourceAtRequest: participant.source,
    } });
    await tx.participation.update({ where: { id: participant.id }, data: { status: "WITHDRAWAL_PENDING" } });
    await notifyBoth(tx, user.id, job.organizerId, "Yêu cầu rút tham gia mới", `${user.name} đề nghị rút khỏi ${job.title}. Lý do: ${data.reason}`);
    return request;
  }, { isolationLevel: "ReadCommitted" });
}

async function depart(tx: Prisma.TransactionClient, participationId: string, kolId: string, jobId: string, actorId: string, approved: boolean, now: Date) {
  await tx.participation.update({ where: { id: participationId }, data: { status: approved ? "WITHDRAWN_APPROVED" : "WITHDRAWN_UNAPPROVED", leftAt: now } });
  const accepted = await tx.application.findUnique({ where: { jobId_kolId: { jobId, kolId } } });
  if (accepted && ["PENDING", "ACCEPTED"].includes(accepted.status)) {
    await tx.application.update({ where: { id: accepted.id }, data: { status: "WITHDRAWN" } });
    await tx.applicationHistory.create({ data: { applicationId: accepted.id, actorId, status: "WITHDRAWN", message: accepted.message.slice(0, 2000), action: approved ? "WITHDRAWN_APPROVED" : "WITHDRAWN_UNAPPROVED", occurredAt: now } });
  }
  await tx.invitation.updateMany({ where: { jobId, kolId, status: { in: ["ACCEPTED", "PENDING"] } }, data: { status: "WITHDRAWN" } });
}
export async function decideWithdrawal(actor: Actor | null, id: string, input: unknown) {
  const user = await authorize(actor, ["ORGANIZER"]);
  const data = withdrawalDecisionSchema.parse(input);
  const metadata = await db.withdrawalRequest.findUnique({ where: { id }, select: { participation: { select: { jobId: true } } } });
  assert(metadata, 404, "Không tìm thấy yêu cầu rút.");
  return notificationTransaction(async (tx) => {
    const job = await lockJob(tx, metadata.participation.jobId);
    assertOwner(job.organizerId, user.id);
    const request = await tx.withdrawalRequest.findUniqueOrThrow({ where: { id }, include: { participation: true } });
    assertReviewable(job, request.participation.status, request.status);
    const now = new Date();
    const approved = data.status === "APPROVED";
    const result = await tx.withdrawalRequest.update({ where: { id }, data: {
      status: data.status, reviewedAt: now, reviewedById: user.id, decisionNote: data.note,
      ...(approved && { departedAt: now, activeSlot: null }),
    } });
    if (approved) await depart(tx, request.participationId, request.participation.kolId, job.id, user.id, true, now);
    else await tx.participation.update({ where: { id: request.participationId }, data: { status: "WITHDRAWAL_REJECTED" } });
    await notifyBoth(tx, request.participation.kolId, job.organizerId, approved ? "Yêu cầu rút được chấp thuận" : "Yêu cầu rút bị từ chối", `${job.title}${data.note ? `: ${data.note}` : ""}${approved ? ". KOL đã rời và vị trí tuyển được cập nhật." : ". KOL vẫn có thể xác nhận rời, trạng thái sẽ ghi nhận không được chấp thuận."}`);
    return result;
  }, { isolationLevel: "ReadCommitted" });
}
export async function confirmDeparture(actor: Actor | null, id: string, input: unknown) {
  const user = await authorize(actor, ["KOL"]);
  withdrawalDepartureSchema.parse(input);
  const metadata = await db.withdrawalRequest.findUnique({ where: { id }, select: { participation: { select: { jobId: true, kolId: true } } } });
  assert(metadata, 404, "Không tìm thấy yêu cầu rút.");
  assertOwner(metadata.participation.kolId, user.id);
  return notificationTransaction(async (tx) => {
    const job = await lockJob(tx, metadata.participation.jobId);
    const request = await tx.withdrawalRequest.findUniqueOrThrow({ where: { id }, include: { participation: true } });
    assertOwner(request.participation.kolId, user.id);
    assertCanConfirmDeparture(job, request.participation.status, request.status);
    const now = new Date();
    const result = await tx.withdrawalRequest.update({ where: { id }, data: { status: "LEFT_WITHOUT_APPROVAL", departedAt: now, activeSlot: null } });
    await depart(tx, request.participationId, user.id, job.id, user.id, false, now);
    await notifyBoth(tx, user.id, job.organizerId, "KOL đã rời không được chấp thuận", `${user.name} đã xác nhận rời ${job.title}. Lý do đã gửi: ${request.reason}`);
    return result;
  }, { isolationLevel: "ReadCommitted" });
}
