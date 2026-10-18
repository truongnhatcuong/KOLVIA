import Link from "next/link";
import { notFound } from "next/navigation";
import { jobForViewer } from "@/services/jobs";
import { currentActor } from "@/lib/auth/session";
import { dateLabel, money } from "@/lib/format";
import { ApiForm } from "@/components/ui/api-form";
import { applicationState } from "@/services/collaborations";
import { MediaImage } from "@/components/ui/media-image";
import { Icon } from "@/components/ui/icon";
import { organizationLogo } from "@/lib/demo-assets";
export const metadata = { title: "Chi tiết cơ hội" };
export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentActor();
  const job = await jobForViewer(actor, id);
  if (!job) notFound();
  const recruiting = job.status === "OPEN" && !job.completedAt && job.moderation === "APPROVED" && job.deadline > new Date();
  const state = actor?.role === "KOL" ? await applicationState(actor, id) : null;
  return (
    <main id="main-content" className="site-container content-page job-detail-page">
      <Link href="/jobs" className="back-link">
        ← Tất cả cơ hội
      </Link>
      <div className="detail-grid">
        <div>
          <section className="panel job-overview">
            <MediaImage
              src={job.media[0]?.url}
              alt={job.title}
              className="job-detail-cover"
              fallback={job.category}
            />
            <span className="tag">{job.category}</span>
            <h1 className="detail-title">{job.title}</h1>
            <p className="muted">
              {job.organizer.organizer?.companyName ?? job.organizer.name} · {job.location}
            </p>
            <div className="detail-facts">
              <div>
                <small>
                  <Icon name="briefcase" size={15} /> Ngân sách dự kiến
                </small>
                <strong>
                  {money(job.budgetMin)} – {money(job.budgetMax)}
                </strong>
              </div>
              <div>
                <small>
                  <Icon name="pin" size={15} /> Địa điểm
                </small>
                <strong>{job.location}</strong>
              </div>
              <div>
                <small>
                  <Icon name="calendar" size={15} /> Hạn ứng tuyển
                </small>
                <strong>{dateLabel(job.deadline)}</strong>
              </div>
              <div>
                <small>
                  <Icon name="calendar" size={15} /> Ngày sự kiện
                </small>
                <strong>{dateLabel(job.eventDate)}</strong>
              </div>
            </div>
          </section>
          <section className="panel">
            <h2>Mô tả công việc</h2>
            <p className="detail-copy">{job.description}</p>
          </section>
          <section className="panel">
            <h2>Quyền lợi dành cho KOL</h2><p className="detail-copy">{job.benefits || "Liên hệ nhà tổ chức để trao đổi quyền lợi cụ thể."}</p>
            <p className="mt-4 text-sm text-primary">Số lượng: {job._count.participations}/{job.capacity} KOL đã xác nhận</p>
          </section>
          <section className="panel">
            <h2>Yêu cầu đối với KOL</h2>
            <p className="detail-copy">{job.requirements}</p>
          </section>
        </div>
        <aside className="detail-aside">
          <section className="panel application-panel">
            <span className="eyebrow">Ngân sách dự kiến</span>
            <h2 style={{ color: "var(--primary)" }}>
              {money(job.budgetMin)} – {money(job.budgetMax)}
            </h2>
            {!actor ? (
              <>
                <p className="muted">Đăng nhập bằng tài khoản KOL để gửi lời ứng tuyển.</p>
                <Link href="/login" className="button" style={{ marginTop: 20 }}>
                  Đăng nhập để ứng tuyển ↗
                </Link>
              </>
            ) : actor.role !== "KOL" ? (
              <p className="muted">Ứng tuyển dành cho tài khoản KOL.</p>
            ) : state?.confirmed || state?.applied ? (
              <>
                <p className="muted">
                  {state.confirmed
                    ? "Bạn đã xác nhận tham gia Job này."
                    : "Bạn đã gửi đơn ứng tuyển cho Job này."}
                </p>
                <Link
                  href={state.confirmed ? "/kol/jobs" : "/kol/applications"}
                  className="button secondary"
                  style={{ marginTop: 20 }}
                >
                  {state.confirmed ? "Xem hợp tác của tôi" : "Theo dõi đơn ứng tuyển"}
                </Link>
              </>
            ) : !recruiting || job._count.participations >= job.capacity ? (
              <p className="notice">{recruiting ? "Job đã tuyển đủ số lượng KOL." : "Job hiện không nhận thêm yêu cầu tham gia."}</p>
            ) : (
              <ApiForm
                endpoint="/api/applications"
                extra={{ jobId: id }}
                fields={[
                  {
                    name: "message",
                    label: "Lời giới thiệu của bạn",
                    type: "textarea",
                    required: true,
                    minLength: 10,
                    maxLength: 2000,
                    placeholder: "Chia sẻ lý do bạn phù hợp và ý tưởng của bạn…",
                  },
                ]}
                submitLabel="Gửi ứng tuyển"
                redirectTo="/kol/applications"
              />
            )}
          </section>
          <section className="panel organizer-detail">
            <span className="eyebrow">Về nhà tổ chức</span>
            <div className="aside-organizer">
              <MediaImage
                src={job.organizer.media[0]?.url ?? organizationLogo(job.organizer.organizer?.companyName)}
                alt={job.organizer.organizer?.companyName ?? job.organizer.name}
                className="avatar medium"
              />
              <div>
                <strong>{job.organizer.organizer?.companyName ?? job.organizer.name}</strong>
                <p className="muted">Nhà tổ chức sự kiện</p>
              </div>
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              {job.organizer.organizer?.description}
            </p>
          </section>
          <section className="panel">
            <h2>Quy trình tuyển dụng</h2>
            <ol className="recruitment-steps">
              <li>
                <span>1</span>
                <div>
                  <strong>Gửi ứng tuyển</strong>
                  <p>Giới thiệu bản thân và ý tưởng hợp tác cho sự kiện.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Nhà tổ chức xét duyệt</strong>
                  <p>Theo dõi kết quả tại mục Đơn ứng tuyển.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Xác nhận tham gia</strong>
                  <p>Đơn được chấp nhận sẽ xuất hiện trong lịch hợp tác của bạn.</p>
                </div>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}
