# Đổi mật khẩu

Vào menu ảnh đại diện → **Đổi mật khẩu**, hoặc `/account/security`. Áp dụng cho KOL, Organizer và Admin.

- Nhập mật khẩu hiện tại, mật khẩu mới (10–128 ký tự) và xác nhận. Mật khẩu mới phải khác mật khẩu cũ.
- Backend xác minh người dùng đang hoạt động, mật khẩu hiện tại và Origin; không nhận ID người dùng từ client.
- Giới hạn 10 lần thử trong 15 phút theo tài khoản, sử dụng bảng LoginAttempt hiện có với khóa riêng.
- Hash bằng scrypt hiện có. Cập nhật có điều kiện theo hash cũ để ngăn hai lần đổi đồng thời ghi đè nhau.
- Cập nhật hash và thu hồi mọi session của tài khoản trong cùng transaction. Chỉ xóa cookie sau khi transaction thành công; giao diện chuyển về đăng nhập và báo đổi thành công.
- Không sửa schema, không sửa tài khoản mẫu hoặc mật khẩu trong `.env`.

## File chính

`src/services/auth.ts`, `src/lib/validations/index.ts`, `src/app/api/auth/password/route.ts`, `src/app/(customer)/account/security/page.tsx`, menu tài khoản, ApiForm và trang đăng nhập.

## Kiểm thử

`tests/password-change.test.ts`: validation, quyền, mật khẩu sai, cả ba vai trò, scrypt, thu hồi phiên, rollback, giới hạn thử và đổi đồng thời. Dùng transaction double, không thay thế kiểm thử MySQL thật.

`tests/routes.test.mjs`: thêm kịch bản API kiểm tra Origin, cookie, hai phiên bị thu hồi và đăng nhập bằng mật khẩu mới. Chạy bằng `npm run test:api` khi có `TEST_DATABASE_URL` riêng. Chưa chạy kịch bản này trên MySQL trong môi trường hiện tại.
