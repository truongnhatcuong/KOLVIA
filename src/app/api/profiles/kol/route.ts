import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { ownProfile, updateKolProfile } from "@/services/profiles";
import { authorize } from "@/lib/permissions/guards";
export const GET = api(async () => ownProfile(await authorize(await currentActor(), ["KOL"])));
export const PATCH = api(
  async (r) => updateKolProfile(await currentActor(), await jsonBody(r)),
  true,
);
