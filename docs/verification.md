# Kiểm thử cấu hình MySQL hiện tại

| Kiểm tra | Kết quả |
| --- | --- |
| Prisma validate/generate MySQL | Đạt |
| DATABASE_URL khớp MySQL | Đạt |
| Unit validation, Origin, cách ly MySQL, cache Prisma, UI, realtime Pusher, hủy/rút tham gia và service với test double | 56/56 đạt |
| TypeScript / ESLint / production build | Đạt |
| Kết nối MySQL hiện tại | P1001; DNS endpoint TiDB trả ENOTFOUND từ môi trường agent |
| Migration / seed / demo HTTP trên MySQL | Chưa xác nhận vì thiếu kết nối |
| 48 business / 19 Route Handler tests | Chưa chạy; cần TEST_DATABASE_URL MySQL |
| Pusher cấu hình / kết nối thật | Cấu hình hợp lệ; DNS Pusher ENOTFOUND trong môi trường agent, chưa xác minh key hoặc giao nhận realtime thật |
| Browser | Chưa xác nhận; cần database test và quyền mở cổng/Chromium |

Đã khôi phục migration MySQL ban đầu nguyên nội dung; migration mới chỉ thêm Notification và các cột tuyển dụng/hồ sơ. Không reset database. Prisma diff tạo SQL MySQL hợp lệ. Đã thử `npm run db:migrate`, dừng ở P1001 trước khi áp dụng; không tính là đã thực thi thành công trên server.

Đã bỏ các script/database nhúng, dependencies và test giao thức cũ. `npm run dev` dùng DATABASE_URL MySQL, generate, migrate deploy, check schema rồi khởi động Next.js. Giữ cache Prisma theo fingerprint để tránh client thiếu Notification sau reload. Harness test dùng database MySQL tên ngẫu nhiên, giữ TLS options và chỉ DROP database đã tạo.

Kết quả trước đây lưu trong `verification-history.md`, không dùng để khẳng định toàn bộ nghiệp vụ hiện tại đã được kiểm thử. Xem `mysql.md` để chạy các lệnh trên máy có kết nối database.

Ảnh hồ sơ: thêm 2 chân dung Organizer AI, logo và avatar mặc định; nút camera/modal xem trước cho avatar/cover/logo, ưu tiên ảnh upload. Cho phép Organizer upload avatar/cover, vẫn kiểm tra chủ sở hữu và từ chối portfolio/Admin. Sửa preview blob để Next/Image hiển thị đúng. Unit/TypeScript/ESLint/build được kiểm tra; business test mới và browser harness cần MySQL test, không coi là đã đạt khi chỉ build thành công. Chưa tải ảnh thật lên UploadThing.

Đã thử khởi động Chromium headless với timeout 5 giây trong lượt chỉnh ảnh; không khởi động được, chưa có screenshot xác minh bố cục mới.

Sửa bố cục theo screenshot: tách ProfilePhotoUpload khỏi ImageUpload manager, header Organizer giới hạn kích thước cover/avatar/logo, đặt form và quản lý upload riêng; thêm AccountMenu với thông tin cá nhân và điều hướng theo vai trò. Hai test render component thật không cần database xác nhận không có dropzone trong header và ảnh upload thay fallback. Browser harness thêm mở menu, kiểm tra email/link/đăng xuất, Escape trả focus và bấm ngoài đóng; chưa chạy trên MySQL test/Chromium.
