import { db } from "../src/lib/db/client";
import { cleanUnusedMedia } from "../src/lib/uploadthing/server";
async function main() {
  if (!process.env.UPLOADTHING_TOKEN)
    throw new Error("Set UPLOADTHING_TOKEN before cleaning unused files.");
  const owners = await db.mediaAsset.findMany({
    where: { slot: null, deletedAt: null },
    select: { ownerId: true },
    distinct: ["ownerId"],
  });
  for (const owner of owners) await cleanUnusedMedia(owner.ownerId);
  const remaining = await db.mediaAsset.count({ where: { slot: null, deletedAt: null } });
  console.log(`Cleanup finished. ${remaining} unused file receipts remain for retry.`);
  if (remaining) process.exitCode = 1;
}
main()
  .catch(() => {
    console.error("Media cleanup failed; check token and connectivity.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
