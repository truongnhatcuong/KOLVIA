import { spawnSync } from "node:child_process";
import { createTestDatabase } from "./test-database.mjs";

let database;
try {
  database = await createTestDatabase();
  const env = {
    ...process.env,
    DATABASE_URL: database.url,
    APP_URL: "http://127.0.0.1:3000",
    NODE_ENV: "test",
    PUSHER_APP_ID: "", // Unit/API fixtures must not publish to the real Pusher app.
  };
  for (const args of [
    ["scripts/prisma.mjs", "migrate", "deploy"],
    [
      "--import",
      "tsx",
      "--test",
      "--test-concurrency=1",
      ...(process.argv[2]
        ? [process.argv[2]]
        : ["tests/business.test.ts", "tests/database-config.test.mjs", "tests/test-database.test.mjs", "tests/prisma-client.test.mjs", "tests/profile-ui.test.tsx", "tests/social-embeds.test.tsx", "tests/realtime.test.ts", "tests/withdrawal-policy.test.ts", "tests/withdrawal-services.test.ts", "tests/request-origin.test.ts", "tests/validation.test.ts", "tests/password-change.test.ts", "tests/ai.test.ts", "tests/chat-ui.test.tsx"]),
    ],
  ]) {
    const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      break;
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (database) {
    try {
      await database.cleanup();
    } catch {
      console.error("Không dọn được database thử nghiệm; kiểm tra quyền DROP DATABASE của tài khoản test.");
      process.exitCode = 1;
    }
  }
}
