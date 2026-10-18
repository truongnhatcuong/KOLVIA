"use client";
import { useState } from "react";
import Link from "next/link";
import type { applications, invitations } from "@/services/collaborations";
import { dateLabel, dateTimeLabel, money, statusLabels, applicationActionLabels } from "@/lib/format";
import { MediaImage } from "@/components/ui/media-image";
import { defaultAvatar } from "@/lib/demo-assets";
import { Badge, Empty } from "@/components/ui";
import { MutationButton } from "@/components/ui/api-form";
import { ActionLink } from "@/components/ui/action-controls";
import { WithdrawalControls } from "./withdrawal-controls";

type Items = Awaited<ReturnType<typeof applications>> | Awaited<ReturnType<typeof invitations>>;
export function CollaborationList({
  items,
  role,
  kind,
  filterable = false,
  compact = false,
}: {
  items: Items;
  role: "KOL" | "ORGANIZER";
  kind: "applications" | "invitations";
  filterable?: boolean;
  compact?: boolean;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const filtered = items.filter(
    (item) =>
      (!status || item.status === status) &&
      `${item.job.title} ${item.kol.name}`
        .toLocaleLowerCase("vi")
        .includes(q.toLocaleLowerCase("vi")),
  );
  if (!items.length)
    return (
      <Empty
        title={kind === "applications" ? "Chưa có đơn ứng tuyển" : "Chưa có lời mời hợp tác"}
        description={
          role === "KOL"
            ? "Khám phá các cơ hội và hoàn thiện hồ sơ để bắt đầu kết nối."
            : "Tạo Job và tìm kiếm nhà sáng tạo phù hợp để bắt đầu hợp tác."
        }
        href={role === "KOL" ? "/jobs" : "/kols"}
        label={role === "KOL" ? "Khám phá cơ hội" : "Tìm kiếm KOL"}
      />
    );
  return (
    <div className={`connection-list ${compact ? "compact" : ""}`}>
      {filterable && (
        <div className="collaboration-filters">
          <label>
            <span className="sr-only">Tìm Job hoặc KOL</span>
            <input
              placeholder="Tìm theo tên Job hoặc KOL…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Trạng thái kết nối</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {[...new Set(items.map((item) => item.status))].map((s) => (
                <option value={s} key={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <span>{filtered.length} kết nối</span>
        </div>
      )}
      <div className="list-stack">
        {filtered.map((item) => (
          <article className="list-card" key={item.id}>
            <div className="connection-progress" aria-label="Tiến trình hợp tác">
              {(kind === "applications"
                ? ["Đã gửi hồ sơ", "Xét duyệt", "Xác nhận hợp tác"]
                : ["Đã gửi lời mời", "KOL phản hồi", "Xác nhận hợp tác"]
              ).map((label, index) => (
                <span
                  key={label}
                  className={
                    index === 0 || item.status === "ACCEPTED"
                      ? "complete"
                      : item.status === "PENDING" && index === 1
                        ? "current"
                        : ""
                  }
                >
                  <i>{index === 0 || item.status === "ACCEPTED" ? "✓" : index + 1}</i>
                  {label}
                </span>
              ))}
            </div>
            <div className="list-card-top">
              <div>
                {role === "ORGANIZER" && (
                  <div className="candidate-identity">
                    <MediaImage
                      src={item.kol.media[0]?.url ?? item.kol.demoAvatar ?? defaultAvatar}
                      alt={item.kol.name}
                      className="avatar medium"
                    />
                    <div>
                      <strong>{item.kol.name}</strong>
                      <small>
                        {item.kol.kol?.category} · {item.kol.kol?.location} · {item.kol.kol?.experienceYears ?? 0} năm kinh nghiệm
                      </small>
                    </div>
                  </div>
                )}
                <Link
                  className="table-title"
                  href={
                    role === "ORGANIZER" ? `/organizer/jobs/${item.job.id}` : `/jobs/${item.job.id}`
                  }
                >
                  <h3>{item.job.title}</h3>
                </Link>
                <small>
                  {role === "KOL"
                    ? (item.job.organizer.organizer?.companyName ?? item.job.organizer.name)
                    : item.kol.name}{" "}
                  · {dateLabel(item.createdAt)}
                </small>
              </div>
              <Badge status={item.status} label={item.status === "WITHDRAWN" && "history" in item && item.history[0]?.action === "CANCELLED" ? "Đã hủy đăng ký" : undefined} />
            </div>
            <div className="collaboration-facts">
              <span>{item.job.location}</span>
              <span>{item.job._count.participations}/{item.job.capacity} KOL</span>
              <strong>
                {money(item.job.budgetMin)} – {money(item.job.budgetMax)}
              </strong>
            </div>
            <p className="detail-copy">{item.message}</p>
            {item.participation && ["ACCEPTED", "WITHDRAWN"].includes(item.status) && item.participation.status !== "CONFIRMED" && !("history" in item && item.history[0]?.action === "CANCELLED") && <div className="mb-3"><Badge status={item.participation.status} /></div>}
            {"history" in item && item.history.length > 0 && <details className="mb-4 text-xs"><summary>Lịch sử đăng ký ({item.history.length})</summary><ol className="mt-3 grid gap-3">{item.history.map((entry) => <li key={entry.id}><strong>{applicationActionLabels[entry.action] ?? statusLabels[entry.status]}</strong><span className="ml-2 text-muted">{dateTimeLabel(entry.occurredAt)}</span><p className="mt-1 whitespace-pre-wrap text-muted">{entry.message}</p></li>)}</ol></details>}
            {role === "KOL" && item.participation && item.status === "ACCEPTED" && <div className="actions mb-4"><WithdrawalControls participationId={item.participation.id} status={item.participation.status} job={item.job} request={item.participation.withdrawals[0]} /></div>}
            {role === "ORGANIZER" && item.participation?.status === "WITHDRAWAL_PENDING" && <div className="actions mb-4"><ActionLink href="/organizer/withdrawals" icon="logout" label="Xử lý yêu cầu rút tham gia" /></div>}
            {item.status === "PENDING" && item.job.status !== "COMPLETED" && !item.job.completedAt && (
              <div className="actions">
                {kind === "applications" && role === "ORGANIZER" ? (
                  <>
                    <MutationButton
                      endpoint={`/api/applications/${item.id}`}
                      body={{ status: "ACCEPTED" }}
                      icon="check" label="Chấp nhận ứng viên"
                      variant=""
                    >
                      Chấp nhận
                    </MutationButton>
                    <MutationButton
                      endpoint={`/api/applications/${item.id}`}
                      body={{ status: "REJECTED" }}
                      icon="close" label="Từ chối ứng viên" variant="danger"
                    >
                      Từ chối
                    </MutationButton>
                    <ActionLink href={`/kols/${item.kol.id}`} icon="profile" label="Xem hồ sơ KOL" />
                  </>
                ) : kind === "applications" ? (
                  <MutationButton
                    endpoint={`/api/applications/${item.id}`}
                    body={{ status: "WITHDRAWN" }}
                    icon="logout" label="Hủy đăng ký"
                    confirm="Hủy đăng ký đang chờ duyệt? Hệ thống sẽ giữ lịch sử và thông báo cho nhà tổ chức."
                  >
                    Hủy đăng ký
                  </MutationButton>
                ) : role === "KOL" ? (
                  <>
                    <MutationButton
                      endpoint={`/api/invitations/${item.id}`}
                      body={{ status: "ACCEPTED" }}
                      icon="check" label="Chấp nhận lời mời tham gia"
                      variant=""
                    >
                      Xác nhận tham gia
                    </MutationButton>
                    <MutationButton
                      endpoint={`/api/invitations/${item.id}`}
                      body={{ status: "DECLINED" }}
                      icon="close" label="Từ chối lời mời" variant="danger"
                    >
                      Từ chối
                    </MutationButton>
                  </>
                ) : (
                  <span className="muted">Đang chờ KOL phản hồi</span>
                )}
              </div>
            )}
          </article>
        ))}
        {filtered.length === 0 && (
          <Empty
            title="Không tìm thấy kết nối"
            description="Thử thay đổi từ khóa hoặc trạng thái."
          />
        )}
      </div>
    </div>
  );
}
