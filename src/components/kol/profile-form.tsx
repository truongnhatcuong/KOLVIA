import type { Actor } from "@/types";
import { categories } from "@/types";
import type { kolProfileForEdit } from "@/services/profiles";
import { ApiForm } from "@/components/ui/api-form";
import { profileSampleValues } from "@/lib/profile-samples";
export function KolProfileForm({
  actor,
  profile,
}: {
  actor: Actor;
  profile: Awaited<ReturnType<typeof kolProfileForEdit>>;
}) {
  const link = (platform: string, kind: string) =>
    profile?.socialLinks.find((l) => l.platform === platform && l.kind === kind)?.url ?? "";
  return (
    <ApiForm
      endpoint="/api/profiles/kol"
      method="PATCH"
      socialTabs
      sampleValues={profileSampleValues(actor.name, profile?.category ?? "Lifestyle")}
      fields={[
        {
          name: "name",
          label: "Tên hiển thị",
          required: true,
          value: actor.name,
          minLength: 2,
          maxLength: 100,
        },
        {
          name: "bio",
          label: "Giới thiệu bản thân",
          type: "textarea",
          value: profile?.bio,
          maxLength: 2000,
        },
        {
          name: "category",
          label: "Lĩnh vực",
          type: "select",
          value: profile?.category,
          options: categories.map((c) => ({ label: c, value: c })),
        },
        { name: "skills", label: "Kỹ năng", type: "textarea", value: profile?.skills, maxLength: 1000, placeholder: "Review sản phẩm, livestream, dẫn chương trình…", hint: "Phân tách các kỹ năng bằng dấu phẩy." },
        { name: "experienceYears", label: "Số năm kinh nghiệm", type: "number", min: 0, max: 60, value: profile?.experienceYears ?? 0, required: true },
        { name: "location", label: "Địa điểm", value: profile?.location, maxLength: 150 },
        {
          name: "tiktokUrl",
          label: "Kênh TikTok",
          type: "url",
          value: link("TIKTOK", "CHANNEL"),
          placeholder: "https://www.tiktok.com/@tenkenh",
        },
        {
          name: "facebookUrl",
          label: "Kênh Facebook",
          type: "url",
          value: link("FACEBOOK", "CHANNEL"),
          placeholder: "https://www.facebook.com/tenkenh",
        },
        { name: "instagramUrl", label: "Kênh Instagram", type: "url", value: link("INSTAGRAM", "CHANNEL"), placeholder: "https://www.instagram.com/tenkenh" },
        { name: "youtubeUrl", label: "Kênh YouTube", type: "url", value: link("YOUTUBE", "CHANNEL"), placeholder: "https://www.youtube.com/@tenkenh" },
        {
          name: "tiktokPost",
          label: "Video TikTok công khai",
          type: "url",
          socialPlatform: "TIKTOK",
          value: link("TIKTOK", "POST"),
        },
        {
          name: "facebookPost",
          label: "Bài đăng Facebook công khai",
          type: "url",
          socialPlatform: "FACEBOOK",
          value: link("FACEBOOK", "POST"),
        },
        {
          name: "youtubePost",
          label: "Video YouTube công khai",
          type: "url",
          socialPlatform: "YOUTUBE",
          value: link("YOUTUBE", "POST"),
        },
        {
          name: "isPublic",
          label: "Công khai hồ sơ để Organizer tìm thấy bạn",
          type: "checkbox",
          value: profile?.isPublic,
        },
      ]}
    />
  );
}
