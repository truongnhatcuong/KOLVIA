import { UTApi } from "uploadthing/server";
import { cleanupUnusedMedia } from "@/services/media";

export async function cleanUnusedMedia(ownerId: string) {
  let utapi: UTApi | undefined;
  return cleanupUnusedMedia(ownerId, async (key) => {
    utapi ??= new UTApi();
    return (await utapi.deleteFiles(key)).success;
  });
}
