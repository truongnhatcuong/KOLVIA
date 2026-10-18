export type MatchProfile = { category: string; skills: string; bio: string; experienceYears: number; location: string };
export type MatchJob = { category: string; requirements: string; description: string; location: string; budgetMin: number; budgetMax: number };
export type MatchPreferences = { minBudget?: number; maxBudget?: number };
export type MatchFactor = { key: string; label: string; weight: number; points: number | null; reason: string };
export type MatchScore = { score: number; assessedWeight: number; factors: MatchFactor[]; reasons: string[] };

export function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export function canonicalLocation(value: string) {
  const text = normalizeText(value);
  if (/\b(hcm|tphcm|tp hcm|ho chi minh|sai gon)\b/.test(text)) return "ho chi minh";
  if (/\b(ha noi|hanoi)\b/.test(text)) return "ha noi";
  if (/\b(da nang|danang)\b/.test(text)) return "da nang";
  return text.replace(/\b(tp|thanh pho|tinh)\b/g, "").trim();
}
export function remoteLocation(value: string) { return /\b(online|remote|truc tuyen|tu xa|toan quoc)\b/.test(normalizeText(value)); }
const skillGroups = [
  ["Review sản phẩm", "review", "danh gia san pham"],
  ["Livestream", "livestream", "live stream", "phat truc tiep"],
  ["Dẫn chương trình", "mc", "dan chuong trinh"],
  ["Sáng tạo nội dung", "content", "sang tao noi dung", "viet noi dung"],
  ["Quay video", "quay video", "quay phim", "videography"],
  ["Chụp ảnh", "chup anh", "photography"],
  ["Dựng video", "dung video", "edit video", "bien tap video"],
  ["Trang điểm", "makeup", "make up", "trang diem"],
  ["TikTok", "tiktok"], ["YouTube", "youtube"], ["Facebook", "facebook"],
];
function containsPhrase(text: string, phrase: string) { return ` ${normalizeText(text)} `.includes(` ${phrase} `); }
export function scoreMatch(profile: MatchProfile, job: MatchJob, preferences: MatchPreferences = {}): MatchScore {
  const factors: MatchFactor[] = [];
  const factor = (key: string, label: string, weight: number, ratio: number | null, reason: string) => factors.push({ key, label, weight, points: ratio === null ? null : Math.round(Math.max(0, Math.min(1, ratio)) * weight * 100) / 100, reason });
  const sameCategory = normalizeText(profile.category) === normalizeText(job.category);
  factor("category", "Lĩnh vực", 30, profile.category && job.category ? Number(sameCategory) : null, profile.category && job.category ? sameCategory ? `Cùng lĩnh vực ${job.category}.` : `Hồ sơ ${profile.category}; job ${job.category}.` : "Chưa đủ thông tin lĩnh vực.");
  const requirementSkills = skillGroups.filter(([, ...phrases]) => phrases.some((phrase) => containsPhrase(`${job.requirements} ${job.description}`, phrase)));
  const matchingSkills = requirementSkills.filter(([, ...phrases]) => phrases.some((phrase) => containsPhrase(`${profile.skills} ${profile.bio}`, phrase)));
  factor("skills", "Kỹ năng / nội dung", 25, requirementSkills.length ? matchingSkills.length / requirementSkills.length : null, requirementSkills.length ? `Đáp ứng ${matchingSkills.length}/${requirementSkills.length} nhóm được đề cập: ${requirementSkills.map(([name]) => name).join(", ")}.` : "Job chưa nêu kỹ năng thuộc nhóm nhận diện; chưa chấm tiêu chí này.");
  const years = [...normalizeText(job.requirements).matchAll(/\b(\d{1,2})(?:\s+(?:den\s+)?\d{1,2})?\s+nam\b/g)].map((match) => Number(match[1]));
  const minimumYears = years.length ? Math.max(...years) : null;
  factor("experience", "Kinh nghiệm", 20, minimumYears === null ? null : minimumYears === 0 ? 1 : profile.experienceYears / minimumYears, minimumYears === null ? "Yêu cầu chưa nêu số năm kinh nghiệm; chưa chấm tiêu chí này." : `Hồ sơ ${profile.experienceYears} năm; yêu cầu nêu ${minimumYears} năm.`);
  const sameLocation = canonicalLocation(profile.location) === canonicalLocation(job.location);
  factor("location", "Địa điểm", 15, !job.location ? null : remoteLocation(job.location) ? 1 : profile.location ? Number(sameLocation) : null, remoteLocation(job.location) ? "Job cho phép trực tuyến / toàn quốc." : profile.location && job.location ? sameLocation ? `Phù hợp địa điểm ${job.location}.` : `Hồ sơ ở ${profile.location}; job tại ${job.location}.` : "Chưa đủ thông tin địa điểm.");
  const hasBudget = preferences.minBudget !== undefined || preferences.maxBudget !== undefined;
  const overlap = job.budgetMax >= (preferences.minBudget ?? 0) && job.budgetMin <= (preferences.maxBudget ?? Number.MAX_SAFE_INTEGER);
  factor("budget", "Thù lao", 10, hasBudget ? Number(overlap) : null, hasBudget ? overlap ? "Khoảng thù lao của job giao với mức bạn chọn." : "Thù lao nằm ngoài mức bạn chọn." : "Chưa chọn mức thù lao mong muốn; chưa chấm tiêu chí này.");
  const assessedWeight = factors.reduce((total, item) => total + (item.points === null ? 0 : item.weight), 0);
  const totalPoints = factors.reduce((total, item) => total + (item.points ?? 0), 0);
  return { score: assessedWeight ? Math.round(totalPoints / assessedWeight * 100) : 0, assessedWeight, factors, reasons: factors.filter((item) => item.points !== null).map((item) => item.reason) };
}
