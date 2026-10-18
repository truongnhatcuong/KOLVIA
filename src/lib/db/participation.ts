import type { Prisma } from "@prisma/client";
export const activeParticipationStatuses = ["CONFIRMED", "WITHDRAWAL_PENDING", "WITHDRAWAL_REJECTED"] as const;
export const activeParticipationFilter: Prisma.ParticipationWhereInput = {
  status: { in: [...activeParticipationStatuses] },
};
export const activeParticipationCount = { participations: { where: activeParticipationFilter } } as const;
export function isActiveParticipation(status: string) {
  return (activeParticipationStatuses as readonly string[]).includes(status);
}
