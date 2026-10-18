import type { adminJobs } from "@/services/admin";
import { Badge, Empty } from "@/components/ui";
import { ApiForm, MutationButton } from "@/components/ui/api-form";
import { dateLabel, money } from "@/lib/format";
import { MediaImage } from "@/components/ui/media-image";
import { ActionDialog } from "@/components/ui/action-controls";
export function AdminJobs({
  jobs,
  moderation = false,
}: {
  jobs: Awaited<ReturnType<typeof adminJobs>>;
  moderation?: boolean;
}) {
  if (!jobs.length)
    return (
      <Empty
        title={moderation ? "Đã xử lý hết Job chờ duyệt" : "Chưa có Job"}
        description={
          moderation
            ? "Job mới gửi kiểm duyệt sẽ xuất hiện tại đây."
            : "Các Job do Organizer tạo sẽ xuất hiện tại đây."
        }
      />
    );
  return (
    <div className="list-stack">
      {jobs.map((job) => (
        <article key={job.id} className="list-card">
          {job.media[0] && (
            <MediaImage src={job.media[0].url} alt={job.title} className="job-detail-cover" />
          )}
          <div className="list-card-top">
            <div>
              <h3>{job.title}</h3>
              <small>
                {job.organizer.organizer?.companyName ?? job.organizer.name} · {job.location} ·{" "}
                {job.category} · {job._count.participations}/{job.capacity} KOL
              </small>
            </div>
            <div className="actions">
              <Badge status={job.moderation} />
              <Badge status={job.status} />
            </div>
          </div>
          <p className="muted">
            {money(job.budgetMin)} – {money(job.budgetMax)} · Hạn {dateLabel(job.deadline)} · Sự
            kiện {dateLabel(job.eventDate)}
          </p>
          {job.moderationNote && <p className="notice danger">{job.moderationNote}</p>}
          <div className="actions">
          <ActionDialog icon="eye" label="Đọc nội dung Job" title={job.title}>
            <p className="detail-copy">{job.description}</p>
            <p className="detail-copy">
              <strong>Yêu cầu:</strong>
              <br />
              {job.requirements}
            </p>
            <p className="detail-copy"><strong>Quyền lợi:</strong><br />{job.benefits || "Chưa cập nhật"}</p>
          </ActionDialog>
          {moderation && job.moderation === "PENDING" ? (
            <>
              <MutationButton
                endpoint={`/api/admin/jobs/${job.id}/moderation`}
                body={{ moderation: "APPROVED", note: "" }}
                icon="check" label="Duyệt Job"
                variant=""
              >
                Duyệt Job
              </MutationButton>
              <ActionDialog icon="close" label="Từ chối Job và gửi lý do" danger>
                <ApiForm
                  endpoint={`/api/admin/jobs/${job.id}/moderation`}
                  method="PATCH"
                  extra={{ moderation: "REJECTED" }}
                  fields={[
                    {
                      name: "note",
                      label: "Lý do từ chối",
                      type: "textarea",
                      required: true,
                      minLength: 5,
                      maxLength: 2000,
                    },
                  ]}
                  submitLabel="Từ chối Job"
                />
              </ActionDialog>
            </>
          ) : (
            <>
              {job.moderation === "APPROVED" && job.status !== "ARCHIVED" && <ActionDialog icon="eye-off" label="Ẩn Job không phù hợp" danger>
                <ApiForm endpoint={`/api/admin/jobs/${job.id}/hide`} method="PATCH" fields={[{ name: "note", label: "Lý do ẩn Job", type: "textarea", required: true, minLength: 5, maxLength: 2000 }]} submitLabel="Ẩn Job và thông báo" />
              </ActionDialog>}
              {!["ARCHIVED", "COMPLETED"].includes(job.status) && !job.completedAt && (
                <MutationButton
                  endpoint={`/api/admin/jobs/${job.id}`}
                  body={{ status: job.status === "OPEN" ? "CLOSED" : "OPEN" }}
                  icon={job.status === "OPEN" ? "lock" : "unlock"} label={job.status === "OPEN" ? "Đóng Job" : "Mở lại Job"}
                >
                  {job.status === "OPEN" ? "Đóng Job" : "Mở lại Job"}
                </MutationButton>
              )}
              <MutationButton
                endpoint={`/api/admin/jobs/${job.id}`}
                method="DELETE"
                icon="trash" label="Xóa hoặc lưu trữ Job"
                variant="danger"
                confirm="Xóa Job này? Nếu đã có kết nối, Job sẽ được lưu trữ."
              >
                Xóa / lưu trữ
              </MutationButton>
            </>
          )}
          </div>
        </article>
      ))}
    </div>
  );
}
