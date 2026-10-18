import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { publicJob } from "@/lib/db/queries";
import { updateJob, deleteJob, ownJob } from "@/services/jobs";
import { assert } from "@/lib/errors";
import { db } from "@/lib/db/client";
import { cleanUnusedMedia } from "@/lib/uploadthing/server";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return api(async (r) => {
    if (new URL(r.url).searchParams.get("scope") === "mine")
      return ownJob(await currentActor(), id);
    const job = await publicJob(id);
    assert(job, 404, "Không tìm thấy Job công khai.");
    return job;
  }, false)(request);
}
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return api(async (r) => updateJob(await currentActor(), id, await jsonBody(r)), true)(request);
}
export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return api(async () => {
    const actor = await currentActor();
    const owner = await db.job.findUnique({ where: { id }, select: { organizerId: true } });
    const result = await deleteJob(actor, id);
    if (!result.archived && owner && process.env.UPLOADTHING_TOKEN)
      await cleanUnusedMedia(owner.organizerId).catch(() =>
        console.error("Media cleanup deferred"),
      );
    return result;
  }, true)(request);
}
