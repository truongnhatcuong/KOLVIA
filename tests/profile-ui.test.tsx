import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { OrganizerProfileHeader } from "../src/components/organizer/profile-header";
import { KolProfileForm } from "../src/components/kol/profile-form";
import { MutationButton } from "../src/components/ui/api-form";
import { ActionLink } from "../src/components/ui/action-controls";
import { AdminJobs } from "../src/components/admin/jobs";
import { WithdrawalControls } from "../src/components/withdrawal-controls";
import { WithdrawalList } from "../src/components/withdrawal-list";
import type { withdrawals } from "../src/services/withdrawals";
import type { Actor } from "../src/types";
import type { MediaView } from "../src/lib/validations/media";
import { InvitationOfferCard, RecommendedJobCard } from "../src/components/kol/job-offer-card";
import { scoreMatch } from "../src/lib/ai/matching";
import { Pagination } from "../src/components/customer/search";

const actor: Actor = { id: "demo", name: "Minh Anh", email: "organizer@kolvia.local", role: "ORGANIZER", active: true };
const router = { bfcacheId: "profile-test", push() {}, replace() {}, refresh() {}, hmrRefresh() {}, back() {}, forward() {}, prefetch() {} };
test("catalog pagination keeps both a selected matching job and an explicit no-matching choice", () => {
  for (const jobId of ["job-1", ""]) {
    const html = renderToStaticMarkup(<Pagination page={1} pages={2} pathname="/kols" values={{ matchJob: jobId, category: "Beauty" }} />);
    assert.ok(html.includes(`matchJob=${jobId}&amp;category=Beauty&amp;page=2`));
  }
});
test("invitation offer cards expose valid response actions and never offer unsupported contract flows", () => {
  type Item = Parameters<typeof InvitationOfferCard>[0]["item"];
  const now = new Date();
  const item = {
    id: "invite-1", status: "PENDING", message: "Mời bạn hợp tác cùng sự kiện.", createdAt: now,
    job: { id: "job-1", title: "Beauty event", category: "Beauty", status: "OPEN", moderation: "APPROVED", completedAt: null, deadline: new Date(now.getTime() + 86400000), eventDate: new Date(now.getTime() + 172800000), budgetMin: 1000000, budgetMax: 2000000, capacity: 2, _count: { participations: 0 }, location: "TP.HCM", benefits: "Hỗ trợ sản phẩm", organizer: { name: "Minh Anh", organizer: { companyName: "Studio" }, media: [] } },
  } as unknown as Item;
  const render = (value: Item) => renderToStaticMarkup(<AppRouterContext.Provider value={router}><InvitationOfferCard item={value} /></AppRouterContext.Provider>);
  const html = render(item);
  assert.ok(html.includes("Chấp nhận lời mời")); assert.ok(html.includes("Từ chối")); assert.ok(html.includes("Hỗ trợ sản phẩm"));
  assert.ok(!html.includes("Ký HĐ") && !html.includes("Affiliate") && !html.includes("Thương thảo"));
  for (const blocked of [{ ...item, job: { ...item.job, status: "COMPLETED" as const } }, { ...item, job: { ...item.job, deadline: new Date(now.getTime() - 1) } }, { ...item, job: { ...item.job, _count: { participations: 2 } } }]) assert.ok(!render(blocked).includes("Chấp nhận lời mời"));
});
test("job suggestion cards show real matching evidence and omit absent benefits", () => {
  const match = scoreMatch({ category: "Beauty", skills: "Review", bio: "", experienceYears: 2, location: "TP.HCM" }, { category: "Beauty", requirements: "Review", description: "", location: "TP.HCM", budgetMin: 1, budgetMax: 2 });
  const html = renderToStaticMarkup(<RecommendedJobCard item={{ ...match, id: "job-1", name: "Beauty event", category: "Beauty", location: "TP.HCM", href: "/jobs/job-1", detail: "1.000.000 – 2.000.000 đ", organizerName: "Studio" }} />);
  assert.ok(html.includes("100% phù hợp")); assert.ok(html.includes("Căn cứ chấm điểm")); assert.ok(html.includes("1.000.000 – 2.000.000 đ"));
  assert.ok(html.includes("Xem job &amp; ứng tuyển")); assert.ok(!html.includes("Quyền lợi"));
});
test("withdrawal controls expose the correct action and completion blocks every departure", () => {
  const render = (status: string, jobStatus = "OPEN") => renderToStaticMarkup(<AppRouterContext.Provider value={router}><WithdrawalControls participationId="part-1" status={status} job={{ status: jobStatus }} request={{ id: "request-1", status: "REJECTED" }} /></AppRouterContext.Provider>);
  assert.ok(render("CONFIRMED").includes('aria-label="Rút tham gia"'));
  assert.ok(render("CONFIRMED").includes('name="reason"'));
  assert.ok(!render("WITHDRAWAL_PENDING").includes('aria-label="Rút tham gia"'));
  assert.ok(render("WITHDRAWAL_REJECTED").includes('aria-label="Xác nhận rời không được chấp thuận"'));
  assert.ok(render("CONFIRMED", "COMPLETED").includes("Job đã hoàn thành, không thể rút tham gia."));
  assert.ok(!render("WITHDRAWAL_REJECTED", "COMPLETED").includes('aria-label="Xác nhận rời không được chấp thuận"'));
});
test("withdrawal history shows reason and times and exposes review actions only to Organizer", () => {
  const item: Awaited<ReturnType<typeof withdrawals>>[number] = {
    id: "request-1", participationId: "part-1", activeSlot: "part-1", status: "PENDING", reason: "Tôi có thay đổi lịch cá nhân.", timing: "EVENT_STARTED", sourceAtRequest: "APPLICATION", eventDateAtRequest: new Date(), requestedAt: new Date(), reviewedAt: null, reviewedById: null, decisionNote: "", departedAt: null, reviewedBy: null,
    participation: { id: "part-1", status: "WITHDRAWAL_PENDING", kol: { id: "kol-1", name: "Linh Nguyễn" }, job: { id: "job-1", title: "Sự kiện sáng tạo", location: "Hà Nội", status: "OPEN", completedAt: null } },
  };
  const render = (role: "KOL" | "ORGANIZER") => renderToStaticMarkup(<AppRouterContext.Provider value={router}><WithdrawalList items={[item]} role={role} /></AppRouterContext.Provider>);
  const kolHtml = render("KOL"), organizerHtml = render("ORGANIZER");
  assert.ok(kolHtml.includes(item.reason)); assert.ok(kolHtml.includes("Gửi lúc:")); assert.ok(kolHtml.includes("Sự kiện đã bắt đầu"));
  assert.ok(!kolHtml.includes('aria-label="Chấp thuận rút tham gia"'));
  assert.ok(organizerHtml.includes('aria-label="Chấp thuận rút tham gia"'));
  assert.ok(organizerHtml.includes('aria-label="Từ chối yêu cầu rút"'));
});
test("compact actions keep accessible names and tooltips while showing only icons", () => {
  const html = renderToStaticMarkup(<AppRouterContext.Provider value={router}>
    <MutationButton endpoint="/api/jobs/job-1" method="DELETE" icon="trash" label="Xóa Job" confirm="Xóa Job này?">Xóa / lưu trữ</MutationButton>
    <ActionLink href="/organizer/jobs/job-1/edit" icon="edit" label="Sửa Job" />
  </AppRouterContext.Provider>);
  assert.ok(html.includes('aria-label="Xóa Job"'));
  assert.ok(html.includes('title="Xóa Job"'));
  assert.ok(html.includes('aria-label="Sửa Job"'));
  assert.ok(html.includes('href="/organizer/jobs/job-1/edit"'));
  assert.ok(!html.includes("Xóa / lưu trữ"));
  assert.ok(html.includes('aria-busy="false"'));
});
test("admin rejection uses labeled dialogs and unique required reason fields for each job", () => {
  const job: Parameters<typeof AdminJobs>[0]["jobs"][number] = {
    id: "job-1", organizerId: "organizer-1", title: "Sự kiện sáng tạo", description: "Nội dung sự kiện", requirements: "Yêu cầu tham gia", benefits: "Quyền lợi", category: "Lifestyle", location: "Hà Nội", capacity: 5, budgetMin: 1000000, budgetMax: 2000000, moderation: "PENDING", status: "OPEN", moderationNote: "", recruitmentVersion: 0,
    createdAt: new Date(), updatedAt: new Date(), deadline: new Date(), eventDate: new Date(), completedAt: null, media: [],
    organizer: { id: "organizer-1", name: "Minh Anh", organizer: { companyName: "The Social Studio" } }, _count: { applications: 0, participations: 0 },
  };
  const html = renderToStaticMarkup(<AppRouterContext.Provider value={router}><AdminJobs jobs={[job, { ...job, id: "job-2" }]} moderation /></AppRouterContext.Provider>);
  assert.ok(html.includes('aria-label="Duyệt Job"'));
  assert.ok(html.includes('aria-label="Từ chối Job và gửi lý do"'));
  assert.equal((html.match(/<dialog\b/g) ?? []).length, 4);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  const reasons = [...html.matchAll(/<textarea[^>]*name="note"[^>]*>/g)].map((match) => match[0]);
  assert.equal(reasons.length, 2);
  for (const reason of reasons) { assert.ok(reason.includes("required")); assert.ok(reason.includes('minLength="5"')); }
});
test("KOL form offers an explicit sample fill action and inputs for all three post platforms", () => {
  const html = renderToStaticMarkup(<AppRouterContext.Provider value={router}><KolProfileForm actor={{ ...actor, role: "KOL" }} profile={null} /></AppRouterContext.Provider>);
  assert.ok(html.includes("Điền thông tin mẫu"));
  for (const field of ["tiktokPost", "facebookPost", "youtubePost"]) assert.ok(html.includes(`name="${field}"`));
  assert.ok(!html.includes("<iframe"));
});
function header(media: MediaView[] = []) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <OrganizerProfileHeader actor={actor} companyName="The Social Studio" location="TP. Hồ Chí Minh" media={media} enabled />
    </AppRouterContext.Provider>,
  );
}

test("profile header shows three photos and camera controls without upload dropzones", () => {
  const html = header();
  assert.equal((html.match(/data-profile-photo=/g) ?? []).length, 3);
  for (const label of ["Ảnh đại diện", "Ảnh bìa", "Logo tổ chức"]) {
    assert.ok(html.includes(`aria-label="Thay ${label.toLowerCase()}"`));
  }
  assert.ok(html.includes("minh-anh"));
  assert.ok(html.includes("social-studio"));
  assert.ok(html.includes("The Social Studio"));
  assert.ok(!html.includes("upload-drop"));
  assert.ok(!html.includes("Chọn ảnh từ thiết bị"));
});

test("uploaded profile images replace illustrations in the header", () => {
  const media: MediaView[] = ["AVATAR", "COVER", "LOGO"].map((target) => ({ id: target, target, name: target, url: `https://demo.ufs.sh/f/uploaded-${target.toLowerCase()}.jpg` }));
  const html = header(media);
  for (const image of media) assert.ok(html.includes(image.url));
  assert.ok(!html.includes("minh-anh.png"));
  assert.ok(!html.includes("social-studio.svg"));
  assert.ok(!html.includes("creator-workspace.png"));
  assert.ok(!html.includes("upload-drop"));
});
