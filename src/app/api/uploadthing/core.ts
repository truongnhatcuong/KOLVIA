import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";
import { currentActor } from "@/lib/auth/session";
import { checkOrigin } from "@/lib/http";
import { uploadInputSchema } from "@/lib/validations/media";
import { uploadPermission, recordUpload, queueUnusedUpload } from "@/services/media";
import { cleanUnusedMedia } from "@/lib/uploadthing/server";
import { AppError } from "@/lib/errors";

const f = createUploadthing();
export const uploadRouter = {
  imageUploader: f(
    {
      "image/jpeg": { maxFileSize: "4MB", maxFileCount: 1 },
      "image/png": { maxFileSize: "4MB", maxFileCount: 1 },
      "image/webp": { maxFileSize: "4MB", maxFileCount: 1 },
    },
    { awaitServerData: true },
  )
    .input(uploadInputSchema)
    .middleware(async ({ req, input, files }) => {
      try {
        checkOrigin(req);
        if (files.length !== 1) throw new Error("Chọn một ảnh mỗi lần tải.");
        if (!["image/jpeg", "image/png", "image/webp"].includes(files[0].type))
          throw new Error("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
        if (files[0].size <= 0 || files[0].size > 4 * 1024 * 1024)
          throw new Error("Ảnh cần nhỏ hơn hoặc bằng 4 MB.");
        if (!process.env.UPLOADTHING_TOKEN) throw new Error("UploadThing chưa được cấu hình.");
        return await uploadPermission(await currentActor(), input);
      } catch (error) {
        throw new UploadThingError({
          code:
            error instanceof AppError && [401, 403].includes(error.status)
              ? "FORBIDDEN"
              : "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Không được phép tải ảnh.",
        });
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      let asset;
      try {
        asset = await recordUpload(metadata, {
          key: file.key,
          url: file.ufsUrl,
          name: file.name,
          size: file.size,
        });
      } catch (error) {
        try {
          const unused = await queueUnusedUpload(metadata, {
            key: file.key,
            url: file.ufsUrl,
            name: file.name,
            size: file.size,
          });
          if (!unused) await new UTApi().deleteFiles(file.key);
          else if (!unused.slot) await cleanUnusedMedia(unused.ownerId);
        } catch {
          console.error("Rejected upload cleanup deferred");
        }
        return {
          asset: null,
          error: error instanceof AppError ? error.message : "Không thể lưu ảnh. Vui lòng thử lại.",
        };
      }
      await cleanUnusedMedia(metadata.ownerId).catch(() => console.error("Media cleanup deferred"));
      return { asset, error: null };
    }),
} satisfies FileRouter;
export type UploadRouter = typeof uploadRouter;
