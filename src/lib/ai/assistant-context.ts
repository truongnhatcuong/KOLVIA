import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { assert } from "@/lib/errors";
import type { Actor } from "@/types";

const schema = z.object({ version: z.literal(1), expiresAt: z.number(), selectedJobId: z.string().max(100).optional(), jobChoices: z.array(z.string().min(1).max(100)).max(200).default([]), shownKolIds: z.array(z.string().min(1).max(100)).max(200).default([]) }).strict();
export type AssistantContext = z.infer<typeof schema>;
const lifetime = 30 * 60 * 1000;
function signature(actor: Actor, payload: string) {
  const secret = process.env.API_KEY_AI || process.env.GEMINI_API_KEY;
  assert(secret, 503, "Trợ lý AI chưa được cấu hình.");
  return createHmac("sha256", secret).update(JSON.stringify(["kolvia-chat-context-v1", actor.id, actor.role, payload])).digest();
}
export function signAssistantContext(actor: Actor, state: Pick<AssistantContext, "selectedJobId" | "jobChoices"> & { shownKolIds?: string[] }, now = Date.now()) {
  const context = schema.parse({ ...state, version: 1, expiresAt: now + lifetime });
  const payload = Buffer.from(JSON.stringify(context)).toString("base64url");
  return `${payload}.${signature(actor, payload).toString("base64url")}`;
}
export function readAssistantContext(actor: Actor, token: string | undefined, now = Date.now()): AssistantContext | null {
  if (!token || token.length > 12000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  const [payload, signed] = token.split(".");
  const expected = signature(actor, payload);
  const received = Buffer.from(signed, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const result = schema.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    return result.success && result.data.expiresAt > now ? result.data : null;
  } catch { return null; }
}
