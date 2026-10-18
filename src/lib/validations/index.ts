import { z } from "zod";
import { categories } from "@/types";

const text = (min: number, max: number) =>
  z.string().trim().min(min, `Nhập ít nhất ${min} ký tự.`).max(max, `Tối đa ${max} ký tự.`);
const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Email không hợp lệ."));
const password = z.string().min(10, "Mật khẩu cần ít nhất 10 ký tự.").max(128);
export const registerSchema = z
  .object({ name: text(2, 100), email, password, role: z.enum(["KOL", "ORGANIZER"]) })
  .strict();
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại.").max(128),
  newPassword: password,
  confirmPassword: z.string().min(1, "Nhập lại mật khẩu mới.").max(128),
}).strict()
  .refine((data) => data.newPassword === data.confirmPassword, { path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp." })
  .refine((data) => data.currentPassword !== data.newPassword, { path: ["newPassword"], message: "Mật khẩu mới phải khác mật khẩu hiện tại." });

export function isSocialUrl(value: string, platform: "TIKTOK" | "FACEBOOK" | "INSTAGRAM" | "YOUTUBE") {
  try {
    const u = new URL(value);
    const hosts = {
      TIKTOK: ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
      FACEBOOK: ["facebook.com", "www.facebook.com", "web.facebook.com", "m.facebook.com", "fb.watch"],
      INSTAGRAM: ["instagram.com", "www.instagram.com"],
      YOUTUBE: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"],
    }[platform];
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      hosts.includes(u.hostname) &&
      u.pathname !== "/"
    );
  } catch {
    return false;
  }
}
const social = (platform: "TIKTOK" | "FACEBOOK" | "INSTAGRAM" | "YOUTUBE") =>
  z
    .string()
    .trim()
    .max(1000)
    .refine((v) => !v || isSocialUrl(v, platform), "Nhập URL HTTPS đúng tên miền mạng xã hội.")
    .default("");
export const kolProfileSchema = z
  .object({
    name: text(2, 100),
    bio: text(0, 2000),
    category: z.enum(categories),
    location: text(0, 150),
    skills: text(0, 1000).default(""),
    experienceYears: z.number().int().min(0).max(60).default(0),
    isPublic: z.boolean(),
    tiktokUrl: social("TIKTOK"),
    facebookUrl: social("FACEBOOK"),
    instagramUrl: social("INSTAGRAM"),
    youtubeUrl: social("YOUTUBE"),
    tiktokPost: social("TIKTOK"),
    facebookPost: social("FACEBOOK"),
    youtubePost: social("YOUTUBE"),
  })
  .strict();
export const organizerProfileSchema = z
  .object({
    name: text(2, 100),
    companyName: text(2, 150),
    description: text(0, 2000),
    location: text(0, 150),
    website: z
      .string()
      .trim()
      .max(1000)
      .refine((v) => {
        if (!v) return true;
        try {
          const u = new URL(v);
          return u.protocol === "https:" && !u.username && !u.password;
        } catch {
          return false;
        }
      }, "Website cần là URL HTTPS hợp lệ."),
  })
  .strict();
const date = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Ngày không hợp lệ.")
  .transform((v) => new Date(v));
export const jobSchema = z
  .object({
    title: text(5, 150),
    description: text(20, 10000),
    requirements: text(10, 5000),
    benefits: text(0, 5000).default(""),
    capacity: z.number().int().min(1).max(1000).default(10),
    category: z.enum(categories),
    location: text(2, 150),
    budgetMin: z.number().int().min(0).max(1000000000),
    budgetMax: z.number().int().min(0).max(1000000000),
    deadline: date,
    eventDate: date,
  })
  .strict()
  .refine((d) => d.budgetMax >= d.budgetMin, {
    message: "Ngân sách tối đa phải lớn hơn hoặc bằng tối thiểu.",
    path: ["budgetMax"],
  })
  .refine((d) => d.deadline > new Date(), {
    message: "Hạn ứng tuyển phải nằm trong tương lai.",
    path: ["deadline"],
  })
  .refine((d) => d.eventDate >= d.deadline, {
    message: "Ngày sự kiện phải sau hạn ứng tuyển.",
    path: ["eventDate"],
  });
export const applicationSchema = z
  .object({ jobId: text(1, 100), message: text(10, 2000) })
  .strict();
export const applicationDecisionSchema = z
  .object({ status: z.enum(["ACCEPTED", "REJECTED", "WITHDRAWN"]) })
  .strict();
export const invitationSchema = z
  .object({ jobId: text(1, 100), kolId: text(1, 100), message: text(10, 2000) })
  .strict();
export const invitationDecisionSchema = z
  .object({ status: z.enum(["ACCEPTED", "DECLINED"]) })
  .strict();
export const jobStatusSchema = z.object({ status: z.enum(["OPEN", "CLOSED", "COMPLETED"]) }).strict();
export const withdrawalRequestSchema = z.object({ participationId: text(1, 100), reason: text(5, 2000) }).strict();
export const withdrawalDecisionSchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]), note: text(0, 2000).default("") }).strict()
  .refine((value) => value.status !== "REJECTED" || value.note.length >= 5, { path: ["note"], message: "Nhập lý do từ chối (ít nhất 5 ký tự)." });
export const withdrawalDepartureSchema = z.object({ confirm: z.literal(true) }).strict();
export const moderationSchema = z
  .object({ moderation: z.enum(["APPROVED", "REJECTED"]), note: text(0, 2000) })
  .strict()
  .refine((d) => d.moderation !== "REJECTED" || d.note.length >= 5, {
    message: "Nhập lý do từ chối (ít nhất 5 ký tự).",
    path: ["note"],
  });
export const userStatusSchema = z.object({ active: z.boolean() }).strict();
const calendarDate = z.string().refine((value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}, "Ngày không hợp lệ.").default("");
export const filtersSchema = z.object({
  q: z.string().trim().max(100).default(""),
  category: z.enum(categories).or(z.literal("")).default(""),
  location: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  minBudget: z.coerce.number().int().min(0).max(1000000000).default(0),
  maxBudget: z.preprocess((v) => v === "" ? undefined : v, z.coerce.number().int().min(0).max(1000000000).default(1000000000)),
  skills: z.string().trim().max(100).default(""),
  minExperience: z.coerce.number().int().min(0).max(60).default(0),
  eventFrom: calendarDate,
  eventTo: calendarDate,
  sort: z.enum(["newest", "name", "deadline", "budget"]).default("newest"),
  platform: z.enum(["", "TIKTOK", "FACEBOOK", "INSTAGRAM", "YOUTUBE"]).default(""),
}).refine((f) => f.maxBudget >= f.minBudget, { message: "Thù lao tối đa phải lớn hơn hoặc bằng tối thiểu.", path: ["maxBudget"] })
  .refine((f) => !f.eventFrom || !f.eventTo || f.eventFrom <= f.eventTo, { message: "Ngày kết thúc phải sau ngày bắt đầu.", path: ["eventTo"] });

export const jobManagementFiltersSchema = z.object({
  q: z.string().trim().max(100).default(""),
  status: z.enum(["", "OPEN", "CLOSED", "ARCHIVED", "COMPLETED"]).default(""),
  moderation: z.enum(["", "DRAFT", "PENDING", "APPROVED", "REJECTED"]).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});

export const notificationActionSchema = z.object({ read: z.literal(true) }).strict();
export const hideJobSchema = z.object({ note: text(5, 2000) }).strict();
