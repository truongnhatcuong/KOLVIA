import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { setUserActive } from "@/services/admin";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return api(
    async (r) => setUserActive(await currentActor(), id, await jsonBody(r)),
    true,
  )(request);
}
