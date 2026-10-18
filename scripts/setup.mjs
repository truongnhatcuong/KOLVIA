import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

if (!existsSync(".env")) {
  let contents = readFileSync(".env.example", "utf8");
  for (const key of ["DEMO_ADMIN_PASSWORD", "DEMO_KOL_PASSWORD", "DEMO_ORGANIZER_PASSWORD"]) {
    contents = contents.replace(`${key}=""`, `${key}="${randomBytes(15).toString("base64url")}"`);
  }
  writeFileSync(".env", contents, { mode: 0o600 });
  console.log("Created .env with random demo passwords. Read them locally in .env.");
}
for (const args of [
  ["run", "db:check", "--", "--config-only"],
  ["run", "db:generate"],
  ["run", "db:migrate"],
  ["run", "db:seed"],
  ["run", "db:check"],
]) {
  const result = spawnSync("npm", args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  "Ready. Run npm run dev. Read DEMO_ADMIN_EMAIL, DEMO_KOL_EMAIL, DEMO_ORGANIZER_EMAIL and their passwords in .env.",
);
