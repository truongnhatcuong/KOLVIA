import { currentActor } from "@/lib/auth/session";
import { api } from "@/lib/http";
import { recommendations } from "@/services/recommendations";

export const GET = api(async (request) => {
  const params = new URL(request.url).searchParams;
  const input: Record<string, unknown> = Object.fromEntries(params);
  for (const field of ["minBudget", "maxBudget"]) if (input[field] !== undefined) input[field] = Number(input[field]);
  return recommendations(await currentActor(), input);
});
