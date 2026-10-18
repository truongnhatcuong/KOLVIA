import { lockJob } from "@/lib/db/recruitment";
import { db } from "@/lib/db/client";
import { authorize, assertOwner } from "@/lib/permissions/guards";
import { assert, AppError } from "@/lib/errors";
import { uploadInputSchema, mediaSelect, type UploadInput } from "@/lib/validations/media";
import type { Actor } from "@/types";

export type UploadReceipt = { key: string; url: string; name: string; size: number };
function validateReceipt(file: UploadReceipt) {
  let url: URL;
  try {
    url = new URL(file.url);
  } catch {
    throw new AppError(422, "Địa chỉ ảnh không hợp lệ.");
  }
  assert(
    url.protocol === "https:" &&
      (url.hostname === "ufs.sh" || url.hostname.endsWith(".ufs.sh")) &&
      !url.username &&
      !url.password &&
      !url.port,
    422,
    "Địa chỉ ảnh không hợp lệ.",
  );
  assert(
    Number.isSafeInteger(file.size) && file.size > 0 && file.size <= 4 * 1024 * 1024,
    422,
    "Ảnh cần nhỏ hơn hoặc bằng 4 MB.",
  );
  assert(file.key.length > 0 && file.key.length <= 512, 422, "Mã ảnh không hợp lệ.");
}

export async function uploadPermission(actor: Actor | null, value: unknown, checkCapacity = true) {
  const user = await authorize(actor, ["KOL", "ORGANIZER"]);
  const input = uploadInputSchema.parse(value);
  assert(
    user.role === "KOL"
      ? ["AVATAR", "COVER", "PORTFOLIO"].includes(input.target)
      : ["AVATAR", "COVER", "LOGO", "JOB_COVER"].includes(input.target),
    403,
    "Bạn không có quyền tải loại ảnh này.",
  );
  if (input.jobId) {
    const job = await db.job.findUnique({ where: { id: input.jobId } });
    assert(job, 404, "Không tìm thấy Job.");
    assertOwner(job.organizerId, user.id);
    assert(!["ARCHIVED", "COMPLETED"].includes(job.status) && !job.completedAt, 409, "Job đã lưu trữ không thể thay đổi ảnh.");
  }
  if (checkCapacity && input.target === "PORTFOLIO") {
    const count = await db.mediaAsset.count({
      where: { ownerId: user.id, target: "PORTFOLIO", slot: { not: null } },
    });
    assert(count < 6, 409, "Portfolio chứa tối đa 6 ảnh. Xóa một ảnh trước khi tải thêm.");
  }
  return { ownerId: user.id, role: user.role, input };
}

