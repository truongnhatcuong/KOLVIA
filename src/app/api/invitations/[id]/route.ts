import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { respondInvitation } from "@/services/collaborations";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return api(
    async (r) => respondInvitation(await currentActor(), id, await jsonBody(r)),
    true,
  )(request);
}
