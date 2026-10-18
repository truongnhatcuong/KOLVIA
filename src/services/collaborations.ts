import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { assert } from "@/lib/errors";
import { authorize, assertOwner } from "@/lib/permissions/guards";
import { applicationSchema, applicationDecisionSchema, invitationSchema, invitationDecisionSchema } from "@/lib/validations";
import { lockJob, assertOpenJob, confirmParticipant } from "@/lib/db/recruitment";
import { notify, notificationTransaction } from "./notifications";
import { demoPortrait } from "@/lib/demo-assets";
import type { Actor } from "@/types";
import { mediaSelect } from "@/lib/validations/media";
import { activeParticipationCount, activeParticipationFilter, isActiveParticipation } from "@/lib/db/participation";
import { assertWithdrawalAllowed } from "@/lib/withdrawal-policy";

const transaction = <T>(work: (tx: Prisma.TransactionClient) => Promise<T>) => notificationTransaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
const person = {
  id: true, name: true, email: true,
  media: { where: { target: "AVATAR", slot: { not: null } }, select: mediaSelect },
  kol: { select: { category: true, location: true, skills: true, experienceYears: true } },
} as const;
const jobSummary = {
  id: true, title: true, status: true, completedAt: true, moderation: true, deadline: true, eventDate: true, location: true, category: true, requirements: true, description: true, benefits: true,
  budgetMin: true, budgetMax: true, capacity: true,
  _count: { select: activeParticipationCount },
  organizer: { select: { name: true, organizer: { select: { companyName: true } }, media: { where: { slot: { not: null }, target: "LOGO" }, select: mediaSelect } } },
} as const;
function withPortrait<T extends { kol: { email: string } }>(item: T) {
  const { email, ...kol } = item.kol;
  return { ...item, kol: { ...kol, demoAvatar: demoPortrait(email) } };
}
async function withParticipations<T extends { kol: { id: string; email: string }; job: { id: string } }>(items: T[]) {
  const rows = items.length ? await db.participation.findMany({
    where: { OR: items.map((item) => ({ jobId: item.job.id, kolId: item.kol.id })) },
    select: { id: true, jobId: true, kolId: true, status: true, withdrawals: { orderBy: { requestedAt: "desc" }, take: 1 } },
  }) : [];
  const byPair = new Map(rows.map((row) => [`${row.jobId}:${row.kolId}`, row]));
  return items.map((item) => ({ ...withPortrait(item), participation: byPair.get(`${item.job.id}:${item.kol.id}`) ?? null }));
}
export async function applicationState(actor: Actor | null, jobId: string) {
  const user = await authorize(actor, ["KOL"]);
  const [application, participant] = await Promise.all([
    db.application.findUnique({ where: { jobId_kolId: { jobId, kolId: user.id } }, select: { status: true } }),
    db.participation.findUnique({ where: { jobId_kolId: { jobId, kolId: user.id } }, select: { id: true, status: true } }),
  ]);
  return { applied: !!application && application.status !== "WITHDRAWN", confirmed: Boolean(participant && isActiveParticipation(participant.status)) };
}
export async function applications(actor: Actor | null) {
  const user = await authorize(actor, ["KOL", "ORGANIZER"]);
  const items = await db.application.findMany({
    where: user.role === "KOL" ? { kolId: user.id } : { job: { organizerId: user.id } },
    select: { id: true, message: true, status: true, createdAt: true, history: { orderBy: { occurredAt: "desc" } }, kol: { select: person }, job: { select: jobSummary } },
    orderBy: { createdAt: "desc" },
  });
  return withParticipations(items);
}
export async function applyToJob(actor: Actor | null, input: unknown) {
  const user = await authorize(actor, ["KOL"]);
  const data = applicationSchema.parse(input);
  return transaction(async (tx) => {
    const job = await lockJob(tx, data.jobId);
    assertOpenJob(job);
    assert(job._count.participations < job.capacity, 409, "Job đã đủ số lượng KOL được tuyển.");
    assert(!(await tx.participation.findFirst({ where: { jobId: data.jobId, kolId: user.id, ...activeParticipationFilter } })), 409, "Bạn đã xác nhận tham gia Job này.");
    const previous = await tx.application.findUnique({ where: { jobId_kolId: { jobId: data.jobId, kolId: user.id } } });
    assert(!previous || previous.status === "WITHDRAWN", 409, "Bạn đã gửi yêu cầu tham gia Job này.");
    const application = previous
      ? await tx.application.update({ where: { id: previous.id }, data: { message: data.message, status: "PENDING" } })
      : await tx.application.create({ data: { ...data, kolId: user.id } });
    await tx.applicationHistory.create({ data: { applicationId: application.id, actorId: user.id, status: "PENDING", message: data.message, action: previous ? "RESUBMITTED" : "SUBMITTED" } });
    await notify(tx, job.organizerId, "APPLICATION", "Có yêu cầu tham gia mới", `${user.name} vừa ứng tuyển vào ${job.title}.`, "/organizer/applications");
    return application;
  });
}
export async function decideApplication(actor: Actor | null, id: string, input: unknown) {
  const user = await authorize(actor, ["KOL", "ORGANIZER"]);
  const { status } = applicationDecisionSchema.parse(input);
  const metadata = await db.application.findUnique({ where: { id }, select: { jobId: true } });
  assert(metadata, 404, "Không tìm thấy đơn ứng tuyển.");
  return transaction(async (tx) => {
    const job = await lockJob(tx, metadata.jobId);
    const application = await tx.application.findUnique({ where: { id } });
    assert(application, 404, "Không tìm thấy đơn ứng tuyển.");
    if (status === "WITHDRAWN") {
      assertWithdrawalAllowed(job);
      assert(user.role === "KOL", 403, "Chỉ KOL được rút đơn.");
      assertOwner(application.kolId, user.id);
    } else {
      assert(user.role === "ORGANIZER", 403, "Chỉ Organizer được duyệt đơn.");
      assertOwner(job.organizerId, user.id);
    }
    assert(application.status === "PENDING", 409, "Đơn đã được xử lý.");
    if (status === "ACCEPTED") {
      assertOpenJob(job);
      const kol = await tx.user.findUnique({ where: { id: application.kolId } });
      assert(kol?.active && kol.role === "KOL", 409, "Tài khoản KOL không còn hoạt động.");
      await confirmParticipant(tx, job, application.kolId, "APPLICATION");
    }
    const result = await tx.application.update({ where: { id }, data: { status } });
    await tx.applicationHistory.create({ data: { applicationId: id, actorId: user.id, status, message: application.message.slice(0, 2000), action: status === "WITHDRAWN" ? "CANCELLED" : status } });
    await notify(tx, status === "WITHDRAWN" ? job.organizerId : application.kolId, "APPLICATION_STATUS", status === "WITHDRAWN" ? "KOL đã rút đơn" : status === "ACCEPTED" ? "Yêu cầu tham gia được chấp nhận" : "Yêu cầu tham gia bị từ chối", `Trạng thái ứng tuyển cho ${job.title} đã được cập nhật.`, status === "WITHDRAWN" ? "/organizer/applications" : "/kol/applications");
    if (status === "WITHDRAWN") await notify(tx, user.id, "APPLICATION_STATUS", "Bạn đã hủy đăng ký", job.title, "/kol/applications");
    return result;
  });
}
export async function invitations(actor: Actor | null) {
  const user = await authorize(actor, ["KOL", "ORGANIZER"]);
  const items = await db.invitation.findMany({
    where: user.role === "KOL" ? { kolId: user.id } : { job: { organizerId: user.id } },
    select: { id: true, status: true, message: true, createdAt: true, kol: { select: person }, job: { select: jobSummary } },
    orderBy: { createdAt: "desc" },
  });
  return withParticipations(items);
}
export async function inviteKol(actor: Actor | null, input: unknown) {
  const user = await authorize(actor, ["ORGANIZER"]);
  const data = invitationSchema.parse(input);
  return transaction(async (tx) => {
    const job = await lockJob(tx, data.jobId);
    assertOpenJob(job);
    assertOwner(job.organizerId, user.id);
    assert(job._count.participations < job.capacity, 409, "Job đã đủ số lượng KOL được tuyển.");
    const kol = await tx.user.findFirst({ where: { id: data.kolId, role: "KOL", active: true, kol: { isPublic: true } } });
    assert(kol, 404, "Không tìm thấy hồ sơ KOL công khai.");
    assert(!(await tx.participation.findFirst({ where: { jobId: data.jobId, kolId: data.kolId, ...activeParticipationFilter } })), 409, "KOL đã xác nhận tham gia Job.");
    const previous = await tx.invitation.findUnique({ where: { jobId_kolId: { jobId: data.jobId, kolId: data.kolId } } });
    assert(!previous || ["DECLINED", "WITHDRAWN"].includes(previous.status), 409, "Đã có lời mời đang hiệu lực cho KOL này.");
    const invitation = previous
      ? await tx.invitation.update({ where: { id: previous.id }, data: { message: data.message, status: "PENDING", createdAt: new Date() } })
      : await tx.invitation.create({ data });
    await notify(tx, data.kolId, "INVITATION", "Bạn nhận được lời mời tham gia Job", `${user.name} mời bạn đồng hành cùng ${job.title}.`, "/kol/invitations");
    return invitation;
  });
}
export async function respondInvitation(actor: Actor | null, id: string, input: unknown) {
  const user = await authorize(actor, ["KOL"]);
  const { status } = invitationDecisionSchema.parse(input);
  const metadata = await db.invitation.findUnique({ where: { id }, select: { jobId: true } });
  assert(metadata, 404, "Không tìm thấy lời mời.");
  return transaction(async (tx) => {
    const job = await lockJob(tx, metadata.jobId);
    const invitation = await tx.invitation.findUnique({ where: { id } });
    assert(invitation, 404, "Không tìm thấy lời mời.");
    assertOwner(invitation.kolId, user.id);
    assert(invitation.status === "PENDING", 409, "Lời mời đã được xử lý.");
    if (status === "ACCEPTED") {
      assertOpenJob(job);
      await confirmParticipant(tx, job, user.id, "INVITATION");
    }
    const result = await tx.invitation.update({ where: { id }, data: { status } });
    await notify(tx, job.organizerId, "INVITATION_STATUS", status === "ACCEPTED" ? "KOL chấp nhận lời mời" : "KOL từ chối lời mời", `${user.name} đã phản hồi lời mời cho ${job.title}.`, "/organizer/invitations");
    return result;
  });
}
