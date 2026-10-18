import { isSocialUrl } from "@/lib/validations";

export type PostPlatform = "TIKTOK" | "FACEBOOK" | "YOUTUBE";

/** Extract a URL only: submitted scripts and markup are never rendered. */
export function socialPostUrl(input: string, platform: PostPlatform): string | null {
  if (input.length > 20000) return null;
  const raw = input.trim();
  const candidates = raw.startsWith("<")
    ? [...raw.matchAll(/\b(?:cite|data-href|src|href)\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1])
    : [raw];
  for (const candidate of candidates) {
    let value = candidate.replace(/&amp;|&#38;|&#x26;/gi, "&");
    if (!isSocialUrl(value, platform)) continue;
    const parsed = new URL(value);
    if (platform === "FACEBOOK" && /^\/plugins\/(?:post|video)\.php$/.test(parsed.pathname)) {
      value = parsed.searchParams.get("href") ?? "";
      if (!isSocialUrl(value, platform)) continue;
    }
    if (platform === "FACEBOOK") {
      const canonical = new URL(value);
      if (canonical.hostname !== "fb.watch") canonical.hostname = "www.facebook.com";
      value = canonical.toString();
    }
    if (value.length <= 1000) return value;
  }
  return null;
}

export function socialPostEmbed(platform: PostPlatform, input: string) {
  const value = socialPostUrl(input, platform);
  if (!value) return null;
  const url = new URL(value);
  if (platform === "YOUTUBE") {
    const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)\/?$/)?.[1];
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? { url: value, src: `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`, video: true } : null;
  }
  if (platform === "TIKTOK") {
    const id = url.pathname.match(/^\/(?:@[^/]+\/video|player\/v1|embed\/v2)\/(\d+)\/?$/)?.[1];
    return id ? { url: value, src: `https://www.tiktok.com/player/v1/${id}?autoplay=0&description=1&music_info=1`, video: true } : null;
  }
  if (url.hostname === "fb.watch") return null;
  // Facebook plugins use the canonical desktop URL, including permalink query IDs.
  url.hostname = "www.facebook.com";
  const video = /\/(?:videos|reel)\/[^/]+\/?$/.test(url.pathname) || (/^\/watch\/?$/.test(url.pathname) && Boolean(url.searchParams.get("v")));
  const post = /\/posts\/[^/]+\/?$/.test(url.pathname) || (/^\/(?:permalink|story)\.php$/.test(url.pathname) && Boolean(url.searchParams.get("story_fbid")));
  if (!video && !post) return null;
  const params = new URLSearchParams({ href: url.toString(), show_text: "true", width: "500" });
  return { url: value, src: `https://www.facebook.com/plugins/${video ? "video" : "post"}.php?${params}`, video };
}
