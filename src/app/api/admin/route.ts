import { api } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { adminOverview } from "@/services/admin";
export const GET = api(async () => adminOverview(await currentActor()));
