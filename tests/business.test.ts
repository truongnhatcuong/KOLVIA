import test, { before, after } from "node:test";
import strict from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { db } from "../src/lib/db/client";
import type { Actor } from "../src/types";
import { actorSelect, resolveSession } from "../src/lib/auth/session";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { register, login } from "../src/services/auth";
import { updateKolProfile, updateOrganizerProfile } from "../src/services/profiles";
import {
  createJob,
  updateJob,
  submitJob,
  setJobStatus,
  deleteJob,
  ownJob,
  ownJobPage,
  participants,
  jobForViewer,
} from "../src/services/jobs";
import {
  applyToJob,
  applications,
  decideApplication,
  inviteKol,
  invitations,
  respondInvitation,
} from "../src/services/collaborations";
import { moderateJob, hideJob, setUserActive, adminUsers } from "../src/services/admin";
import { notifications, readNotification } from "../src/services/notifications";
import { requestWithdrawal, decideWithdrawal, confirmDeparture, withdrawals } from "../src/services/withdrawals";
import { publicJobs, publicKols, publicJob, publicKol } from "../src/lib/db/queries";
import { isSocialUrl } from "../src/lib/validations";
import { checkOrigin } from "../src/lib/http";
import { AppError } from "../src/lib/errors";
import {
  uploadPermission,
  recordUpload,
  ownMedia,
  detachMedia,
  queueUnusedUpload,
  cleanupUnusedMedia,
} from "../src/services/media";

let admin: Actor, kol: Actor, otherKol: Actor, organizer: Actor, otherOrganizer: Actor;
const password = randomBytes(16).toString("hex");
const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const jobInput = () => ({
  title: "Sự kiện trải nghiệm sáng tạo",
  description: "Nhà tổ chức tìm kiếm KOL để đồng hành cùng sự kiện và chia sẻ trải nghiệm.",
  requirements: "Tham gia sự kiện đúng lịch và thực hiện nội dung đã thống nhất.",
  category: "Lifestyle",
  location: "TP. Hồ Chí Minh",
  budgetMin: 1000000,
  budgetMax: 3000000,
  deadline: days(10),
  eventDate: days(14),
});
const denial = (status: number) => (e: unknown) => e instanceof AppError && e.status === status;
async function approvedJob() {
  const job = await createJob(organizer, jobInput());
  await submitJob(organizer, job.id);
  await moderateJob(admin, job.id, { moderation: "APPROVED", note: "" });
  return job;
}

before(async () => {
  admin = await db.user.create({
    data: {
      email: "admin@test.local",
      name: "Admin",
      role: "ADMIN",
      passwordHash: await hashPassword(password),
    },
    select: actorSelect,
  });
  kol = await register({ email: "kol@test.local", name: "KOL A", role: "KOL", password });
  otherKol = await register({ email: "kol2@test.local", name: "KOL B", role: "KOL", password });
  organizer = await register({
    email: "organizer@test.local",
    name: "Organizer A",
    role: "ORGANIZER",
    password,
  });
  otherOrganizer = await register({
    email: "organizer2@test.local",
    name: "Organizer B",
    role: "ORGANIZER",
    password,
  });
  for (const actor of [kol, otherKol])
    await updateKolProfile(actor, {
      name: actor.name,
      bio: "Giới thiệu của nhà sáng tạo",
      category: "Lifestyle",
      location: "Hà Nội",
      isPublic: true,
    });
});
after(async () => db.$disconnect());

