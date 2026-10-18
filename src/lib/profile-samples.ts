import { sampleProfileDetails } from "../../prisma/profile-fixtures";

// Public content fixtures for testing, not verified ownership by a KOL account.
export const sampleSocialLinks = [
  { platform: "TIKTOK", kind: "CHANNEL", url: "https://www.tiktok.com/@scout2015", field: "tiktokUrl" },
  { platform: "TIKTOK", kind: "POST", url: "https://www.tiktok.com/@scout2015/video/6718335390845095173", field: "tiktokPost" },
  { platform: "FACEBOOK", kind: "CHANNEL", url: "https://www.facebook.com/TiramisuMrHuan", field: "facebookUrl" },
  { platform: "FACEBOOK", kind: "POST", url: "https://www.facebook.com/TiramisuMrHuan/posts/pfbid0vNRuBexsUdzsBZNJVxUgER968GDaF3T2wDZmKmkhBKhamTXFN2oNBTkFxFoe7M92l", field: "facebookPost" },
  { platform: "YOUTUBE", kind: "CHANNEL", url: "https://www.youtube.com/@GoogleDevelopers", field: "youtubeUrl" },
  { platform: "YOUTUBE", kind: "POST", url: "https://www.youtube.com/watch?v=bC8fvcpocBU", field: "youtubePost" },
] as const;

export function profileSampleValues(name: string, category: string): Record<string, string | number | boolean> {
  return { ...sampleProfileDetails(name, category), ...Object.fromEntries(sampleSocialLinks.map((link) => [link.field, link.url])) };
}

export function fillMissingProfileValues(current: Record<string, string | number | boolean>, sample: Record<string, string | number | boolean>) {
  const result = { ...current };
  for (const [name, value] of Object.entries(sample)) {
    if (result[name] === undefined || (typeof result[name] === "string" && !result[name].trim())) result[name] = value;
  }
  for (const [postField, channelField, host, pattern] of [
    ["tiktokPost", "tiktokUrl", "www.tiktok.com", /^\/(@[^/]+)\/video\//],
    ["facebookPost", "facebookUrl", "www.facebook.com", /^\/([^/]+)\/(?:posts|videos)\//],
  ] as const) {
    if (current[channelField] || typeof current[postField] !== "string") continue;
    try {
      const url = new URL(current[postField]);
      const expected = host.slice(4);
      if (![host, expected, `web.${expected}`, `m.${expected}`].includes(url.hostname)) continue;
      const handle = url.pathname.match(pattern)?.[1];
      if (handle) result[channelField] = `https://${host}/${handle}`;
    } catch { /* Keep the sample channel when the draft has no usable post URL. */ }
  }
  return result;
}
