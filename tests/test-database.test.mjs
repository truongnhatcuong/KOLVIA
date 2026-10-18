import test from "node:test";
import assert from "node:assert/strict";
import { isolatedMysqlUrl } from "../scripts/test-database.mjs";

test("MySQL tests use a separate database and preserve TLS options", () => {
  const result = isolatedMysqlUrl("mysql://test:secret@localhost:3306/kolvia?sslaccept=strict", "0123456789abcdef");
  const url = new URL(result.url);
  assert.equal(url.pathname, "/kolvia_test_0123456789abcdef");
  assert.equal(url.searchParams.get("sslaccept"), "strict");
  assert.equal(url.username, "test");
  assert.equal(url.port, "3306");
});
test("MySQL tests require explicit test credentials", () => {
  assert.throws(() => isolatedMysqlUrl(undefined), /TEST_DATABASE_URL/);
});
test("test database identifiers reject SQL fragments and source collisions", () => {
  assert.throws(() => isolatedMysqlUrl("mysql://test:secret@localhost/kolvia", "x`; DROP DATABASE kolvia;"), /không hợp lệ/);
  assert.throws(() => isolatedMysqlUrl("mysql://test:secret@localhost/kolvia_test_0123456789abcdef", "0123456789abcdef"), /tách biệt/);
});
test("MySQL tests reject incompatible protocols without exposing credentials", () => {
  assert.throws(() => isolatedMysqlUrl("https://test:secret@localhost/kolvia"), (error) => /MySQL/.test(error.message) && !/secret/.test(error.message));
});
