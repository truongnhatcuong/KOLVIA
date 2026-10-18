import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { notifications, readNotification, notificationUnread } from "@/services/notifications";
import { filtersSchema, notificationActionSchema } from "@/lib/validations";
export const GET = api(async (request) => {
  if (new URL(request.url).searchParams.get("summary") === "1") return notificationUnread(await currentActor());
  const { page } = filtersSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return notifications(await currentActor(), page);
});
export const PATCH = api(async (request) => {
  notificationActionSchema.parse(await jsonBody(request));
  return readNotification(await currentActor());
}, true);
