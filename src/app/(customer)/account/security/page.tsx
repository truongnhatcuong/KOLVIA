import { redirect } from "next/navigation";
import { currentActor } from "@/lib/auth/session";
import { authorize } from "@/lib/permissions/guards";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeading } from "@/components/ui";
import Link from "next/link";
import { PasswordSettings } from "@/components/account/password-settings";
import { roleHome } from "@/types";

export const metadata = { title: "Đổi mật khẩu" };
export default async function Page() {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  const user = await authorize(actor, ["KOL", "ORGANIZER", "ADMIN"]);
  return <DashboardShell actor={user}>
    <PageHeading eyebrow="Cài đặt tài khoản" title="Đổi mật khẩu" description="Quản lý mật khẩu và giữ an toàn cho tài khoản của bạn." action={<Link className="button secondary small" href={roleHome[user.role]}>← Về tổng quan</Link>} />
    <PasswordSettings actor={user} />
  </DashboardShell>;
}
