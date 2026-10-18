import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { invitations, inviteKol } from "@/services/collaborations";
export const GET = api(async () => invitations(await currentActor()));
export const POST = api(async (r) => inviteKol(await currentActor(), await jsonBody(r)), true);
