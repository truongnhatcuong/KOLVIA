"use client";
import Link from "next/link";
import { useState } from "react";
import type { withdrawals } from "@/services/withdrawals";
import { dateTimeLabel, withdrawalLabels, withdrawalTimingLabels } from "@/lib/format";
import { Empty } from "@/components/ui";
import { ApiForm, MutationButton } from "@/components/ui/api-form";
import { ActionDialog } from "@/components/ui/action-controls";
import { WithdrawalControls } from "./withdrawal-controls";

export function WithdrawalList({ items, role }: { items: Awaited<ReturnType<typeof withdrawals>>; role: "KOL" | "ORGANIZER" }) {
  const [filter, setFilter] = useState("");
  const visible = items.filter((item) => !filter || item.status === filter);
  if (!items.length) return <Empty title="Chưa có yêu cầu rút tham gia" description="Yêu cầu rút và lịch sử xử lý sẽ hiển thị tại đây." />;
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-muted">{visible.length} yêu cầu</span>
      <select aria-label="Lọc trạng thái yêu cầu rút" value={filter} onChange={(event) => setFilter(event.target.value)} className="max-w-full rounded-xl border border-line bg-white p-3 text-xs">
        <option value="">Tất cả trạng thái</option>{Object.entries(withdrawalLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
      </select>
    </div>
    <div className="list-stack">{visible.map((item) => {
      const p = item.participation;
      const finished = p.job.status === "COMPLETED" || Boolean(p.job.completedAt);
      return <article key={item.id} className="list-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><Link href={role === "ORGANIZER" ? `/organizer/jobs/${p.job.id}` : `/jobs/${p.job.id}`} className="table-title"><h3>{p.job.title}</h3></Link><p className="mt-1 text-xs text-muted">{p.kol.name} · {p.job.location}</p></div>
          <span className={`badge badge-${item.status === "LEFT_WITHOUT_APPROVAL" ? "rejected" : item.status.toLowerCase()}`}>{withdrawalLabels[item.status]}</span>
        </div>
        <p className="detail-copy whitespace-pre-wrap break-words"><strong>Lý do:</strong> {item.reason}</p>
        <div className="grid gap-2 text-xs text-muted sm:grid-cols-2">
          <p>Gửi lúc: {dateTimeLabel(item.requestedAt)}</p><p>{withdrawalTimingLabels[item.timing]}</p>
          <p>{item.sourceAtRequest === "APPLICATION" ? "Tham gia qua ứng tuyển" : "Tham gia qua lời mời"}</p>
          <p>Lịch sự kiện khi gửi: {dateTimeLabel(item.eventDateAtRequest)}</p>
          {item.reviewedAt && <p>Xử lý lúc: {dateTimeLabel(item.reviewedAt)} · {item.reviewedBy?.name}</p>}
          {item.departedAt && <p>Rời lúc: {dateTimeLabel(item.departedAt)}</p>}
        </div>
        {item.decisionNote && <p className="notice mt-4 break-words"><strong>Phản hồi của nhà tổ chức:</strong> {item.decisionNote}</p>}
        {item.status === "REJECTED" && !finished && <p className="mt-4 text-xs text-muted">KOL vẫn đang tham gia và có quyền xác nhận rời. Khi rời, hệ thống ghi nhận không được chấp thuận.</p>}
        {role === "ORGANIZER" && item.status === "PENDING" && !finished && <div className="actions mt-4">
          <MutationButton endpoint={`/api/withdrawals/${item.id}`} body={{ status: "APPROVED", note: "" }} icon="check" label="Chấp thuận rút tham gia" confirm="Chấp thuận để KOL rời Job? Số lượng tham gia và vị trí tuyển còn trống sẽ được cập nhật.">Chấp thuận</MutationButton>
          <ActionDialog icon="close" label="Từ chối yêu cầu rút" danger><ApiForm endpoint={`/api/withdrawals/${item.id}`} method="PATCH" extra={{ status: "REJECTED" }} fields={[{ name: "note", label: "Lý do từ chối", type: "textarea", required: true, minLength: 5, maxLength: 2000 }]} submitLabel="Xác nhận từ chối" /></ActionDialog>
        </div>}
        {role === "KOL" && item.status === "REJECTED" && p.status === "WITHDRAWAL_REJECTED" && <div className="actions mt-4"><WithdrawalControls participationId={p.id} status={p.status} job={p.job} request={item} /></div>}
      </article>;
    })}</div>
    {!visible.length && <Empty title="Không có yêu cầu ở trạng thái này" />}
  </>;
}
