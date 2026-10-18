import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const env = { ...process.env, XDG_CACHE_HOME: resolve(".cache") };
const platform =
  process.platform === "darwin" ? `darwin${process.arch === "arm64" ? "-arm64" : ""}` : null;
if (platform) {
  const query = resolve(`node_modules/@prisma/engines/libquery_engine-${platform}.dylib.node`);
  const schema = resolve(`node_modules/@prisma/engines/schema-engine-${platform}`);
  if (existsSync(query)) env.PRISMA_QUERY_ENGINE_LIBRARY = query;
  if (existsSync(schema)) env.PRISMA_SCHEMA_ENGINE_BINARY = schema;
}
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", ...process.argv.slice(2)],
  { stdio: "inherit", env },
);
process.exit(result.status ?? 1);
