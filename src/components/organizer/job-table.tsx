import Link from "next/link";
import type { ownJobs } from "@/services/jobs";
import { dateLabel } from "@/lib/format";
import { Badge, Empty } from "@/components/ui";
import { MutationButton } from "@/components/ui/api-form";
import { MediaImage } from "@/components/ui/media-image";
import { ActionLink } from "@/components/ui/action-controls";
export function JobTable({ jobs }: { jobs: Awaited<ReturnType<typeof ownJobs>> }) {
  if (!jobs.length)
    return (
      <Empty
        title="Cơ hội đầu tiên bắt đầu từ bạn"
        description="Tạo một Job, gửi kiểm duyệt và kết nối cùng nhà sáng tạo."
        href="/organizer/jobs/new"
        label="Tạo Job mới"
      />
    );
  return (
    <div className="table-wrap job-table">
      <table>
        <thead>
          <tr>
            <th>Job</th>
            <th>Kiểm duyệt</th>
            <th>Trạng thái</th>
            <th>Kết nối</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <div className="job-table-identity">
                  {job.media[0] && (
                    <MediaImage
                      src={job.media[0].url}
                      alt={job.title}
                      className="job-table-cover"
                    />
                  )}
                  <div>
                    <Link href={`/organizer/jobs/${job.id}`} className="table-title">
                      {job.title}
                    </Link>
                    <small>
                      {job.location} · Hạn {dateLabel(job.deadline)}
                    </small>
                    {job.moderationNote && (
                      <small className="field-error">{job.moderationNote}</small>
                    )}
                  </div>
                </div>
              </td>
              <td data-label="Kiểm duyệt">
                <Badge status={job.moderation} />
              </td>
              <td data-label="Trạng thái">
                <Badge status={job.status} />
              </td>
              <td data-label="Kết nối">
                {job._count.applications} ứng tuyển
                <small>{job._count.participations}/{job.capacity} đã xác nhận</small>
              </td>
              <td data-label="Thao tác">
                <div className="actions">
                  <ActionLink href={`/organizer/jobs/${job.id}`} icon="eye" label="Xem chi tiết Job" />
                  {!["ARCHIVED", "COMPLETED"].includes(job.status) && !job.completedAt && (
                    <ActionLink href={`/organizer/jobs/${job.id}/edit`} icon="edit" label="Sửa Job" />
                  )}
                  {["DRAFT", "REJECTED"].includes(job.moderation) && job.status === "OPEN" && (
                    <MutationButton
                      endpoint={`/api/jobs/${job.id}/submit`}
                      method="POST"
                      icon="send" label="Gửi Job kiểm duyệt"
                      variant=""
                    >
                      Gửi duyệt
                    </MutationButton>
                  )}
                  {!["ARCHIVED", "COMPLETED"].includes(job.status) && !job.completedAt && (
                    <MutationButton
                      endpoint={`/api/jobs/${job.id}/status`}
                      body={{ status: job.status === "OPEN" ? "CLOSED" : "OPEN" }}
                      icon={job.status === "OPEN" ? "lock" : "unlock"} label={job.status === "OPEN" ? "Đóng tuyển Job" : "Mở lại Job"}
                    >
                      {job.status === "OPEN" ? "Đóng" : "Mở lại"}
                    </MutationButton>
                  )}
                  <MutationButton
                    endpoint={`/api/jobs/${job.id}`}
                    method="DELETE"
                    icon="trash" label={job.status === "ARCHIVED" ? "Xóa Job" : "Xóa hoặc lưu trữ Job"}
                    variant="danger"
                    confirm="Xóa Job này? Job đã có kết nối sẽ được lưu trữ để giữ lịch sử."
                  >
                    {job.status === "ARCHIVED" ? "Xóa" : "Xóa / lưu trữ"}
                  </MutationButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
