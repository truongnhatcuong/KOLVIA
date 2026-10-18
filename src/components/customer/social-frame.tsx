"use client";

import { useEffect, useRef, useState } from "react";

export function SocialFrame({ src, label }: { src: string; label: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== "https://www.tiktok.com" || event.source !== frame.current?.contentWindow) return;
      if (event.data?.["x-tiktok-player"] === true && ["onPlayerError", "onError"].includes(event.data.type)) {
        setLoading(false);
        setFailed(true);
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  return (
    <>
      <div className="relative">
        <iframe
          ref={frame} src={src} title={`Nội dung ${label}`} loading="lazy"
          allow="fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setFailed(true); }}
        />
        {loading && <span role="status" className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/95 px-3 py-2 text-xs text-muted">Đang tải nội dung {label}…</span>}
      </div>
      {failed && <p role="alert" className="field-error">Không tải được nội dung {label}. Bạn có thể mở liên kết bên dưới để kiểm tra.</p>}
    </>
  );
}