// Called exclusively from UploadThing's signed completion callback. Never accept URLs from a public mutation.
export async function recordUpload(
  metadata: { ownerId: string; input: UploadInput },
  file: UploadReceipt,
) {
  const actor = await db.user.findUnique({ where: { id: metadata.ownerId } });
  await uploadPermission(actor, metadata.input, false);
  validateReceipt(file);
  const slot = `${metadata.ownerId}:${metadata.input.target}:${metadata.input.jobId ?? (metadata.input.target === "PORTFOLIO" ? file.key : "profile")}`;
  return db.$transaction(async (tx) => {
    const owner = await tx.user.findUnique({ where: { id: metadata.ownerId } });
    assert(owner?.active && owner.role === actor?.role, 401, "Tài khoản không còn hoạt động.");
    if (metadata.input.jobId) {
      const job = await lockJob(tx, metadata.input.jobId);
      assertOwner(job.organizerId, metadata.ownerId);
      assert(!["ARCHIVED", "COMPLETED"].includes(job.status) && !job.completedAt, 409, "Job đã lưu trữ.");
    }
    const existing = await tx.mediaAsset.findUnique({ where: { key: file.key } });
    if (existing) {
      assertOwner(existing.ownerId, metadata.ownerId);
      assert(existing.slot, 409, "Ảnh đã được xóa hoặc thay thế.");
      assert(
        existing.target === metadata.input.target &&
          existing.jobId === (metadata.input.jobId ?? null),
        409,
        "Ảnh đã được sử dụng.",
      );
      return { id: existing.id, url: existing.url, name: existing.name, target: existing.target };
    }
    if (metadata.input.target === "PORTFOLIO") {
      const count = await tx.mediaAsset.count({
        where: { ownerId: metadata.ownerId, target: "PORTFOLIO", slot: { not: null } },
      });
      assert(count < 6, 409, "Portfolio chứa tối đa 6 ảnh.");
    }
    await tx.mediaAsset.updateMany({ where: { slot }, data: { slot: null } });
    if (metadata.input.jobId) {
      // A new cover changes the published listing and must be reviewed like other edits.
      await tx.job.updateMany({
        where: { id: metadata.input.jobId, moderation: "APPROVED" },
        data: { moderation: "PENDING", moderationNote: "" },
      });
    }
    return tx.mediaAsset.create({
      data: {
        ownerId: metadata.ownerId,
        jobId: metadata.input.jobId,
        target: metadata.input.target,
        slot,
        key: file.key,
        url: file.url,
        name: file.name.slice(0, 255),
        size: file.size,
      },
      select: mediaSelect,
    });
  });
}
export async function ownMedia(actor: Actor | null, jobId?: string) {
  const user = await authorize(actor, ["KOL", "ORGANIZER"]);
  if (jobId) {
    const job = await db.job.findUnique({ where: { id: jobId } });
    assert(job, 404, "Không tìm thấy Job.");
    assertOwner(job.organizerId, user.id);
  }
  return db.mediaAsset.findMany({
    where: { ownerId: user.id, slot: { not: null }, jobId: jobId ?? null },
    select: mediaSelect,
    orderBy: { createdAt: "desc" },
  });
}
export async function detachMedia(actor: Actor | null, id: string) {
  const user = await authorize(actor, ["KOL", "ORGANIZER"]);
  return db.$transaction(async (tx) => {
    const owner = await tx.user.findUnique({ where: { id: user.id } });
    assert(owner?.active && owner.role === user.role, 401, "Tài khoản không còn hoạt động.");
    const asset = await tx.mediaAsset.findUnique({ where: { id } });
    assert(asset, 404, "Không tìm thấy ảnh.");
    assertOwner(asset.ownerId, user.id);
    // Repeating a removal must not change moderation of the replacement cover.
    if (!asset.slot) return asset;
    if (asset.jobId) {
      await lockJob(tx, asset.jobId);
      const job = await tx.job.findUnique({ where: { id: asset.jobId } });
      assert(job, 404, "Không tìm thấy Job.");
      assertOwner(job.organizerId, user.id);
      assert(!["ARCHIVED", "COMPLETED"].includes(job.status) && !job.completedAt, 409, "Ảnh của Job đã lưu trữ không thể sửa.");
    }
    await tx.mediaAsset.update({ where: { id }, data: { slot: null } });
    if (asset.jobId)
      await tx.job.updateMany({
        where: { id: asset.jobId, moderation: "APPROVED" },
        data: { moderation: "PENDING", moderationNote: "" },
      });
    return asset;
  });
}

// Signed callbacks may fail after a file reaches the CDN (e.g. a user was locked).
// Keep the receipt out of public slots so a failed CDN deletion can be retried.
export async function queueUnusedUpload(
  metadata: { ownerId: string; input: UploadInput },
  file: UploadReceipt,
) {
  const input = uploadInputSchema.parse(metadata.input);
  validateReceipt(file);
  return db.$transaction(async (tx) => {
    const existing = await tx.mediaAsset.findUnique({ where: { key: file.key } });
    if (existing) {
      assertOwner(existing.ownerId, metadata.ownerId);
      return existing;
    }
    const owner = await tx.user.findUnique({ where: { id: metadata.ownerId } });
    if (!owner) return null;
    const job = input.jobId
      ? await tx.job.findFirst({
          where: { id: input.jobId, organizerId: owner.id },
          select: { id: true },
        })
      : null;
    return tx.mediaAsset.create({
      data: {
        ownerId: owner.id,
        jobId: job?.id,
        target: input.target,
        slot: null,
        key: file.key,
        url: file.url,
        name: file.name.slice(0, 255),
        size: file.size,
      },
    });
  });
}

export async function cleanupUnusedMedia(
  ownerId: string,
  deleteFile: (key: string) => Promise<boolean>,
) {
  const assets = await db.mediaAsset.findMany({
    where: { ownerId, slot: null, deletedAt: null },
    select: { id: true, key: true },
  });
  let deleted = 0;
  for (const asset of assets) {
    try {
      if (await deleteFile(asset.key)) {
        const result = await db.mediaAsset.updateMany({
          where: { id: asset.id, ownerId, slot: null, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        deleted += result.count;
      }
    } catch {
      /* Keep this receipt and continue cleaning the remaining files. */
    }
  }
  return {
    deleted,
    pending: await db.mediaAsset.count({ where: { ownerId, slot: null, deletedAt: null } }),
  };
}
