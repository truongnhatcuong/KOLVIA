import test from "node:test";
import assert from "node:assert/strict";
import { isSocialUrl, kolProfileSchema, jobSchema, filtersSchema } from "../src/lib/validations";
import { sampleProfileDetails } from "../prisma/profile-fixtures";
import { profileSampleValues, fillMissingProfileValues, sampleSocialLinks } from "../src/lib/profile-samples";
test("profile sample fill preserves edits and derives channels from existing posts", () => {
  const sample = profileSampleValues("Linh Nguyễn", "Lifestyle");
  const current = { bio: "Giới thiệu riêng", skills: "", experienceYears: 0, isPublic: false, tiktokPost: "https://www.tiktok.com/@phuc.__thubaaa/video/7674550995740904722", facebookPost: "https://web.facebook.com/TiramisuMrHuan/posts/pfbid123" };
  const filled = fillMissingProfileValues(current, sample);
  assert.equal(filled.bio, current.bio);
  assert.equal(filled.experienceYears, 0);
  assert.equal(filled.isPublic, false);
  assert.equal(filled.tiktokPost, current.tiktokPost);
  assert.equal(filled.tiktokUrl, "https://www.tiktok.com/@phuc.__thubaaa");
  assert.equal(filled.facebookUrl, "https://www.facebook.com/TiramisuMrHuan");
  assert.equal(filled.youtubeUrl, "https://www.youtube.com/@GoogleDevelopers");
  assert.ok(String(filled.skills).length > 20);
  assert.ok(kolProfileSchema.safeParse({ ...filled, name: "Linh Nguyễn", category: "Lifestyle", location: "Hà Nội" }).success);
  for (const link of sampleSocialLinks) assert.ok(isSocialUrl(link.url, link.platform));
});
const job = () => ({ title: "Sự kiện sáng tạo nội dung", description: "Một sự kiện dành cho các nhà sáng tạo nội dung để cùng trải nghiệm.", requirements: "Tham dự sự kiện và bàn giao nội dung.", category: "Lifestyle", location: "Hà Nội", budgetMin: 1_000_000, budgetMax: 3_000_000, deadline: new Date(Date.now() + 86400000).toISOString(), eventDate: new Date(Date.now() + 2 * 86400000).toISOString() });
test("sample profiles have coherent complete details within backend constraints", () => {
  for (const category of ["Lifestyle", "Beauty", "Fashion", "Food", "Travel", "Technology", "Fitness"] as const) {
    const details = sampleProfileDetails("Linh Nguyễn", category);
    const parsed = kolProfileSchema.parse({ ...details, name: "Linh Nguyễn", category, isPublic: true });
    assert.ok(parsed.bio.includes("Linh Nguyễn"));
    assert.ok(parsed.bio.length > 300);
    assert.ok(parsed.skills.split(",").length >= 4);
    assert.ok(!/demo|AI minh họa/i.test(parsed.bio));
    assert.equal(parsed.tiktokUrl, "");
    assert.equal(parsed.facebookUrl, "");
  }
});
test("all four social platforms accept real HTTPS domains and reject spoofed URLs", () => {
  for (const [platform, url] of [["TIKTOK", "https://www.tiktok.com/@creator"], ["FACEBOOK", "https://www.facebook.com/creator"], ["INSTAGRAM", "https://www.instagram.com/creator"], ["YOUTUBE", "https://www.youtube.com/@creator"]] as const) {
    assert.ok(isSocialUrl(url, platform));
    const parsed = new URL(url);
    for (const value of [`https://${parsed.hostname}.evil.test${parsed.pathname}`, url.replace("https:", "http:"), `https://user@${parsed.hostname}${parsed.pathname}`, `https://${parsed.hostname}:444${parsed.pathname}`]) assert.equal(isSocialUrl(value, platform), false);
  }
});
test("KOL skills and experience are validated and previous payloads stay compatible", () => {
  const profile = { name: "KOL Test", bio: "", category: "Beauty", location: "", isPublic: true };
  assert.equal(kolProfileSchema.parse(profile).experienceYears, 0);
  assert.equal(kolProfileSchema.parse({ ...profile, skills: "Review, MC", experienceYears: 3, instagramUrl: "https://instagram.com/creator", youtubeUrl: "https://youtube.com/@creator" }).experienceYears, 3);
  for (const experienceYears of [-1, 1.5, 61]) assert.equal(kolProfileSchema.safeParse({ ...profile, experienceYears }).success, false);
});
test("recruitment capacity and benefit lengths are bounded", () => {
  assert.equal(jobSchema.parse(job()).capacity, 10);
  for (const capacity of [0, -1, 1.5, 1001]) assert.equal(jobSchema.safeParse({ ...job(), capacity }).success, false);
  assert.equal(jobSchema.safeParse({ ...job(), benefits: "a".repeat(5001) }).success, false);
});
test("filters support dates, salary overlap, experience and new platforms", () => {
  const input = { minBudget: "1000000", maxBudget: "3000000", eventFrom: "2026-11-01", eventTo: "2026-12-01", minExperience: "3", platform: "YOUTUBE", skills: "MC" };
  assert.equal(filtersSchema.parse(input).minExperience, 3);
  assert.equal(filtersSchema.parse({ maxBudget: "" }).maxBudget, 1000000000);
  assert.equal(filtersSchema.safeParse({ ...input, maxBudget: "999" }).success, false);
  assert.equal(filtersSchema.safeParse({ ...input, eventTo: "2026-01-01" }).success, false);
  assert.equal(filtersSchema.safeParse({ eventFrom: "not-a-date" }).success, false);
  assert.equal(filtersSchema.safeParse({ eventFrom: "2026-02-31" }).success, false);
});
