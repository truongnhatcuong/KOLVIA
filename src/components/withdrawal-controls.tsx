import { ApiForm, MutationButton } from "@/components/ui/api-form";
import { ActionDialog, ActionLink } from "@/components/ui/action-controls";

export function WithdrawalControls({ participationId, status, job, request }: {
  participationId: string; status: string; job: { status: string; completedAt?: Date | string | null }; request?: { id: string; status: string };
}) {
  if (status.startsWith("WITHDRAWN_")) return <ActionLink href="/kol/withdrawals" icon="eye" label="Xem lịch sử rút tham gia" />;
  if (job.status === "COMPLETED" || job.completedAt) return <p className="text-xs text-muted">Job đã hoàn thành, không thể rút tham gia.</p>;
  if (status === "CONFIRMED") return <ActionDialog icon="logout" label="Rút tham gia" title="Yêu cầu rút tham gia">
    <p className="mb-4 text-sm text-muted">Yêu cầu sẽ được gửi tới nhà tổ chức. Bạn vẫn được tính trong danh sách tham gia cho đến khi được chấp thuận hoặc xác nhận rời sau khi bị từ chối. Bạn có thể gửi yêu cầu kể cả khi sự kiện sắp hoặc đã bắt đầu.</p>
    <ApiForm endpoint="/api/withdrawals" method="POST" extra={{ participationId }} fields={[{ name: "reason", label: "Lý do rút tham gia", type: "textarea", required: true, minLength: 5, maxLength: 2000 }]} submitLabel="Xác nhận gửi yêu cầu rút" />
  </ActionDialog>;
  if (status === "WITHDRAWAL_REJECTED" && request?.status === "REJECTED") return <MutationButton endpoint={`/api/withdrawals/${request.id}/depart`} method="POST" body={{ confirm: true }} icon="logout" label="Xác nhận rời không được chấp thuận" variant="danger" confirm="Nhà tổ chức đã từ chối yêu cầu rút. Bạn vẫn muốn rời? Hệ thống sẽ ghi nhận rút không được chấp thuận và giải phóng vị trí tuyển.">Xác nhận rời</MutationButton>;
  return <ActionLink href="/kol/withdrawals" icon="eye" label="Theo dõi yêu cầu rút tham gia" />;
}
