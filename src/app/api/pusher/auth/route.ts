import { api } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { authorize } from "@/lib/permissions/guards";
import { assert } from "@/lib/errors";
import { notificationChannel, validSocketId } from "@/lib/realtime/channels";
import { pusherConfig, signChannel } from "@/lib/realtime/pusher";

export const runtime = "nodejs";
export const POST = api(async (request) => {
  const actor = await authorize(await currentActor(), ["KOL", "ORGANIZER", "ADMIN"]);
  const body = await request.text();
  assert(body.length <= 2000, 413, "Dữ liệu gửi lên quá lớn.");
  const values = new URLSearchParams(body);
  const socketId = values.get("socket_id") ?? "";
  const channel = values.get("channel_name") ?? "";
  assert(validSocketId(socketId), 422, "Socket không hợp lệ.");
  assert(channel === notificationChannel(actor.id), 403, "Bạn không có quyền nhận thông báo của tài khoản khác.");
  const config = pusherConfig();
  assert(config, 503, "Realtime chưa được cấu hình.");
  return signChannel(config, socketId, channel);
}, true);
