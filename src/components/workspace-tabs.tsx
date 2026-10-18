import Link from "next/link";
export function WorkspaceTabs({
  role,
  active,
}: {
  role: "kol" | "organizer";
  active: "applications" | "invitations";
}) {
  return (
    <nav className="workspace-tabs" aria-label="Quản lý kết nối">
      <Link className={active === "applications" ? "active" : ""} href={`/${role}/applications`}>
        {role === "kol" ? "Đơn ứng tuyển của tôi" : "Ứng viên ứng tuyển"}
      </Link>
      <Link className={active === "invitations" ? "active" : ""} href={`/${role}/invitations`}>
        Lời mời hợp tác
      </Link>
    </nav>
  );
}