test("registration rejects ADMIN, extra privilege fields, duplicate emails", async () => {
  await strict.rejects(() =>
    register({ email: "evil@test.local", name: "Evil", role: "ADMIN", password }),
  );
  await strict.rejects(() =>
    register({ email: "evil@test.local", name: "Evil", role: "KOL", password, active: true }),
  );
  await strict.rejects(() =>
    register({ email: kol.email.toUpperCase(), name: "Duplicate", role: "KOL", password }),
  );
});
test("password hashing uses salt and rejects an incorrect password", async () => {
  const a = await hashPassword(password),
    b = await hashPassword(password);
  strict.notEqual(a, b);
  strict.ok(await verifyPassword(password, a));
  strict.equal(await verifyPassword("incorrect", a), false);
});
test("login accepts credentials and rejects wrong passwords without exposing passwordHash", async () => {
  const actor = await login({ email: kol.email, password });
  strict.equal(actor.id, kol.id);
  strict.ok(!("passwordHash" in actor));
  await strict.rejects(() => login({ email: kol.email, password: "incorrect" }), denial(401));
});
test("login attempts are rate limited", async () => {
  for (let n = 0; n < 10; n++)
    await strict.rejects(() => login({ email: "unknown@test.local", password }));
  await strict.rejects(() => login({ email: "unknown@test.local", password }), denial(429));
});
test("sensitive services reject anonymous and wrong-role actors", async () => {
  await strict.rejects(() => createJob(null, jobInput()), denial(401));
  await strict.rejects(() => createJob(kol, jobInput()), denial(403));
  await strict.rejects(() => adminUsers(organizer), denial(403));
  await strict.rejects(() => updateOrganizerProfile(kol, { name: "Bad" }), denial(403));
});
test("profile update preserves ownership and validates social links", async () => {
  await updateKolProfile(kol, {
    name: "KOL Updated",
    bio: "Updated bio",
    category: "Beauty",
    location: "Hà Nội",
    isPublic: true,
    tiktokUrl: "https://www.tiktok.com/@creator",
  });
  strict.equal((await publicKol(kol.id))?.user.name, "KOL Updated");
  strict.equal((await publicKol(otherKol.id))?.user.name, otherKol.name);
  await strict.rejects(() =>
    updateKolProfile(kol, {
      name: "Name",
      bio: "",
      category: "Beauty",
      location: "",
      isPublic: true,
      facebookUrl: "https://facebook.com.evil.test/user",
    }),
  );
});
test("URL validation rejects spoofed hosts, javascript, credentials and arbitrary ports", () => {
  for (const url of [
    "https://tiktok.com.evil.test/@x",
    "javascript:alert(1)",
    "http://tiktok.com/@x",
    "https://user@tiktok.com/@x",
    "https://www.tiktok.com:444/@x",
  ])
    strict.equal(isSocialUrl(url, "TIKTOK"), false);
  strict.ok(isSocialUrl("https://www.facebook.com/user/posts/123", "FACEBOOK"));
});
test("CSRF checks reject missing and foreign origins", () => {
  strict.throws(() => checkOrigin(new Request("http://127.0.0.1:3000/api/jobs")), denial(403));
  strict.throws(
    () =>
      checkOrigin(
        new Request("http://127.0.0.1:3000/api/jobs", { headers: { origin: "https://evil.test" } }),
      ),
    denial(403),
  );
  checkOrigin(
    new Request("http://127.0.0.1:3000/api/jobs", { headers: { origin: "http://127.0.0.1:3000" } }),
  );
});
test("draft/pending jobs stay private and owners are enforced", async () => {
  const job = await createJob(organizer, jobInput());
  strict.equal(await publicJob(job.id), null);
  await strict.rejects(() => ownJob(otherOrganizer, job.id), denial(403));
  await strict.rejects(() => updateJob(otherOrganizer, job.id, jobInput()), denial(403));
  await strict.rejects(() => deleteJob(otherOrganizer, job.id), denial(403));
  await submitJob(organizer, job.id);
  strict.equal(await publicJob(job.id), null);
  await strict.rejects(
    () => moderateJob(organizer, job.id, { moderation: "APPROVED", note: "" }),
    denial(403),
  );
  await moderateJob(admin, job.id, { moderation: "APPROVED", note: "" });
  strict.ok(await publicJob(job.id));
});
test("job validation rejects invalid budgets, dates and client-selected owners", async () => {
  await strict.rejects(() =>
    createJob(organizer, { ...jobInput(), budgetMin: 500, budgetMax: 100 }),
  );
  await strict.rejects(() => createJob(organizer, { ...jobInput(), deadline: days(-1) }));
  await strict.rejects(() => createJob(organizer, { ...jobInput(), eventDate: days(1) }));
  await strict.rejects(() =>
    createJob(organizer, { ...jobInput(), organizerId: otherOrganizer.id }),
  );
});
test("editing an approved job sends it back for moderation", async () => {
  const job = await approvedJob();
  const edited = await updateJob(organizer, job.id, {
    ...jobInput(),
    title: "Nội dung cập nhật của sự kiện",
  });
  strict.equal(edited.moderation, "PENDING");
  strict.equal(await publicJob(job.id), null);
});
test("moderation rejects a missing reason and repeated decisions", async () => {
  const job = await createJob(organizer, jobInput());
  await submitJob(organizer, job.id);
  await strict.rejects(() => moderateJob(admin, job.id, { moderation: "REJECTED", note: "" }));
  await moderateJob(admin, job.id, {
    moderation: "REJECTED",
    note: "Vui lòng bổ sung lịch trình.",
  });
  await strict.rejects(
    () => moderateJob(admin, job.id, { moderation: "APPROVED", note: "" }),
    denial(409),
  );
});
test("application is unique and invisible to another organizer/KOL", async () => {
  const job = await approvedJob();
  const application = await applyToJob(kol, {
    jobId: job.id,
    message: "Tôi mong muốn tham gia sự kiện này.",
  });
  await strict.rejects(() =>
    applyToJob(kol, { jobId: job.id, message: "Đơn trùng của cùng KOL." }),
  );
  strict.ok(!(await applications(otherOrganizer)).some((a) => a.id === application.id));
  strict.ok(!(await applications(otherKol)).some((a) => a.id === application.id));
  await strict.rejects(
    () => decideApplication(otherOrganizer, application.id, { status: "ACCEPTED" }),
    denial(403),
  );
  await strict.rejects(
    () => decideApplication(otherKol, application.id, { status: "WITHDRAWN" }),
    denial(403),
  );
  await strict.rejects(
    () => decideApplication(kol, application.id, { status: "ACCEPTED" }),
    denial(403),
  );
});
test("accepting an application creates a participant and repeated decisions fail", async () => {
  const job = await approvedJob();
  const application = await applyToJob(kol, {
    jobId: job.id,
    message: "Tôi mong muốn tham gia sự kiện này.",
  });
  await decideApplication(organizer, application.id, { status: "ACCEPTED" });
  strict.equal((await participants(organizer, job.id)).length, 1);
  await strict.rejects(
    () => decideApplication(organizer, application.id, { status: "REJECTED" }),
    denial(409),
  );
  await strict.rejects(() => participants(otherOrganizer, job.id), denial(403));
});
test("only the invited KOL may respond and invitation reads are scoped", async () => {
  const job = await approvedJob();
  const invitation = await inviteKol(organizer, {
    jobId: job.id,
    kolId: kol.id,
    message: "Chúng tôi muốn mời bạn tham gia.",
  });
  await strict.rejects(
    () =>
      inviteKol(otherOrganizer, {
        jobId: job.id,
        kolId: kol.id,
        message: "Giả mạo chủ sở hữu Job.",
      }),
    denial(403),
  );
  await strict.rejects(
    () => respondInvitation(otherKol, invitation.id, { status: "ACCEPTED" }),
    denial(403),
  );
  strict.ok(!(await invitations(otherOrganizer)).some((i) => i.id === invitation.id));
  strict.ok(!(await invitations(otherKol)).some((i) => i.id === invitation.id));
  await respondInvitation(kol, invitation.id, { status: "ACCEPTED" });
  strict.equal((await participants(organizer, job.id)).length, 1);
});
test("application and invitation confirmation share one participant", async () => {
  const job = await approvedJob();
  const app = await applyToJob(kol, {
    jobId: job.id,
    message: "Tôi mong muốn tham gia sự kiện này.",
  });
  const invitation = await inviteKol(organizer, {
    jobId: job.id,
    kolId: kol.id,
    message: "Chúng tôi muốn mời bạn tham gia.",
  });
  await respondInvitation(kol, invitation.id, { status: "ACCEPTED" });
  await decideApplication(organizer, app.id, { status: "ACCEPTED" });
  strict.equal((await participants(organizer, job.id)).length, 1);
});
test("closed and expired jobs reject applications and acceptance", async () => {
  const job = await approvedJob();
  const invitation = await inviteKol(organizer, {
    jobId: job.id,
    kolId: kol.id,
    message: "Chúng tôi muốn mời bạn tham gia.",
  });
  await setJobStatus(organizer, job.id, { status: "CLOSED" });
  await strict.rejects(
    () => applyToJob(kol, { jobId: job.id, message: "Tôi mong muốn tham gia sự kiện này." }),
    denial(409),
  );
  await strict.rejects(
    () => respondInvitation(kol, invitation.id, { status: "ACCEPTED" }),
    denial(409),
  );
  await setJobStatus(organizer, job.id, { status: "OPEN" });
  await db.job.update({ where: { id: job.id }, data: { deadline: new Date(Date.now() - 1000) } });
  await strict.rejects(
    () => applyToJob(kol, { jobId: job.id, message: "Tôi mong muốn tham gia sự kiện này." }),
    denial(409),
  );
  strict.equal(await publicJob(job.id), null);
});
test("deleting a job with history archives it and preserves participation", async () => {
  const job = await approvedJob();
  const app = await applyToJob(kol, {
    jobId: job.id,
    message: "Tôi mong muốn tham gia sự kiện này.",
  });
  await decideApplication(organizer, app.id, { status: "ACCEPTED" });
  strict.deepEqual(await deleteJob(organizer, job.id), { archived: true });
  strict.equal((await ownJob(organizer, job.id)).status, "ARCHIVED");
  strict.equal((await participants(organizer, job.id)).length, 1);
  await strict.rejects(() => updateJob(organizer, job.id, jobInput()), denial(409));
});
test("public DTOs never contain emails, password hashes or private profiles", async () => {
  const job = await approvedJob();
  const data = JSON.stringify(await publicJob(job.id));
  strict.ok(!data.includes("passwordHash"));
  strict.ok(!data.includes("email"));
  const creators = JSON.stringify(await publicKols());
  strict.ok(!creators.includes("passwordHash"));
  strict.ok(!creators.includes("email"));
  await db.kolProfile.update({ where: { userId: otherKol.id }, data: { isPublic: false } });
  strict.equal(await publicKol(otherKol.id), null);
  strict.ok((await publicJobs()).total > 0);
});
test("sessions reject expiry, tampering and locked accounts", async () => {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.session.create({
    data: { tokenHash, userId: kol.id, expiresAt: new Date(Date.now() + 60000) },
  });
  strict.equal((await resolveSession(token))?.id, kol.id);
  strict.equal(await resolveSession("x".repeat(64)), null);
  await db.session.update({
    where: { tokenHash },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  strict.equal(await resolveSession(token), null);
  await db.session.update({
    where: { tokenHash },
    data: { expiresAt: new Date(Date.now() + 60000) },
  });
  await setUserActive(admin, kol.id, { active: false });
  strict.equal(await resolveSession(token), null);
  await strict.rejects(
    () => applyToJob(kol, { jobId: "anything", message: "Đơn ứng tuyển của tài khoản khóa." }),
    denial(401),
  );
  await strict.rejects(() => login({ email: kol.email, password }), denial(401));
  await setUserActive(admin, kol.id, { active: true });
});
test("admin cannot lock themselves or change roles through the user endpoint", async () => {
  await strict.rejects(() => setUserActive(admin, admin.id, { active: false }), denial(409));
  await strict.rejects(() => setUserActive(admin, kol.id, { active: true, role: "ADMIN" }));
});

const receipt = (key: string) => ({
  key,
  url: `https://demo.ufs.sh/f/${key}`,
  name: "portrait.webp",
  size: 12000,
});
test("media upload enforces session, role, target and job ownership", async () => {
  await strict.rejects(() => uploadPermission(null, { target: "AVATAR" }), denial(401));
  await strict.rejects(() => uploadPermission(admin, { target: "AVATAR" }), denial(403));
  strict.equal((await uploadPermission(organizer, { target: "AVATAR" })).ownerId, organizer.id);
  strict.equal((await uploadPermission(organizer, { target: "COVER" })).ownerId, organizer.id);
  await strict.rejects(() => uploadPermission(organizer, { target: "PORTFOLIO" }), denial(403));
  await strict.rejects(() => uploadPermission(kol, { target: "LOGO" }), denial(403));
  await strict.rejects(() => uploadPermission(kol, { target: "AVATAR", ownerId: otherKol.id }));
  await strict.rejects(() => uploadPermission(organizer, { target: "JOB_COVER" }));
  const job = await createJob(organizer, jobInput());
  await strict.rejects(
    () => uploadPermission(otherOrganizer, { target: "JOB_COVER", jobId: job.id }),
    denial(403),
  );
  await strict.rejects(() => ownMedia(otherOrganizer, job.id), denial(403));
  strict.equal(
    (await uploadPermission(organizer, { target: "JOB_COVER", jobId: job.id })).ownerId,
    organizer.id,
  );
});
test("media replacement is idempotent and only the active image enters public DTOs", async () => {
  const metadata = { ownerId: kol.id, input: { target: "AVATAR" as const } };
  const old = await recordUpload(metadata, receipt("avatar-first"));
  const current = await recordUpload(metadata, receipt("avatar-second"));
  strict.deepEqual(await recordUpload(metadata, receipt("avatar-second")), current);
  strict.equal((await ownMedia(kol)).filter((m) => m.target === "AVATAR").length, 1);
  strict.equal((await db.mediaAsset.findUnique({ where: { id: old.id } }))?.slot, null);
  const profile = await publicKol(kol.id);
  strict.equal(profile?.user.media.find((m) => m.target === "AVATAR")?.url, current.url);
  const data = JSON.stringify(profile);
  for (const privateField of ["ownerId", "slot", "key", "passwordHash", "email"])
    strict.ok(!data.includes(`"${privateField}"`));
});
test("media callbacks recheck locked accounts and reject forged URLs and oversize images", async () => {
  const metadata = { ownerId: kol.id, input: { target: "COVER" as const } };
  await strict.rejects(
    () =>
      recordUpload(metadata, { ...receipt("bad-host"), url: "https://ufs.sh.attacker.test/f/x" }),
    denial(422),
  );
  await strict.rejects(
    () => recordUpload(metadata, { ...receipt("bad-size"), size: 4 * 1024 * 1024 + 1 }),
    denial(422),
  );
  await setUserActive(admin, kol.id, { active: false });
  await strict.rejects(() => recordUpload(metadata, receipt("locked")), denial(401));
  await setUserActive(admin, kol.id, { active: true });
});
test("portfolio quota is enforced at callback and duplicate callbacks remain safe at capacity", async () => {
  const metadata = { ownerId: kol.id, input: { target: "PORTFOLIO" as const } };
  for (let i = 0; i < 6; i++) await recordUpload(metadata, receipt(`portfolio-${i}`));
  await strict.rejects(() => uploadPermission(kol, metadata.input), denial(409));
  await strict.rejects(() => recordUpload(metadata, receipt("portfolio-seventh")), denial(409));
  await recordUpload(metadata, receipt("portfolio-0"));
  strict.equal((await ownMedia(kol)).filter((m) => m.target === "PORTFOLIO").length, 6);
});
test("organizer can replace profile photos without changing the organization logo", async () => {
  const logo = await recordUpload({ ownerId: organizer.id, input: { target: "LOGO" } }, receipt("organizer-logo"));
  await recordUpload({ ownerId: organizer.id, input: { target: "AVATAR" } }, receipt("organizer-avatar-old"));
  const avatar = await recordUpload({ ownerId: organizer.id, input: { target: "AVATAR" } }, receipt("organizer-avatar-new"));
  const cover = await recordUpload({ ownerId: organizer.id, input: { target: "COVER" } }, receipt("organizer-profile-cover"));
  const media = await ownMedia(organizer);
  strict.equal(media.filter((m) => m.target === "AVATAR").length, 1);
  strict.equal(media.find((m) => m.target === "AVATAR")?.id, avatar.id);
  strict.equal(media.find((m) => m.target === "COVER")?.id, cover.id);
  strict.equal(media.find((m) => m.target === "LOGO")?.id, logo.id);
  await strict.rejects(() => detachMedia(otherOrganizer, avatar.id), denial(403));
});

test("media deletion is scoped to owner and hides the image before remote cleanup", async () => {
  const asset = await recordUpload(
    { ownerId: kol.id, input: { target: "COVER" } },
    receipt("cover-to-remove"),
  );
  await strict.rejects(() => detachMedia(otherKol, asset.id), denial(403));
  await strict.rejects(() => detachMedia(organizer, asset.id), denial(403));
  await detachMedia(kol, asset.id);
  strict.ok(!(await ownMedia(kol)).some((m) => m.id === asset.id));
  strict.ok(!(await publicKol(kol.id))?.user.media.some((m) => m.id === asset.id));
  await db.mediaAsset.update({ where: { id: asset.id }, data: { deletedAt: new Date() } });
  await strict.rejects(
    () => recordUpload({ ownerId: kol.id, input: { target: "COVER" } }, receipt("cover-to-remove")),
    denial(409),
  );
});
test("new and removed job images trigger moderation and stay out of public listings", async () => {
  const job = await approvedJob();
  const asset = await recordUpload(
    { ownerId: organizer.id, input: { target: "JOB_COVER", jobId: job.id } },
    receipt("job-cover"),
  );
  strict.equal((await ownJob(organizer, job.id)).moderation, "PENDING");
  strict.equal(await publicJob(job.id), null);
  await moderateJob(admin, job.id, { moderation: "APPROVED", note: "" });
  strict.equal((await publicJob(job.id))?.media[0].id, asset.id);
  await detachMedia(organizer, asset.id);
  strict.equal((await ownJob(organizer, job.id)).moderation, "PENDING");
});
test("deleted jobs retain cleanup receipts without exposing orphaned covers", async () => {
  const job = await createJob(organizer, jobInput());
  const asset = await recordUpload(
    { ownerId: organizer.id, input: { target: "JOB_COVER", jobId: job.id } },
    receipt("deleted-job-cover"),
  );
  await deleteJob(organizer, job.id);
  const orphan = await db.mediaAsset.findUnique({ where: { id: asset.id } });
  strict.equal(orphan?.jobId, null);
  strict.equal(orphan?.slot, null);
});

test("removing a replaced cover or repeating a removal does not re-moderate the current job", async () => {
  const job = await approvedJob();
  const metadata = {
    ownerId: organizer.id,
    input: { target: "JOB_COVER" as const, jobId: job.id },
  };
  const old = await recordUpload(metadata, receipt("cover-repeat-old"));
  const current = await recordUpload(metadata, receipt("cover-repeat-current"));
  await moderateJob(admin, job.id, { moderation: "APPROVED", note: "" });
  await detachMedia(organizer, old.id);
  strict.equal((await ownJob(organizer, job.id)).moderation, "APPROVED");
  strict.equal((await publicJob(job.id))?.media[0]?.id, current.id);
  await detachMedia(organizer, current.id);
  await moderateJob(admin, job.id, { moderation: "APPROVED", note: "" });
  await detachMedia(organizer, current.id);
  strict.equal((await ownJob(organizer, job.id)).moderation, "APPROVED");
});
test("archived jobs preserve their cover and reject image removal", async () => {
  const job = await approvedJob();
  const asset = await recordUpload(
    { ownerId: organizer.id, input: { target: "JOB_COVER", jobId: job.id } },
    receipt("archived-job-photo"),
  );
  await moderateJob(admin, job.id, { moderation: "APPROVED", note: "" });
  await applyToJob(kol, { jobId: job.id, message: "Tôi muốn tham gia sự kiện này." });
  await deleteJob(organizer, job.id);
  await strict.rejects(() => detachMedia(organizer, asset.id), denial(409));
  strict.ok((await db.mediaAsset.findUnique({ where: { id: asset.id } }))?.slot);
});
test("failed uploads keep cleanup receipts even when the account was locked before callback", async () => {
  const actor = await register({
    name: "Upload locked",
    email: "upload-locked@test.local",
    role: "KOL",
    password,
  });
  const metadata = { ownerId: actor.id, input: { target: "AVATAR" as const } };
  await setUserActive(admin, actor.id, { active: false });
  await strict.rejects(() => recordUpload(metadata, receipt("rejected-locked-photo")), denial(401));
  const queued = await queueUnusedUpload(metadata, receipt("rejected-locked-photo"));
  strict.ok(queued);
  strict.equal(queued.slot, null);
  strict.equal(queued.deletedAt, null);
  strict.equal(
    (await queueUnusedUpload(metadata, receipt("rejected-locked-photo")))?.id,
    queued.id,
  );
  strict.equal(await publicKol(actor.id), null);
  const cleaned = await cleanupUnusedMedia(actor.id, async () => true);
  strict.deepEqual(cleaned, { deleted: 1, pending: 0 });
  strict.ok((await db.mediaAsset.findUnique({ where: { id: queued.id } }))?.deletedAt);
});
test("cleanup continues after provider failures, retains retries and never deletes active or foreign files", async () => {
  const actor = await register({
    name: "Cleanup owner",
    email: "cleanup@test.local",
    role: "KOL",
    password,
  });
  const metadata = { ownerId: actor.id, input: { target: "AVATAR" as const } };
  const active = await recordUpload(metadata, receipt("cleanup-active"));
  for (const key of ["cleanup-fails", "cleanup-throws", "cleanup-success"])
    await queueUnusedUpload(metadata, receipt(key));
  strict.equal((await queueUnusedUpload(metadata, receipt("cleanup-active")))?.slot !== null, true);
  await strict.rejects(
    () => queueUnusedUpload({ ...metadata, ownerId: otherKol.id }, receipt("cleanup-active")),
    denial(403),
  );
  const attempted: string[] = [];
  const result = await cleanupUnusedMedia(actor.id, async (key) => {
    attempted.push(key);
    if (key === "cleanup-throws") throw new Error("Provider unavailable");
    return key === "cleanup-success";
  });
  strict.deepEqual(result, { deleted: 1, pending: 2 });
  strict.deepEqual(attempted.sort(), ["cleanup-fails", "cleanup-success", "cleanup-throws"]);
  strict.ok((await db.mediaAsset.findUnique({ where: { id: active.id } }))?.slot);
  const retried: string[] = [];
  strict.deepEqual(
    await cleanupUnusedMedia(actor.id, async (key) => {
      retried.push(key);
      return true;
    }),
    { deleted: 2, pending: 0 },
  );
  strict.deepEqual(retried.sort(), ["cleanup-fails", "cleanup-throws"]);
  strict.deepEqual(
    await cleanupUnusedMedia(actor.id, async () => {
      throw new Error("Already cleaned");
    }),
    { deleted: 0, pending: 0 },
  );
});
test("job management filters and pagination are always scoped to the organizer", async () => {
  await strict.rejects(() => ownJobPage(null), denial(401));
  await strict.rejects(() => ownJobPage(kol), denial(403));
  for (let index = 0; index < 10; index++)
    await createJob(otherOrganizer, { ...jobInput(), title: `Bộ lọc phân trang ${index}` });
  await createJob(organizer, { ...jobInput(), title: "Bộ lọc phân trang khác chủ" });
  const first = await ownJobPage(otherOrganizer, {
    q: "Bộ lọc phân trang",
    moderation: "DRAFT",
    status: "OPEN",
    page: 1,
  });
  const second = await ownJobPage(otherOrganizer, {
    q: "Bộ lọc phân trang",
    moderation: "DRAFT",
    status: "OPEN",
    page: 2,
  });
  strict.equal(first.total, 10);
  strict.equal(first.pages, 2);
  strict.equal(first.items.length, 8);
  strict.equal(second.items.length, 2);
  strict.ok(first.items.every((item) => item.organizerId === otherOrganizer.id));
  strict.ok(second.items.every((item) => !first.items.some((old) => old.id === item.id)));
  strict.equal(
    (await ownJobPage(otherOrganizer, { q: "Bộ lọc phân trang", status: "CLOSED" })).total,
    0,
  );
  await strict.rejects(() => ownJobPage(otherOrganizer, { moderation: "FORGED" }));
});

test("parallel application decisions cannot overfill recruitment capacity", async () => {
  const job = await createJob(organizer, { ...jobInput(), capacity: 1, benefits: "Thù lao và hỗ trợ di chuyển." });
  await submitJob(organizer, job.id);
  await moderateJob(admin, job.id, { moderation: "APPROVED", note: "" });
  const a = await applyToJob(kol, { jobId: job.id, message: "Tôi muốn tham gia sự kiện này." });
  const b = await applyToJob(otherKol, { jobId: job.id, message: "Tôi muốn tham gia sự kiện này." });
  const results = await Promise.allSettled([decideApplication(organizer, a.id, { status: "ACCEPTED" }), decideApplication(organizer, b.id, { status: "ACCEPTED" })]);
  strict.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const failure = results.find((result) => result.status === "rejected");
  strict.ok(failure?.status === "rejected" && denial(409)(failure.reason));
  strict.equal((await participants(organizer, job.id)).length, 1);
});
test("application and invitation decisions share the same seat limit", async () => {
  const job = await createJob(organizer, { ...jobInput(), capacity: 1 });
  await submitJob(organizer, job.id);
  await moderateJob(admin, job.id, { moderation: "APPROVED", note: "" });
  const app = await applyToJob(kol, { jobId: job.id, message: "Tôi muốn tham gia sự kiện này." });
  const invite = await inviteKol(organizer, { jobId: job.id, kolId: otherKol.id, message: "Mời bạn đồng hành cùng sự kiện." });
  const results = await Promise.allSettled([decideApplication(organizer, app.id, { status: "ACCEPTED" }), respondInvitation(otherKol, invite.id, { status: "ACCEPTED" })]);
  strict.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  strict.equal((await participants(organizer, job.id)).length, 1);
});
test("withdrawn applications and declined invitations can be resubmitted without duplicate rows", async () => {
  const job = await approvedJob();
  const app = await applyToJob(kol, { jobId: job.id, message: "Tôi muốn tham gia sự kiện này." });
  await decideApplication(kol, app.id, { status: "WITHDRAWN" });
  strict.equal((await applyToJob(kol, { jobId: job.id, message: "Tôi gửi lại yêu cầu tham gia." })).id, app.id);
  const data = { jobId: job.id, kolId: otherKol.id, message: "Mời bạn đồng hành cùng sự kiện." };
  const invite = await inviteKol(organizer, data);
  await strict.rejects(() => inviteKol(organizer, data), denial(409));
  await respondInvitation(otherKol, invite.id, { status: "DECLINED" });
  strict.equal((await inviteKol(organizer, data)).id, invite.id);
});
test("notifications are persisted with business changes and cannot be read by another owner", async () => {
  const job = await approvedJob();
  await applyToJob(kol, { jobId: job.id, message: "Tôi muốn tham gia sự kiện này." });
  const notice = (await notifications(organizer)).items.find((item) => item.type === "APPLICATION" && item.message.includes(job.title));
  strict.ok(notice);
  await strict.rejects(() => readNotification(otherKol, notice.id), denial(404));
  await readNotification(organizer, notice.id);
  strict.ok((await db.notification.findUnique({ where: { id: notice.id } }))?.readAt);
});
test("admin hiding preserves existing connections and restricts private job access", async () => {
  const job = await approvedJob();
  const app = await applyToJob(kol, { jobId: job.id, message: "Tôi muốn tham gia sự kiện này." });
  await decideApplication(organizer, app.id, { status: "ACCEPTED" });
  await strict.rejects(() => hideJob(organizer, job.id, { note: "Nội dung không phù hợp." }), denial(403));
  await hideJob(admin, job.id, { note: "Nội dung không phù hợp." });
  strict.equal(await publicJob(job.id), null);
  strict.ok(await jobForViewer(kol, job.id));
  strict.equal(await jobForViewer(otherKol, job.id), null);
  strict.equal((await participants(organizer, job.id)).length, 1);
});

async function confirmedParticipation() {
  const job = await approvedJob();
  const app = await applyToJob(kol, { jobId: job.id, message: "Tôi muốn đồng hành cùng sự kiện." });
  await decideApplication(organizer, app.id, { status: "ACCEPTED" });
  const participation = await db.participation.findUniqueOrThrow({ where: { jobId_kolId: { jobId: job.id, kolId: kol.id } } });
  return { job, app, participation };
}
test("cancellation and resubmission retain original application messages and timestamps in history", async () => {
  const job = await approvedJob();
  const app = await applyToJob(kol, { jobId: job.id, message: "Giới thiệu lần đầu của nhà sáng tạo." });
  await decideApplication(kol, app.id, { status: "WITHDRAWN" });
  await strict.rejects(() => decideApplication(kol, app.id, { status: "WITHDRAWN" }), denial(409));
  const again = await applyToJob(kol, { jobId: job.id, message: "Giới thiệu mới cho lần đăng ký tiếp theo." });
  strict.equal(again.id, app.id);
  strict.equal(again.createdAt.getTime(), app.createdAt.getTime());
  const history = await db.applicationHistory.findMany({ where: { applicationId: app.id } });
  strict.deepEqual(new Set(history.map((row) => row.action)), new Set(["SUBMITTED", "CANCELLED", "RESUBMITTED"]));
  strict.ok(history.some((row) => row.message === app.message));
});
test("withdrawal near or after event start remains allowed and records timing", async () => {
  for (const hours of [1, -1]) {
    const { job, participation } = await confirmedParticipation();
    await db.job.update({ where: { id: job.id }, data: { eventDate: new Date(Date.now() + hours * 3600000), status: "CLOSED" } });
    const request = await requestWithdrawal(kol, { participationId: participation.id, reason: "Lịch cá nhân thay đổi, tôi cần rút tham gia." });
    strict.equal(request.timing, hours > 0 ? "WITHIN_24H" : "EVENT_STARTED");
    strict.equal((await participants(organizer, job.id)).length, 1);
  }
});
test("approval releases the seat while all participation and withdrawal records remain", async () => {
  const { job, app, participation } = await confirmedParticipation();
  const request = await requestWithdrawal(kol, { participationId: participation.id, reason: "Tôi không thể tham gia theo lịch đã thống nhất." });
  await strict.rejects(() => decideWithdrawal(otherOrganizer, request.id, { status: "APPROVED" }), denial(403));
  await decideWithdrawal(organizer, request.id, { status: "APPROVED" });
  strict.equal((await participants(organizer, job.id)).length, 0);
  strict.equal((await db.participation.findUniqueOrThrow({ where: { id: participation.id } })).status, "WITHDRAWN_APPROVED");
  strict.equal((await db.application.findUniqueOrThrow({ where: { id: app.id } })).status, "WITHDRAWN");
  strict.equal((await publicJob(job.id))?._count.participations, 0);
  strict.equal((await withdrawals(kol)).find((row) => row.id === request.id)?.status, "APPROVED");
  strict.ok(!(await withdrawals(otherKol)).some((row) => row.id === request.id));
  await deleteJob(organizer, job.id);
  strict.equal((await ownJob(organizer, job.id)).status, "ARCHIVED");
  strict.ok(await db.withdrawalRequest.findUnique({ where: { id: request.id } }));
});
test("rejection keeps a seat until the KOL explicitly leaves without approval", async () => {
  const { job, participation } = await confirmedParticipation();
  const request = await requestWithdrawal(kol, { participationId: participation.id, reason: "Tôi cần xử lý công việc cá nhân gấp." });
  await decideWithdrawal(organizer, request.id, { status: "REJECTED", note: "Sự kiện đã chốt danh sách nhân sự." });
  strict.equal((await participants(organizer, job.id)).length, 1);
  await strict.rejects(() => confirmDeparture(otherKol, request.id, { confirm: true }), denial(403));
  await strict.rejects(() => confirmDeparture(organizer, request.id, { confirm: true }), denial(403));
  const left = await confirmDeparture(kol, request.id, { confirm: true });
  strict.equal(left.status, "LEFT_WITHOUT_APPROVAL");
  strict.equal(left.decisionNote, "Sự kiện đã chốt danh sách nhân sự.");
  strict.ok(left.reviewedAt && left.departedAt);
  strict.equal((await participants(organizer, job.id)).length, 0);
  await strict.rejects(() => confirmDeparture(kol, request.id, { confirm: true }), denial(409));
});
test("parallel withdrawal requests and reviews each have one successful transition", async () => {
  const { participation } = await confirmedParticipation();
  const input = { participationId: participation.id, reason: "Tôi không thể tham gia sự kiện này." };
  const attempts = await Promise.allSettled([requestWithdrawal(kol, input), requestWithdrawal(kol, input)]);
  strict.equal(attempts.filter((row) => row.status === "fulfilled").length, 1);
  const request = await db.withdrawalRequest.findFirstOrThrow({ where: { participationId: participation.id } });
  const decisions = await Promise.allSettled([decideWithdrawal(organizer, request.id, { status: "APPROVED" }), decideWithdrawal(organizer, request.id, { status: "REJECTED", note: "Cần trao đổi trước khi rút." })]);
  strict.equal(decisions.filter((row) => row.status === "fulfilled").length, 1);
  strict.equal(await db.withdrawalRequest.count({ where: { participationId: participation.id } }), 1);
});
test("completed jobs reject withdrawal and completion cannot bypass a pending request", async () => {
  const { job, participation } = await confirmedParticipation();
  const request = await requestWithdrawal(kol, { participationId: participation.id, reason: "Tôi không thể tiếp tục tham gia." });
  await strict.rejects(() => setJobStatus(organizer, job.id, { status: "COMPLETED" }), denial(409));
  await decideWithdrawal(organizer, request.id, { status: "REJECTED", note: "Đã thống nhất lịch và nội dung." });
  await setJobStatus(organizer, job.id, { status: "COMPLETED" });
  await strict.rejects(() => confirmDeparture(kol, request.id, { confirm: true }), denial(409));
  await strict.rejects(() => requestWithdrawal(kol, { participationId: participation.id, reason: "Tôi muốn rút sau hoàn thành." }), denial(409));
  await strict.rejects(() => setJobStatus(organizer, job.id, { status: "OPEN" }), denial(409));
  await strict.rejects(() => updateJob(organizer, job.id, jobInput()), denial(409));
  await deleteJob(organizer, job.id);
  strict.ok((await ownJob(organizer, job.id)).completedAt);
  await strict.rejects(() => confirmDeparture(kol, request.id, { confirm: true }), denial(409));
});
test("completion racing a new withdrawal cannot produce a completed job with a pending request", async () => {
  const { job, participation } = await confirmedParticipation();
  const attempts = await Promise.allSettled([setJobStatus(organizer, job.id, { status: "COMPLETED" }), requestWithdrawal(kol, { participationId: participation.id, reason: "Tôi có thay đổi kế hoạch cá nhân." })]);
  strict.equal(attempts.filter((row) => row.status === "fulfilled").length, 1);
  const current = await ownJob(organizer, job.id);
  const pending = await db.withdrawalRequest.count({ where: { participationId: participation.id, status: "PENDING" } });
  strict.ok(!(current.status === "COMPLETED" && pending > 0));
});
test("seat release racing a new acceptance cannot overfill recruitment", async () => {
  const job = await createJob(organizer, { ...jobInput(), capacity: 1 });
  await submitJob(organizer, job.id); await moderateJob(admin, job.id, { moderation: "APPROVED", note: "" });
  const a = await applyToJob(kol, { jobId: job.id, message: "Tôi muốn tham gia sự kiện này." });
  const b = await applyToJob(otherKol, { jobId: job.id, message: "Tôi muốn tham gia sự kiện này." });
  await decideApplication(organizer, a.id, { status: "ACCEPTED" });
  const p = await db.participation.findUniqueOrThrow({ where: { jobId_kolId: { jobId: job.id, kolId: kol.id } } });
  const request = await requestWithdrawal(kol, { participationId: p.id, reason: "Tôi cần rút tham gia do lịch cá nhân." });
  const results = await Promise.allSettled([decideWithdrawal(organizer, request.id, { status: "APPROVED" }), decideApplication(organizer, b.id, { status: "ACCEPTED" })]);
  strict.equal(results[0].status, "fulfilled");
  if (results[1].status === "rejected") { strict.ok(denial(409)(results[1].reason)); await decideApplication(organizer, b.id, { status: "ACCEPTED" }); }
  strict.equal((await participants(organizer, job.id)).length, 1);
});
test("rejoining through an invitation preserves previous withdrawal attempts", async () => {
  const { job, participation } = await confirmedParticipation();
  const first = await requestWithdrawal(kol, { participationId: participation.id, reason: "Tôi có việc cần xử lý trước sự kiện." });
  await decideWithdrawal(organizer, first.id, { status: "APPROVED" });
  const invitation = await inviteKol(organizer, { jobId: job.id, kolId: kol.id, message: "Mời bạn tham gia lại khi đã sắp xếp được lịch." });
  await respondInvitation(kol, invitation.id, { status: "ACCEPTED" });
  const again = await db.participation.findUniqueOrThrow({ where: { jobId_kolId: { jobId: job.id, kolId: kol.id } } });
  strict.equal(again.id, participation.id); strict.equal(again.status, "CONFIRMED");
  const second = await requestWithdrawal(kol, { participationId: again.id, reason: "Tôi cần gửi yêu cầu rút cho lịch mới." });
  strict.notEqual(second.id, first.id); strict.equal(second.sourceAtRequest, "INVITATION");
  strict.equal((await db.withdrawalRequest.findUniqueOrThrow({ where: { id: first.id } })).status, "APPROVED");
});
