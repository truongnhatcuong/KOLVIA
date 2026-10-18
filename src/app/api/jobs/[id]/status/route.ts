import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { setJobStatus } from "@/services/jobs";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return api(async (r) => setJobStatus(await currentActor(), id, await jsonBody(r)), true)(request);
}
