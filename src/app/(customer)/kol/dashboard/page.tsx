import Link from "next/link";
import { pageActor } from "@/lib/permissions/guards";
import { overview, confirmedJobs } from "@/services/dashboard";
import { applications } from "@/services/collaborations";
import { kolInvitationCards } from "@/services/kol-offers";
import { publicJobs } from "@/lib/db/queries";
import { PageHeading, StatCards, Empty } from "@/components/ui";
import { JobCard } from "@/components/customer/cards";
import { CollaborationList } from "@/components/collaboration-list";
import { dateLabel } from "@/lib/format";
import { RecommendationsPanel } from "@/components/ai/recommendations-panel";
import { InvitationOfferCard } from "@/components/kol/job-offer-card";
import { Icon } from "@/components/ui/icon";
export const metadata = { title: "Không gian KOL" };
export default async function Page() {
  const actor = await pageActor("KOL");
  const [stats, recent, confirmed, invites, jobs] = await Promise.all([
    overview(actor),
    applications(actor),
    confirmedJobs(actor),
    kolInvitationCards(actor),
    publicJobs(),
  ]);
  const pendingInvites = invites.filter((item) => item.status === "PENDING");
  return (
    <>
      <PageHeading
        eyebrow="Không gian nhà sáng tạo"
        title={`Xin chào, ${actor.name}! 👋`}
        description="Khám phá cơ hội và theo dõi những kết nối của bạn."
        action={
          <div className="actions">
            <Link href="/kol/profile" className="button secondary">
              Cập nhật Portfolio
            </Link>
            <Link href="/jobs" className="button">
              Tìm kiếm Job mới ↗
            </Link>
          </div>
        }
      />
      <StatCards items={stats} />
      {pendingInvites.length > 0 && <section className="kol-invitation-section"><div className="section-heading"><div className="kol-invitation-title"><span><Icon name="spark" size={20} /></span><h2>Lời mời hợp tác dành cho bạn</h2><small>Chờ phản hồi</small></div><Link href="/kol/invitations" className="section-link">Xem tất cả {pendingInvites.length} lời mời →</Link></div><div className="kol-offer-list">{pendingInvites.slice(0, 2).map((item) => <InvitationOfferCard key={item.id} item={item} />)}</div></section>}
      <RecommendationsPanel />
      <div className="workspace-grid kol-workspace">
        <div>
          <div className="section-heading">
            <div>
              <h2>Cơ hội mới nhất</h2>
              <p className="muted">Khám phá Job đang tuyển và chọn cơ hội bạn yêu thích.</p>
            </div>
            <Link href="/jobs" className="section-link">
              Xem tất cả →
            </Link>
          </div>
          {jobs.items.length ? (
            <div className="workspace-jobs">
              {jobs.items.slice(0, 3).map((job) => (
                <JobCard key={job.id} job={job} variant="workspace" />
              ))}
            </div>
          ) : (
            <Empty title="Chưa có Job đang tuyển" />
          )}
          <section className="panel recent-applications" style={{ marginTop: 30 }}>
            <div className="section-heading">
              <h2>Ứng tuyển gần đây</h2>
              <Link href="/kol/applications" className="section-link">
                Xem tất cả →
              </Link>
            </div>
            <CollaborationList items={recent.slice(0, 3)} kind="applications" role="KOL" />
          </section>
        </div>
        <aside>
          <section className="panel">
            <h2>Lịch hợp tác đã xác nhận</h2>
            {confirmed.length ? (
              <div className="list-stack">
                {confirmed.slice(0, 4).map((c) => (
                  <article className="schedule-item" key={c.id}>
                    <span className="schedule-date">{dateLabel(c.job.eventDate)}</span>
                    <h3>{c.job.title}</h3>
                    <p className="muted">{c.job.location}</p>
                    <small>{c.job.organizer.organizer?.companyName ?? c.job.organizer.name}</small>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title="Chưa có lịch hợp tác"
                description="Các Job đã xác nhận sẽ xuất hiện ở đây."
              />
            )}
          </section>
          <section className="panel welcome-panel">
            <div>
              <h2>Hoàn thiện hồ sơ của bạn</h2>
              <p className="muted">
                Thêm ảnh, portfolio và các kênh nội dung để nhà tổ chức hiểu hơn về bạn.
              </p>
              <Link
                href="/kol/profile"
                className="button secondary small"
                style={{ marginTop: 16 }}
              >
                Cập nhật hồ sơ ↗
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
