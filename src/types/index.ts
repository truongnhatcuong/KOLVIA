import type { Role } from "@prisma/client";

export type Actor = { id: string; name: string; email: string; role: Role; active: boolean };
export const categories = [
  "Lifestyle",
  "Beauty",
  "Fashion",
  "Food",
  "Travel",
  "Technology",
  "Fitness",
] as const;
export const roleHome = {
  KOL: "/kol/dashboard",
  ORGANIZER: "/organizer/dashboard",
  ADMIN: "/admin",
} as const;
