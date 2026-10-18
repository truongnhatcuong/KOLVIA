import { AppError, assert } from "./errors";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function checkOrigin(request: Request) {
  const configured = process.env.APP_URL;
  assert(configured, 500, "Ứng dụng chưa cấu hình APP_URL.");
  let expected: URL;
  try {
    expected = new URL(configured);
    assert(["http:", "https:"].includes(expected.protocol), 500, "APP_URL không hợp lệ.");
  } catch {
    throw new AppError(500, "APP_URL không hợp lệ.");
  }
  const origin = request.headers.get("origin");
  if (origin === expected.origin) return;

  // Next development can use a different port and normalize localhost to 127.0.0.1.
  // Accept only loopback origins on the request's actual port and protocol.
  if (process.env.NODE_ENV === "development" && origin) {
    try {
      const source = new URL(origin);
      const destination = new URL(request.url);
      if (
        origin === source.origin &&
        loopbackHosts.has(expected.hostname) &&
        loopbackHosts.has(source.hostname) &&
        loopbackHosts.has(destination.hostname) &&
        source.protocol === destination.protocol &&
        source.port === destination.port
      ) return;
    } catch {
      // Missing, opaque, and malformed origins fail the same CSRF check below.
    }
  }
  throw new AppError(
    403,
    process.env.NODE_ENV === "development"
      ? `Địa chỉ truy cập không khớp APP_URL (${expected.origin}). Kiểm tra URL trên trình duyệt và cấu hình .env.`
      : "Nguồn yêu cầu không hợp lệ. Tải lại trang và thử lại.",
  );
}
