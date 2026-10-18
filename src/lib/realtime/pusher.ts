import { createHash, createHmac } from "node:crypto";
import { notificationChannel, notificationEvent } from "./channels";

export type PusherConfig = { appId: string; key: string; secret: string; cluster: string };
export function pusherConfig(env: Record<string, string | undefined> = process.env): PusherConfig | null {
  const appId = env.PUSHER_APP_ID ?? env.app_id;
  const key = env.PUSHER_APP_KEY ?? env.key;
  const secret = env.PUSHER_APP_SECRET ?? env.secret;
  const cluster = env.PUSHER_APP_CLUSTER ?? env.cluster;
  if (!appId || !/^\d+$/.test(appId) || !key || !/^[a-zA-Z0-9_-]+$/.test(key) || !secret || !cluster || !/^[a-z0-9-]{2,16}$/.test(cluster)) return null;
  return { appId, key, secret, cluster };
}
export function publicPusherConfig() {
  const config = pusherConfig();
  return config ? { key: config.key, cluster: config.cluster } : null;
}
export function signChannel(config: PusherConfig, socketId: string, channel: string) {
  return { auth: `${config.key}:${createHmac("sha256", config.secret).update(`${socketId}:${channel}`).digest("hex")}` };
}
export function notificationRequest(config: PusherConfig, userIds: string[], now = Date.now()) {
  const path = `/apps/${config.appId}/events`;
  const body = JSON.stringify({ name: notificationEvent, channels: [...new Set(userIds)].map(notificationChannel), data: JSON.stringify({ changed: true }) });
  const query = new URLSearchParams({ auth_key: config.key, auth_timestamp: String(Math.floor(now / 1000)), auth_version: "1.0", body_md5: createHash("md5").update(body).digest("hex") });
  query.sort();
  const signature = createHmac("sha256", config.secret).update(`POST\n${path}\n${query}`).digest("hex");
  query.set("auth_signature", signature);
  return { url: `https://api-${config.cluster}.pusher.com${path}?${query}`, body };
}
export async function publishNotificationChanges(userIds: string[]) {
  const config = pusherConfig();
  if (!config || !userIds.length) return;
  const recipients = [...new Set(userIds)];
  try {
    await Promise.all(Array.from({ length: Math.ceil(recipients.length / 100) }, async (_, index) => {
      const request = notificationRequest(config, recipients.slice(index * 100, index * 100 + 100));
      const response = await fetch(request.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: request.body, signal: AbortSignal.timeout(3000), cache: "no-store" });
      if (!response.ok) console.warn(`Pusher notification delivery failed (HTTP ${response.status}); database notification preserved.`);
    }));
  } catch {
    // Never print signed URLs, secrets or remote error bodies.
    console.warn("Pusher notification delivery unavailable; database notification preserved.");
  }
}
