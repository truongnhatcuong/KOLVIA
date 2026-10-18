import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { deleteJob, setJobStatus } from "@/services/jobs";
import { authorize } from "@/lib/permissions/guards";
import { db } from "@/lib/db/client";
import { cleanUnusedMedia } from "@/lib/uploadthing/server";
type Context = { params: Promise<{ id: string }> };
export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return api(async () => {
    const actor = await authorize(await currentActor(), ["ADMIN"]);
    const owner = await db.job.findUnique({ where: { id }, select: { organizerId: true } });
    const result = await deleteJob(actor, id);
    if (!result.archived && owner && process.env.UPLOADTHING_TOKEN)
      await cleanUnusedMedia(owner.organizerId).catch(() =>
        console.error("Media cleanup deferred"),
      );
    return result;
  }, true)(request);
}
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return api(
    async (r) =>
      setJobStatus(await authorize(await currentActor(), ["ADMIN"]), id, await jsonBody(r)),
    true,
  )(request);
}
