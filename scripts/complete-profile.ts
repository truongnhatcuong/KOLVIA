import { PrismaClient } from "@prisma/client";
import { sampleProfileDetails } from "../prisma/profile-fixtures";
import { isSocialUrl } from "../src/lib/validations";
import { sampleSocialLinks } from "../src/lib/profile-samples";

const db = new PrismaClient();
async function main() {
  const userId = process.argv[2];
  if (!userId || !/^[a-zA-Z0-9_-]{1,100}$/.test(userId)) throw new Error("Chạy npm run profile:complete -- <ID_KOL>.");
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, include: { kol: { include: { socialLinks: true } } } });
    if (!user || user.role !== "KOL" || !user.active) throw new Error("Không tìm thấy tài khoản KOL đang hoạt động.");
    const profile = user.kol;
    const category = profile?.category || "Lifestyle";
    const defaults = sampleProfileDetails(user.name, category);
    // Keep custom details and visibility; only enrich blank or old seeded content.
    const oldBio = profile?.bio ?? "";
    const seededBio = [
      "Kể những câu chuyện đời thường bằng một góc nhìn mới. Tôi yêu những dự án có cá tính và kết nối thật với cộng đồng.",
      "Nhà sáng tạo nội dung demo về công nghệ, trải nghiệm thiết bị và ứng dụng trong cuộc sống.",
      "Nhà sáng tạo nội dung demo về du lịch địa phương, trải nghiệm văn hóa và hành trình khám phá.",
    ];
    const data = {
      bio: !oldBio.trim() || seededBio.includes(oldBio) ? defaults.bio : oldBio,
      category,
      location: profile?.location.trim() ? profile.location : defaults.location,
      skills: !profile?.skills.trim() || profile.skills === "Sáng tạo nội dung, Review sản phẩm, Tham gia sự kiện" ? defaults.skills : profile.skills,
      experienceYears: profile?.experienceYears ?? defaults.experienceYears,
    };
    const updated = await tx.kolProfile.upsert({ where: { userId }, create: { ...data, userId, isPublic: false }, update: data });
    // Derive missing channel links only from posts already saved by the user.
    for (const post of profile?.socialLinks.filter((link) => link.kind === "POST") ?? []) {
      if (post.platform !== "TIKTOK" && post.platform !== "FACEBOOK") continue;
      if (!isSocialUrl(post.url, post.platform)) continue;
      const url = new URL(post.url);
      const channel = post.platform === "TIKTOK"
        ? url.pathname.match(/^\/(@[^/]+)\/video\//)?.[1]
        : url.pathname.match(/^\/([^/]+)\/(?:posts|videos)\//)?.[1];
      if (!channel) continue;
      const channelUrl = `https://www.${post.platform === "TIKTOK" ? "tiktok" : "facebook"}.com/${channel}`;
      await tx.socialLink.upsert({
        where: { profileId_platform_kind: { profileId: updated.id, platform: post.platform, kind: "CHANNEL" } },
        create: { profileId: updated.id, platform: post.platform, kind: "CHANNEL", url: channelUrl },
        update: {},
      });
    }
    for (const { platform, kind, url } of sampleSocialLinks) {
      await tx.socialLink.upsert({
        where: { profileId_platform_kind: { profileId: updated.id, platform, kind } },
        create: { profileId: updated.id, platform, kind, url },
        update: {},
      });
    }
  }, { timeout: 20000, maxWait: 10000 });
  console.log("Đã bổ sung hồ sơ KOL bằng thông tin mẫu. Giữ nguyên tên, email, ảnh, liên kết đã lưu và trạng thái công khai.");
}
main().catch((error: unknown) => {
  const code = error && typeof error === "object" ? ("code" in error ? String(error.code) : "errorCode" in error ? String(error.errorCode) : "PRISMA_ERROR") : "ERROR";
  console.error(error instanceof Error && error.name.startsWith("Prisma")
    ? code === "P1001" ? "Không kết nối được MySQL (P1001). Kiểm tra mạng/VPN và DATABASE_URL. Chưa thay đổi dữ liệu."
      : `Không cập nhật được hồ sơ (${code}). Kiểm tra kết nối MySQL và chạy npm run db:migrate. Chưa thay đổi dữ liệu.`
    : error instanceof Error ? error.message : "Không cập nhật được hồ sơ.");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
