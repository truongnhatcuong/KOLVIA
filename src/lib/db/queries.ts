import type { Prisma } from "@prisma/client";
import { db } from "./client";
import { filtersSchema } from "@/lib/validations";
import { mediaSelect } from "@/lib/validations/media";
import { demoPortrait } from "@/lib/demo-assets";
import { activeParticipationCount, activeParticipationFilter } from "./participation";

export const organizerPublic = {
  name: true,
  media: { where: { slot: { not: null }, target: "LOGO" }, select: mediaSelect },
  organizer: { select: { companyName: true, description: true, location: true, website: true } },
} as const;
export const kolPublic = {
  id: true,
  bio: true,
  category: true,
  location: true,
  skills: true,
  experienceYears: true,
  socialLinks: { select: { id: true, platform: true, kind: true, url: true } },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      media: { where: { slot: { not: null }, jobId: null }, select: mediaSelect },
    },
  },
} as const;
export const jobPublic = {
  id: true,
  status: true,
  moderation: true,
  completedAt: true,
  title: true,
  description: true,
  requirements: true,
  benefits: true,
  capacity: true,
  _count: { select: activeParticipationCount },
  category: true,
  location: true,
  budgetMin: true,
  budgetMax: true,
  deadline: true,
  eventDate: true,
  createdAt: true,
  media: { where: { slot: { not: null } }, select: mediaSelect },
  organizer: { select: organizerPublic },
} as const;
export const PAGE_SIZE = 9;

export function withDemoPortrait<T extends { user: { email: string } }>(kol: T) {
  const { email, ...user } = kol.user;
  return { ...kol, user: { ...user, demoAvatar: demoPortrait(email) } };
}

export async function publicJobs(filters: unknown = {}) {
  const f = filtersSchema.parse(filters);
  const where: Prisma.JobWhereInput = {
    moderation: "APPROVED",
    status: "OPEN",
    completedAt: null,
    deadline: { gt: new Date() },
    organizer: { active: true },
    budgetMax: { gte: f.minBudget },
    budgetMin: { lte: f.maxBudget },
    ...((f.eventFrom || f.eventTo) && { eventDate: { ...(f.eventFrom && { gte: new Date(`${f.eventFrom}T00:00:00+07:00`) }), ...(f.eventTo && { lte: new Date(`${f.eventTo}T23:59:59.999+07:00`) }) } }),
    ...(f.q && { OR: [{ title: { contains: f.q } }, { description: { contains: f.q } }] }),
    ...(f.category && { category: f.category }),
    ...(f.location && { location: { contains: f.location } }),
  };
  const [items, total] = await Promise.all([
    db.job.findMany({
      where,
      select: jobPublic,
      orderBy:
        f.sort === "deadline"
          ? { deadline: "asc" }
          : f.sort === "budget"
            ? { budgetMax: "desc" }
            : f.sort === "name"
              ? { title: "asc" }
              : { createdAt: "desc" },
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.job.count({ where }),
  ]);
  return { items, total, page: f.page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
export async function publicJob(id: string) {
  return db.job.findFirst({
    where: {
      id,
      moderation: "APPROVED",
      status: "OPEN",
      completedAt: null,
      deadline: { gt: new Date() },
      organizer: { active: true },
    },
    select: jobPublic,
  });
}
export function publicKolWhere(filters: unknown = {}): Prisma.KolProfileWhereInput {
  const f = filtersSchema.parse(filters);
  return {
    isPublic: true,
    user: { active: true, role: "KOL", ...(f.q && { name: { contains: f.q } }) },
    ...(f.skills && { skills: { contains: f.skills } }),
    experienceYears: { gte: f.minExperience },
    ...(f.platform && { socialLinks: { some: { platform: f.platform, kind: "CHANNEL" } } }),
    ...(f.category && { category: f.category }),
    ...(f.location && { location: { contains: f.location } }),
  };
}
export async function publicKols(filters: unknown = {}) {
  const f = filtersSchema.parse(filters);
  const where = publicKolWhere(f);
  const [items, total] = await Promise.all([
    db.kolProfile.findMany({
      where,
      select: kolPublic,
      orderBy: f.sort === "name" ? { user: { name: "asc" } } : { user: { createdAt: "desc" } },
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.kolProfile.count({ where }),
  ]);
  return { items: items.map(withDemoPortrait), total, page: f.page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
export async function publicKol(id: string) {
  const kol = await db.kolProfile.findFirst({
    where: { userId: id, isPublic: true, user: { active: true, role: "KOL" } },
    select: kolPublic,
  });
  return kol ? withDemoPortrait(kol) : null;
}
export async function publicStats() {
  const [jobs, kols, organizers, collaborations] = await Promise.all([
    db.job.count({
      where: {
        moderation: "APPROVED",
        status: "OPEN",
        deadline: { gt: new Date() },
        organizer: { active: true },
      },
    }),
    db.kolProfile.count({ where: { isPublic: true, user: { active: true } } }),
    db.user.count({ where: { role: "ORGANIZER", active: true } }),
    db.participation.count({
      where: { ...activeParticipationFilter, kol: { active: true }, job: { organizer: { active: true } } },
    }),
  ]);
  return { jobs, kols, organizers, collaborations };
}
