import { api, jsonBody } from "@/lib/http";
import { createSession } from "@/lib/auth/session";
import { login } from "@/services/auth";
export const POST = api(async (r) => {
  const user = await login(await jsonBody(r));
  await createSession(user.id);
  return user;
}, true);
