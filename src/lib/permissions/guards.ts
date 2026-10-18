import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { currentActor, actorSelect } from "@/lib/auth/session";
import { assert } from "@/lib/errors";
import { roleHome, type Actor } from "@/types";

export async function authorize(actor: Actor | null, roles: readonly Role[]) {
  assert(actor, 401, "Bạn cần đăng nhập để tiếp tục.");
  const user = await db.user.findUnique({ where: { id: actor.id }, select: actorSelect });
  assert(user?.active, 401, "Tài khoản không còn hoạt động.");
  assert(roles.includes(user.role), 403, "Bạn không có quyền thực hiện thao tác này.");
  return user;
}
export async function pageActor(role: Role) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (actor.role !== role) redirect(roleHome[actor.role]);
  return authorize(actor, [role]);
}
export function assertOwner(ownerId: string, actorId: string) {
  assert(ownerId === actorId, 403, "Bạn không có quyền truy cập dữ liệu này.");
}
