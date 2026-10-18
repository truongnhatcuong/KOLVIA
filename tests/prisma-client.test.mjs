import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

async function checkCache(setup, assertions) {
  // A separate process simulates a Next.js reload with a pre-existing global
  // singleton. Prisma construction does not require a database connection.
  await run(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import { Prisma, PrismaClient } from "@prisma/client";
    process.env.NODE_ENV = "development";
    ${setup}
    const { db } = await import("./src/lib/db/client.ts");
    ${assertions}
    assert.equal(typeof db.notification.count, "function");
    assert.equal(globalThis.kolviaDb, db);
    assert.equal(globalThis.kolviaDbSchema, JSON.stringify({ provider: "mysql", datamodel: Prisma.dmmf.datamodel }));
    await db.$disconnect();
  `], { cwd: new URL("..", import.meta.url), timeout: 15000 });
}

test("replaces a Prisma singleton cached before Notification was added", async () => {
  await checkCache(`
    let disconnected = false;
    const old = { $disconnect: async () => { disconnected = true; } };
    globalThis.kolviaDb = old;
  `, `assert.notEqual(db, old); assert.equal(disconnected, true);`);
});

test("replaces a singleton when the generated schema changes", async () => {
  await checkCache(`
    const old = new PrismaClient();
    globalThis.kolviaDb = old;
    globalThis.kolviaDbSchema = "previous schema";
  `, `assert.notEqual(db, old);`);
});

test("reuses the pool across reloads when the schema is unchanged", async () => {
  await checkCache(`
    const old = new PrismaClient();
    globalThis.kolviaDb = old;
    globalThis.kolviaDbSchema = JSON.stringify({ provider: "mysql", datamodel: Prisma.dmmf.datamodel });
  `, `assert.equal(db, old);`);
});
