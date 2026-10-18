import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { authorize } from "@/lib/permissions/guards";
import { assert } from "@/lib/errors";
import { activeParticipationCount, activeParticipationFilter } from "@/lib/db/participation";
import { recommendationSchema } from "@/lib/ai/schemas";
import { scoreMatch, type MatchScore } from "@/lib/ai/matching";
import type { Actor } from "@/types";
import { kolPublic, PAGE_SIZE, publicKolWhere, withDemoPortrait } from "@/lib/db/queries";
import { filtersSchema } from "@/lib/validations";
import { mediaSelect } from "@/lib/validations/media";
import { organizationLogo } from "@/lib/demo-assets";

export type Recommendation = MatchScore & { id: string; name: string; category: string; location: string; href: string; detail: string; jobId?: string; organizerName?: string; organizerLogo?: string; benefits?: string; deadline?: string; eventDate?: string };
export type Recommendations = { kind: "jobs" | "kols"; items: Recommendation[]; considered: number; limit: number; generatedAt: string; notice: string; jobTitle?: string };
export const matchJobSelect = { id: true, title: true, category: true, requirements: true, description: true, benefits: true, deadline: true, eventDate: true, location: true, budgetMin: true, budgetMax: true, capacity: true, _count: { select: activeParticipationCount }, organizer: { select: { name: true, organizer: { select: { companyName: true } }, media: { where: { slot: { not: null }, target: "LOGO" }, select: mediaSelect } } } } as const;
export const matchProfileSelect = { category: true, skills: true, bio: true, experienceYears: true, location: true } as const;
export function recruitingWhere(now = new Date()): Prisma.JobWhereInput { return { moderation: "APPROVED", status: "OPEN", completedAt: null, deadline: { gt: now }, eventDate: { gt: now }, organizer: { active: true } }; }
const limit = 200;
const notice = "Điểm do hệ thống tính theo trọng số dữ liệu khả dụng, không phải xác suất được tuyển. Tiêu chí thiếu dữ liệu được bỏ khỏi mẫu số. Tối đa 200 ứng viên gần nhất mỗi lần đánh giá.";
export async function recommendations(actor: Actor | null, input: unknown = {}): Promise<Recommendations> {
  const user = await authorize(actor, ["KOL", "ORGANIZER"]);
  const preferences = recommendationSchema.parse(input);
  let items: Recommendation[];
  let considered = 0;
  let jobTitle: string | undefined;
  if (user.role === "KOL") {
    assert(!preferences.jobId, 422, "KOL nhận gợi ý job từ hồ sơ của chính mình.");
    const profile = await db.kolProfile.findUnique({ where: { userId: user.id }, select: matchProfileSelect });
    assert(profile, 409, "Hoàn thiện hồ sơ KOL trước khi nhận gợi ý.");
    const jobs = await db.job.findMany({
      where: { ...recruitingWhere(),
        budgetMax: { gte: preferences.minBudget }, budgetMin: { lte: preferences.maxBudget },
        participations: { none: { kolId: user.id, ...activeParticipationFilter } },
        applications: { none: { kolId: user.id, status: { not: "WITHDRAWN" } } },
        invitations: { none: { kolId: user.id, status: { in: ["PENDING", "ACCEPTED"] } } },
      }, select: matchJobSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: limit,
    });
    const available = jobs.filter((job) => job._count.participations < job.capacity);
    considered = available.length;
    items = available.map((job) => ({ ...scoreMatch(profile, job, preferences), id: job.id, name: job.title, category: job.category, location: job.location, href: `/jobs/${job.id}`, detail: `${job.budgetMin.toLocaleString("vi-VN")} – ${job.budgetMax.toLocaleString("vi-VN")} đ`,
      organizerName: job.organizer?.organizer?.companyName ?? job.organizer?.name,
      organizerLogo: job.organizer?.media[0]?.url ?? organizationLogo(job.organizer?.organizer?.companyName),
      benefits: job.benefits, deadline: job.deadline?.toISOString(), eventDate: job.eventDate?.toISOString(),
    }));
  } else {
    assert(preferences.jobId, 422, "Chọn job để tìm KOL phù hợp.");
    const job = await db.job.findFirst({ where: { id: preferences.jobId, organizerId: user.id, ...recruitingWhere() }, select: matchJobSelect });
    assert(job, 404, "Job không thuộc bạn hoặc chưa được duyệt / đã đóng tuyển.");
    assert(job._count.participations < job.capacity, 409, "Job đã đủ số lượng KOL.");
    const profiles = await db.kolProfile.findMany({ where: { isPublic: true, user: { active: true, role: "KOL",
      participations: { none: { jobId: job.id, ...activeParticipationFilter } },
      invitations: { none: { jobId: job.id, status: { in: ["PENDING", "ACCEPTED"] } } },
    } }, select: { ...matchProfileSelect, userId: true, user: { select: { name: true } } }, orderBy: [{ user: { createdAt: "desc" } }, { userId: "asc" }], take: limit });
    considered = profiles.length;
    jobTitle = job.title;
    // KOL profiles do not contain quoted fees. Organizer budget is displayed, not inferred.
    items = profiles.map((profile) => ({ ...scoreMatch(profile, job), id: profile.userId, jobId: job.id, name: profile.user.name, category: profile.category, location: profile.location, href: `/kols/${profile.userId}`, detail: `${profile.experienceYears} năm kinh nghiệm` }));
  }
  items.sort((a, b) => b.score - a.score || b.assessedWeight - a.assessedWeight || a.id.localeCompare(b.id));
  return { kind: user.role === "KOL" ? "jobs" : "kols", items: items.slice(0, 8), considered, limit, generatedAt: new Date().toISOString(), notice, jobTitle };
}

