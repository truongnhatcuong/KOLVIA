import { createHash } from "node:crypto";
import { assert } from "@/lib/errors";

type Window = { count: number; until: number };
const root = globalThis as unknown as { kolviaAiLimits?: Map<string, Window> };
const windows = root.kolviaAiLimits ??= new Map();
export function consumeAiLimit(identity: string, now = Date.now()) {
  for (const [key, value] of windows) if (value.until <= now) windows.delete(key);
  const keys: [string, number, number][] = [["all", 100, 60_000], [createHash("sha256").update(identity).digest("hex"), 20, 300_000]];
  for (const [key, limit] of keys) assert((windows.get(key)?.count ?? 0) < limit, 429, "Bạn đang gửi quá nhiều yêu cầu AI. Vui lòng chờ rồi thử lại.");
  assert(windows.size < 3000 || windows.has(keys[1][0]), 429, "Trợ lý đang bận. Vui lòng thử lại sau.");
  for (const [key, , duration] of keys) {
    const current = windows.get(key);
    windows.set(key, { count: (current?.count ?? 0) + 1, until: current?.until ?? now + duration });
  }
}
