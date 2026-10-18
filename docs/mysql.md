# Chạy KOLVIA với MySQL

Prisma dùng provider `mysql`. Giữ nguyên `DATABASE_URL` MySQL hiện có trong `.env`; không đưa URL chứa mật khẩu vào source code. Với TiDB Cloud, giữ cấu hình TLS do dịch vụ cung cấp (ví dụ tham số `sslaccept=strict`).

```sh
npm run setup
npm run dev
```

Setup kiểm tra cấu hình, generate Client MySQL, deploy migration, seed demo rồi kiểm tra đọc dữ liệu. Seed không ghi đè tài khoản hiện có. Ba biến mật khẩu demo trong `.env` phải có ít nhất 10 ký tự. Nếu chạy từng bước:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:check
npm run dev
```

Seed bổ sung hồ sơ KOL/Organizer, Job công khai và các trạng thái kiểm duyệt, đơn ứng tuyển/lời mời demo. Muốn bảo đảm mật khẩu đăng nhập Admin trùng `DEMO_ADMIN_PASSWORD` đang cấu hình, chạy `npm run db:admin` sau seed. Lệnh tạo hoặc đặt lại mật khẩu của Admin demo và thu hồi session cũ; không đổi role của tài khoản KOL/Organizer trùng email.

Migration `202610120004_mysql_initial` giữ nguyên 11 bảng ban đầu. Migration `202610120006_mysql_features` bổ sung bảng Notification, kỹ năng/kinh nghiệm, quyền lợi và chỉ tiêu tuyển. Migration thứ hai thêm cột có default để giữ dữ liệu cũ; chỉ tiêu được nâng tối thiểu bằng số người đã xác nhận. Tổng cộng 12 bảng KOLVIA với utf8mb4 và foreign keys. Các trường mô tả, tin nhắn và URL đủ dài theo validation, tránh giới hạn VARCHAR mặc định của MySQL. Không chạy migration SQLite lên MySQL. Schema/migration SQLite cũ ở `prisma/legacy/sqlite/`, database cũ vẫn ở `prisma/dev.db`; dữ liệu cũ chưa được chuyển tự động sang MySQL.

Nếu server đã có bảng và Prisma báo `P3005`, cần đối chiếu schema và baseline theo database thực tế trước khi deploy; không chạy reset để vượt lỗi. Migration hiện tại dành cho database chưa có bảng KOLVIA.

`P1001` nghĩa là Prisma không kết nối được server. Kiểm tra endpoint, cổng, DNS/mạng, trạng thái cluster và TLS. Trong phiên triển khai, DNS endpoint TiDB Cloud không phân giải được (`ENOTFOUND`) nên chưa áp dụng migration/seed lên server; cần chạy setup trên máy truy cập được endpoint.

Sau khi generate Client hoặc thay schema, dừng dev server cũ bằng Ctrl+C rồi chạy lại để không giữ Client cũ thiếu model hoặc trường mới.

## Kiểm thử

Điền `TEST_DATABASE_URL` trong `.env` bằng kết nối MySQL dành cho test, có database gốc tồn tại và quyền CREATE/DROP DATABASE. Bộ test dùng kết nối này để tạo database `kolvia_test_<mã ngẫu nhiên>` và xóa đúng database đã tạo khi kết thúc. Không dùng tên database chính làm nơi chạy test. Mật khẩu và tham số TLS được giữ trong môi trường.

```sh
node --test tests/database-config.test.mjs tests/test-database.test.mjs
npm test
npm run test:api
npm run test:browser
```

Bảy bài cấu hình/cách ly chạy được không cần MySQL. Các bài nghiệp vụ/API/browser cần kết nối MySQL test thật; không tự thay bằng SQLite khi kết nối lỗi.

`npm run dev` tự chạy generate và migrate deploy trước check schema. Không seed hoặc đặt lại mật khẩu khi khởi động dev; chạy setup/db:admin khi cần dữ liệu demo. Khóa hàng Job qua UPDATE trong transaction ReadCommitted hoạt động với MySQL InnoDB. Tìm kiếm dùng collation `utf8mb4_unicode_ci`, bỏ tham số `mode` theo [Prisma MySQL filtering](https://docs.prisma.io/docs/orm/v6/prisma-client/queries/case-sensitivity).
