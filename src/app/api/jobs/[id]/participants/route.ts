import { api } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { participants } from "@/services/jobs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return api(async () => participants(await currentActor(), id), false)(request);
}
