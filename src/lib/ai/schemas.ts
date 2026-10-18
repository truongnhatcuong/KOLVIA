import { z } from "zod";
import { categories } from "@/types";

const optionalText = z.string().trim().max(120).optional();
export const budgetFields = { minBudget: z.number().int().min(0).max(2_000_000_000).optional(), maxBudget: z.number().int().min(0).max(2_000_000_000).optional() };
export const recommendationSchema = z.object({ jobId: z.string().min(1).max(100).optional(), ...budgetFields }).strict().refine((data) => data.minBudget === undefined || data.maxBudget === undefined || data.minBudget <= data.maxBudget, "Thù lao tối thiểu phải nhỏ hơn hoặc bằng tối đa.");
export const searchToolSchema = z.object({ category: z.enum(categories).optional(), location: optionalText, q: optionalText, ...budgetFields }).strict().refine((data) => data.minBudget === undefined || data.maxBudget === undefined || data.minBudget <= data.maxBudget, "Khoảng thù lao không hợp lệ.");
export const chatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1000) }).strict()).max(6).default([]),
  contextToken: z.string().max(12000).optional(),
  action: z.object({ type: z.literal("select_job"), jobId: z.string().min(1).max(100) }).strict().optional(),
}).strict();
export const jobToolSchema = z.object({ jobId: z.string().min(1).max(100).optional() }).strict();
export const emptyToolSchema = z.object({}).strict();
export const helpToolSchema = z.object({ topic: z.enum(["about", "jobs", "profile", "apply", "invitations", "withdrawals", "login", "unsupported"]) }).strict();
