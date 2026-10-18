import { api } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { detachMedia } from "@/services/media";
import { cleanUnusedMedia } from "@/lib/uploadthing/server";
import { assert } from "@/lib/errors";
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assert(process.env.UPLOADTHING_TOKEN, 503, "UploadThing chưa được cấu hình.");
    const { id } = await context.params;
    const asset = await detachMedia(await currentActor(), id);
    await cleanUnusedMedia(asset.ownerId).catch(() => console.error("Media cleanup deferred"));
    return { id };
  }, true)(request);
}
