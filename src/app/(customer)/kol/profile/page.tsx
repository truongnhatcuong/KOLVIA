import Link from "next/link";
import { pageActor } from "@/lib/permissions/guards";
import { kolProfileForEdit } from "@/services/profiles";
import { KolProfileForm } from "@/components/kol/profile-form";
import { PageHeading } from "@/components/ui";
import { ownMedia } from "@/services/media";
import { ImageUpload, ProfilePhotoUpload } from "@/components/ui/image-upload";
import { Icon } from "@/components/ui/icon";
import { portfolioBackdrop } from "@/lib/design-assets";
import { demoPortrait, defaultAvatar } from "@/lib/demo-assets";
export const metadata = { title: "Hồ sơ của tôi" };
export default async function Page() {
  const actor = await pageActor("KOL");
  const [profile, media] = await Promise.all([kolProfileForEdit(actor), ownMedia(actor)]);
  const enabled = Boolean(process.env.UPLOADTHING_TOKEN);
  return (
    <>
      <PageHeading
        title="Hồ sơ cá nhân & Portfolio"
        description="Hoàn thiện hồ sơ để nhà tổ chức hiểu rõ về bạn."
        action={
          profile?.isPublic && (
            <Link className="button secondary" href={`/kols/${actor.id}`}>
              Xem hồ sơ công khai ↗
            </Link>
          )
        }
      />
      <ProfilePhotoUpload
        input={{ target: "COVER" }} assets={media.filter((m) => m.target === "COVER")}
        label="Ảnh bìa" shape="cover" enabled={enabled}
        fallbackSrc={portfolioBackdrop} fallbackAlt="Ảnh bìa hồ sơ"
      />
      <section className="panel profile-content">
        <div className="profile-heading profile-overlap">
          <ProfilePhotoUpload
            input={{ target: "AVATAR" }} assets={media.filter((m) => m.target === "AVATAR")}
            label="Ảnh đại diện" shape="avatar" enabled={enabled}
            fallbackSrc={demoPortrait(actor.email) ?? defaultAvatar} fallbackAlt={`Ảnh đại diện của ${actor.name}`}
          />
          <div>
            <h1>{actor.name}</h1>
            <p className="muted">
              {profile?.category} · {profile?.location || "Cập nhật địa điểm của bạn"}
            </p>
          </div>
        </div>
        <nav className="profile-tabs" aria-label="Các phần hồ sơ">
          <a href="#profile-info">Thông tin cơ bản</a>
          <a href="#profile-images">Ảnh hồ sơ</a>
          <a href="#portfolio">Portfolio</a>
        </nav>
        <div className="form-layout">
          <div>
            <section id="profile-info">
              <h2>Thông tin & kênh mạng xã hội</h2>
              <KolProfileForm actor={actor} profile={profile} />
            </section>
          </div>
          <aside className="panel form-guidance">
            <span className="icon-tile">
              <Icon name="profile" />
            </span>
            <h2>Hồ sơ tạo ấn tượng</h2>
            <p>Giới thiệu phong cách, lĩnh vực và địa điểm để nhà tổ chức tìm thấy bạn dễ dàng.</p>
            <ul>
              <li>Chọn ảnh đại diện rõ nét.</li>
              <li>Thêm các ảnh dự án vào portfolio.</li>
              <li>Liên kết TikTok hoặc Facebook của bạn.</li>
              <li>Bật công khai sau khi hoàn thiện hồ sơ.</li>
            </ul>
          </aside>
        </div>
        <section id="profile-images">
          <ImageUpload
            input={{ target: "AVATAR" }}
            label="Ảnh đại diện"
            assets={media.filter((m) => m.target === "AVATAR")}
            enabled={enabled}
          />
          <ImageUpload
            input={{ target: "COVER" }}
            label="Ảnh bìa"
            assets={media.filter((m) => m.target === "COVER")}
            enabled={enabled}
          />
        </section>
        <section id="portfolio">
          <ImageUpload
            input={{ target: "PORTFOLIO" }}
            label="Portfolio của bạn"
            assets={media.filter((m) => m.target === "PORTFOLIO")}
            enabled={enabled}
          />
        </section>
      </section>
    </>
  );
}
