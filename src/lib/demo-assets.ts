// Illustrative AI portraits belong only to the explicitly seeded demo accounts.
// Uploaded photos always take precedence. No real account receives a fake portrait.
const demoSlugs = ["linh", "an", "khanh", "mai", "huy", "thao"] as const;

export function demoPortrait(email: string): string | null {
  if (email === "linh@kolvia.local" || email === process.env.DEMO_KOL_EMAIL) return "/images/demo-kols/linh.png";
  if (email === "organizer@kolvia.local" || email === process.env.DEMO_ORGANIZER_EMAIL) return "/images/demo-organizers/minh-anh.png";
  if (email === "travel-organizer@kolvia.local") return "/images/demo-organizers/tuan.png";
  const slug = demoSlugs.find((value) => email === `${value}@kolvia.local`);
  return slug ? `/images/demo-kols/${slug}.png` : null;
}

export const defaultAvatar = "/images/default-avatar.svg";
export function organizationLogo(companyName?: string | null): string {
  if (companyName === "The Social Studio") return "/images/social-studio.svg";
  if (companyName === "Vietnam Experience Studio" || companyName === "Vietnam Experience Studio (Demo)") return "/images/travel-studio.svg";
  return "/images/default-organization.svg";
}

export const categoryLabels: Record<string, string> = {
  Lifestyle: "Phong cách sống",
  Beauty: "Làm đẹp & Mỹ phẩm",
  Fashion: "Thời trang & Stylist",
  Food: "Ẩm thực & F&B",
  Travel: "Du lịch & Khám phá",
  Technology: "Công nghệ & Gadgets",
  Fitness: "Fitness & Sức khỏe",
};
