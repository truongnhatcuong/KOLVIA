import { createRequire } from "node:module";
import test, { before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync, createHmac } from "node:crypto";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
// Initialize the same AsyncLocalStorage globals used by Next's Node server.
// Executing compiled route modules exercises cookie/session behavior without a listening socket.
require("next/dist/server/node-environment");
const { NextRequest } = require("next/server");
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const password = randomBytes(20).toString("hex");
const origin = process.env.APP_URL;
// Local SDK fixture configuration. Provider calls in signed callback tests are mocked.
process.env.UPLOADTHING_TOKEN = Buffer.from(
  JSON.stringify({
    apiKey: "sk_test_kolvia_local_rejection_tests",
    appId: "kolviatest",
    regions: ["sea1"],
  }),
).toString("base64");
let admin, kol, organizer, rogue, otherKol;

async function call(
  template,
  { method = "GET", data, rawBody, actor, id, url, foreignOrigin, extraHeaders = {} } = {},
) {
  const { routeModule } = require(resolve(`.next/server/app/api/${template}/route.js`));
  const headers = new Headers();
  if (method !== "GET") {
    headers.set("origin", foreignOrigin ?? origin);
    headers.set("content-type", "application/json");
  }
  if (actor?.cookie) headers.set("cookie", actor.cookie);
  for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, value);
  const request = new NextRequest(
    `${origin}/api/${url ?? template.replace("[id]", id ?? "missing")}`,
    { method, headers, body: rawBody ?? (data === undefined ? undefined : JSON.stringify(data)) },
  );
  const response = await routeModule.handle(request, {
    params: id ? { id } : {},
    renderOpts: { supportsDynamicResponse: true, experimental: {} },
    sharedContext: { buildId: "kolvia-api-test", deploymentId: "" },
    previewProps: {
      previewModeId: "test",
      previewModeSigningKey: "test",
      previewModeEncryptionKey: "test",
    },
  });
  return {
    status: response.status,
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
    setCookie: response.headers.get("set-cookie"),
  };
}
async function account(name, role) {
  const email = `${name}@routes.test`;
  const reply = await call("auth/register", {
    method: "POST",
    data: { name, email, password, role },
  });
  assert.equal(reply.status, 200);
  assert.ok(reply.cookie);
  return { ...reply.body.data, cookie: reply.cookie, email };
}
test("password change checks Origin/current credentials and revokes both existing sessions", async () => {
  const owner = await account("password_change_owner", "KOL");
  const secondLogin = await call("auth/login", { method: "POST", data: { email: owner.email, password } });
  assert.equal(secondLogin.status, 200);
  const nextPassword = randomBytes(20).toString("hex");
  const options = { method: "PATCH", actor: owner, data: { currentPassword: password, newPassword: nextPassword, confirmPassword: nextPassword } };
  assert.equal((await call("auth/password", { ...options, actor: undefined })).status, 401);
  assert.equal((await call("auth/password", { ...options, foreignOrigin: "https://evil.test" })).status, 403);
  assert.equal((await call("auth/password", { ...options, data: { ...options.data, userId: "other-user" } })).status, 422);
  assert.equal((await call("auth/password", { ...options, data: { ...options.data, confirmPassword: "does-not-match" } })).status, 422);
  assert.equal((await call("auth/password", { ...options, data: { ...options.data, currentPassword: "incorrect-password" } })).status, 400);
  assert.equal((await call("auth/session", { actor: owner })).body.data.id, owner.id);
  const changed = await call("auth/password", options);
  assert.equal(changed.status, 200);
  assert.deepEqual(changed.body.data, { changed: true });
  assert.match(changed.setCookie, /kolvia_session=;/);
  assert.equal(await db.session.count({ where: { userId: owner.id } }), 0);
  assert.equal((await call("auth/session", { actor: owner })).body.data, null);
  assert.equal((await call("auth/session", { actor: { ...owner, cookie: secondLogin.cookie } })).body.data, null);
  assert.equal((await call("auth/login", { method: "POST", data: { email: owner.email, password } })).status, 401);
  assert.equal((await call("auth/login", { method: "POST", data: { email: owner.email, password: nextPassword } })).status, 200);
});
test("Pusher authorizes only the active session's own private notification channel", async () => {
  const owner = await account("realtime_owner", "KOL");
  const keys = { PUSHER_APP_ID: "123", PUSHER_APP_KEY: "test_key", PUSHER_APP_SECRET: "test_secret", PUSHER_APP_CLUSTER: "ap1" };
  const previous = Object.fromEntries(Object.keys(keys).map((key) => [key, process.env[key]]));
  Object.assign(process.env, keys);
  const channel = `private-notifications-${owner.id}`;
  const options = { method: "POST", actor: owner, rawBody: new URLSearchParams({ socket_id: "123.456", channel_name: channel }).toString(), extraHeaders: { "content-type": "application/x-www-form-urlencoded" } };
  try {
    assert.equal((await call("pusher/auth", { ...options, actor: undefined })).status, 401);
    assert.equal((await call("pusher/auth", { ...options, foreignOrigin: "https://evil.test" })).status, 403);
    assert.equal((await call("pusher/auth", { ...options, rawBody: "socket_id=123.456&channel_name=private-notifications-other-user" })).status, 403);
    assert.equal((await call("pusher/auth", { ...options, rawBody: `socket_id=invalid&channel_name=${channel}` })).status, 422);
    const authorized = await call("pusher/auth", options);
    assert.equal(authorized.status, 200);
    assert.equal(authorized.body.data.auth, `test_key:${createHmac("sha256", "test_secret").update(`123.456:${channel}`).digest("hex")}`);
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
test("withdrawal API checks login, Origin, ownership, decisions and explicit departure", async () => {
  const owner = await account("withdrawal_organizer", "ORGANIZER");
  const creator = await account("withdrawal_kol", "KOL");
  const created = await call("jobs", { method: "POST", actor: owner, data: jobInput() });
  const jobId = created.body.data.id;
  await call("jobs/[id]/submit", { method: "POST", id: jobId, actor: owner });
  await call("admin/jobs/[id]/moderation", { method: "PATCH", id: jobId, actor: admin, data: { moderation: "APPROVED", note: "" } });
  const app = await call("applications", { method: "POST", actor: creator, data: { jobId, message: "Tôi muốn đồng hành cùng sự kiện." } });
  await call("applications/[id]", { method: "PATCH", id: app.body.data.id, actor: owner, data: { status: "ACCEPTED" } });
  const participation = await db.participation.findUniqueOrThrow({ where: { jobId_kolId: { jobId, kolId: creator.id } } });
  const data = { participationId: participation.id, reason: "Lịch cá nhân thay đổi, tôi cần rút tham gia." };
  assert.equal((await call("withdrawals", { method: "POST", data })).status, 401);
  assert.equal((await call("withdrawals", { method: "POST", actor: creator, data, foreignOrigin: "https://evil.test" })).status, 403);
  assert.equal((await call("withdrawals", { method: "POST", actor: otherKol, data })).status, 403);
  assert.equal((await call("withdrawals", { method: "POST", actor: creator, data: { ...data, requestedAt: new Date().toISOString() } })).status, 422);
  const requested = await call("withdrawals", { method: "POST", actor: creator, data });
  assert.equal(requested.status, 200);
  const id = requested.body.data.id;
  assert.equal((await call("withdrawals", { method: "POST", actor: creator, data })).status, 409);
  assert.equal((await call("withdrawals/[id]", { method: "PATCH", id, actor: creator, data: { status: "APPROVED" } })).status, 403);
  assert.equal((await call("withdrawals/[id]", { method: "PATCH", id, actor: owner, data: { status: "REJECTED", note: "" } })).status, 422);
  assert.equal((await call("withdrawals/[id]", { method: "PATCH", id, actor: owner, data: { status: "REJECTED", note: "Đã chốt lịch tham gia sự kiện." } })).status, 200);
  assert.equal((await call("withdrawals/[id]/depart", { method: "POST", id, actor: creator, data: { confirm: false } })).status, 422);
  const left = await call("withdrawals/[id]/depart", { method: "POST", id, actor: creator, data: { confirm: true } });
  assert.equal(left.status, 200); assert.equal(left.body.data.status, "LEFT_WITHOUT_APPROVAL");
  assert.equal((await call("withdrawals", { actor: otherKol })).body.data.some((row) => row.id === id), false);
});
const jobInput = () => ({
  title: "Job kiểm thử API thực tế",
  description: "Một sự kiện dành cho nhà sáng tạo để cùng trải nghiệm và kể những câu chuyện mới.",
  requirements: "Đồng hành cùng đội ngũ sự kiện và thực hiện nội dung đã trao đổi.",
  category: "Lifestyle",
  location: "Hà Nội",
  budgetMin: 1000000,
  budgetMax: 5000000,
  deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
  eventDate: new Date(Date.now() + 21 * 86400000).toISOString(),
});
async function approved() {
  const created = await call("jobs", { method: "POST", data: jobInput(), actor: organizer });
  assert.equal(created.status, 200);
  const id = created.body.data.id;
  assert.equal(
    (await call("jobs/[id]/submit", { method: "POST", id, actor: organizer })).status,
    200,
  );
  assert.equal(
    (
      await call("admin/jobs/[id]/moderation", {
        method: "PATCH",
        id,
        actor: admin,
        data: { moderation: "APPROVED", note: "" },
      })
    ).status,
    200,
  );
  return id;
}
before(async () => {
  const salt = randomBytes(16).toString("hex");
  await db.user.create({
    data: {
      name: "API Admin",
      email: "admin@routes.test",
      role: "ADMIN",
      passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    },
  });
  const login = await call("auth/login", {
    method: "POST",
    data: { email: "admin@routes.test", password },
  });
  assert.equal(login.status, 200);
  admin = { ...login.body.data, cookie: login.cookie };
  kol = await account("Creator", "KOL");
  otherKol = await account("OtherCreator", "KOL");
  organizer = await account("Organizer", "ORGANIZER");
  rogue = await account("OtherOrganizer", "ORGANIZER");
  for (const actor of [kol, otherKol])
    assert.equal(
      (
        await call("profiles/kol", {
          method: "PATCH",
          actor,
          data: {
            name: actor.name,
            bio: "Hồ sơ thử nghiệm",
            category: "Lifestyle",
            location: "Hà Nội",
            isPublic: true,
          },
        })
      ).status,
      200,
    );
});
after(async () => db.$disconnect());

test("public GET endpoints return DTOs, support filters and reject invalid filters", async () => {
  assert.equal((await call("jobs")).status, 200);
  const creators = await call("kols");
  assert.equal(creators.body.data.total, 2);
  assert.ok(!JSON.stringify(creators.body).includes("passwordHash"));
  assert.ok(!JSON.stringify(creators.body).includes("email"));
  assert.equal((await call("kols", { url: "kols?category=Beauty" })).body.data.total, 0);
  assert.equal((await call("jobs", { url: "jobs?page=-1" })).status, 422);
});
test("authentication sets HttpOnly SameSite cookies and sessions have no password data", async () => {
  const reply = await call("auth/login", { method: "POST", data: { email: kol.email, password } });
  assert.equal(reply.status, 200);
  assert.match(reply.setCookie, /HttpOnly/i);
  assert.match(reply.setCookie, /SameSite=lax/i);
  const session = await call("auth/session", { actor: { cookie: reply.cookie } });
  assert.equal(session.body.data.id, kol.id);
  assert.ok(!("passwordHash" in session.body.data));
  const bad = await call("auth/login", {
    method: "POST",
    data: { email: kol.email, password: "incorrect" },
  });
  assert.equal(bad.status, 401);
});
test("registration cannot create ADMIN and duplicate emails return conflict", async () => {
  assert.equal(
    (
      await call("auth/register", {
        method: "POST",
        data: { name: "Evil", email: "evil@test.local", password, role: "ADMIN" },
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await call("auth/register", {
        method: "POST",
        data: { name: "Duplicate", email: kol.email, password, role: "KOL" },
      })
    ).status,
    409,
  );
});
test("private endpoints reject anonymous access and cross-role requests", async () => {
  for (const route of [
    "profiles/kol",
    "profiles/organizer",
    "applications",
    "invitations",
    "admin",
    "admin/users",
    "admin/jobs",
    "admin/moderation",
  ])
    assert.equal((await call(route)).status, 401, route);
  assert.equal((await call("jobs", { url: "jobs?scope=mine" })).status, 401);
  for (const route of [
    "admin",
    "admin/users",
    "admin/jobs",
    "admin/moderation",
    "profiles/organizer",
  ])
    assert.equal((await call(route, { actor: kol })).status, 403, route);
  assert.equal((await call("profiles/kol", { actor: organizer })).status, 403);
});
test("API mutations reject a foreign origin, invalid payload and forged ownership", async () => {
  assert.equal(
    (
      await call("jobs", {
        method: "POST",
        data: jobInput(),
        actor: organizer,
        foreignOrigin: "https://evil.test",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("jobs", {
        method: "POST",
        data: { ...jobInput(), organizerId: rogue.id },
        actor: organizer,
      })
    ).status,
    422,
  );
  assert.equal((await call("jobs", { method: "POST", data: jobInput(), actor: kol })).status, 403);
});
test("full API job lifecycle enforces ownership, moderation and visibility", async () => {
  const created = await call("jobs", { method: "POST", data: jobInput(), actor: organizer });
  const id = created.body.data.id;
  assert.equal((await call("jobs/[id]", { id })).status, 404);
  assert.equal(
    (await call("jobs/[id]", { id, actor: organizer, url: `jobs/${id}?scope=mine` })).status,
    200,
  );
  assert.equal(
    (await call("jobs/[id]", { method: "PATCH", id, actor: rogue, data: jobInput() })).status,
    403,
  );
  assert.equal(
    (await call("jobs/[id]/submit", { method: "POST", id, actor: organizer })).status,
    200,
  );
  assert.equal(
    (
      await call("admin/jobs/[id]/moderation", {
        method: "PATCH",
        id,
        actor: organizer,
        data: { moderation: "APPROVED", note: "" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("admin/jobs/[id]/moderation", {
        method: "PATCH",
        id,
        actor: admin,
        data: { moderation: "APPROVED", note: "" },
      })
    ).status,
    200,
  );
  assert.equal((await call("jobs/[id]", { id })).status, 200);
  assert.equal(
    (
      await call("jobs/[id]", {
        method: "PATCH",
        id,
        actor: organizer,
        data: { ...jobInput(), title: "Cập nhật nội dung Job được duyệt" },
      })
    ).body.data.moderation,
    "PENDING",
  );
  assert.equal((await call("jobs/[id]", { id })).status, 404);
  assert.equal((await call("jobs/[id]", { method: "DELETE", id, actor: rogue })).status, 403);
  assert.equal((await call("jobs/[id]", { method: "DELETE", id, actor: organizer })).status, 200);
  assert.equal((await call("jobs/[id]", { id })).status, 404);
});
test("full API application flow validates roles and confirms participation", async () => {
  const id = await approved();
  const data = { jobId: id, message: "Tôi muốn tham gia cơ hội sáng tạo này." };
  const applied = await call("applications", { method: "POST", actor: kol, data });
  assert.equal(applied.status, 200);
  const appId = applied.body.data.id;
  assert.equal((await call("applications", { method: "POST", actor: kol, data })).status, 409);
  assert.equal(
    (
      await call("applications/[id]", {
        method: "PATCH",
        id: appId,
        actor: rogue,
        data: { status: "ACCEPTED" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("applications/[id]", {
        method: "PATCH",
        id: appId,
        actor: organizer,
        data: { status: "ACCEPTED" },
      })
    ).status,
    200,
  );
  const roster = await call("jobs/[id]/participants", { id, actor: organizer });
  assert.equal(roster.body.data.length, 1);
  assert.equal((await call("jobs/[id]/participants", { id, actor: rogue })).status, 403);
  const removed = await call("jobs/[id]", { method: "DELETE", id, actor: organizer });
  assert.deepEqual(removed.body.data, { archived: true });
});
test("full API invitation flow blocks other KOLs and stores the confirmation", async () => {
  const id = await approved();
  const invited = await call("invitations", {
    method: "POST",
    actor: organizer,
    data: { jobId: id, kolId: kol.id, message: "Chúng tôi muốn mời bạn đồng hành." },
  });
  assert.equal(invited.status, 200);
  const invitationId = invited.body.data.id;
  assert.equal(
    (
      await call("invitations/[id]", {
        method: "PATCH",
        id: invitationId,
        actor: otherKol,
        data: { status: "ACCEPTED" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("invitations/[id]", {
        method: "PATCH",
        id: invitationId,
        actor: kol,
        data: { status: "ACCEPTED" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await call("jobs/[id]/participants", { id, actor: organizer })).body.data.length,
    1,
  );
});
test("locking a user revokes existing cookies; logout also revokes the token", async () => {
  assert.equal(
    (
      await call("admin/users/[id]", {
        method: "PATCH",
        id: otherKol.id,
        actor: admin,
        data: { active: false },
      })
    ).status,
    200,
  );
  assert.equal((await call("auth/session", { actor: otherKol })).body.data, null);
  assert.equal((await call("applications", { actor: otherKol })).status, 401);
  assert.equal((await call("auth/logout", { method: "POST", actor: kol })).status, 200);
  assert.equal((await call("auth/session", { actor: kol })).body.data, null);
});

test("UploadThing preflight blocks anonymous users, wrong roles, foreign origins and client ownership", async () => {
  const upload = async (
    actor,
    input,
    foreignOrigin,
    files = [{ name: "portrait.webp", size: 12000, type: "image/webp", lastModified: 1 }],
  ) =>
    call("uploadthing", {
      method: "POST",
      actor,
      foreignOrigin,
      url: "uploadthing?slug=imageUploader&actionType=upload",
      extraHeaders: {
        "x-uploadthing-package": "@uploadthing/react",
        "x-uploadthing-version": "7.7.4",
      },
      data: {
        files,
        input,
      },
    });
  assert.equal((await upload(undefined, { target: "AVATAR" })).status, 403);
  assert.equal((await upload(organizer, { target: "PORTFOLIO" })).status, 403);
  assert.equal((await upload(organizer, { target: "LOGO" }, "https://other.test")).status, 403);
  assert.equal((await upload(organizer, { target: "LOGO", ownerId: "forged" })).status, 400);
  assert.equal(
    (
      await upload(organizer, { target: "LOGO" }, undefined, [
        { name: "photo.jpg", size: 1000, type: "image/svg+xml" },
      ])
    ).status,
    400,
  );
  assert.equal(
    (
      await upload(organizer, { target: "LOGO" }, undefined, [
        { name: "photo.webp", size: 4 * 1024 * 1024 + 1, type: "image/webp" },
      ])
    ).status,
    400,
  );
  assert.equal(
    (
      await upload(organizer, { target: "LOGO" }, undefined, [
        { name: "one.png", size: 1000, type: "image/png" },
        { name: "two.webp", size: 1000, type: "image/webp" },
      ])
    ).status,
    400,
  );
});
test("UploadThing rejects unsigned callbacks before writing media records", async () => {
  const before = await db.mediaAsset.count();
  const response = await call("uploadthing", {
    method: "POST",
    url: "uploadthing?slug=imageUploader",
    extraHeaders: {
      "uploadthing-hook": "callback",
      "x-uploadthing-signature": "hmac-sha256=forged",
    },
    data: {
      status: "uploaded",
      metadata: { ownerId: organizer.id, input: { target: "LOGO" } },
      file: {
        key: "forged",
        url: "https://kolviatest.ufs.sh/f/forged",
        ufsUrl: "https://kolviatest.ufs.sh/f/forged",
        name: "forged.webp",
        size: 12,
        type: "image/webp",
        appId: "kolviatest",
        customId: null,
      },
    },
  });
  assert.equal(response.status, 400);
  assert.equal(await db.mediaAsset.count(), before);
});

test("media deletion API rejects anonymous, foreign-origin and non-owner requests", async () => {
  const owner = await account("media-owner", "KOL");
  const asset = await db.mediaAsset.create({
    data: {
      ownerId: owner.id,
      target: "AVATAR",
      slot: `${owner.id}:AVATAR:profile`,
      key: "protected-photo",
      url: "https://demo.ufs.sh/f/protected-photo",
      name: "photo.webp",
      size: 12000,
    },
  });
  assert.equal((await call("media/[id]", { method: "DELETE", id: asset.id })).status, 401);
  assert.equal(
    (await call("media/[id]", { method: "DELETE", id: asset.id, actor: rogue })).status,
    403,
  );
  assert.equal(
    (await call("media/[id]", { method: "DELETE", id: asset.id, actor: admin })).status,
    403,
  );
  assert.equal(
    (
      await call("media/[id]", {
        method: "DELETE",
        id: asset.id,
        actor: owner,
        foreignOrigin: "https://other.test",
      })
    ).status,
    403,
  );
  assert.equal(
    (await call("media/[id]", { method: "DELETE", id: "missing-photo", actor: owner })).status,
    404,
  );
  assert.ok((await db.mediaAsset.findUnique({ where: { id: asset.id } }))?.slot);
});

function callbackPayload(owner, target, key) {
  const url = `https://kolviatest.ufs.sh/f/${key}`;
  return {
    status: "uploaded",
    origin: "https://sea1.ingest.uploadthing.com",
    metadata: { ownerId: owner.id, role: owner.role, input: { target } },
    file: {
      key,
      name: "photo.webp",
      type: "image/webp",
      size: 12000,
      customId: null,
      url,
      ufsUrl: url,
      appUrl: url,
      fileHash: "test-fixture-hash",
    },
  };
}
function signedCallback(payload) {
  const signature = createHmac("sha256", "sk_test_kolvia_local_rejection_tests")
    .update(JSON.stringify(payload))
    .digest("hex");
  return call("uploadthing", {
    method: "POST",
    url: "uploadthing?slug=imageUploader",
    extraHeaders: {
      "uploadthing-hook": "callback",
      "x-uploadthing-signature": `hmac-sha256=${signature}`,
    },
    data: payload,
  });
}
async function waitForCallback(predicate) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail("UploadThing callback did not finish");
}
function mockStorage(calls) {
  return mock.method(globalThis, "fetch", async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const pathname = new URL(request.url).pathname;
    const body = JSON.parse(await request.text());
    if (!["/callback-result", "/v6/deleteFiles"].includes(pathname))
      throw new Error("Unexpected network request in local callback test");
    calls.push({ pathname, body });
    return Response.json(
      pathname === "/callback-result" ? { ok: true } : { success: true, deletedCount: 1 },
    );
  });
}
test("signed SDK callback persists an image and returns only the public image DTO", async () => {
  const owner = await account("callback-owner", "KOL");
  const calls = [];
  const storage = mockStorage(calls);
  try {
    assert.equal(
      (await signedCallback(callbackPayload(owner, "AVATAR", "signed-avatar"))).status,
      200,
    );
    await waitForCallback(() => calls.some((call) => call.pathname === "/callback-result"));
    const asset = await db.mediaAsset.findUnique({ where: { key: "signed-avatar" } });
    assert.equal(asset.ownerId, owner.id);
    assert.ok(asset.slot);
    const reply = calls.find((call) => call.pathname === "/callback-result").body.callbackData;
    assert.equal(reply.asset.id, asset.id);
    assert.equal(reply.error, null);
    assert.deepEqual(Object.keys(reply.asset).sort(), ["id", "name", "target", "url"]);
  } finally {
    storage.mock.restore();
  }
});
test("signed callback after account locking queues cleanup and reports a failed upload", async () => {
  const owner = await account("callback-locked", "KOL");
  await db.user.update({ where: { id: owner.id }, data: { active: false } });
  const calls = [];
  const storage = mockStorage(calls);
  try {
    assert.equal(
      (await signedCallback(callbackPayload(owner, "AVATAR", "signed-rejected-avatar"))).status,
      200,
    );
    await waitForCallback(() => calls.some((call) => call.pathname === "/callback-result"));
    const asset = await db.mediaAsset.findUnique({ where: { key: "signed-rejected-avatar" } });
    assert.equal(asset.ownerId, owner.id);
    assert.equal(asset.slot, null);
    assert.ok(asset.deletedAt);
    const deletion = calls.find((call) => call.pathname === "/v6/deleteFiles");
    assert.deepEqual(deletion.body.fileKeys, ["signed-rejected-avatar"]);
    const reply = calls.find((call) => call.pathname === "/callback-result").body.callbackData;
    assert.equal(reply.asset, null);
    assert.ok(reply.error);
  } finally {
    storage.mock.restore();
  }
});

async function approvedFor(owner, capacity = 2) {
  const created = await call("jobs", { method: "POST", actor: owner, data: { ...jobInput(), capacity, benefits: "Thù lao và hỗ trợ di chuyển." } });
  assert.equal(created.status, 200);
  const id = created.body.data.id;
  assert.equal((await call("jobs/[id]/submit", { method: "POST", id, actor: owner })).status, 200);
  assert.equal((await call("admin/jobs/[id]/moderation", { method: "PATCH", id, actor: admin, data: { moderation: "APPROVED", note: "" } })).status, 200);
  return id;
}
test("new social platforms, skills and experience persist through profile API", async () => {
  const creator = await account("expanded-profile", "KOL");
  const reply = await call("profiles/kol", { method: "PATCH", actor: creator, data: { name: "Expanded creator", bio: "Creator profile", category: "Lifestyle", location: "Hà Nội", isPublic: true, skills: "Livestream, MC", experienceYears: 3, instagramUrl: "https://instagram.com/creator", youtubeUrl: "https://youtube.com/@creator" } });
  assert.equal(reply.status, 200);
  const profile = await call("kols/[id]", { id: creator.id });
  assert.equal(profile.body.data.experienceYears, 3);
  assert.equal(profile.body.data.socialLinks.length, 2);
  assert.ok(!("email" in profile.body.data.user));
});
test("notification API requires login, preserves ownership and checks Origin", async () => {
  const owner = await account("notice-owner", "ORGANIZER");
  const creator = await account("notice-creator", "KOL");
  const id = await approvedFor(owner);
  assert.equal((await call("applications", { method: "POST", actor: creator, data: { jobId: id, message: "Tôi mong muốn tham gia sự kiện này." } })).status, 200);
  assert.equal((await call("notifications")).status, 401);
  const notice = (await call("notifications", { actor: owner })).body.data.items.find((item) => item.type === "APPLICATION");
  assert.ok(notice);
  assert.equal((await call("notifications/[id]", { method: "PATCH", id: notice.id, actor: creator, data: { read: true } })).status, 404);
  assert.equal((await call("notifications/[id]", { method: "PATCH", id: notice.id, actor: owner, data: { read: true }, foreignOrigin: "https://evil.test" })).status, 403);
  assert.equal((await call("notifications/[id]", { method: "PATCH", id: notice.id, actor: owner, data: { read: true } })).status, 200);
});
test("admin hide API removes public access while keeping participation", async () => {
  const owner = await account("hide-owner", "ORGANIZER");
  const creator = await account("hide-creator", "KOL");
  const id = await approvedFor(owner, 1);
  const applied = await call("applications", { method: "POST", actor: creator, data: { jobId: id, message: "Tôi mong muốn tham gia sự kiện này." } });
  assert.equal((await call("applications/[id]", { method: "PATCH", id: applied.body.data.id, actor: owner, data: { status: "ACCEPTED" } })).status, 200);
  assert.equal((await call("admin/jobs/[id]/hide", { method: "PATCH", id, actor: owner, data: { note: "Nội dung không phù hợp." } })).status, 403);
  assert.equal((await call("admin/jobs/[id]/hide", { method: "PATCH", id, actor: admin, data: { note: "Nội dung không phù hợp." } })).status, 200);
  assert.equal((await call("jobs/[id]", { id })).status, 404);
  assert.equal((await call("jobs/[id]/participants", { id, actor: owner })).body.data.length, 1);
});

test("AI recommendations and read-only tools enforce roles, ownership and real MySQL facts", async () => {
  const owner = await account("ai_owner", "ORGANIZER");
  const creator = await account("ai_creator", "KOL");
  assert.equal((await call("profiles/kol", { method: "PATCH", actor: creator, data: { name: creator.name, category: "Beauty", skills: "Review, Livestream, TikTok", experienceYears: 3, bio: "Sáng tạo nội dung Beauty", location: "TP.HCM", isPublic: true } })).status, 200);
  const created = await call("jobs", { method: "POST", actor: owner, data: { ...jobInput(), title: "AI Beauty job", category: "Beauty", location: "TP. Hồ Chí Minh", capacity: 2, requirements: "Review và livestream trên TikTok. Ít nhất 2 năm kinh nghiệm." } });
  assert.equal(created.status, 200);
  const id = created.body.data.id;
  assert.equal((await call("ai/recommendations", { actor: owner, url: `ai/recommendations?jobId=${id}` })).status, 404);
  assert.equal((await call("jobs/[id]/submit", { method: "POST", actor: owner, id })).status, 200);
  assert.equal((await call("admin/jobs/[id]/moderation", { method: "PATCH", actor: admin, id, data: { moderation: "APPROVED", note: "" } })).status, 200);
  assert.equal((await call("ai/recommendations")).status, 401);
  assert.equal((await call("ai/recommendations", { actor: admin })).status, 403);
  assert.equal((await call("ai/recommendations", { actor: organizer, url: `ai/recommendations?jobId=${id}` })).status, 404);
  const matches = await call("ai/recommendations", { actor: creator });
  assert.equal(matches.status, 200); assert.ok(matches.body.data.items.some((item) => item.id === id));
  const candidates = await call("ai/recommendations", { actor: owner, url: `ai/recommendations?jobId=${id}` });
  assert.equal(candidates.status, 200); assert.ok(candidates.body.data.items.some((item) => item.id === creator.id));
  assert.ok(!JSON.stringify(candidates.body).includes(creator.email));
  assert.equal((await call("ai/recommendations", { actor: creator, url: "ai/recommendations?minBudget=500&maxBudget=1" })).status, 422);
  const keys = ["API_KEY_AI", "AI_CHAT_BASE_URL", "AI_MODEL"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, { API_KEY_AI: "fixture-key", AI_CHAT_BASE_URL: "https://gateway.test/v1/chat/completions", AI_MODEL: "gemini-3-flash" });
  let planned = { name: "get_help", args: { topic: "about" } };
  const fetchMock = mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(JSON.parse(options.body).model, "gemini-3-flash");
    return Response.json({ choices: [{ message: { content: "Hệ thống có 999999 KOL", tool_calls: [{ id: "fixture-call", type: "function", function: { name: planned.name, arguments: JSON.stringify(planned.args) } }] } }] });
  });
  try {
    const input = { message: "KOLVIA là gì?" };
    assert.equal((await call("ai/chat", { method: "POST", data: input, foreignOrigin: "https://evil.test" })).status, 403);
    assert.equal((await call("ai/chat", { method: "POST", data: { ...input, role: "ADMIN" } })).status, 422);
    const counts = { applications: await db.application.count(), invitations: await db.invitation.count(), jobs: await db.job.count() };
    const guest = await call("ai/chat", { method: "POST", data: input });
    assert.equal(guest.status, 200); assert.ok(!guest.body.data.message.includes("999999"));
    planned = { name: "admin_overview", args: {} };
    assert.equal((await call("ai/chat", { method: "POST", data: input })).status, 403);
    const adminReply = await call("ai/chat", { method: "POST", actor: admin, data: input });
    assert.equal(adminReply.status, 200); assert.ok(adminReply.body.data.message.includes(`${await db.user.count({ where: { role: "KOL" } })} tài khoản KOL`));
    planned = { name: "my_kol_activity", args: {} };
    const activity = await call("ai/chat", { method: "POST", actor: creator, data: { message: "Tôi đã đăng ký bao nhiêu job?" } });
    assert.equal(activity.status, 200); assert.ok(activity.body.data.message.includes("0 đơn đăng ký"));
    planned = { name: "my_organizer_jobs", args: { jobId: id } };
    assert.equal((await call("ai/chat", { method: "POST", actor: owner, data: input })).status, 200);
    assert.equal((await call("ai/chat", { method: "POST", actor: organizer, data: input })).status, 404);
    const automatic = await call("ai/chat", { method: "POST", actor: owner, data: { message: "Gợi ý KOL phù hợp cho sự kiện của tôi" } });
    assert.equal(automatic.status, 200); assert.equal(automatic.body.data.selectedJobId, id);
    assert.ok(automatic.body.data.cards.some((card) => card.href === `/kols/${creator.id}`));
    assert.deepEqual({ applications: await db.application.count(), invitations: await db.invitation.count(), jobs: await db.job.count() }, counts);
    // Manual invite uses the existing business API; matching then excludes this active invitation.
    assert.equal((await call("invitations", { method: "POST", actor: owner, data: { jobId: id, kolId: creator.id, message: "Mời bạn tham gia AI Beauty job." } })).status, 200);
    const afterInvite = await call("ai/recommendations", { actor: owner, url: `ai/recommendations?jobId=${id}` });
    assert.ok(!afterInvite.body.data.items.some((item) => item.id === creator.id));
    const secondJob = await approvedFor(owner, 2);
    const pendingJob = await call("jobs", { method: "POST", actor: owner, data: { ...jobInput(), title: "Không đưa job chờ duyệt vào lựa chọn" } });
    assert.equal((await call("jobs/[id]/submit", { method: "POST", actor: owner, id: pendingJob.body.data.id })).status, 200);
    const rejectedJob = await call("jobs", { method: "POST", actor: owner, data: { ...jobInput(), title: "Không đưa job bị từ chối vào lựa chọn" } });
    assert.equal((await call("jobs/[id]/submit", { method: "POST", actor: owner, id: rejectedJob.body.data.id })).status, 200);
    assert.equal((await call("admin/jobs/[id]/moderation", { method: "PATCH", actor: admin, id: rejectedJob.body.data.id, data: { moderation: "REJECTED", note: "Nội dung chưa phù hợp." } })).status, 200);
    const choiceReply = await call("ai/chat", { method: "POST", actor: owner, data: { message: "Gợi ý KOL phù hợp cho sự kiện của tôi" } });
    assert.equal(choiceReply.status, 200); assert.equal(choiceReply.body.data.jobChoices.length, 2);
    assert.ok(choiceReply.body.data.jobChoices.every((job) => [id, secondJob].includes(job.jobId)));
    const selected = await call("ai/chat", { method: "POST", actor: owner, data: { message: "Chọn job", contextToken: choiceReply.body.data.contextToken, action: { type: "select_job", jobId: secondJob } } });
    assert.equal(selected.status, 200); assert.equal(selected.body.data.selectedJobId, secondJob); assert.ok(!selected.body.data.message.includes("job nào"));
    assert.equal((await call("ai/chat", { method: "POST", actor: owner, data: { message: "Chọn job", contextToken: choiceReply.body.data.contextToken, action: { type: "select_job", jobId: pendingJob.body.data.id } } })).status, 409);
    assert.equal((await call("ai/chat", { method: "POST", actor: organizer, data: { message: "Chọn job", contextToken: choiceReply.body.data.contextToken, action: { type: "select_job", jobId: secondJob } } })).status, 409);
  } finally {
    fetchMock.mock.restore();
    for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  }
});
