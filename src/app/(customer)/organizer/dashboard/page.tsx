import Link from "next/link";
import { pageActor } from "@/lib/permissions/guards";
import { overview } from "@/services/dashboard";
import { ownJobs } from "@/services/jobs";
import { applications } from "@/services/collaborations";
import { PageHeading, StatCards, Badge, Empty } from "@/components/ui";
import { CollaborationList } from "@/components/collaboration-list";
import { dateLabel, money } from "@/lib/format";
import { publicKols } from "@/lib/db/queries";
import { KolCard } from "@/components/customer/cards";
import { ActionLink } from "@/components/ui/action-controls";
export const metadata = { title: "Không gian Organizer" };
export default async function Page() {
  const actor = await pageActor("ORGANIZER");
  const [stats, jobs, applicants, creators] = await Promise.all([
    overview(actor),
    ownJobs(actor),
    applications(actor),
    publicKols(),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="Không gian nhà tổ chức"
        title={`Chào mừng trở lại, ${actor.name}!`}
        description="Quản lý Job, xét duyệt ứng viên và theo dõi hợp tác tại đây."
        action={
          <div className="actions">
            <Link href="/organizer/jobs/new" className="button">
              + Đăng Job mới
            </Link>
            <Link href="/kols" className="button secondary">
              Khám phá KOL
            </Link>
          </div>
        }
      />
      <StatCards items={stats} />
      <div className="workspace-grid organizer-workspace">
        <div>
          <section className="panel campaign-panel">
            <div className="section-heading">
              <h2>Job đang triển khai</h2>
              <Link href="/organizer/jobs" className="section-link">
                Quản lý tất cả →
              </Link>
            </div>
            {jobs.length ? (
              <div className="list-stack">
                {jobs.slice(0, 5).map((job) => (
                  <article className="list-card managed-job" key={job.id}>
                    <div className="list-card-top">
                      <div>
                        <span className="tag">{job.category}</span>
                        <Link href={`/organizer/jobs/${job.id}`}>
                          <h3 style={{ marginTop: 12 }}>{job.title}</h3>
                        </Link>
                        <small>
                          {job.location} · Hạn {dateLabel(job.deadline)}
                        </small>
                      </div>
                      <Badge status={job.moderation} />
                    </div>
                    <div className="managed-job-stats">
                      <div>
                        <span>Ngân sách</span>
                        <strong>
                          {money(job.budgetMin)} – {money(job.budgetMax)}
                        </strong>
                      </div>
                      <div>
                        <span>Ứng tuyển</span>
                        <strong>{job._count.applications}</strong>
                      </div>
                      <div>
                        <span>Đã xác nhận</span>
                        <strong>{job._count.participations}/{job.capacity}</strong>
                      </div>
                    </div>
                    <div className="actions">
                      <ActionLink href={`/organizer/jobs/${job.id}`} icon="briefcase" label="Quản lý Job" />
                      {!["ARCHIVED", "COMPLETED"].includes(job.status) && !job.completedAt && (
                        <ActionLink href={`/organizer/jobs/${job.id}/edit`} icon="edit" label="Chỉnh sửa Job" />
                      )}
                      <Badge status={job.status} />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title="Tạo Job đầu tiên của bạn"
                href="/organizer/jobs/new"
                label="Đăng Job mới"
              />
            )}
          </section>
          <section className="panel creator-discovery">
            <div className="section-heading">
              <div>
                <h2>Khám phá nhà sáng tạo</h2>
                <p className="muted">Hồ sơ công khai để bạn tìm kiếm và gửi lời mời phù hợp.</p>
              </div>
              <Link href="/kols" className="section-link">
                Xem tất cả →
              </Link>
            </div>
            {creators.items.length ? (
              <div className="creator-discovery-list">
                {creators.items.slice(0, 3).map((kol) => (
                  <KolCard key={kol.id} kol={kol} compact />
                ))}
              </div>
            ) : (
              <Empty title="Chưa có hồ sơ công khai" />
            )}
          </section>
        </div>
        <aside>
          <section className="panel">
            <div className="section-heading">
              <h2>Ứng viên chờ duyệt</h2>
              <Link href="/organizer/applications" className="section-link">
                Xem →
              </Link>
            </div>
            <CollaborationList
              compact
              items={applicants.filter((a) => a.status === "PENDING").slice(0, 2)}
              kind="applications"
              role="ORGANIZER"
            />
          </section>
          <section className="panel workflow-panel">
            <div>
              <h2>Kết nối nhà sáng tạo cho sự kiện</h2>
              <p className="muted">
                Khám phá hồ sơ KOL theo lĩnh vực và địa điểm để bắt đầu một lời mời.
              </p>
              <ol>
                <li>Tạo Job và gửi kiểm duyệt.</li>
                <li>Xem ứng viên hoặc gửi lời mời.</li>
                <li>Theo dõi KOL đã xác nhận.</li>
              </ol>
              <Link href="/kols" className="button small secondary" style={{ marginTop: 18 }}>
                Tìm kiếm KOL ↗
              </Link>
            </div>
          </section>
          <section className="panel">
            <h2>Giới thiệu tổ chức</h2>
            <p className="muted">Cập nhật logo và thông tin tổ chức để KOL biết thêm về bạn.</p>
            <Link className="section-link" style={{ marginTop: 18 }} href="/organizer/profile">
              Cập nhật hồ sơ →
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
