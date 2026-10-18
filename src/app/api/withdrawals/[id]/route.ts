import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { decideWithdrawal } from "@/services/withdrawals";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return api(async (r) => decideWithdrawal(await currentActor(), id, await jsonBody(r)), true)(request);
}
