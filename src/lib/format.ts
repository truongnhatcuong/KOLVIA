export const money = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
export const dateLabel = (date: Date | string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(date));
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
export const dateTimeLabel = (date: Date | string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(date));
export const withdrawalLabels: Record<string, string> = { PENDING: "Chờ duyệt rút", APPROVED: "Đã rút · Được chấp thuận", REJECTED: "Yêu cầu rút bị từ chối", LEFT_WITHOUT_APPROVAL: "Đã rút · Không được chấp thuận" };
export const withdrawalTimingLabels: Record<string, string> = { BEFORE_EVENT: "Trước sự kiện", WITHIN_24H: "Trong 24 giờ trước sự kiện", EVENT_STARTED: "Sự kiện đã bắt đầu" };
export const applicationActionLabels: Record<string, string> = { SNAPSHOT: "Trạng thái trước khi bổ sung lịch sử", SUBMITTED: "Gửi đăng ký", RESUBMITTED: "Đăng ký lại", CANCELLED: "Hủy đăng ký", ACCEPTED: "Được chấp nhận", REJECTED: "Bị từ chối", WITHDRAWN_APPROVED: "Rời với sự chấp thuận", WITHDRAWN_UNAPPROVED: "Rời không được chấp thuận" };
export const statusLabels: Record<string, string> = {
  COMPLETED: "Đã hoàn thành",
  CONFIRMED: "Đang tham gia",
  WITHDRAWAL_PENDING: "Chờ duyệt rút",
  WITHDRAWAL_REJECTED: "Yêu cầu rút bị từ chối",
  WITHDRAWN_APPROVED: "Đã rút · Được chấp thuận",
  WITHDRAWN_UNAPPROVED: "Đã rút · Không được chấp thuận",
  DRAFT: "Bản nháp",
  PENDING: "Chờ xử lý",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  ACCEPTED: "Đã chấp nhận",
  DECLINED: "Đã từ chối",
  WITHDRAWN: "Đã rút",
  OPEN: "Đang mở",
  CLOSED: "Đã đóng",
  ARCHIVED: "Đã lưu trữ",
  KOL: "KOL",
  ORGANIZER: "Organizer",
  ADMIN: "Admin",
};
