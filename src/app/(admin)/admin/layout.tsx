import type { ReactNode } from "react";
import { pageActor } from "@/lib/permissions/guards";
import { DashboardShell } from "@/components/dashboard-shell";
export default async function AdminLayout({ children }: { children: ReactNode }) {
  return <DashboardShell actor={await pageActor("ADMIN")}>{children}</DashboardShell>;
}
