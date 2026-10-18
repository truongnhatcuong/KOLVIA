import { redirect } from "next/navigation";
import { currentActor } from "@/lib/auth/session";
import { roleHome } from "@/types";
import { AuthPage } from "@/components/customer/auth-page";
export const metadata = { title: "Đăng ký" };
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const actor = await currentActor();
  if (actor) redirect(roleHome[actor.role]);
  const { role } = await searchParams;
  return <AuthPage register defaultRole={role === "ORGANIZER" ? "ORGANIZER" : "KOL"} />;
}
