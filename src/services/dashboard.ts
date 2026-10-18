import { db } from "@/lib/db/client";
import { authorize } from "@/lib/permissions/guards";
import type { Actor } from "@/types";
import { activeParticipationFilter } from "@/lib/db/participation";
export async function confirmedJobs(actor: Actor | null) {
  const user = await authorize(actor, ["KOL"]);
  return db.participation.findMany({
    where: { kolId: user.id },
    select: {
      id: true,
      source: true,
      status: true,
      confirmedAt: true,
      leftAt: true,
      withdrawals: { orderBy: { requestedAt: "desc" }, take: 10 },
      job: {
        select: {
          id: true,
          title: true,
          location: true,
          eventDate: true,
          status: true,
          completedAt: true,
          capacity: true,
          budgetMin: true,
          budgetMax: true,
          organizer: { select: { name: true, organizer: { select: { companyName: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
export async function overview(actor: Actor | null) {
  const user = await authorize(actor, ["KOL", "ORGANIZER"]);
  if (user.role === "KOL") {
    const [applications, pending, invitations, confirmed] = await Promise.all([
      db.application.count({ where: { kolId: user.id } }),
      db.application.count({ where: { kolId: user.id, status: "PENDING" } }),
      db.invitation.count({ where: { kolId: user.id, status: "PENDING" } }),
      db.participation.count({ where: { kolId: user.id, ...activeParticipationFilter } }),
    ]);
    return [
      { label: "Đơn ứng tuyển", value: applications },
      { label: "Đang chờ duyệt", value: pending },
      { label: "Lời mời mới", value: invitations },
      { label: "Hợp tác đã xác nhận", value: confirmed },
    ];
  }
  const [jobs, pending, applications, confirmed] = await Promise.all([
    db.job.count({ where: { organizerId: user.id, status: "OPEN" } }),
    db.job.count({ where: { organizerId: user.id, moderation: "PENDING" } }),
    db.application.count({ where: { job: { organizerId: user.id }, status: "PENDING" } }),
    db.participation.count({ where: { job: { organizerId: user.id }, ...activeParticipationFilter } }),
  ]);
  return [
    { label: "Job đang mở", value: jobs },
    { label: "Job chờ kiểm duyệt", value: pending },
    { label: "Ứng viên chờ duyệt", value: applications },
    { label: "KOL đã xác nhận", value: confirmed },
  ];
}
