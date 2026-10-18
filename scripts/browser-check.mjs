import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createTestDatabase } from "./test-database.mjs";

mkdirSync(".cache/tests", { recursive: true });
mkdirSync("test-results", { recursive: true });
const port = Number(process.env.TEST_PORT ?? 3100);
const origin = `http://127.0.0.1:${port}`;
const password = randomBytes(20).toString("hex");
const env = {
  ...process.env,
  APP_URL: origin,
  NODE_ENV: "production",
  UPLOADTHING_TOKEN: Buffer.from(
    JSON.stringify({
      apiKey: "sk_test_kolvia_preview_only",
      appId: "kolviatest",
      regions: ["sea1"],
    }),
  ).toString("base64"),
  DEMO_ADMIN_EMAIL: "admin@kolvia.local",
  DEMO_KOL_EMAIL: "linh@kolvia.local",
  DEMO_ORGANIZER_EMAIL: "organizer@kolvia.local",
  DEMO_ADMIN_PASSWORD: password,
  DEMO_KOL_PASSWORD: password,
  DEMO_ORGANIZER_PASSWORD: password,
};
let server, browser, database;
try {
  database = await createTestDatabase();
  env.DATABASE_URL = database.url;
  for (const args of [
    ["scripts/prisma.mjs", "migrate", "deploy"],
    ["--import", "tsx", "prisma/seed.ts"],
  ]) {
    const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
    assert.equal(result.status, 0, "Browser database setup failed");
  }
  let logs = "",
    exited = false;
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });
  server.on("exit", () => {
    exited = true;
  });
  let ready = false;
  for (let i = 0; i < 200; i++) {
    if (exited) throw new Error(`Preview server could not start:\n${logs.slice(-1800)}`);
    try {
      const response = await fetch(origin);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, "Preview server did not become ready");
  browser = await chromium.launch({ headless: true });
  const contexts = [];
  async function signedIn(email, role) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      timezoneId: "Asia/Ho_Chi_Minh",
    });
    contexts.push(context);
    const page = await context.newPage();
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto(`${origin}/login`);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: /^Đăng nhập/ }).click();
    await page.waitForURL(`**/${role === "admin" ? "admin" : `${role}/dashboard`}`);
    return page;
  }
  const organizer = await signedIn("organizer@kolvia.local", "organizer");
  const admin = await signedIn("admin@kolvia.local", "admin");
  const kol = await signedIn("linh@kolvia.local", "kol");
  const an = await signedIn("an@kolvia.local", "kol");
  await organizer.goto(`${origin}/organizer/profile`);
  const accountButton = organizer.getByRole("button", { name: "Menu tài khoản của Minh Anh", exact: true });
  await accountButton.click();
  const accountPanel = organizer.getByRole("region", { name: "Tài khoản của Minh Anh", exact: true });
  await accountPanel.waitFor();
  await accountPanel.getByText("organizer@kolvia.local", { exact: true }).waitFor();
  await accountPanel.getByRole("link", { name: "Thông tin hồ sơ", exact: true }).waitFor();
  await accountPanel.getByRole("button", { name: "Đăng xuất", exact: true }).waitFor();
  await organizer.keyboard.press("Escape");
  await accountPanel.waitFor({ state: "hidden" });
  assert.equal(await accountButton.evaluate((element) => element === document.activeElement), true);
  await accountButton.click();
  await organizer.getByRole("heading", { name: "Hồ sơ tổ chức", exact: true }).click();
  await accountPanel.waitFor({ state: "hidden" });
  // Test local image selection only. No file is uploaded to UploadThing.
  await kol.goto(`${origin}/kol/profile`);
  let uploadPosts = 0;
  const countUploads = (request) => {
    if (new URL(request.url()).pathname === "/api/uploadthing" && request.method() === "POST")
      uploadPosts++;
  };
  kol.on("request", countUploads);
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4/x8AAwAB//wl3FEAAAAASUVORK5CYII=";
  const avatarField = kol.locator(".upload-field.upload-avatar");
  await avatarField.getByLabel("Chọn ảnh đại diện", { exact: true }).setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await kol.getByAltText("Xem trước avatar.png").waitFor();
  await kol.getByRole("button", { name: "Tải ảnh này", exact: true }).waitFor();
  assert.equal(uploadPosts, 0, "Preview must not upload before clicking save");
  await kol.getByRole("button", { name: "Bỏ chọn", exact: true }).click();
  await kol.getByAltText("Xem trước avatar.png").waitFor({ state: "detached" });
  await avatarField.getByLabel("Chọn ảnh đại diện", { exact: true }).setInputFiles({
    name: "invalid.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),
  });
  await kol.getByRole("alert").filter({ hasText: "Chọn ảnh JPG, PNG hoặc WebP" }).waitFor();
  const transfer = await kol.evaluateHandle((encoded) => {
    const dt = new DataTransfer();
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    dt.items.add(new File([bytes], "drag.png", { type: "image/png" }));
    return dt;
  }, png);
  await kol
    .locator(".upload-avatar .upload-area")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await kol.getByAltText("Xem trước drag.png").waitFor();
  await kol.getByRole("button", { name: "Bỏ chọn", exact: true }).click();
  await transfer.dispose();
  assert.equal(uploadPosts, 0);
  kol.off("request", countUploads);
  // Camera button opens the picker; selection opens a modal and requires save.
  for (const [page, route, targets] of [
    [kol, "/kol/profile", ["ảnh đại diện", "ảnh bìa"]],
    [organizer, "/organizer/profile", ["ảnh đại diện", "ảnh bìa", "logo tổ chức"]],
  ]) {
    await page.goto(`${origin}${route}`);
    page.on("request", countUploads);
    for (const target of targets) {
      const button = page.getByRole("button", { name: `Thay ${target}`, exact: true });
      await button.waitFor();
      const chooserPromise = page.waitForEvent("filechooser");
      await button.click();
      const chooser = await chooserPromise;
      await chooser.setFiles({ name: "preview.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
      const modal = page.getByRole("dialog", { name: `Cập nhật ${target}`, exact: true });
      await modal.waitFor();
      await modal.getByAltText(`Xem trước ${target}`).waitFor();
      await modal.getByRole("button", { name: "Lưu thay đổi", exact: true }).waitFor();
      await modal.getByRole("button", { name: "Hủy", exact: true }).click();
      await modal.waitFor({ state: "hidden" });
    }
    assert.equal(uploadPosts, 0, "Camera preview must wait for explicit save before uploading");
    page.off("request", countUploads);
  }
  const title = "Hợp tác được kiểm thử từ giao diện";
  await organizer.goto(`${origin}/organizer/jobs/new`);
  await organizer.getByLabel("Tên Job", { exact: false }).fill(title);
  await organizer.getByLabel("Địa điểm", { exact: false }).fill("Hà Nội");
  await organizer.getByRole("button", { name: /^Tiếp tục/ }).click();
  await organizer
    .getByLabel("Mô tả cơ hội", { exact: false })
    .fill(
      "Sự kiện kiểm thử giao diện dành cho nhà sáng tạo và nhà tổ chức để cùng chia sẻ trải nghiệm.",
    );
  await organizer
    .getByLabel("Yêu cầu với KOL", { exact: false })
    .fill("Tham gia đúng lịch và trao đổi nội dung cùng đội ngũ sự kiện.");
  await organizer.getByLabel("Quyền lợi dành cho KOL", { exact: false }).fill("Thù lao đã công khai và hỗ trợ nội dung, di chuyển.");
  await organizer.getByRole("button", { name: /^Tiếp tục/ }).click();
  for (const [label, value] of [
    ["Số lượng KOL cần tuyển", "2"],
    ["Ngân sách tối thiểu (VNĐ)", "1000000"],
    ["Ngân sách tối đa (VNĐ)", "3000000"],
    ["Hạn ứng tuyển", new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16)],
    ["Thời gian sự kiện", new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 16)],
  ])
    await organizer.getByLabel(label, { exact: false }).fill(value);
  await organizer.getByRole("button", { name: /^Tiếp tục/ }).click();
  await organizer.getByRole("heading", { name: "Kiểm tra nội dung Job" }).waitFor();
  await organizer.getByRole("button", { name: /^Tạo bản nháp/ }).click();
  await organizer.waitForURL(/\/organizer\/jobs\/[^/]+$/);
  const jobId = new URL(organizer.url()).pathname.split("/").at(-1);
  await organizer.getByRole("button", { name: "Gửi Job kiểm duyệt", exact: true }).click();
  await organizer.getByText("Chờ xử lý", { exact: true }).waitFor();
  await admin.goto(`${origin}/admin/moderation`);
  const moderation = admin
    .locator(".list-card")
    .filter({ has: admin.getByRole("heading", { name: title, exact: true }) });
  await moderation.getByRole("button", { name: "Duyệt Job", exact: true }).click();
  await moderation.waitFor({ state: "detached" });
  await kol.goto(`${origin}/jobs/${jobId}`);
  await kol
    .getByLabel("Lời giới thiệu của bạn")
    .fill("Tôi muốn đồng hành cùng đội ngũ trong sự kiện sáng tạo này.");
  await kol.getByRole("button", { name: /^Gửi ứng tuyển/ }).click();
  await kol.waitForURL("**/kol/applications");
  await organizer.goto(`${origin}/organizer/applications`);
  const application = organizer
    .locator(".list-card")
    .filter({ has: organizer.getByRole("heading", { name: title, exact: true }) });
  await application.getByRole("button", { name: "Chấp nhận ứng viên", exact: true }).click();
  await application.getByText("Đã chấp nhận", { exact: true }).waitFor();
  const creators = await (await organizer.request.get(`${origin}/api/kols?q=An`)).json();
  await organizer.goto(`${origin}/kols/${creators.data.items[0].user.id}`);
  await organizer.getByLabel("Chọn Job").selectOption(jobId);
  await organizer
    .getByLabel("Lời mời hợp tác", { exact: true })
    .fill("Chúng tôi muốn mời bạn trải nghiệm và đồng hành tại sự kiện này.");
  await organizer.getByRole("button", { name: /^Gửi lời mời/ }).click();
  await organizer.waitForURL("**/organizer/invitations");
  await an.goto(`${origin}/kol/invitations`);
  await an.getByRole("button", { name: "Chấp nhận lời mời tham gia", exact: true }).click();
  await an.getByText("Đã chấp nhận", { exact: true }).waitFor();
  await organizer.goto(`${origin}/organizer/jobs/${jobId}`);
  await organizer.getByRole("heading", { name: "KOL đã xác nhận (2)", exact: true }).waitFor();

  async function requestLeave(page, reason) {
    await page.goto(`${origin}/kol/jobs`);
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await card.getByRole("button", { name: "Rút tham gia", exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Yêu cầu rút tham gia", exact: true });
    await modal.getByLabel("Lý do rút tham gia", { exact: true }).fill(reason);
    await modal.getByRole("button", { name: /^Xác nhận gửi yêu cầu rút/ }).click();
    await modal.waitFor({ state: "hidden" });
  }
  await requestLeave(kol, "Tôi cần thay đổi lịch tham gia vì công việc cá nhân.");
  await organizer.goto(`${origin}/organizer/jobs/${jobId}`);
  const leave = organizer.locator(".list-card").filter({ hasText: "Tôi cần thay đổi lịch tham gia vì công việc cá nhân." });
  await leave.getByRole("button", { name: "Từ chối yêu cầu rút", exact: true }).click();
  const rejection = organizer.getByRole("dialog", { name: "Từ chối yêu cầu rút", exact: true });
  await rejection.getByLabel("Lý do từ chối", { exact: true }).fill("Danh sách đã chốt, cần trao đổi lại lịch.");
  await rejection.getByRole("button", { name: /^Xác nhận từ chối/ }).click();
  await rejection.waitFor({ state: "hidden" });
  await kol.goto(`${origin}/kol/withdrawals`);
  kol.once("dialog", (dialog) => dialog.accept());
  await kol.getByRole("button", { name: "Xác nhận rời không được chấp thuận", exact: true }).click();
  await kol.locator(".list-card").getByText("Đã rút · Không được chấp thuận", { exact: true }).waitFor();
  await organizer.goto(`${origin}/organizer/jobs/${jobId}`);
  await organizer.getByRole("heading", { name: "KOL đã xác nhận (1)", exact: true }).waitFor();
  await requestLeave(an, "Tôi không thể tham gia theo kế hoạch đã thống nhất.");
  await organizer.goto(`${origin}/organizer/jobs/${jobId}`);
  organizer.once("dialog", (dialog) => dialog.accept());
  await organizer.getByRole("button", { name: "Chấp thuận rút tham gia", exact: true }).click();
  await organizer.getByRole("heading", { name: "KOL đã xác nhận (0)", exact: true }).waitFor();
  organizer.once("dialog", (dialog) => dialog.accept());
  await organizer.getByRole("button", { name: "Đánh dấu Job hoàn thành", exact: true }).click();
  await organizer.getByText("Đã hoàn thành", { exact: true }).waitFor();

  await organizer.goto(`${origin}/organizer/jobs`);
  await organizer.getByLabel("Tìm kiếm Job", { exact: true }).fill(title);
  await organizer.getByRole("button", { name: "Lọc Job", exact: true }).click();
  await organizer.waitForURL("**/organizer/jobs?**");
  assert.match(await organizer.locator(".results-count").innerText(), /1 Job phù hợp/);
  await organizer.getByRole("link", { name: title, exact: true }).waitFor();
  await organizer.setViewportSize({ width: 390, height: 1000 });
  assert.ok(
    await organizer.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "Organizer job cards overflow on mobile",
  );
  const publicContext = await browser.newContext();
  contexts.push(publicContext);
  const publicPage = await publicContext.newPage();
  for (const width of [1440, 390]) {
    await publicPage.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/",
      "/jobs",
      "/kols",
      "/login",
      "/register",
      `/jobs/${jobId}`,
      `/kols/${creators.data.items[0].user.id}`,
    ]) {
      const response = await publicPage.goto(`${origin}${path}`);
      assert.equal(response.status(), 200, path);
      assert.ok(
        await publicPage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        `Horizontal overflow: ${path} at ${width}`,
      );
      if (path === "/login") {
        await publicPage.getByLabel("Mật khẩu", { exact: true }).fill("PreviewOnly#123");
        await publicPage.getByRole("button", { name: "Hiện mật khẩu", exact: true }).click();
        assert.equal(
          await publicPage.getByLabel("Mật khẩu", { exact: true }).getAttribute("type"),
          "text",
        );
        await publicPage.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).click();
        assert.equal(
          await publicPage.getByLabel("Mật khẩu", { exact: true }).getAttribute("type"),
          "password",
        );
        await publicPage.getByLabel("Mật khẩu", { exact: true }).fill("");
      }
      await publicPage.evaluate(() => document.fonts.ready);
      await publicPage.screenshot({
        path: `test-results/public-${path.replace(/[^a-z0-9]+/gi, "-") || "home"}-${width}.png`,
        fullPage: true,
      });
    }
    await publicPage.goto(origin);
    // Widget UI checks use a local response fixture; never call the paid provider.
    await publicPage.route("**/api/ai/chat", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { message: "KOLVIA kết nối KOL với người tổ chức.", cards: [{ title: "Khám phá Job", href: "/jobs", detail: "Xem job công khai" }], tools: ["get_help"], retrievedAt: new Date().toISOString() } }) }));
    await publicPage.getByRole("button", { name: "Mở trợ lý AI KOLVIA", exact: true }).click();
    const chat = publicPage.getByRole("dialog", { name: "Trợ lý KOLVIA", exact: true });
    await chat.getByRole("button", { name: "KOLVIA là gì?" }).click();
    await chat.getByText("KOLVIA kết nối KOL với người tổ chức.", { exact: true }).waitFor();
    const compactSize = await chat.boundingBox();
    await chat.getByRole("button", { name: "Phóng to trò chuyện", exact: true }).click();
    assert.equal(await chat.getByRole("button", { name: "Thu gọn trò chuyện", exact: true }).getAttribute("aria-pressed"), "true");
    const expandedSize = await chat.boundingBox();
    assert.ok(expandedSize.width >= compactSize.width && expandedSize.height >= compactSize.height, "Expanded chat must grow within the viewport");
    assert.ok(expandedSize.x >= 0 && expandedSize.x + expandedSize.width <= width && expandedSize.y >= 0, `Expanded chat overflow at ${width}`);
    await chat.getByRole("button", { name: "Thu gọn trò chuyện", exact: true }).click();
    assert.ok(await chat.getByText("KOLVIA kết nối KOL với người tổ chức.", { exact: true }).isVisible());
    await publicPage.getByRole("button", { name: "Thu nhỏ trợ lý KOLVIA", exact: true }).click();
    await publicPage.getByRole("button", { name: "Mở trợ lý AI KOLVIA", exact: true }).click();
    assert.ok(await chat.getByText("KOLVIA kết nối KOL với người tổ chức.", { exact: true }).isVisible());
    assert.ok(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Chat overflow at ${width}`);
    await chat.getByRole("button", { name: "Đóng trò chuyện", exact: true }).click();
    await publicPage.unroute("**/api/ai/chat");
    await publicPage.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    await organizer.setViewportSize({ width, height: 1000 });
    await organizer.goto(origin);
    let chatCalls = 0;
    await organizer.route("**/api/ai/chat", (route) => {
      chatCalls++;
      const body = route.request().postDataJSON();
      if (chatCalls === 1) return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { message: "Bạn muốn tìm KOL cho job nào?", cards: [], jobChoices: [{ jobId: "ui-job-a", title: "Sự kiện Beauty", detail: "Còn 2 vị trí" }, { jobId: "ui-job-b", title: "Sự kiện Tech", detail: "Còn 1 vị trí" }], contextToken: "fixture.context", tools: ["my_recommendations"] } }) });
      assert.deepEqual(body.action, { type: "select_job", jobId: "ui-job-a" }); assert.equal(body.contextToken, "fixture.context");
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { message: "### KOL phù hợp\n\n**Gợi ý theo sự kiện Beauty**\n\n- Kỹ năng review", cards: [{ title: "Nhà sáng tạo", href: "/kols/creator-ui", detail: "Beauty · TP.HCM", score: 90 }], jobChoices: [], selectedJobId: "ui-job-a", contextToken: "fixture.selected", tools: ["my_recommendations"] } }) });
    });
    await organizer.getByRole("button", { name: "Mở trợ lý AI KOLVIA", exact: true }).click();
    const organizerChat = organizer.getByRole("dialog", { name: "Trợ lý KOLVIA", exact: true });
    await organizerChat.getByRole("button", { name: "Gợi ý KOL phù hợp cho sự kiện của tôi." }).click();
    await organizerChat.getByRole("button", { name: /Sự kiện Beauty/ }).click();
    await organizerChat.getByRole("heading", { name: "KOL phù hợp", exact: true }).waitFor();
    assert.equal(chatCalls, 2); assert.ok(await organizerChat.getByRole("link", { name: /Nhà sáng tạo/ }).isVisible());
    assert.ok(await organizer.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Job choices overflow at ${width}`);
    await organizerChat.getByRole("button", { name: "Đóng trò chuyện", exact: true }).click();
    await organizer.unroute("**/api/ai/chat");
    for (const [page, role, routes] of [
      [kol, "kol", ["dashboard", "profile", "applications", "invitations"]],
      [
        organizer,
        "organizer",
        ["dashboard", "profile", "jobs", "jobs/new", "applications", "invitations"],
      ],
      [admin, "admin", ["", "users", "jobs", "moderation"]],
    ]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of routes) {
        const response = await page.goto(`${origin}/${role}${path ? `/${path}` : ""}`);
        assert.equal(response.status(), 200, `${role}/${path}`);
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
          `Horizontal overflow: ${role}/${path} at ${width}`,
        );
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: `test-results/${role}-${path.replaceAll("/", "-") || "overview"}-${width}.png`,
          fullPage: true,
        });
      }
      await page.screenshot({ path: `test-results/${role}-${width}.png`, fullPage: true });
    }
  }
  await publicPage.goto(`${origin}/admin`);
  await publicPage.waitForURL("**/login");
  await kol.goto(`${origin}/admin`);
  await kol.waitForURL("**/kol/dashboard");
  for (const context of contexts) await context.close();
  console.log(
    "Browser checks passed: role login, moderation, applications, invitations, roster, routing and desktop/mobile overflow. Screenshots are in test-results/.",
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Browser checks failed");
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
  }
  if (database) {
    try {
      await database.cleanup();
    } catch {
      console.error("Không dọn được database MySQL thử nghiệm.");
      process.exitCode = 1;
    }
  }
}
