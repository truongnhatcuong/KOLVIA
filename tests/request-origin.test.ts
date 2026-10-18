import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { checkOrigin } from "../src/lib/request-origin";
import { AppError } from "../src/lib/errors";

const denied = (status: number) => (error: unknown) => error instanceof AppError && error.status === status;
const request = (url: string, origin?: string) => new Request(url, { headers: origin ? { origin } : {} });

function environment(t: TestContext) {
  const previous = { APP_URL: process.env.APP_URL, NODE_ENV: process.env.NODE_ENV };
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  return (key: string, value: string) => { process.env[key] = value; };
}

test("mutation origin checks support local development without weakening production", (t) => {
  const setEnv = environment(t);
  setEnv("APP_URL", "http://127.0.0.1:3000");
  setEnv("NODE_ENV", "development");
  checkOrigin(request("http://127.0.0.1:3000/api/auth/login", "http://localhost:3000"));
  checkOrigin(request("http://localhost:3001/api/auth/login", "http://localhost:3001"));
  checkOrigin(request("http://127.0.0.1:3001/api/auth/login", "http://[::1]:3001"));
  for (const origin of [undefined, "null", "https://evil.test", "http://localhost.evil.test:3000", "http://localhost:9999", "https://localhost:3000", "http://user@localhost:3000", "http://localhost:3000/anything"]) {
    assert.throws(() => checkOrigin(request("http://127.0.0.1:3000/api/auth/login", origin)), denied(403));
  }
  assert.throws(() => checkOrigin(request("http://evil.test:3000/api/auth/login", "http://localhost:3000")), denied(403));
  setEnv("NODE_ENV", "production");
  checkOrigin(request("http://127.0.0.1:3000/api/auth/login", "http://127.0.0.1:3000"));
  assert.throws(() => checkOrigin(request("http://127.0.0.1:3000/api/auth/login", "http://localhost:3000")), denied(403));
  assert.throws(() => checkOrigin(request("http://localhost:3001/api/auth/login", "http://localhost:3001")), denied(403));
});

test("production domains remain strict in development and invalid configuration is explicit", (t) => {
  const setEnv = environment(t);
  setEnv("NODE_ENV", "development");
  setEnv("APP_URL", "https://kolvia.example");
  checkOrigin(request("http://127.0.0.1:3000/api/auth/login", "https://kolvia.example"));
  assert.throws(() => checkOrigin(request("http://127.0.0.1:3000/api/auth/login", "http://localhost:3000")), denied(403));
  setEnv("APP_URL", "invalid-url");
  assert.throws(() => checkOrigin(request("http://localhost:3000/api/auth/login", "http://localhost:3000")), denied(500));
});
