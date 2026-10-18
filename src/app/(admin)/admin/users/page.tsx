import { pageActor } from "@/lib/permissions/guards";
import { adminUsers } from "@/services/admin";
import { PageHeading, Badge, Empty } from "@/components/ui";
import { MutationButton } from "@/components/ui/api-form";
import { dateLabel } from "@/lib/format";
export const metadata = { title: "Quản lý tài khoản" };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const actor = await pageActor("ADMIN");
  const input = await searchParams;
  const role = ["KOL", "ORGANIZER", "ADMIN"].includes(input.role ?? "") ? input.role as "KOL" | "ORGANIZER" | "ADMIN" : undefined;
  const raw = input.q;
  const q = typeof raw === "string" ? raw.slice(0, 100) : "";
  const users = (await adminUsers(actor, role)).filter((u) =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Quản lý tài khoản."
        description="Theo dõi vai trò và khóa hoặc mở lại tài khoản người dùng."
      />
      <form className="search-filters" action="/admin/users">
        <label>
          <span className="sr-only">Tìm tài khoản</span>
          <input name="q" defaultValue={q} placeholder="Tên, email hoặc vai trò…" maxLength={100} />
        </label>
        <select name="role" defaultValue={role ?? ""} aria-label="Lọc vai trò"><option value="">Tất cả vai trò</option><option value="KOL">KOL/KOC</option><option value="ORGANIZER">Nhà tổ chức</option><option value="ADMIN">Admin</option></select>
        <button className="button">Tìm kiếm</button>
      </form>
      {users.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tài khoản</th>
                <th>Vai trò</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </td>
                  <td>
                    <Badge status={u.role} />
                  </td>
                  <td>{dateLabel(u.createdAt)}</td>
                  <td>
                    <span className={`badge ${u.active ? "badge-approved" : "badge-rejected"}`}>
                      {u.active ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td>
                    {u.role !== "ADMIN" && (
                      <MutationButton
                        endpoint={`/api/admin/users/${u.id}`}
                        body={{ active: !u.active }}
                        icon={u.active ? "lock" : "unlock"} label={`${u.active ? "Khóa" : "Mở khóa"} tài khoản ${u.name}`}
                        confirm={u.active ? `Khóa tài khoản ${u.name}?` : undefined}
                        variant={u.active ? "danger" : "secondary"}
                      >
                        {u.active ? "Khóa" : "Mở lại"}
                      </MutationButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Không tìm thấy tài khoản" description="Thử tìm kiếm bằng từ khóa khác." />
      )}
    </>
  );
}
