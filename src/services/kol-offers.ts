import { db } from "@/lib/db/client";
import { authorize } from "@/lib/permissions/guards";
import { matchProfileSelect } from "./recommendations";
import { invitations } from "./collaborations";
import { scoreMatch } from "@/lib/ai/matching";
import type { Actor } from "@/types";

export async function kolInvitationCards(actor: Actor | null) {
  const user = await authorize(actor, ["KOL"]);
  const [items, profile] = await Promise.all([
    invitations(user),
    db.kolProfile.findUnique({ where: { userId: user.id }, select: matchProfileSelect }),
  ]);
  return items.map((item) => ({ ...item, match: profile ? scoreMatch(profile, item.job) : undefined }));
}
