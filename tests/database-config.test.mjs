import test from "node:test";
import assert from "node:assert/strict";
import { validateDatasource } from "../scripts/database-config.mjs";

const schema = 'datasource db { provider = "mysql" url = env("DATABASE_URL") }';
test("accepts MySQL configuration including cloud TLS options", () => {
  assert.equal(validateDatasource(schema, "mysql://user:password@localhost/kolvia?sslaccept=strict"), "mysql");
});
test("rejects invalid configuration without exposing credentials", () => {
  for (const url of ["https://private-user:private-password@localhost/database", "mysql://private-user:private-password@localhost", "bad-url"]) {
    assert.throws(() => validateDatasource(schema, url), (error) => !/private-user|private-password/.test(error.message));
  }
});
test("requires a database URL", () => {
  assert.throws(() => validateDatasource(schema, undefined), /Thiếu DATABASE_URL/);
});
