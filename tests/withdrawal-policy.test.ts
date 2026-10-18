import test from "node:test";
import assert from "node:assert/strict";
import { assertRequestable, assertReviewable, assertCanConfirmDeparture, assertWithdrawalAllowed, seatsAvailable, withdrawalTiming } from "../src/lib/withdrawal-policy";
import { withdrawalRequestSchema, withdrawalDecisionSchema, withdrawalDepartureSchema } from "../src/lib/validations";
import { AppError } from "../src/lib/errors";
import { confirmParticipant, type lockJob } from "../src/lib/db/recruitment";
import type { Prisma } from "@prisma/client";
const conflict = (error: unknown) => error instanceof AppError && error.status === 409;
test("rejoining reuses the historical participation but must obtain a free seat", async () => {
  const existing = { id: "part-1", status: "WITHDRAWN_APPROVED", leftAt: new Date(), source: "APPLICATION" };
  let updates = 0;
  const tx = { participation: {
    findUnique: async () => existing,
    update: async (args: { data: { status: string; leftAt: null; source: string } }) => { updates++; return { ...existing, ...args.data }; },
  } } as unknown as Prisma.TransactionClient;
  const job = { id: "job-1", capacity: 1, _count: { participations: 0 } } as Awaited<ReturnType<typeof lockJob>>;
  const rejoined = await confirmParticipant(tx, job, "kol-1", "INVITATION");
  assert.equal(rejoined.id, existing.id); assert.equal(rejoined.status, "CONFIRMED"); assert.equal(rejoined.leftAt, null);
  job._count.participations = 1;
  await assert.rejects(() => confirmParticipant(tx, job, "kol-1", "INVITATION"), conflict);
  existing.status = "WITHDRAWAL_PENDING";
  assert.equal((await confirmParticipant(tx, job, "kol-1", "APPLICATION")).id, existing.id);
  assert.equal(updates, 1);
});

test("withdrawal timing covers early, near and started events with exact boundaries", () => {
  const now = new Date("2026-10-14T08:00:00Z");
  assert.equal(withdrawalTiming(new Date(now.getTime() + 86400001), now), "BEFORE_EVENT");
  assert.equal(withdrawalTiming(new Date(now.getTime() + 86400000), now), "WITHIN_24H");
  assert.equal(withdrawalTiming(now, now), "EVENT_STARTED");
  assert.equal(withdrawalTiming(new Date(now.getTime() - 86400000), now), "EVENT_STARTED");
});
test("only completed jobs block withdrawals; reopening archived completion cannot bypass the rule", () => {
  for (const status of ["OPEN", "CLOSED", "ARCHIVED"]) assert.doesNotThrow(() => assertRequestable({ status }, "CONFIRMED"));
  assert.throws(() => assertWithdrawalAllowed({ status: "COMPLETED" }), conflict);
  assert.throws(() => assertWithdrawalAllowed({ status: "ARCHIVED", completedAt: new Date() }), conflict);
});
test("pending and rejected requests retain seats; only finalized departures free capacity", () => {
  assert.equal(seatsAvailable(3, ["CONFIRMED", "WITHDRAWAL_PENDING", "WITHDRAWAL_REJECTED", "WITHDRAWN_APPROVED", "WITHDRAWN_UNAPPROVED"]), 0);
  assert.equal(seatsAvailable(3, ["CONFIRMED", "WITHDRAWN_APPROVED", "WITHDRAWN_UNAPPROVED"]), 2);
});
test("request and decision transitions reject duplicates and premature unilateral departure", () => {
  const job = { status: "OPEN" };
  for (const status of ["WITHDRAWAL_PENDING", "WITHDRAWAL_REJECTED", "WITHDRAWN_APPROVED", "WITHDRAWN_UNAPPROVED"]) assert.throws(() => assertRequestable(job, status), conflict);
  assert.doesNotThrow(() => assertReviewable(job, "WITHDRAWAL_PENDING", "PENDING"));
  for (const status of ["APPROVED", "REJECTED", "LEFT_WITHOUT_APPROVAL"]) assert.throws(() => assertReviewable(job, "WITHDRAWAL_PENDING", status), conflict);
  assert.throws(() => assertCanConfirmDeparture(job, "WITHDRAWAL_PENDING", "PENDING"), conflict);
  assert.doesNotThrow(() => assertCanConfirmDeparture(job, "WITHDRAWAL_REJECTED", "REJECTED"));
});
test("withdrawal input rejects forged ownership/times, missing reasons and unconfirmed departures", () => {
  const input = { participationId: "part-1", reason: "Lịch cá nhân thay đổi." };
  assert.ok(withdrawalRequestSchema.safeParse(input).success);
  for (const reason of ["", "    ", "a".repeat(2001)]) assert.ok(!withdrawalRequestSchema.safeParse({ ...input, reason }).success);
  for (const extra of [{ userId: "other" }, { requestedAt: new Date().toISOString() }, { status: "APPROVED" }]) assert.ok(!withdrawalRequestSchema.safeParse({ ...input, ...extra }).success);
  assert.ok(!withdrawalDecisionSchema.safeParse({ status: "REJECTED", note: "" }).success);
  assert.ok(withdrawalDecisionSchema.safeParse({ status: "APPROVED" }).success);
  assert.ok(!withdrawalDepartureSchema.safeParse({ confirm: false }).success);
});
