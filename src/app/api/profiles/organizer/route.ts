import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { ownProfile, updateOrganizerProfile } from "@/services/profiles";
import { authorize } from "@/lib/permissions/guards";
export const GET = api(async () =>
  ownProfile(await authorize(await currentActor(), ["ORGANIZER"])),
);
export const PATCH = api(
  async (r) => updateOrganizerProfile(await currentActor(), await jsonBody(r)),
  true,
);
