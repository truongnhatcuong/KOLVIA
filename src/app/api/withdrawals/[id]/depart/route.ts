import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { confirmDeparture } from "@/services/withdrawals";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return api(async (r) => confirmDeparture(await currentActor(), id, await jsonBody(r)), true)(request);
}
