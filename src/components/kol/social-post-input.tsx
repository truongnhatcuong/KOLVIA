"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SocialFrame } from "@/components/customer/social-frame";
import { socialPostEmbed, socialPostUrl, type PostPlatform } from "@/lib/social-embeds";

export function SocialPostInput({ name, id = name, platform, value, invalid, active = true }: {
  name: string; id?: string; platform: PostPlatform; value: string; invalid: boolean; active?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [expanded, setExpanded] = useState(() => Boolean(socialPostEmbed(platform, value)));
  const [error, setError] = useState("");
  const url = socialPostUrl(draft, platform);
  const embed = url ? socialPostEmbed(platform, url) : null;
  const verticalFacebook = platform === "FACEBOOK" && url && /^\/reel\//.test(new URL(url).pathname);
  const label = { TIKTOK: "TikTok", FACEBOOK: "Facebook", YOUTUBE: "YouTube" }[platform];
  function showPreview(raw = draft) {
    if (!raw.trim()) { setExpanded(false); setError(""); return; }
    const url = socialPostUrl(raw, platform);
    if (!url) { setExpanded(false); setError(`Liên kết hoặc mã nhúng ${label} không hợp lệ.`); return; }
    setDraft(url);
    setExpanded(Boolean(socialPostEmbed(platform, url)));
    setError("");
  }
  return (
    <div className="min-w-0">
      <Input
        id={id} type="text" value={draft} maxLength={20000}
        placeholder={platform === "TIKTOK" ? "https://www.tiktok.com/@tenkenh/video/..." : platform === "YOUTUBE" ? "https://www.youtube.com/watch?v=..." : "https://www.facebook.com/tenkenh/posts/..."}
        aria-invalid={invalid || Boolean(error)}
        title="Dán liên kết HTTPS hoặc mã nhúng của nền tảng. Chỉ nội dung công khai mới xem được."
        aria-describedby={invalid ? `${id}-error` : error ? `${id}-preview-error` : undefined}
        onChange={(event) => { setDraft(event.target.value); setError(""); setExpanded(false); }}
        onBlur={() => showPreview()}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text/plain");
          const url = socialPostUrl(text, platform);
          if (url) { event.preventDefault(); showPreview(url); }
        }}
      />
      <input type="hidden" name={name} value={url ?? draft.trim()} />
      <div className="social-content-actions">
        <Button type="submit" size="sm">Lưu</Button>
        {url ? <a className="button secondary small" href={url} target="_blank" rel="noopener noreferrer">Mở nội dung gốc ↗</a> : <Button type="button" variant="outline" size="sm" disabled>Mở nội dung gốc ↗</Button>}
      </div>
      {error && <p id={`${id}-preview-error`} role="alert" className="field-error">{error}</p>}
      <div className="social-content-preview">
        <span className="min-w-0"><strong>{url ? `Nội dung ${label}` : "Chưa có nội dung"}</strong><small className="muted block">{url ? expanded ? "Bản xem trước" : "Bản xem trước thu gọn" : "Thêm liên kết hoặc mã nhúng để xem trước."}</small></span>
        <Button type="button" variant="outline" size="sm" disabled={!url} aria-expanded={expanded} aria-controls={`${id}-content`} onClick={() => {
          if (expanded) { setExpanded(false); return; }
          showPreview();
          if (!embed) { setError(platform === "FACEBOOK" ? "Cần liên kết bài đăng gốc hoặc mã nhúng Facebook; liên kết /share/ chưa hỗ trợ xem trước." : `Cần liên kết video đầy đủ hoặc mã nhúng ${label}.`); return; }
          setExpanded(true);
        }}>{expanded ? "Thu gọn" : "Xem nội dung"}</Button>
      </div>
      <div id={`${id}-content`}>
        {active && expanded && embed && <div className={`social-content-frame social-content-frame-${platform.toLowerCase()} ${embed.video ? "is-video" : "is-post"} ${verticalFacebook ? "is-reel" : ""}`}><SocialFrame key={embed.src} src={embed.src} label={label} /></div>}
      </div>
    </div>
  );
}
