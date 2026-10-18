import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawn, spawnSync } from "node:child_process";

// Match Next.js development precedence; exported shell variables take priority.
const env = {};
for (const file of [".env", ".env.development", ".env.local", ".env.development.local"]) {
  if (existsSync(file)) Object.assign(env, parseEnv(readFileSync(file, "utf8")));
}
Object.assign(env, process.env);

try {
  console.log("Dev dùng MySQL theo DATABASE_URL; cập nhật migration và kiểm tra schema trước khi chạy Next.js.");
  for (const step of [["scripts/check-database.mjs", "--config-only"], ["scripts/prisma.mjs", "generate"], ["scripts/prisma.mjs", "migrate", "deploy"], ["scripts/check-database.mjs"]]) {
    const result = spawnSync(process.execPath, step, { env, stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
  const args = ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", ...process.argv.slice(2)];
  const server = spawn(process.execPath, args, { env, stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
  server.once("error", () => { console.error("Không khởi động được tiến trình development."); process.exitCode = 1; });
  server.once("exit", (code, signal) => { process.exitCode = code ?? (signal === "SIGINT" ? 0 : 1); });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
