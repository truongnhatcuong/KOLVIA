import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { socialPostUrl, socialPostEmbed } from "../src/lib/social-embeds";
import { SocialPostInput } from "../src/components/kol/social-post-input";
import { SocialContentTabs } from "../src/components/kol/social-content-tabs";
import { SocialEmbed } from "../src/components/customer/social-embed";
import { isSocialUrl, kolProfileSchema } from "../src/lib/validations";

const tiktok = "https://www.tiktok.com/@phuc.__thubaaa/video/7674550995740904722";
test("YouTube public videos, shorts and iframe code use the official embed URL", () => {
  for (const url of ["https://www.youtube.com/watch?v=bC8fvcpocBU", "https://youtu.be/bC8fvcpocBU", "https://www.youtube.com/shorts/bC8fvcpocBU"]) {
    assert.equal(new URL(socialPostEmbed("YOUTUBE", url)!.src).pathname, "/embed/bC8fvcpocBU");
  }
  const markup = '<iframe src="https://www.youtube-nocookie.com/embed/bC8fvcpocBU" allowfullscreen></iframe>';
  assert.equal(new URL(socialPostEmbed("YOUTUBE", markup)!.src).pathname, "/embed/bC8fvcpocBU");
  assert.equal(socialPostEmbed("YOUTUBE", "https://www.youtube.com/@GoogleDevelopers"), null);
  assert.equal(socialPostEmbed("YOUTUBE", "https://www.youtube.com/watch?v=not-valid"), null);
});
test("the supplied web.facebook.com iframe normalizes and passes backend validation", () => {
  const post = "https://web.facebook.com/TiramisuMrHuan/posts/pfbid0vNRuBexsUdzsBZNJVxUgER968GDaF3T2wDZmKmkhBKhamTXFN2oNBTkFxFoe7M92l";
  const code = `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(post)}&show_text=true&width=500" width="500" height="250" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
  const canonical = post.replace("web.facebook.com", "www.facebook.com");
  assert.ok(isSocialUrl(post, "FACEBOOK"));
  assert.equal(socialPostUrl(code, "FACEBOOK"), canonical);
  assert.equal(socialPostUrl(post, "FACEBOOK"), canonical);
  assert.equal(new URL(socialPostEmbed("FACEBOOK", code)!.src).searchParams.get("href"), canonical);
  assert.equal(kolProfileSchema.parse({ name: "KOL Test", bio: "", category: "Beauty", location: "", isPublic: true, facebookPost: post }).facebookPost, post);
  assert.equal(isSocialUrl(post.replace("web.facebook.com", "web.facebook.com.evil.test"), "FACEBOOK"), false);
});
test("the supplied Facebook share link is valid and shows specific permalink guidance", () => {
  const share = "https://web.facebook.com/share/p/1DzKsp6TGc/";
  assert.equal(socialPostUrl(share, "FACEBOOK"), share.replace("web.facebook.com", "www.facebook.com"));
  const html = renderToStaticMarkup(<SocialEmbed platform="FACEBOOK" url={share} kind="POST" />);
  assert.ok(html.includes("Đây là liên kết chia sẻ Facebook"));
  assert.ok(!html.includes("<iframe"));
  assert.ok(html.includes("Mở nội dung"));
});
test("TikTok embed code becomes a URL and the supplied video uses the official player", () => {
  const markup = `<blockquote class="tiktok-embed" cite="${tiktok}" data-video-id="7674550995740904722"></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`;
  assert.equal(socialPostUrl(markup, "TIKTOK"), tiktok);
  const embed = socialPostEmbed("TIKTOK", tiktok)!;
  assert.equal(new URL(embed.src).pathname, "/player/v1/7674550995740904722");
  assert.equal(new URL(embed.src).searchParams.get("autoplay"), "0");
});
test("Facebook posts, permalinks, videos and reels select the correct plugin", () => {
  for (const [url, plugin] of [
    ["https://www.facebook.com/creator/posts/pfbidABC", "post"],
    ["https://m.facebook.com/permalink.php?story_fbid=123&id=456", "post"],
    ["https://www.facebook.com/story.php?story_fbid=123&id=456", "post"],
    ["https://www.facebook.com/creator/videos/123", "video"],
    ["https://www.facebook.com/watch/?v=123", "video"],
    ["https://www.facebook.com/reel/123", "video"],
  ] as const) {
    const embed = socialPostEmbed("FACEBOOK", url)!;
    assert.equal(new URL(embed.src).pathname, `/plugins/${plugin}.php`);
    assert.equal(new URL(new URL(embed.src).searchParams.get("href")!).hostname, "www.facebook.com");
  }
  const source = "https://www.facebook.com/permalink.php?story_fbid=123&id=456";
  const code = `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(source)}&amp;show_text=true"></iframe>`;
  assert.equal(socialPostUrl(code, "FACEBOOK"), source);
});
test("spoofed domains, script URLs and unsupported short/channel links cannot create embeds", () => {
  for (const value of ["javascript:alert(1)", "https://www.tiktok.com.evil.test/@u/video/123", '<iframe src="https://evil.test/video/123"></iframe>', '<script src="https://evil.test"></script>']) {
    assert.equal(socialPostUrl(value, "TIKTOK"), null);
  }
  assert.equal(socialPostUrl(`<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent("https://evil.test/posts/123")}"></iframe>`, "FACEBOOK"), null);
  for (const url of ["https://www.tiktok.com/@creator", "https://vm.tiktok.com/abc/"]) assert.equal(socialPostEmbed("TIKTOK", url), null);
  for (const url of ["https://www.facebook.com/creator", "https://fb.watch/abc/", "https://www.facebook.com/share/p/abc/"]) assert.equal(socialPostEmbed("FACEBOOK", url), null);
});
test("saved posts open automatically, offer collapse and retain canonical form values", () => {
  for (const [platform, url] of [["TIKTOK", tiktok], ["FACEBOOK", "https://www.facebook.com/creator/posts/123"], ["YOUTUBE", "https://www.youtube.com/watch?v=bC8fvcpocBU"]] as const) {
    const html = renderToStaticMarkup(<SocialPostInput name={`${platform.toLowerCase()}Post`} platform={platform} value={url} invalid={false} />);
    assert.ok(html.includes("<iframe"));
    assert.ok(html.includes("Thu gọn"));
    assert.ok(html.includes('aria-expanded="true"'));
    assert.ok(html.includes("Mở nội dung gốc"));
    assert.ok(html.includes('type="submit"'));
    assert.ok(html.includes(`name="${platform.toLowerCase()}Post"`));
    assert.ok(html.includes(`value="${url}"`));
    assert.ok(!html.includes("<script"));
    assert.ok(!renderToStaticMarkup(<SocialEmbed platform={platform} url={url} kind="CHANNEL" />).includes("<iframe"));
  }
});
test("social tabs show one panel while keeping every post in form data", () => {
  const fields = [
    { name: "tiktokPost", domId: "tk", label: "TikTok", socialPlatform: "TIKTOK" as const, value: tiktok },
    { name: "facebookPost", domId: "fb", label: "Facebook", socialPlatform: "FACEBOOK" as const, value: "https://www.facebook.com/creator/posts/123" },
    { name: "youtubePost", domId: "yt", label: "YouTube", socialPlatform: "YOUTUBE" as const, value: "https://www.youtube.com/watch?v=bC8fvcpocBU" },
  ];
  const html = renderToStaticMarkup(<SocialContentTabs fields={fields} errors={{}} />);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 3);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
  assert.equal((html.match(/ hidden=""/g) ?? []).length, 2);
  for (const field of fields) assert.ok(html.includes(`name="${field.name}"`));
  assert.equal((html.match(/<iframe/g) ?? []).length, 1);
  assert.ok(html.includes("https://www.tiktok.com/player/"));
  const invalid = renderToStaticMarkup(<SocialContentTabs fields={fields} errors={{ facebookPost: ["URL không hợp lệ"] }} />);
  assert.ok(invalid.includes('id="fb-tab" aria-controls="fb-panel" aria-selected="true"'));
  assert.ok(invalid.includes("URL không hợp lệ"));
});
