import { assert } from "@/lib/errors";
import { isActiveParticipation } from "@/lib/db/participation";
type JobState = { status: string; completedAt?: Date | null };
export function assertWithdrawalAllowed(job: JobState) {
  assert(job.status !== "COMPLETED" && !job.completedAt, 409, "Job đã hoàn thành, không thể rút tham gia.");
}
export function withdrawalTiming(eventDate: Date, requestedAt: Date) {
  const remaining = eventDate.getTime() - requestedAt.getTime();
  return remaining <= 0 ? "EVENT_STARTED" : remaining <= 86400000 ? "WITHIN_24H" : "BEFORE_EVENT";
}
export function assertRequestable(job: JobState, participationStatus: string) {
  assertWithdrawalAllowed(job);
  assert(participationStatus === "CONFIRMED", 409, "Bạn đã gửi yêu cầu rút hoặc không còn tham gia Job.");
}
export function assertReviewable(job: JobState, participationStatus: string, requestStatus: string) {
  assertWithdrawalAllowed(job);
  assert(participationStatus === "WITHDRAWAL_PENDING" && requestStatus === "PENDING", 409, "Yêu cầu rút đã được xử lý.");
}
export function assertCanConfirmDeparture(job: JobState, participationStatus: string, requestStatus: string) {
  assertWithdrawalAllowed(job);
  assert(participationStatus === "WITHDRAWAL_REJECTED" && requestStatus === "REJECTED", 409, "Chỉ xác nhận rời sau khi yêu cầu rút bị từ chối.");
}
export function seatsAvailable(capacity: number, statuses: string[]) {
  return Math.max(0, capacity - statuses.filter(isActiveParticipation).length);
}
