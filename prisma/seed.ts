import { PrismaClient, type Moderation } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { z } from "zod";
import { sampleProfileDetails } from "./profile-fixtures";
import { sampleSocialLinks } from "../src/lib/profile-samples";

const db = new PrismaClient();
async function main() {
  await db.$connect();
  const credentials = [
    "DEMO_ADMIN_PASSWORD",
    "DEMO_KOL_PASSWORD",
    "DEMO_ORGANIZER_PASSWORD",
  ] as const;
  for (const key of credentials)
    if (!process.env[key] || process.env[key]!.length < 10)
      throw new Error(`Set ${key} to a password of at least 10 characters in .env.`);
  const adminEmail = z.email().parse((process.env.DEMO_ADMIN_EMAIL ?? "admin@kolvia.local").trim().toLowerCase());
  const kolEmail = z.email().parse((process.env.DEMO_KOL_EMAIL ?? "linh@kolvia.local").trim().toLowerCase());
  const organizerEmail = z.email().parse((process.env.DEMO_ORGANIZER_EMAIL ?? "organizer@kolvia.local").trim().toLowerCase());
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Quản trị KOLVIA",
      email: adminEmail,
      role: "ADMIN",
      passwordHash: await hashPassword(process.env.DEMO_ADMIN_PASSWORD!),
    },
  });
  if (admin.role !== "ADMIN")
    throw new Error("DEMO_ADMIN_EMAIL is already assigned to a non-admin account.");
  const organizer = await db.user.upsert({
    where: { email: organizerEmail },
    update: {},
    create: {
      name: "Minh Anh",
      email: organizerEmail,
      role: "ORGANIZER",
      passwordHash: await hashPassword(process.env.DEMO_ORGANIZER_PASSWORD!),
      organizer: {
        create: {
          companyName: "The Social Studio",
          description:
            "Studio tổ chức sự kiện và xây dựng chiến dịch sáng tạo cùng các nhà sáng tạo nội dung Việt Nam.",
          location: "TP. Hồ Chí Minh",
          website: "",
        },
      },
    },
  });
  if (organizer.role !== "ORGANIZER")
    throw new Error(
      "The demo organizer email belongs to a different role. Existing data was preserved.",
    );
  const creators = [
    {
      slug: "linh",
      name: "Linh Nguyễn",
      category: "Lifestyle",
      location: "TP. Hồ Chí Minh",
      bio: sampleProfileDetails("Linh Nguyễn", "Lifestyle").bio,
    },
    {
      slug: "an",
      name: "An Trần",
      category: "Beauty",
      location: "Hà Nội",
      bio: "Chia sẻ trải nghiệm làm đẹp chân thật, từ chăm sóc da đến phong cách sống. Sẵn sàng đồng hành cùng các sự kiện và thương hiệu phù hợp.",
    },
    {
      slug: "khanh",
      name: "Khánh Lê",
      category: "Food",
      location: "Đà Nẵng",
      bio: "Khám phá ẩm thực và những địa điểm mới. Nội dung tập trung vào trải nghiệm tại chỗ và những câu chuyện phía sau mỗi món ăn.",
    },
    {
      slug: "mai",
      name: "Mai Phạm",
      category: "Fashion",
      location: "TP. Hồ Chí Minh",
      bio: "Thời trang là một cách kể chuyện. Tôi tạo nội dung phong cách cá nhân và tham gia những sự kiện sáng tạo.",
    },
    {
      slug: "huy",
      name: "Huy Võ",
      category: "Technology",
      location: "Hà Nội",
      bio: sampleProfileDetails("Huy Võ", "Technology").bio,
    },
    {
      slug: "thao",
      name: "Thảo Trần",
      category: "Travel",
      location: "Đà Nẵng",
      bio: sampleProfileDetails("Thảo Trần", "Travel").bio,
    },
  ];
  const creatorIds = new Map<string, string>();
  for (const creator of creators) {
    const email = creator.slug === "linh" ? kolEmail : `${creator.slug}@kolvia.local`;
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: {
        name: creator.name,
        email,
        role: "KOL",
        passwordHash: await hashPassword(process.env.DEMO_KOL_PASSWORD!),
        kol: {
          create: {
            bio: creator.bio,
            category: creator.category,
            location: creator.location,
            isPublic: true,
            experienceYears: 2,
            skills: sampleProfileDetails(creator.name, creator.category).skills,
            ...(creator.slug === "linh" ? { socialLinks: { create: sampleSocialLinks.map(({ platform, kind, url }) => ({ platform, kind, url })) } } : {}),
          },
        },
      },
    });
    if (user.role !== "KOL")
      throw new Error(
        "A demo creator email belongs to a different role. Existing data was preserved.",
      );
    creatorIds.set(creator.slug, user.id);
  }
  const travelOrganizer = await db.user.upsert({
    where: { email: "travel-organizer@kolvia.local" },
    update: {},
    create: {
      name: "Tuấn Phạm",
      email: "travel-organizer@kolvia.local",
      role: "ORGANIZER",
      passwordHash: await hashPassword(process.env.DEMO_ORGANIZER_PASSWORD!),
      organizer: {
        create: {
          companyName: "Vietnam Experience Studio",
          description: "Tổ chức các chương trình trải nghiệm du lịch và văn hóa địa phương, kết nối nhà sáng tạo để giới thiệu hành trình và điểm đến.",
          location: "Đà Nẵng",
        },
      },
    },
  });
  if (travelOrganizer.role !== "ORGANIZER")
    throw new Error("The travel demo email belongs to a different role. Existing data was preserved.");
  const day = (offset: number) => new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
  const jobs: {
    id: string; title: string; category: string; location: string;
    budgetMin: number; budgetMax: number; organizerId?: string;
    moderation?: Moderation; moderationNote?: string;
  }[] = [
    {
      id: "demo-lifestyle-launch",
      title: "Cùng kể câu chuyện tại Lifestyle Launch",
      category: "Lifestyle",
      location: "TP. Hồ Chí Minh",
      budgetMin: 3000000,
      budgetMax: 6000000,
    },
    {
      id: "demo-beauty-workshop",
      title: "Nhà sáng tạo cho Beauty Workshop",
      category: "Beauty",
      location: "Hà Nội",
      budgetMin: 2500000,
      budgetMax: 5000000,
    },
    {
      id: "demo-food-weekend",
      title: "Trải nghiệm và chia sẻ Food Weekend",
      category: "Food",
      location: "Đà Nẵng",
      budgetMin: 2000000,
      budgetMax: 4000000,
    },
    {
      id: "demo-fashion-popup",
      title: "Đồng hành cùng Fashion Pop-up",
      category: "Fashion",
      location: "TP. Hồ Chí Minh",
      budgetMin: 4000000,
      budgetMax: 8000000,
    },
    {
      id: "demo-technology-experience",
      title: "Trải nghiệm thiết bị tại Tech Experience",
      category: "Technology", location: "Hà Nội", budgetMin: 3000000, budgetMax: 7000000,
    },
    {
      id: "demo-travel-culture",
      title: "Khám phá văn hóa và du lịch Đà Nẵng",
      category: "Travel", location: "Đà Nẵng", budgetMin: 4000000, budgetMax: 9000000,
      organizerId: travelOrganizer.id,
    },
    {
      id: "demo-fitness-pending",
      title: "Ngày hội vận động cộng đồng",
      category: "Fitness", location: "TP. Hồ Chí Minh", budgetMin: 2000000, budgetMax: 5000000,
      moderation: "PENDING",
    },
    {
      id: "demo-travel-draft",
      title: "Hành trình cuối tuần",
      category: "Travel", location: "Đà Nẵng", budgetMin: 2500000, budgetMax: 6000000,
      organizerId: travelOrganizer.id, moderation: "DRAFT",
    },
    {
      id: "demo-beauty-rejected",
      title: "Chia sẻ chăm sóc da",
      category: "Beauty", location: "Hà Nội", budgetMin: 2000000, budgetMax: 4000000,
      moderation: "REJECTED",
      moderationNote: "Cần mô tả rõ lịch trình và nội dung KOL phải thực hiện trước khi gửi duyệt lại.",
    },
  ];
  for (const job of jobs) {
    await db.job.upsert({
      where: { id: job.id },
      update: {},
      create: {
        ...job,
        organizerId: job.organizerId ?? organizer.id,
        description:
          "Chúng tôi tìm kiếm nhà sáng tạo nội dung để tham dự sự kiện, trải nghiệm hoạt động và chia sẻ câu chuyện với cộng đồng. Cùng đội ngũ lên ý tưởng nội dung phù hợp với phong cách của bạn. Chi tiết quyền lợi và lịch trình sẽ được trao đổi sau khi xác nhận hợp tác.",
        benefits: "Thù lao theo ngân sách đã công khai. Được trải nghiệm sản phẩm, hỗ trợ nội dung và trao đổi lịch trình trực tiếp với ban tổ chức.",
        capacity: 5,
        requirements:
          "Có phong cách nội dung phù hợp với chủ đề. Tham gia sự kiện đúng lịch, trao đổi nội dung với đội ngũ tổ chức và thực hiện nội dung đã thống nhất.",
        deadline: day(14),
        eventDate: day(21),
        moderation: job.moderation ?? "APPROVED",
      },
    });
  }
  // Demo relationships only use approved, open jobs belonging to the demo organizer.
  for (const example of [
    { jobId: "demo-lifestyle-launch", slug: "linh", status: "PENDING" },
    { jobId: "demo-food-weekend", slug: "khanh", status: "ACCEPTED" },
    { jobId: "demo-beauty-workshop", slug: "an", status: "REJECTED" },
  ] as const) {
    const kolId = creatorIds.get(example.slug)!;
    await db.$transaction(async (tx) => {
      const job = await tx.job.findUnique({ where: { id: example.jobId } });
      if (!job || job.organizerId !== organizer.id || job.moderation !== "APPROVED" || job.status !== "OPEN" || job.deadline <= new Date()) return;
      const application = await tx.application.upsert({
        where: { jobId_kolId: { jobId: example.jobId, kolId } },
        update: {},
        create: { jobId: example.jobId, kolId, status: example.status, message: "Tôi muốn đồng hành cùng sự kiện và trao đổi kế hoạch nội dung với ban tổ chức. Tôi có thể chuẩn bị ý tưởng, tham dự đúng lịch và bàn giao nội dung theo brief đã thống nhất." },
      });
      if (application.status === "ACCEPTED") await tx.participation.upsert({
        where: { jobId_kolId: { jobId: example.jobId, kolId } }, update: {},
        create: { jobId: example.jobId, kolId, source: "APPLICATION" },
      });
      if (!(await tx.applicationHistory.count({ where: { applicationId: application.id } }))) await tx.applicationHistory.create({ data: { applicationId: application.id, status: application.status, message: application.message.slice(0, 2000), action: "SNAPSHOT" } });
    });
  }
  for (const example of [
    { jobId: "demo-fashion-popup", slug: "mai", status: "PENDING" },
    { jobId: "demo-technology-experience", slug: "huy", status: "ACCEPTED" },
  ] as const) {
    const kolId = creatorIds.get(example.slug)!;
    await db.$transaction(async (tx) => {
      const job = await tx.job.findUnique({ where: { id: example.jobId } });
      if (!job || job.organizerId !== organizer.id || job.moderation !== "APPROVED" || job.status !== "OPEN" || job.deadline <= new Date()) return;
      const invitation = await tx.invitation.upsert({
        where: { jobId_kolId: { jobId: example.jobId, kolId } }, update: {},
        create: { jobId: example.jobId, kolId, status: example.status, message: "Ban tổ chức mời bạn đồng hành cùng sự kiện. Chúng tôi mong muốn trao đổi về ý tưởng, lịch tham gia, thù lao và nội dung phù hợp với phong cách của bạn." },
      });
      if (invitation.status === "ACCEPTED") await tx.participation.upsert({
        where: { jobId_kolId: { jobId: example.jobId, kolId } }, update: {},
        create: { jobId: example.jobId, kolId, source: "INVITATION" },
      });
    });
  }
  console.log(
    "Seeded demo accounts and public content. Existing records were preserved. No social statistics or AI data were generated.",
  );
}
main()
  .catch((error) => {
    console.error(error instanceof Error && error.name.startsWith("Prisma")
      ? `Seed failed (${"code" in error ? String(error.code) : "errorCode" in error ? String(error.errorCode) : "PRISMA_ERROR"}). Check database connection and migrations.`
      : error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
