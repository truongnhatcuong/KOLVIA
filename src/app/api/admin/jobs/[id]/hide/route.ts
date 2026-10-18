import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { hideJob } from "@/services/admin";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return api(async (r) => hideJob(await currentActor(), id, await jsonBody(r)), true)(request);
}
