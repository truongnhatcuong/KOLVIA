import type { Prisma } from "@prisma/client";
import { assert } from "@/lib/errors";
import { activeParticipationCount, isActiveParticipation } from "./participation";

// An UPDATE takes a row lock until the enclosing transaction commits. All seat
// decisions and capacity changes lock this same Job before counting participants.
export async function lockJob(tx: Prisma.TransactionClient, id: string) {
  const locked = await tx.job.updateMany({ where: { id }, data: { recruitmentVersion: { increment: 1 } } });
  assert(locked.count === 1, 404, "Không tìm thấy Job.");
  const job = await tx.job.findUniqueOrThrow({
    where: { id },
    include: { organizer: { select: { active: true } }, _count: { select: activeParticipationCount } },
  });
  return job;
}

export function assertOpenJob(job: Awaited<ReturnType<typeof lockJob>>) {
  assert(job.organizer.active && job.moderation === "APPROVED" && job.status === "OPEN" && !job.completedAt && job.deadline > new Date(), 409, "Job chưa được duyệt, đã đóng, hoàn thành hoặc hết hạn.");
}

export async function confirmParticipant(tx: Prisma.TransactionClient, job: Awaited<ReturnType<typeof lockJob>>, kolId: string, source: "APPLICATION" | "INVITATION") {
  const existing = await tx.participation.findUnique({ where: { jobId_kolId: { jobId: job.id, kolId } } });
  if (existing && isActiveParticipation(existing.status)) return existing;
  assert(job._count.participations < job.capacity, 409, "Job đã đủ số lượng KOL được tuyển.");
  return existing
    ? tx.participation.update({ where: { id: existing.id }, data: { status: "CONFIRMED", leftAt: null, confirmedAt: new Date(), source } })
    : tx.participation.create({ data: { jobId: job.id, kolId, source } });
}
