import { pageActor } from "@/lib/permissions/guards";
import { organizerProfileForEdit } from "@/services/profiles";
import { ApiForm } from "@/components/ui/api-form";
import { PageHeading } from "@/components/ui";
import { ownMedia } from "@/services/media";
import { ImageUpload } from "@/components/ui/image-upload";
import { OrganizerProfileHeader } from "@/components/organizer/profile-header";
import { Icon } from "@/components/ui/icon";
export const metadata = { title: "Hồ sơ tổ chức" };
export default async function Page() {
  const actor = await pageActor("ORGANIZER");
  const [p, media] = await Promise.all([organizerProfileForEdit(actor), ownMedia(actor)]);
  const enabled = Boolean(process.env.UPLOADTHING_TOKEN);
  return (
    <>
      <PageHeading
        title="Hồ sơ tổ chức"
        description="Thông tin rõ ràng giúp nhà sáng tạo hiểu hơn về những cơ hội bạn mang đến."
      />
      <OrganizerProfileHeader actor={actor} companyName={p?.companyName} location={p?.location} media={media} enabled={enabled} />
      <div className="mt-6 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="panel min-w-0" aria-label="Chỉnh sửa thông tin tổ chức">
          <h2>Thông tin tổ chức</h2>
          <p className="mb-5 text-xs leading-5 text-muted">Cập nhật người đại diện, giới thiệu và thông tin liên hệ.</p>
        <ApiForm
          endpoint="/api/profiles/organizer"
          method="PATCH"
          fields={[
            {
              name: "name",
              label: "Tên người đại diện",
              value: actor.name,
              required: true,
              minLength: 2,
              maxLength: 100,
            },
            {
              name: "companyName",
              label: "Tên tổ chức",
              value: p?.companyName,
              required: true,
              minLength: 2,
              maxLength: 150,
            },
            {
              name: "description",
              label: "Giới thiệu tổ chức",
              value: p?.description,
              type: "textarea",
              maxLength: 2000,
            },
            { name: "location", label: "Địa điểm", value: p?.location, maxLength: 150 },
            {
              name: "website",
              label: "Website",
              value: p?.website,
              type: "url",
              placeholder: "https://example.com",
            },
          ]}
        />
        </section>
        <aside className="panel min-w-0">
          <span className="mb-4 inline-flex rounded-xl bg-surface-container p-3 text-primary"><Icon name="profile" /></span>
          <h2>Thông tin tài khoản</h2>
          <dl className="grid gap-4 text-xs"><div><dt className="text-muted">Người đại diện</dt><dd className="mt-1 font-medium">{actor.name}</dd></div><div><dt className="text-muted">Email đăng nhập</dt><dd className="mt-1 break-all font-medium">{actor.email}</dd></div><div><dt className="text-muted">Vai trò</dt><dd className="mt-1 font-medium">Nhà tổ chức sự kiện</dd></div></dl>
          <details className="mt-6 border-t border-line pt-5">
          <summary className="cursor-pointer text-sm font-medium">Quản lý và xóa ảnh hồ sơ</summary>
          <div className="mt-4 grid gap-5">
            {(["AVATAR", "COVER", "LOGO"] as const).map((target) => <ImageUpload key={target} input={{ target }} assets={media.filter((m) => m.target === target)} label={target === "AVATAR" ? "Ảnh đại diện" : target === "COVER" ? "Ảnh bìa" : "Logo tổ chức"} enabled={enabled} />)}
          </div>
        </details>
        </aside>
      </div>
    </>
  );
}
