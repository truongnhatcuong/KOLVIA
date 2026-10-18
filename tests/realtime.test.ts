import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createHmac, createHash } from "node:crypto";
import { notificationChannel, validSocketId, refreshCollaborationPage } from "../src/lib/realtime/channels";
import { pusherConfig, publicPusherConfig, signChannel, notificationRequest, publishNotificationChanges } from "../src/lib/realtime/pusher";
import { committedNotifications, collectNotificationRecipient } from "../src/lib/realtime/transaction";

const config = { appId: "123", key: "test_key", secret: "test_secret", cluster: "ap1" };
test("collaboration realtime refresh excludes forms being edited", () => {
  for (const path of ["/kol/withdrawals", "/organizer/withdrawals", "/kol/jobs", "/organizer/jobs", "/organizer/jobs/job-1", "/kol/applications"]) assert.equal(refreshCollaborationPage(path), true);
  for (const path of ["/organizer/jobs/new", "/organizer/jobs/job-1/edit", "/kol/profile", "/organizer/profile", null]) assert.equal(refreshCollaborationPage(path), false);
});
function configure() {
  const values = { PUSHER_APP_ID: config.appId, PUSHER_APP_KEY: config.key, PUSHER_APP_SECRET: config.secret, PUSHER_APP_CLUSTER: config.cluster };
  const old = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  return () => { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } };
}
test("Pusher configuration supports supplied aliases but never exposes the secret publicly", () => {
  assert.deepEqual(pusherConfig({ app_id: "123", key: "test_key", secret: "test_secret", cluster: "ap1" }), config);
  assert.equal(pusherConfig({ PUSHER_APP_ID: "../123", PUSHER_APP_KEY: "key", PUSHER_APP_SECRET: "secret", PUSHER_APP_CLUSTER: "ap1" }), null);
  assert.equal(pusherConfig({ app_id: "123", key: "key", secret: "secret", cluster: "evil.test/path" }), null);
  const restore = configure();
  try { assert.deepEqual(publicPusherConfig(), { key: config.key, cluster: config.cluster }); }
  finally { restore(); }
});
test("private channel signatures bind to exactly one socket and recipient", () => {
  const channel = notificationChannel("user-1");
  assert.ok(validSocketId("123.456"));
  for (const invalid of ["", "123", "123.456:other", "123.456\n"]) assert.equal(validSocketId(invalid), false);
  assert.throws(() => notificationChannel("user:other"));
  const signed = signChannel(config, "123.456", channel);
  const expected = createHmac("sha256", config.secret).update("123.456:private-notifications-user-1").digest("hex");
  assert.equal(signed.auth, `${config.key}:${expected}`);
  assert.notEqual(signed.auth, signChannel(config, "123.457", channel).auth);
  assert.notEqual(signed.auth, signChannel(config, "123.456", notificationChannel("user-2")).auth);
});
test("HTTP events sign the actual body and carry only invalidation data", () => {
  const request = notificationRequest(config, ["user-1", "user-1", "user-2"], 1700000000000);
  const url = new URL(request.url);
  assert.equal(url.hostname, "api-ap1.pusher.com");
  assert.equal(url.pathname, "/apps/123/events");
  assert.equal(url.searchParams.get("auth_timestamp"), "1700000000");
  assert.equal(url.searchParams.get("body_md5"), createHash("md5").update(request.body).digest("hex"));
  const body = JSON.parse(request.body);
  assert.deepEqual(body.channels, ["private-notifications-user-1", "private-notifications-user-2"]);
  assert.deepEqual(JSON.parse(body.data), { changed: true });
  assert.ok(!request.body.includes(config.secret));
});
test("transaction recipients are deduplicated and emitted only after commit", async () => {
  const order: string[] = [];
  const tx = {};
  const result = await committedNotifications(async (work) => { const result = await work(tx); order.push("commit"); return result; }, async (context) => {
    order.push("work");
    collectNotificationRecipient(context, "user-1"); collectNotificationRecipient(context, "user-1"); collectNotificationRecipient(context, "user-2");
    return { id: "saved" };
  }, async (users) => { order.push("publish"); assert.deepEqual(users, ["user-1", "user-2"]); });
  assert.deepEqual(order, ["work", "commit", "publish"]);
  assert.deepEqual(result, { id: "saved" });
});
test("a rollback or commit failure cannot emit a phantom notification", async () => {
  for (const failInWork of [true, false]) {
    let emitted = false;
    await assert.rejects(committedNotifications(async (work) => { await work({}); throw new Error("Commit failed"); }, async (tx) => {
      collectNotificationRecipient(tx, "user-1");
      if (failInWork) throw new Error("Work failed");
      return "result";
    }, async () => { emitted = true; }));
    assert.equal(emitted, false);
  }
});
test("realtime failure does not turn a committed operation into an API failure", async () => {
  const warning = mock.method(console, "warn", () => {});
  try {
    const result = await committedNotifications(async (work) => work({}), async (tx) => { collectNotificationRecipient(tx, "user-1"); return "saved"; }, async () => { throw new Error("Provider offline"); });
    assert.equal(result, "saved");
    assert.equal(warning.mock.callCount(), 1);
  } finally { warning.mock.restore(); }
});
test("Pusher emits at most 100 channels per request and failure logging hides credentials", async () => {
  const restore = configure();
  const batches: number[] = [];
  const fetchMock = mock.method(globalThis, "fetch", async (_url: Parameters<typeof fetch>[0], options?: RequestInit) => {
    batches.push(JSON.parse(String(options?.body)).channels.length);
    return new Response("{}", { status: 200 });
  });
  const warning = mock.method(console, "warn", () => {});
  try {
    await publishNotificationChanges(Array.from({ length: 205 }, (_, index) => `user-${index}`));
    assert.deepEqual(batches, [100, 100, 5]);
    fetchMock.mock.mockImplementation(async () => { throw new Error(`${config.secret} should not be logged`); });
    await publishNotificationChanges(["user-1"]);
    assert.equal(warning.mock.callCount(), 1);
    assert.ok(!JSON.stringify(warning.mock.calls).includes(config.secret));
  } finally { fetchMock.mock.restore(); warning.mock.restore(); restore(); }
});
