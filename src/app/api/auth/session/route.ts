import { api } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
export const GET = api(async () => currentActor());
