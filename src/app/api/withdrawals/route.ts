import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { requestWithdrawal, withdrawals } from "@/services/withdrawals";
export const GET = api(async () => withdrawals(await currentActor()));
export const POST = api(async (request) => requestWithdrawal(await currentActor(), await jsonBody(request)), true);
