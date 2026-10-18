import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { applications, applyToJob } from "@/services/collaborations";
export const GET = api(async () => applications(await currentActor()));
export const POST = api(async (r) => applyToJob(await currentActor(), await jsonBody(r)), true);
