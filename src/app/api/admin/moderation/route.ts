import { api } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { adminJobs } from "@/services/admin";
export const GET = api(async () => adminJobs(await currentActor(), true));
