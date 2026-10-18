import { db } from "@/lib/db/client";
import { authorize } from "@/lib/permissions/guards";
import { kolProfileSchema, organizerProfileSchema } from "@/lib/validations";
import { kolPublic, publicKol } from "@/lib/db/queries";
import { demoPortrait } from "@/lib/demo-assets";
import type { Actor } from "@/types";

export async function ownProfile(actor: Actor | null) {
  const user = await authorize(actor, ["KOL", "ORGANIZER"]);
  return user.role === "KOL"
    ? db.kolProfile.findUnique({ where: { userId: user.id }, include: { socialLinks: true } })
    : db.organizerProfile.findUnique({ where: { userId: user.id } });
}
export async function kolProfileForEdit(actor: Actor | null) {
  const user = await authorize(actor, ["KOL"]);
  return db.kolProfile.findUnique({ where: { userId: user.id }, include: { socialLinks: true } });
}
export async function organizerProfileForEdit(actor: Actor | null) {
  const user = await authorize(actor, ["ORGANIZER"]);
  return db.organizerProfile.findUnique({ where: { userId: user.id } });
}
export async function updateKolProfile(actor: Actor | null, input: unknown) {
  const user = await authorize(actor, ["KOL"]);
  const { name, tiktokUrl, facebookUrl, instagramUrl, youtubeUrl, tiktokPost, facebookPost, youtubePost, ...profile } =
    kolProfileSchema.parse(input);
  const links = [
    { platform: "TIKTOK", kind: "CHANNEL", url: tiktokUrl },
    { platform: "FACEBOOK", kind: "CHANNEL", url: facebookUrl },
    { platform: "INSTAGRAM", kind: "CHANNEL", url: instagramUrl },
    { platform: "YOUTUBE", kind: "CHANNEL", url: youtubeUrl },
    { platform: "TIKTOK", kind: "POST", url: tiktokPost },
    { platform: "FACEBOOK", kind: "POST", url: facebookPost },
    { platform: "YOUTUBE", kind: "POST", url: youtubePost },
  ].filter((l) => l.url);
  return db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { name } });
    return tx.kolProfile.upsert({
      where: { userId: user.id },
      create: { ...profile, userId: user.id, socialLinks: { create: links } },
      update: { ...profile, socialLinks: { deleteMany: {}, create: links } },
      include: { socialLinks: true },
    });
  });
}
export async function updateOrganizerProfile(actor: Actor | null, input: unknown) {
  const user = await authorize(actor, ["ORGANIZER"]);
  const { name, ...profile } = organizerProfileSchema.parse(input);
  return db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { name } });
    return tx.organizerProfile.upsert({
      where: { userId: user.id },
      create: { ...profile, userId: user.id },
      update: profile,
    });
  });
}

export async function kolForViewer(actor: Actor | null, id: string) {
  const published = await publicKol(id);
  if (published || !actor || actor.role === "KOL") return published;
  const organizer = await authorize(actor, ["ORGANIZER", "ADMIN"]);
  const profile = await db.kolProfile.findFirst({
    where: { userId: id, user: { role: "KOL", active: true, ...(organizer.role === "ORGANIZER" && { OR: [{ applications: { some: { job: { organizerId: organizer.id } } } }, { invitations: { some: { job: { organizerId: organizer.id } } } }] }) } },
    select: kolPublic,
  });
  if (!profile) return null;
  const { email, ...user } = profile.user;
  return { ...profile, user: { ...user, demoAvatar: demoPortrait(email) } };
}
