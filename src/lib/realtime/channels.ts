export const notificationEvent = "notifications.changed";
export const notificationLocalEvent = "kolvia:notifications-changed";
export function refreshCollaborationPage(pathname: string | null) {
  return Boolean(pathname && (/^\/(?:kol|organizer)\/(?:withdrawals|applications|invitations|jobs)$/.test(pathname)
    || (pathname !== "/organizer/jobs/new" && /^\/organizer\/jobs\/[^/]+$/.test(pathname))));
}
export function notificationChannel(userId: string) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(userId)) throw new Error("Invalid notification recipient.");
  return `private-notifications-${userId}`;
}
export function validSocketId(value: string) {
  return /^\d{1,20}\.\d{1,20}$/.test(value);
}
