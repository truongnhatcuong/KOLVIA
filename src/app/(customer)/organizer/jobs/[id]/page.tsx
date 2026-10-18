import Link from "next/link";
import { notFound } from "next/navigation";
import { pageActor } from "@/lib/permissions/guards";
import { ownJob, participants } from "@/services/jobs";
import { AppError } from "@/lib/errors";
import { PageHeading, Badge, Empty } from "@/components/ui";
import { MutationButton } from "@/components/ui/api-form";
import { dateLabel, money } from "@/lib/format";
import { ownMedia } from "@/services/media";
import { ImageUpload } from "@/components/ui/image-upload";
import { ActionLink } from "@/components/ui/action-controls";
import { withdrawals } from "@/services/withdrawals";
import { WithdrawalList } from "@/components/withdrawal-list";
export const metadata = { title: "Chi tiết Job của tôi" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await pageActor("ORGANIZER");
  const { id } = await params;
  const job = await ownJob(actor, id).catch((error) => {
    if (error instanceof AppError && [403, 404].includes(error.status)) notFound();
    throw error;
  });
  const roster = await participants(actor, id);
  const media = await ownMedia(actor, id);
  const withdrawalItems = await withdrawals(actor, id);
  return (
    <>
      <PageHeading
        title={job.title}
        description={`${job.location} · ${money(job.budgetMin)} – ${money(job.budgetMax)}`}
        action={
          !["ARCHIVED", "COMPLETED"].includes(job.status) && !job.completedAt && (
            <ActionLink href={`/organizer/jobs/${id}/edit`} icon="edit" label="Sửa Job" />
          )
        }
      />
      <section className="panel">
        {!["ARCHIVED", "COMPLETED"].includes(job.status) && !job.completedAt && (
          <ImageUpload
            input={{ target: "JOB_COVER", jobId: id }}
            label="Ảnh bìa Job"
            assets={media}
            enabled={Boolean(process.env.UPLOADTHING_TOKEN)}
          />
        )}
        <div className="actions">
          <Badge status={job.moderation} />
          <Badge status={job.status} />
          {job.moderation === "APPROVED" && !["ARCHIVED", "COMPLETED"].includes(job.status) && !job.completedAt && <MutationButton endpoint={`/api/jobs/${id}/status`} body={{ status: "COMPLETED" }} icon="check" label="Đánh dấu Job hoàn thành" confirm="Đánh dấu Job đã hoàn thành? Sau đó không thể mở lại, sửa Job hoặc rút tham gia. Các yêu cầu rút đang chờ cần được xử lý trước.">Hoàn thành Job</MutationButton>}
          {["DRAFT", "REJECTED"].includes(job.moderation) && job.status === "OPEN" && (
            <MutationButton endpoint={`/api/jobs/${id}/submit`} method="POST" variant="" icon="send" label="Gửi Job kiểm duyệt">
              Gửi kiểm duyệt
            </MutationButton>
          )}
        </div>
        {job.moderationNote && (
          <p className="notice danger">Ghi chú kiểm duyệt: {job.moderationNote}</p>
        )}
        <div className="detail-facts">
          <div>
            <small>Hạn ứng tuyển</small>
            <strong>{dateLabel(job.deadline)}</strong>
          </div>
          <div>
            <small>Ngày sự kiện</small>
            <strong>{dateLabel(job.eventDate)}</strong>
          </div>
        </div>
        <p className="mt-5 text-sm text-primary">Đang tham gia {roster.length}/{job.capacity} KOL · Còn {Math.max(0, job.capacity - roster.length)} vị trí</p>
        <h2>Mô tả</h2>
        <p className="detail-copy">{job.description}</p>
        <h2 style={{ marginTop: 25 }}>Yêu cầu</h2>
        <p className="detail-copy">{job.requirements}</p>
        <h2 style={{ marginTop: 25 }}>Quyền lợi</h2>
        <p className="detail-copy">{job.benefits || "Chưa cập nhật"}</p>
      </section>
      {job.status === "OPEN" && job.moderation === "APPROVED" && !job.completedAt && job.deadline > new Date() && job.eventDate > new Date() && roster.length < job.capacity && <div className="organizer-match-shortcut"><div><h2>Tìm KOL phù hợp</h2><p>Đối chiếu hồ sơ và gửi lời mời tại trang Khám phá KOL.</p></div><Link className="button" href={`/kols?matchJob=${id}`}>Khám phá KOL ↗</Link></div>}
      <section className="panel">
        <h2>KOL đã xác nhận ({roster.length})</h2>
        {roster.length ? (
          <div className="list-stack">
            {roster.map((p) => (
              <div key={p.id}>
                <Link className="table-title" href={`/kols/${p.kol.id}`}>
                  {p.kol.name}
                </Link>
                <p className="muted">
                  {p.kol.kol?.category} · {p.kol.kol?.location} ·{" "}
                  {p.source === "APPLICATION" ? "Qua ứng tuyển" : "Qua lời mời"}
                </p>
                <Badge status={p.status} />
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Chưa có KOL xác nhận"
            description="Duyệt đơn ứng tuyển hoặc gửi lời mời để bắt đầu hợp tác."
          />
        )}
        <div className="actions" style={{ marginTop: 20 }}>
          <Link href="/organizer/applications" className="button secondary small">
            Xem ứng tuyển
          </Link>
          <Link href="/kols" className="button secondary small">
            Tìm KOL ↗
          </Link>
        </div>
      </section>
      <section className="panel"><h2 className="mb-4">Yêu cầu rút & lịch sử rời Job</h2><WithdrawalList items={withdrawalItems} role="ORGANIZER" /></section>
    </>
  );
}
