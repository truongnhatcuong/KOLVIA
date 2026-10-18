import { api } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { submitJob } from "@/services/jobs";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  return api(async () => submitJob(await currentActor(), id), true)(request);
}
