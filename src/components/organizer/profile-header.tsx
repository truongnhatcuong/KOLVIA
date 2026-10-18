import type { Actor } from "@/types";
import type { MediaView } from "@/lib/validations/media";
import { ProfilePhotoUpload } from "@/components/ui/image-upload";
import { demoPortrait, defaultAvatar, organizationLogo } from "@/lib/demo-assets";
import { portfolioBackdrop } from "@/lib/design-assets";
import { Icon } from "@/components/ui/icon";

export function OrganizerProfileHeader({ actor, companyName, location, media, enabled }: {
  actor: Actor;
  companyName?: string | null;
  location?: string | null;
  media: MediaView[];
  enabled: boolean;
}) {
  return (
    <section id="profile-images" className="min-w-0 scroll-mt-5 rounded-2xl border border-line bg-white shadow-sm" aria-label="Ảnh và thông tin tổ chức">
      <ProfilePhotoUpload input={{ target: "COVER" }} assets={media.filter((m) => m.target === "COVER")} label="Ảnh bìa" shape="cover" enabled={enabled} fallbackSrc={portfolioBackdrop} fallbackAlt="Ảnh bìa tổ chức" />
      <div className="px-5 pb-5 sm:px-7 sm:pb-7">
        <div className="grid min-w-0 gap-4 sm:grid-cols-[128px_minmax(0,1fr)] sm:gap-5">
          <div className="relative -mt-12 self-start">
            <ProfilePhotoUpload input={{ target: "AVATAR" }} assets={media.filter((m) => m.target === "AVATAR")} label="Ảnh đại diện" shape="avatar" enabled={enabled} fallbackSrc={demoPortrait(actor.email) ?? defaultAvatar} fallbackAlt={`Ảnh đại diện của ${actor.name}`} />
          </div>
          <div className="min-w-0 pt-0 sm:pt-5">
            <p className="text-xs font-medium text-primary">Nhà tổ chức sự kiện</p>
            <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-ink sm:text-2xl">{companyName || actor.name}</h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted"><span>{actor.name}</span><span className="inline-flex items-center gap-1"><Icon name="pin" size={14} />{location || "Chưa cập nhật địa điểm"}</span></p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <ProfilePhotoUpload input={{ target: "LOGO" }} assets={media.filter((m) => m.target === "LOGO")} label="Logo tổ chức" shape="logo" enabled={enabled} fallbackSrc={organizationLogo(companyName)} />
            <div className="min-w-0"><p className="text-sm font-semibold">Nhận diện tổ chức</p><p className="mt-1 max-w-60 text-xs leading-5 text-muted">Logo hiển thị cùng các Job của bạn.</p></div>
          </div>
          <p className="max-w-xs text-xs leading-5 text-muted">Bấm camera trên ảnh để thay đổi. JPG, PNG, WebP · Tối đa 4 MB.</p>
        </div>
      </div>
    </section>
  );
}
