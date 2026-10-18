import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { db } from "../src/lib/db/client";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { changePassword } from "../src/services/auth";
import { changePasswordSchema } from "../src/lib/validations";
import { AppError } from "../src/lib/errors";
import type { Actor } from "../src/types";

const oldPassword = "old-password-123";
const newPassword = "new-password-456";
const actor: Actor = { id: "owner", name: "Linh", email: "owner@test.local", role: "KOL", active: true };
const input = { currentPassword: oldPassword, newPassword, confirmPassword: newPassword };
const denial = (status: number) => (error: unknown) => error instanceof AppError && error.status === status;
let state: { user: Actor & { passwordHash: string }; sessions: { userId: string }[]; attempts: Record<string, { count: number; expiresAt: Date }> };
let failRevocation = false;
const restores: (() => void)[] = [];
function stub(object: object, name: string, value: unknown) {
  const original = Reflect.get(object, name);
  Object.defineProperty(object, name, { value, configurable: true, writable: true });
  restores.push(() => Object.defineProperty(object, name, { value: original, configurable: true, writable: true }));
}
beforeEach(async () => {
  state = { user: { ...actor, passwordHash: await hashPassword(oldPassword) }, sessions: [{ userId: actor.id }, { userId: actor.id }, { userId: "other" }], attempts: {} };
  failRevocation = false;
  stub(db.user, "findUnique", async ({ where }: { where: { id: string } }) => where.id === actor.id ? { ...state.user } : null);
  const tx = {
    loginAttempt: {
      upsert: async ({ where, create }: { where: { key: string }; create: { count: number; expiresAt: Date } }) => {
        const entry = state.attempts[where.key];
        if (entry) entry.count++;
        else state.attempts[where.key] = { ...create };
        return { ...state.attempts[where.key] };
      },
      update: async ({ where, data }: { where: { key: string }; data: { count: number; expiresAt: Date } }) => Object.assign(state.attempts[where.key], data),
      deleteMany: async ({ where }: { where: { key: string } }) => { delete state.attempts[where.key]; return { count: 1 }; },
    },
    user: { updateMany: async ({ where, data }: { where: { id: string; active: boolean; passwordHash: string }; data: { passwordHash: string } }) => {
      if (where.id !== state.user.id || where.active !== state.user.active || where.passwordHash !== state.user.passwordHash) return { count: 0 };
      state.user.passwordHash = data.passwordHash;
      return { count: 1 };
    } },
    session: { deleteMany: async ({ where }: { where: { userId: string } }) => {
      if (failRevocation) throw new Error("session storage failure");
      const count = state.sessions.filter((session) => session.userId === where.userId).length;
      state.sessions = state.sessions.filter((session) => session.userId !== where.userId);
      return { count };
    } },
  } as unknown as Prisma.TransactionClient;
  let queue: Promise<unknown> = Promise.resolve();
  // Transaction double verifies atomic service behavior; it is not a live MySQL test.
  stub(db, "$transaction", (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
    const run = queue.then(async () => {
      const snapshot = structuredClone(state);
      try { return await fn(tx); } catch (error) { state = snapshot; throw error; }
    });
    queue = run.catch(() => {});
    return run;
  });
});
afterEach(() => { while (restores.length) restores.pop()!(); });

test("password change rejects forged ownership, mismatched confirmation and reused/short passwords", () => {
  for (const value of [{ ...input, userId: "other" }, { ...input, confirmPassword: "different-password" }, { ...input, newPassword: oldPassword, confirmPassword: oldPassword }, { ...input, newPassword: "short", confirmPassword: "short" }]) assert.equal(changePasswordSchema.safeParse(value).success, false);
  assert.equal(changePasswordSchema.safeParse(input).success, true);
});
test("password change requires an active authenticated account and the correct current password", async () => {
  await assert.rejects(changePassword(null, input), denial(401));
  await assert.rejects(changePassword(actor, { ...input, currentPassword: "wrong-password" }), denial(400));
  assert.equal(await verifyPassword(oldPassword, state.user.passwordHash), true);
  assert.equal(state.sessions.length, 3);
  state.user.active = false;
  await assert.rejects(changePassword(actor, input), denial(401));
});
test("all three roles can change only their own credentials and revoke every own session", async () => {
  for (const role of ["KOL", "ORGANIZER", "ADMIN"] as const) {
    state.user.role = role;
    state.user.passwordHash = await hashPassword(oldPassword);
    state.sessions = [{ userId: actor.id }, { userId: actor.id }, { userId: "other" }];
    const result = await changePassword({ ...actor, role }, input);
    assert.deepEqual(result, { changed: true });
    assert.equal(await verifyPassword(newPassword, state.user.passwordHash), true);
    assert.equal(await verifyPassword(oldPassword, state.user.passwordHash), false);
    assert.notEqual(state.user.passwordHash, newPassword);
    assert.deepEqual(state.sessions, [{ userId: "other" }]);
    assert.deepEqual(state.attempts, {});
  }
});
test("session revocation failure rolls back the password update", async () => {
  const hash = state.user.passwordHash;
  failRevocation = true;
  await assert.rejects(changePassword(actor, input), /session storage failure/);
  assert.equal(state.user.passwordHash, hash);
  assert.equal(state.sessions.length, 3);
});
test("concurrent password changes have one winner and cannot overwrite the new password", async () => {
  const outcomes = await Promise.allSettled([changePassword(actor, input), changePassword(actor, { ...input, newPassword: "another-password-789", confirmPassword: "another-password-789" })]);
  assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
  const failed = outcomes.find((result) => result.status === "rejected");
  assert.ok(failed?.status === "rejected" && failed.reason instanceof AppError && [400, 409].includes(failed.reason.status));
  assert.deepEqual(state.sessions, [{ userId: "other" }]);
});
test("current-password guessing is limited and an expired attempt window resets", async () => {
  for (let i = 0; i < 10; i++) await assert.rejects(changePassword(actor, { ...input, currentPassword: "wrong-password" }), denial(400));
  await assert.rejects(changePassword(actor, input), denial(429));
  assert.equal(state.sessions.length, 3);
  Object.values(state.attempts)[0].expiresAt = new Date(Date.now() - 1);
  assert.deepEqual(await changePassword(actor, input), { changed: true });
});
