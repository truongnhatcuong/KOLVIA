import { api, jsonBody } from "@/lib/http";
import { createSession } from "@/lib/auth/session";
import { register } from "@/services/auth";
export const POST = api(async (r) => {
  const user = await register(await jsonBody(r));
  await createSession(user.id);
  return user;
}, true);
