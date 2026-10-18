# Kết quả kiểm tra

Ngày thực hiện: 12/10/2026. Môi trường macOS ARM64, Node.js 24.21.0. Kết quả cập nhật sau khi áp dụng thiết kế và tích hợp ảnh.

Đã chuyển Prisma sang MySQL theo yêu cầu, giữ URL MySQL trong `.env`, generate Client mới và tạo migration MySQL đầy đủ. SQLite cũ vẫn được lưu lại. Lỗi provider không khớp đã hết. Kết nối TiDB Cloud trong phiên này bị DNS `ENOTFOUND`, Prisma báo `P1001`; chưa áp dụng migration/seed lên MySQL. Build không xác nhận các trang động đọc được database.

| Kiểm tra hiện tại với cấu hình MySQL | Kết quả |
| --- | --- |
| Prisma validate / generate | Đạt |
| Kiểm tra provider và URL | Đạt |
| Tạo SQL migration MySQL từ schema | Đạt; chưa thực thi trên server |
| `npm run typecheck` | Đạt |
| `npm run lint` | Đạt |
| `npm run build` | Đạt |
| Cấu hình và cách ly database test | 7/7 đạt |
| Kết nối / migration MySQL | Chưa đạt: P1001, DNS ENOTFOUND |
| Seed MySQL | Chưa chạy vì migration chưa thực hiện được |
| 33 bài nghiệp vụ / 14 bài API trên MySQL | Chưa chạy; thiếu TEST_DATABASE_URL |
| Browser / responsive / embed / upload thật | Chưa kiểm chứng |
| Hosting bên ngoài | Chưa thực hiện |

Trước khi chuyển provider, 33 bài nghiệp vụ và 14 bài compiled Route Handler đã đạt trên SQLite cách ly; kết quả đó không được tính là kiểm chứng MySQL. Môi trường cũng từng chặn mở cổng local (`listen EPERM`) và Chromium. Bộ test hiện tại đã chuyển sang database MySQL riêng với tên ngẫu nhiên, yêu cầu TEST_DATABASE_URL và quyền CREATE/DROP DATABASE. Xem [hướng dẫn MySQL](mysql.md).

## Phạm vi 33 bài nghiệp vụ

Đăng ký không được tạo ADMIN; email duy nhất; hash mật khẩu; đăng nhập; giới hạn lần thử; anonymous/wrong-role access; hồ sơ đúng chủ; validation URL; Origin/CSRF; quyền sở hữu Job; ngân sách và lịch; trạng thái kiểm duyệt; ứng tuyển trùng; quyền duyệt/rút đơn; lời mời đúng người; hợp tác qua hai luồng không trùng; Job đóng/hết hạn; lưu trữ giữ lịch sử; DTO công khai; session hết hạn/giả mạo/tài khoản khóa; hạn chế quản trị role. Bảy bài bổ sung kiểm tra upload role/target/ownership, thay ảnh và callback lặp, URL CDN/kích thước, tài khoản khóa, quota portfolio, xóa ảnh đúng chủ/tombstone và kiểm duyệt lại cover/lifecycle khi xóa Job. Năm bài mới xác minh xóa ảnh lặp không thay đổi kiểm duyệt, giữ cover của Job lưu trữ, receipt cho upload bị từ chối sau khóa tài khoản, cleanup tiếp tục/thử lại khi nhà cung cấp lỗi, và lọc/phân trang Job luôn giới hạn đúng Organizer.

## Phạm vi 14 bài API

Các bài gọi Route Handler đã biên dịch thông qua runtime Next.js với `NextRequest`. Cookie được tạo/đọc/thu hồi trong request context thật của Route Handler; lần chạy đã đạt trước đây dùng SQLite riêng; bộ test hiện tại dùng MySQL riêng và chưa được chạy thành công trên MySQL.