export async function organizerMatchJobs(actor: Actor | null) {
  const user = await authorize(actor, ["ORGANIZER"]);
  const jobs = await db.job.findMany({ where: { ...recruitingWhere(), organizerId: user.id }, select: { id: true, title: true, category: true, capacity: true, _count: { select: activeParticipationCount } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 200 });
  return jobs.filter((job) => job._count.participations < job.capacity);
}

export async function matchedKolCatalog(actor: Actor | null, jobId: string, input: unknown = {}) {
  const user = await authorize(actor, ["ORGANIZER"]);
  const { jobId: validatedJobId } = recommendationSchema.parse({ jobId });
  const filters = filtersSchema.parse(input);
  const job = await db.job.findFirst({ where: { id: validatedJobId, organizerId: user.id, ...recruitingWhere() }, select: matchJobSelect });
  assert(job, 404, "Job không thuộc bạn hoặc không còn tuyển.");
  assert(job._count.participations < job.capacity, 409, "Job đã đủ số lượng KOL.");
  const publicWhere = publicKolWhere(filters);
  const profiles = await db.kolProfile.findMany({ where: { ...publicWhere, user: { ...(publicWhere.user as Prisma.UserWhereInput),
    participations: { none: { jobId: job.id, ...activeParticipationFilter } }, invitations: { none: { jobId: job.id, status: { in: ["PENDING", "ACCEPTED"] } } },
  } }, select: kolPublic, orderBy: [{ user: { createdAt: "desc" } }, { userId: "asc" }], take: limit });
  const ranked = profiles.map((profile) => ({ ...withDemoPortrait(profile), match: scoreMatch(profile, job), matchJobId: job.id }));
  ranked.sort((a, b) => b.match.score - a.match.score || b.match.assessedWeight - a.match.assessedWeight || a.user.id.localeCompare(b.user.id));
  return { items: ranked.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE), total: ranked.length, page: filters.page, pages: Math.max(1, Math.ceil(ranked.length / PAGE_SIZE)), limit, jobTitle: job.title };
}
