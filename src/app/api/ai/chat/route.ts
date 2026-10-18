import { currentActor } from "@/lib/auth/session";
import { api, jsonBody } from "@/lib/http";
import { consumeAiLimit } from "@/lib/ai/rate-limit";
import { chatAssistant } from "@/services/ai-assistant";

export const POST = api(async (request) => {
  const actor = await currentActor();
  consumeAiLimit(actor ? `user:${actor.id}` : `guest:${(request.headers.get("x-forwarded-for") ?? "anonymous").split(",")[0].trim().slice(0, 100)}`);
  return chatAssistant(actor, await jsonBody(request));
}, true);
