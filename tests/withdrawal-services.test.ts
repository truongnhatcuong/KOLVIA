import test, { beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import type { Participation, WithdrawalRequest, Application, Prisma } from "@prisma/client";
import { Prisma as RuntimePrisma } from "@prisma/client";
import { db } from "../src/lib/db/client";
import { requestWithdrawal, decideWithdrawal, confirmDeparture } from "../src/services/withdrawals";
import { decideApplication } from "../src/services/collaborations";
import { isActiveParticipation } from "../src/lib/db/participation";
import { AppError } from "../src/lib/errors";
import type { Actor } from "../src/types";

const kol: Actor = { id: "kol-1", role: "KOL", active: true, name: "Linh", email: "kol@test.local" };
const organizer: Actor = { id: "org-1", role: "ORGANIZER", active: true, name: "Minh Anh", email: "org@test.local" };
const stranger: Actor = { ...organizer, id: "org-2" };
const otherKol: Actor = { ...kol, id: "kol-2" };
const denial = (status: number) => (error: unknown) => error instanceof AppError && error.status === status;
type NotificationInput = { userId: string; type: string; title: string; message: string; href: string };
let state: {
  job: { id: string; organizerId: string; title: string; status: "OPEN" | "CLOSED" | "COMPLETED" | "ARCHIVED"; completedAt: Date | null; eventDate: Date; deadline: Date; moderation: "APPROVED"; capacity: number; recruitmentVersion: number };
  participant: Participation; application: Application; invitationStatus: string;
  requests: WithdrawalRequest[]; history: { status: string; message: string; actorId: string; action: string }[];
  notices: NotificationInput[];
};
let restorePusher: () => void;
const restores: (() => void)[] = [];
function stubMethod(object: object, name: string, implementation: (...args: never[]) => unknown) {
  const original = Reflect.get(object, name);
  Object.defineProperty(object, name, { value: implementation, configurable: true, writable: true });
  restores.push(() => Object.defineProperty(object, name, { value: original, configurable: true, writable: true }));
}
beforeEach(() => {
  const old = process.env.PUSHER_APP_ID;
  process.env.PUSHER_APP_ID = ""; // Never send fixture data to a real provider.
  restorePusher = () => { if (old === undefined) delete process.env.PUSHER_APP_ID; else process.env.PUSHER_APP_ID = old; };
  const now = new Date();
  state = {
    job: { id: "job-1", organizerId: organizer.id, title: "Sự kiện nội dung", status: "OPEN", completedAt: null, eventDate: new Date(Date.now() + 3 * 86400000), deadline: new Date(Date.now() + 86400000), moderation: "APPROVED", capacity: 1, recruitmentVersion: 0 },
    participant: { id: "part-1", jobId: "job-1", kolId: kol.id, source: "APPLICATION", status: "CONFIRMED", createdAt: now, confirmedAt: now, leftAt: null },
    application: { id: "app-1", jobId: "job-1", kolId: kol.id, message: "Giới thiệu gốc cần được giữ lại.", status: "ACCEPTED", createdAt: now },
    invitationStatus: "PENDING", requests: [], history: [], notices: [],
  };
  const participantLookup = async (args: { where: { id?: string } }) => args.where.id === state.participant.id ? { ...state.participant } : null;
  const requestLookup = async (args: { where: { id: string } }) => {
    const row = state.requests.find((request) => request.id === args.where.id);
    return row ? { ...row, participation: { ...state.participant } } : null;
  };
  stubMethod(db.user, "findUnique", async (args: { where: { id?: string } }) => [kol, otherKol, organizer, stranger].find((user) => user.id === args.where.id) ?? null);
  stubMethod(db.participation, "findUnique", participantLookup);
  stubMethod(db.application, "findUnique", async () => ({ ...state.application }));
  stubMethod(db.withdrawalRequest, "findUnique", requestLookup);
  const tx = {
    job: {
      updateMany: async () => { state.job.recruitmentVersion++; return { count: 1 }; },
      findUniqueOrThrow: async () => ({ ...state.job, organizer: { active: true }, _count: { participations: isActiveParticipation(state.participant.status) ? 1 : 0 } }),
    },
    participation: {
      findUniqueOrThrow: async () => ({ ...state.participant }),
      update: async (args: { data: Partial<Participation> }) => { Object.assign(state.participant, args.data); return { ...state.participant }; },
    },
    withdrawalRequest: {
      findUniqueOrThrow: requestLookup,
      create: async (args: { data: Prisma.WithdrawalRequestUncheckedCreateInput }) => {
        assert.ok(!state.requests.some((row) => row.activeSlot && row.activeSlot === args.data.activeSlot));
        const row: WithdrawalRequest = {
          id: `request-${state.requests.length + 1}`, participationId: args.data.participationId,
          activeSlot: args.data.activeSlot ?? null, reason: args.data.reason, status: "PENDING", timing: args.data.timing,
          eventDateAtRequest: new Date(args.data.eventDateAtRequest), sourceAtRequest: args.data.sourceAtRequest,
          requestedAt: new Date(args.data.requestedAt ?? Date.now()), reviewedAt: null, reviewedById: null, decisionNote: "", departedAt: null,
        };
        state.requests.push(row); return { ...row };
      },
      update: async (args: { where: { id: string }; data: Partial<WithdrawalRequest> }) => {
        const row = state.requests.find((request) => request.id === args.where.id)!;
        Object.assign(row, args.data); return { ...row };
      },
    },
    application: {
      findUnique: async () => ({ ...state.application }),
      update: async (args: { data: Partial<Application> }) => { Object.assign(state.application, args.data); return { ...state.application }; },
    },
    applicationHistory: { create: async (args: { data: { status: string; message: string; actorId: string; action: string } }) => { state.history.push(args.data); return args.data; } },
    invitation: { updateMany: async () => { state.invitationStatus = "WITHDRAWN"; return { count: 1 }; } },
    notification: { create: async (args: { data: NotificationInput }) => { state.notices.push(args.data); return args.data; } },
  } as unknown as Prisma.TransactionClient;
  // A transactional test double checks service behavior and rollback. Real MySQL
  // row locking/capacity races are covered separately in business.test.ts.
  let queue = Promise.resolve();
  stubMethod(db, "$transaction", async (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
    const previous = queue;
    let release!: () => void;
    queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const snapshot = structuredClone(state);
    try { return await work(tx); }
    catch (error) { state = snapshot; throw error; }
    finally { release(); }
  });
});
afterEach(() => { for (const restore of restores.splice(0).reverse()) restore(); mock.restoreAll(); restorePusher(); });
const request = () => requestWithdrawal(kol, { participationId: "part-1", reason: "Lịch cá nhân thay đổi, tôi không thể tham gia." });
test("pending cancellation checks owner/state and keeps the original message in history", async () => {
  state.application.status = "PENDING";
  state.participant.status = "WITHDRAWN_APPROVED";
  await assert.rejects(() => decideApplication(otherKol, "app-1", { status: "WITHDRAWN" }), denial(403));
  await decideApplication(kol, "app-1", { status: "WITHDRAWN" });
  assert.equal(state.application.status, "WITHDRAWN");
  assert.equal(state.history[0].action, "CANCELLED");
  assert.equal(state.history[0].message, "Giới thiệu gốc cần được giữ lại.");
  assert.equal(state.notices.length, 2);
  await assert.rejects(() => decideApplication(kol, "app-1", { status: "WITHDRAWN" }), denial(409));
  assert.equal(state.history.length, 1);
  state.application.status = "PENDING"; state.job.status = "COMPLETED";
  await assert.rejects(() => decideApplication(kol, "app-1", { status: "WITHDRAWN" }), denial(409));
});
test("rolled-back write conflicts retry without duplicate requests or notifications", async () => {
  const transaction = Reflect.get(db, "$transaction") as (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => Promise<unknown>;
  let attempts = 0;
  stubMethod(db, "$transaction", async (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
    attempts++;
    if (attempts === 1) {
      const before = structuredClone(state);
      await transaction(work);
      state = before;
      throw new RuntimePrisma.PrismaClientKnownRequestError("Write conflict", { code: "P2034", clientVersion: "test" });
    }
    return transaction(work);
  });
  await request();
  assert.equal(attempts, 2); assert.equal(state.requests.length, 1); assert.equal(state.notices.length, 2);
});
test("repeated database conflicts stop after three attempts and preserve state", async () => {
  let attempts = 0;
  stubMethod(db, "$transaction", async () => { attempts++; throw new RuntimePrisma.PrismaClientKnownRequestError("Write conflict", { code: "P2034", clientVersion: "test" }); });
  await assert.rejects(request, (error: unknown) => error instanceof RuntimePrisma.PrismaClientKnownRequestError && error.code === "P2034");
  assert.equal(attempts, 3); assert.equal(state.requests.length, 0); assert.equal(state.notices.length, 0);
});

test("request preserves the seat, reason, exact timing and notifies both parties", async () => {
  state.job.eventDate = new Date(Date.now() + 3600000);
  const row = await request();
  assert.equal(row.timing, "WITHIN_24H");
  assert.equal(state.participant.status, "WITHDRAWAL_PENDING");
  assert.ok(isActiveParticipation(state.participant.status));
  assert.equal(state.application.status, "ACCEPTED");
  assert.deepEqual(new Set(state.notices.map((notice) => notice.userId)), new Set([kol.id, organizer.id]));
  assert.equal(row.eventDateAtRequest.getTime(), state.job.eventDate.getTime());
});
test("started and closed recruitment jobs still permit withdrawal requests", async () => {
  state.job.eventDate = new Date(Date.now() - 3600000); state.job.status = "CLOSED";
  assert.equal((await request()).timing, "EVENT_STARTED");
});
test("approval frees the seat and preserves the participation and application history", async () => {
  const row = await request();
  await decideWithdrawal(organizer, row.id, { status: "APPROVED" });
  assert.equal(state.participant.status, "WITHDRAWN_APPROVED");
  assert.ok(!isActiveParticipation(state.participant.status));
  assert.ok(state.participant.leftAt);
  assert.equal(state.requests[0].activeSlot, null);
  assert.equal(state.application.status, "WITHDRAWN");
  assert.equal(state.application.message, "Giới thiệu gốc cần được giữ lại.");
  assert.equal(state.history[0].actorId, organizer.id);
  assert.equal(state.invitationStatus, "WITHDRAWN");
});
test("a rejected request keeps the seat until the KOL confirms departure", async () => {
  const row = await request();
  await assert.rejects(() => confirmDeparture(kol, row.id, { confirm: true }), denial(409));
  await decideWithdrawal(organizer, row.id, { status: "REJECTED", note: "Lịch sự kiện đã chốt nhân sự." });
  assert.equal(state.participant.status, "WITHDRAWAL_REJECTED");
  assert.ok(isActiveParticipation(state.participant.status));
  const result = await confirmDeparture(kol, row.id, { confirm: true });
  assert.equal(result.status, "LEFT_WITHOUT_APPROVAL");
  assert.equal(result.decisionNote, "Lịch sự kiện đã chốt nhân sự.");
  assert.ok(result.reviewedAt && result.departedAt);
  assert.equal(state.participant.status, "WITHDRAWN_UNAPPROVED");
  const noticeCount = state.notices.length;
  await assert.rejects(() => confirmDeparture(kol, row.id, { confirm: true }), denial(409));
  assert.equal(state.notices.length, noticeCount);
});
test("ownership, role and completion checks block forbidden changes without history loss", async () => {
  await assert.rejects(() => requestWithdrawal(otherKol, { participationId: "part-1", reason: "Tôi muốn rút khỏi sự kiện." }), denial(403));
  await assert.rejects(() => requestWithdrawal(organizer, { participationId: "part-1", reason: "Tôi muốn rút khỏi sự kiện." }), denial(403));
  const row = await request();
  await assert.rejects(() => decideWithdrawal(stranger, row.id, { status: "APPROVED" }), denial(403));
  await assert.rejects(() => decideWithdrawal(kol, row.id, { status: "APPROVED" }), denial(403));
  state.job.status = "COMPLETED"; state.job.completedAt = new Date();
  await assert.rejects(() => decideWithdrawal(organizer, row.id, { status: "APPROVED" }), denial(409));
  assert.equal(state.requests[0].status, "PENDING");
  assert.equal(state.participant.status, "WITHDRAWAL_PENDING");
});
test("parallel requests and decisions have one winner and no duplicate notifications", async () => {
  const requests = await Promise.allSettled([request(), request()]);
  assert.equal(requests.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(state.requests.length, 1);
  assert.equal(state.notices.length, 2);
  const decisions = await Promise.allSettled([
    decideWithdrawal(organizer, state.requests[0].id, { status: "APPROVED" }),
    decideWithdrawal(organizer, state.requests[0].id, { status: "REJECTED", note: "Cần trao đổi trước khi rút." }),
  ]);
  assert.equal(decisions.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(state.notices.length, 4);
});
test("a rejoined KOL can request again while the previous withdrawal remains intact", async () => {
  const first = await request();
  await decideWithdrawal(organizer, first.id, { status: "APPROVED" });
  state.participant.status = "CONFIRMED"; state.participant.confirmedAt = new Date(); state.participant.leftAt = null;
  const second = await request();
  assert.notEqual(first.id, second.id);
  assert.equal(state.requests[0].status, "APPROVED");
  assert.equal(state.requests[1].status, "PENDING");
  assert.equal(state.requests.length, 2);
});
