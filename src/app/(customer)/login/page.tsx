import { redirect } from "next/navigation";
import { currentActor } from "@/lib/auth/session";
import { roleHome } from "@/types";
import { AuthPage } from "@/components/customer/auth-page";
export const metadata = { title: "Đăng nhập" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await currentActor();
  if (actor) redirect(roleHome[actor.role]);
  return <AuthPage passwordChanged={(await searchParams).passwordChanged === "1"} />;
}
