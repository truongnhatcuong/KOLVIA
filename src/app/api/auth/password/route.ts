import { cookies } from "next/headers";
import { api, jsonBody } from "@/lib/http";
import { currentActor, SESSION_COOKIE } from "@/lib/auth/session";
import { changePassword } from "@/services/auth";

export const PATCH = api(async (request) => {
  const result = await changePassword(await currentActor(), await jsonBody(request));
  (await cookies()).delete(SESSION_COOKIE);
  return result;
}, true);
