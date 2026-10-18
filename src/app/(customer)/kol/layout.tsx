import type { ReactNode } from "react";
import { pageActor } from "@/lib/permissions/guards";
import { DashboardShell } from "@/components/dashboard-shell";
export default async function Layout({ children }: { children: ReactNode }) {
  const actor = await pageActor("KOL");
  return <DashboardShell actor={actor}>{children}</DashboardShell>;
}
