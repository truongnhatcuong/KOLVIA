import Link from "next/link";
import { notFound } from "next/navigation";
import { kolForViewer } from "@/services/profiles";
import { currentActor } from "@/lib/auth/session";
import { ownJobs } from "@/services/jobs";
import { MediaImage } from "@/components/ui/media-image";
import { ApiForm } from "@/components/ui/api-form";
import { SocialEmbed } from "@/components/customer/social-embed";
import { portfolioBackdrop } from "@/lib/design-assets";
import { defaultAvatar } from "@/lib/demo-assets";
import { ProfilePhotoUpload } from "@/components/ui/image-upload";
export const metadata = { title: "Hồ sơ nhà sáng tạo" };
export default async function KolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentActor();
  const kol = await kolForViewer(actor, id);
  if (!kol) notFound();
  const owner = actor?.id === kol.user.id;
  const enabled = Boolean(process.env.UPLOADTHING_TOKEN);
  const jobs =
    actor?.role === "ORGANIZER"
      ? (await ownJobs(actor)).filter(
          (j) => j.moderation === "APPROVED" && j.status === "OPEN" && j.deadline > new Date() && j._count.participations < j.capacity,
        )
      : [];
  return (
    <main id="main-content" className="site-container content-page">
      <Link href="/kols" className="back-link">
        ← Cộng đồng sáng tạo
      </Link>
      <div className="detail-grid">
        <div>
          {owner ? <ProfilePhotoUpload input={{ target: "COVER" }} assets={kol.user.media.filter((m) => m.target === "COVER")} label="Ảnh bìa" shape="cover" enabled={enabled} fallbackSrc={portfolioBackdrop} fallbackAlt="Ảnh bìa hồ sơ" /> : <MediaImage
            src={kol.user.media.find((m) => m.target === "COVER")?.url ?? portfolioBackdrop}
            alt={
              kol.user.media.some((m) => m.target === "COVER")
                ? "Ảnh bìa hồ sơ"
                : "Ảnh bìa hồ sơ"
            }
            className="profile-cover"
            fallback="KOLVIA"
          />}
          <section className="panel profile-content">
            <div className="profile-heading profile-overlap">
              {owner ? <ProfilePhotoUpload input={{ target: "AVATAR" }} assets={kol.user.media.filter((m) => m.target === "AVATAR")} label="Ảnh đại diện" shape="avatar" enabled={enabled} fallbackSrc={kol.user.demoAvatar ?? defaultAvatar} fallbackAlt={`Ảnh đại diện của ${kol.user.name}`} /> : <MediaImage
                src={kol.user.media.find((m) => m.target === "AVATAR")?.url ?? kol.user.demoAvatar ?? defaultAvatar}
                alt={`Ảnh đại diện của ${kol.user.name}`}
                sizes="110px" className="avatar large"
              />}
              <div>
                <span className="tag">{kol.category}</span>
                <h1>{kol.user.name}</h1>
                <p className="muted">{kol.location || "Chưa cập nhật địa điểm"}</p>
              </div>
            </div>
            <div className="mb-6 flex flex-wrap gap-2">
              <span className="tag">{kol.experienceYears} năm kinh nghiệm</span>
              {[...new Set(kol.skills.split(",").map((skill) => skill.trim()).filter(Boolean))].map((skill) => <span className="tag" key={skill}>{skill}</span>)}
            </div>
            <h2>Câu chuyện của tôi</h2>
            <p className="detail-copy">
              {kol.bio || "Nhà sáng tạo chưa cập nhật phần giới thiệu."}
            </p>
            <div className="social-links">
              {kol.socialLinks
                .filter((l) => l.kind === "CHANNEL")
                .map((link) => (
                  <SocialEmbed key={link.id} {...link} />
                ))}
            </div>
          </section>
          {kol.user.media.some((m) => m.target === "PORTFOLIO") && (
            <section className="panel">
              <h2>Portfolio</h2>
              <div className="portfolio-grid">
                {kol.user.media
                  .filter((m) => m.target === "PORTFOLIO")
                  .map((m) => (
                    <a
                      key={m.id}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Mở ảnh ${m.name}`}
                    >
                      <MediaImage src={m.url} alt={m.name} className="portfolio-photo" />
                    </a>
                  ))}
              </div>
            </section>
          )}
          {kol.socialLinks.some((l) => l.kind === "POST") && (
            <section className="panel shared-content">
              <h2>Nội dung chia sẻ</h2>
              <div className="social-posts">
                {kol.socialLinks
                  .filter((l) => l.kind === "POST")
                  .map((link) => (
                    <SocialEmbed key={link.id} {...link} />
                  ))}
              </div>
            </section>
          )}
        </div>
        <aside id="collaborate" className="panel detail-aside">
          <h2>Cùng tạo nên điều mới</h2>
          {!actor ? (
            <>
              <p className="muted">Đăng nhập bằng tài khoản Organizer để gửi lời mời hợp tác.</p>
              <Link href="/login" className="button" style={{ marginTop: 20 }}>
                Đăng nhập ↗
              </Link>
            </>
          ) : actor.role !== "ORGANIZER" ? (
            <p className="muted">Lời mời hợp tác dành cho nhà tổ chức sự kiện.</p>
          ) : !jobs.length ? (
            <>
              <p className="muted">Bạn cần một Job đã duyệt và đang mở để gửi lời mời.</p>
              <Link href="/organizer/jobs" className="button secondary" style={{ marginTop: 20 }}>
                Quản lý Job ↗
              </Link>
            </>
          ) : (
            <ApiForm
              endpoint="/api/invitations"
              extra={{ kolId: kol.user.id }}
              fields={[
                {
                  name: "jobId",
                  label: "Chọn Job",
                  type: "select",
                  required: true,
                  options: jobs.map((j) => ({ value: j.id, label: j.title })),
                },
                {
                  name: "message",
                  label: "Lời mời hợp tác",
                  type: "textarea",
                  required: true,
                  minLength: 10,
                  maxLength: 2000,
                  placeholder: "Giới thiệu cơ hội và lý do bạn muốn đồng hành…",
                },
              ]}
              submitLabel="Gửi lời mời"
              redirectTo="/organizer/invitations"
            />
          )}
        </aside>
      </div>
    </main>
  );
}
