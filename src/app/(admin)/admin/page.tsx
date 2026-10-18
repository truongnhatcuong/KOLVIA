import Link from "next/link";
import { pageActor } from "@/lib/permissions/guards";
import { adminOverview, adminJobs, adminActivity } from "@/services/admin";
import { PageHeading, StatCards } from "@/components/ui";
import { ActivityChart } from "@/components/admin/activity-chart";
import { dateLabel } from "@/lib/format";
import { AdminJobs } from "@/components/admin/jobs";
export const metadata = { title: "Quản trị KOLVIA" };
export default async function Page() {
  const actor = await pageActor("ADMIN");
  const [stats, pending, activity] = await Promise.all([adminOverview(actor), adminJobs(actor, true), adminActivity(actor)]);
  return (
    <>
      <PageHeading
        eyebrow="Quản trị nền tảng"
        title="Tổng quan KOLVIA."
        description="Theo dõi hoạt động và xử lý nội dung cần kiểm duyệt."
      />
      <StatCards
        items={[
          { label: "KOL/KOC", value: stats.kols },
          { label: "Nhà tổ chức", value: stats.organizers },
          { label: "Lượt ứng tuyển", value: stats.applications },
          { label: "Lời mời", value: stats.invitations },
          { label: "Tổng số Job", value: stats.jobs },
          { label: "Job chờ duyệt", value: stats.pending },
          { label: "Hợp tác xác nhận", value: stats.collaborations },
        ]}
      />
      <ActivityChart data={activity} />
      <section className="panel mb-8"><h2>Kết nối gần đây</h2>{activity.recent.length ? <div className="table-wrap mt-5"><table><thead><tr><th>KOL</th><th>Sự kiện / Job</th><th>Nhà tổ chức</th><th>Ngày xác nhận</th></tr></thead><tbody>{activity.recent.map((item) => <tr key={item.id}><td>{item.kol.name}</td><td>{item.job.title}<small>{item.source === "APPLICATION" ? "Qua ứng tuyển" : "Qua lời mời"}</small></td><td>{item.job.organizer.organizer?.companyName ?? item.job.organizer.name}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-muted">Chưa có kết nối được xác nhận.</p>}</section>
      <div className="section-heading">
        <h2>Cần kiểm duyệt</h2>
        <Link href="/admin/moderation" className="section-link">
          Xem tất cả →
        </Link>
      </div>
      <AdminJobs jobs={pending.slice(0, 4)} moderation />
    </>
  );
}
