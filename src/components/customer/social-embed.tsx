import { isSocialUrl } from "@/lib/validations";
import { socialPostEmbed } from "@/lib/social-embeds";
import { SocialFrame } from "./social-frame";

export function SocialEmbed({
  platform,
  url,
  kind,
}: {
  platform: string;
  url: string;
  kind: string;
}) {
  if (!["TIKTOK", "FACEBOOK", "INSTAGRAM", "YOUTUBE"].includes(platform)) return null;
  if (!isSocialUrl(url, platform as "TIKTOK" | "FACEBOOK" | "INSTAGRAM" | "YOUTUBE")) return null;
  const label = { TIKTOK: "TikTok", FACEBOOK: "Facebook", INSTAGRAM: "Instagram", YOUTUBE: "YouTube" }[platform];
  const link = (
    <a href={url} target="_blank" rel="noopener noreferrer" className="button secondary small">
      {kind === "CHANNEL" ? "Mở kênh" : "Mở nội dung"}{" "}
      {label} ↗
    </a>
  );
  if (kind !== "POST") return link;
  const embed = platform === "TIKTOK" || platform === "FACEBOOK" || platform === "YOUTUBE" ? socialPostEmbed(platform, url) : null;
  const facebookShare = platform === "FACEBOOK" && /^\/share\//.test(new URL(url).pathname);
  return (
    <div className={`social-embed social-embed-${platform.toLowerCase()}`}>
      {embed && (
        <SocialFrame key={embed.src} src={embed.src} label={label!} />
      )}
      <p className="muted">{embed ? "Nếu nội dung không hiển thị, hãy kiểm tra quyền công khai hoặc mở trực tiếp." : facebookShare ? "Đây là liên kết chia sẻ Facebook (/share/). Bấm Mở nội dung Facebook, mở bài đăng gốc rồi chọn Nhúng và dán mã iframe vào ô bên trên để xem trước." : "Liên kết này chưa hỗ trợ nhúng. Mở bài đăng gốc và sao chép liên kết đầy đủ hoặc mã nhúng."}</p>
      {link}
    </div>
  );
}