Đã kiểm tra endpoint Public và bộ lọc; đăng nhập/cookie; đăng ký ADMIN và trùng email; API riêng với anonymous/sai role; Origin và payload giả mạo; CRUD/kiểm duyệt Job; ứng tuyển đến xác nhận; lời mời đến xác nhận; khóa tài khoản và đăng xuất. Hai bài SDK bổ sung kiểm tra middleware UploadThing (session, role, Origin, ownership giả, MIME/kích thước/số lượng file) và callback sai chữ ký. Ba bài mới kiểm tra API xóa ảnh sai quyền/Origin, callback có chữ ký lưu đúng chủ và trả DTO tối thiểu, callback sau khóa tài khoản tạo receipt không hiển thị và cleanup. Các lời gọi provider cho callback/xóa file được mô phỏng bằng mock `fetch`; không upload file hoặc xóa file thật trên dịch vụ.

Đây là kiểm thử API trong tiến trình, chưa phải kiểm thử HTTP qua socket hoặc thao tác trình duyệt. Kiểm tra điều hướng trang đã có ở mức build và script browser (gồm wizard 4 bước, chọn/xem trước/kéo thả ảnh không upload trước khi bấm lưu, lọc Job và card mobile), chưa xác minh bằng browser tại phiên này.

## Chạy lại

Đợt chỉnh giao diện theo ảnh Stitch: production build và ESLint đạt; TypeScript được kiểm tra lại. Đã thử Chromium độc lập, lỗi `Target page, context or browser has been closed` trước khi mở trang. Script browser mở rộng để chụp riêng mỗi trang Public/KOL/Organizer/Admin ở 1440/390px, bổ sung chi tiết KOL và kiểm tra hiện/ẩn mật khẩu. Chưa có screenshot của ứng dụng đang chạy để xác minh pixel hoặc responsive trực quan tại phiên này.

Seed đã mở rộng lên 6 KOL, 2 Organizer, 9 Job và các đơn/lời mời demo; thêm lệnh `db:admin` tạo/đặt lại mật khẩu Admin từ `.env`, kiểm tra role và thu hồi session cũ. TypeScript (bao gồm scripts TypeScript) và ESLint đạt. Đã thử chạy cả `db:seed` và `db:admin` nhưng đều dừng ở kết nối P1001; chưa ghi dữ liệu hay xác minh đăng nhập Admin trên MySQL.

```sh
npm run typecheck
npm run lint
npm test
npm run test:api
npm run test:browser
```

Cần cấu hình TEST_DATABASE_URL trước khi chạy các bộ test cần database. Bộ browser tạo server và database MySQL riêng. Chạy trên máy cho phép mở cổng local; nếu thiếu Chromium, chạy `npx playwright install chromium` trước.

## Bổ sung trong lượt triển khai tiếp

UI upload có chọn ảnh/xem trước, kéo thả, hủy lựa chọn, thông báo lưu/xóa và thử lại từ file đã chọn. File object URL được thu hồi khi thay ảnh hoặc rời trang. Trang Organizer Job có lọc/phân trang server và cards trên mobile. Script trình duyệt đã được cập nhật nhưng vẫn dừng tại `listen EPERM` trong lần chạy mới; các thao tác UI này chưa được xác minh bằng browser.

## Triển khai lại UI và ảnh KOL minh họa

Production build, TypeScript và ESLint đạt sau khi dựng lại các component bằng Tailwind. Kiểm tra SSR bằng ReactDOM xác minh: 6 chân dung demo đều có asset local và render được, ảnh upload được ưu tiên, email ngoài danh sách demo không nhận ảnh giả lập, trang chủ render được khi danh sách Job rỗng. Không ghi dữ liệu database trong lượt này.

Bộ ảnh AI và prompt lưu tại `public/images/demo-kols/README.md`; ảnh bìa local ở `public/images/creator-workspace.png`. Database đang báo P1001 và Chromium độc lập timeout 180 giây khi khởi chạy, nên chưa chạy kiểm thử nghiệp vụ/browser hay so sánh screenshot với Stitch.
