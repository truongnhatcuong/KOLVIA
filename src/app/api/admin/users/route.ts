import { api } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { adminUsers } from "@/services/admin";
export const GET = api(async () => adminUsers(await currentActor()));
