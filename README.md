# KOLVIA

Nền tảng kết nối KOL/KOC với người tổ chức sự kiện và Job, triển khai theo quy mô đồ án sinh viên. Giao diện dựa trên bản export Stitch trong `stitch_kol_connect_ai_ui_ux_design 2/`.

Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui primitives + MySQL + Prisma. Frontend và API cùng dự án; nghiệp vụ đọc/ghi database, không dùng dữ liệu mock hoặc chỉ số AI giả.

## Chạy dự án với MySQL

Giữ DATABASE_URL MySQL đang có trong `.env`. Với máy mới, cấu hình theo `.env.example` và tạo database trước, rồi chạy:

```sh
npm install
npm run setup
npm run db:admin
npm run dev
```

`npm run dev` kiểm tra URL MySQL, generate Prisma Client, deploy các migration chưa áp dụng và kiểm tra schema trước khi mở Next tại http://127.0.0.1:3000. Không mở database nhúng hoặc đổi DATABASE_URL sang kết nối khác. Mật khẩu demo nằm trong `.env` tại máy.

| Vai trò | Email demo | Biến mật khẩu |
| --- | --- | --- |
| Admin | admin@kolvia.local hoặc DEMO_ADMIN_EMAIL | DEMO_ADMIN_PASSWORD |
| KOL/KOC | DEMO_KOL_EMAIL (mặc định linh@kolvia.local) | DEMO_KOL_PASSWORD |
| Organizer | DEMO_ORGANIZER_EMAIL (mặc định organizer@kolvia.local) | DEMO_ORGANIZER_PASSWORD |

Seed thêm dữ liệu demo vào database thật và không ghi đè tài khoản đã có. Sáu chân dung KOL AI là ảnh minh họa riêng cho tài khoản demo; ảnh upload luôn được ưu tiên. `db:admin` đặt lại mật khẩu Admin demo và thu hồi session cũ, không nâng quyền KOL/Organizer trùng email.

Giao diện hồ sơ và thẻ KOL không hiển thị nhãn demo/AI. Tại `/kol/profile`, bấm **Điền thông tin mẫu** để bổ sung ô còn trống bằng giới thiệu, kỹ năng và kênh/nội dung TikTok, Facebook, YouTube. Xem lại rồi bấm **Lưu thay đổi** để ghi database; nút điền chỉ cập nhật form. Giữ nội dung đã nhập và trạng thái công khai, ưu tiên kênh lấy từ bài đăng đã lưu. Để cập nhật bằng CLI, chạy `npm run profile:complete -- <ID_KOL>`; cần MySQL kết nối được. Script cũng bổ sung liên kết công khai mẫu còn thiếu và không ghi đè liên kết đã có. Không tạo số người theo dõi hoặc thành tích. Nội dung công khai được dùng làm fixture kiểm thử, không xác minh thuộc người trong hồ sơ. Nguồn ở [profile-samples.md](docs/profile-samples.md).

Migration MySQL ban đầu được giữ nguyên để khớp lịch sử đã áp dụng; migration tiếp theo thêm thông báo, kỹ năng/kinh nghiệm, quyền lợi/capacity và giữ số người đã xác nhận. Không chạy reset. Xem [hướng dẫn MySQL](docs/mysql.md).

Trong development với APP_URL loopback, có thể dùng localhost hoặc 127.0.0.1 trên đúng protocol/cổng request. Production yêu cầu Origin trùng APP_URL.

## Chức năng

| Vai trò | Chức năng | Trang chính |
| --- | --- | --- |
| Công khai | Đăng ký/đăng nhập, xem và tìm Job/KOL, chi tiết hồ sơ | /, /login, /register, /jobs, /kols |
| KOL/KOC | Hồ sơ, kỹ năng/kinh nghiệm, 4 mạng xã hội, ứng tuyển/rút đơn, phản hồi lời mời, danh sách đã xác nhận | /kol/dashboard, /kol/profile, /kol/applications, /kol/invitations, /kol/jobs |
| Organizer | Hồ sơ, CRUD/draft/submit Job, quyền lợi/capacity, quản lý đơn và lời mời, roster, dashboard | /organizer/dashboard, /organizer/profile, /organizer/jobs, /organizer/applications, /organizer/invitations |
| Admin | Biểu đồ 30 ngày, thống kê vai trò/Job/đơn/lời mời/kết nối, khóa/mở tài khoản, duyệt/từ chối/ẩn Job | /admin, /admin/users, /admin/jobs, /admin/moderation |
| Đã đăng nhập | Thông báo, đánh dấu đã đọc/tất cả đã đọc, số chưa đọc trên thanh điều hướng | /notifications |

Tìm Job theo từ khóa, lĩnh vực, địa điểm, khoảng thù lao, ngày sự kiện và thứ tự. Tìm KOL theo tên, lĩnh vực, địa điểm, nền tảng, kỹ năng, số năm kinh nghiệm.

## Luồng nghiệp vụ

1. Organizer tạo bản nháp → gửi kiểm duyệt → Admin duyệt → Job công khai.
2. KOL ứng tuyển → Organizer chấp nhận/từ chối → nếu chấp nhận, có một Participation.
3. Organizer gửi lời mời → KOL chấp nhận/từ chối → nếu chấp nhận, cùng một Participation như luồng ứng tuyển.
4. Khóa hàng Job trước đếm số người và xác nhận tham gia, ngăn hai quyết định vượt capacity. Không giảm capacity thấp hơn số người đã xác nhận.
5. Không tạo đơn/lời mời đang hiệu lực trùng. Đơn đã rút và lời mời đã từ chối có thể gửi lại cùng record.
6. Notification ghi cùng transaction với thao tác nghiệp vụ. Hộp thông báo kiểm tra chủ sở hữu ở Backend; chuông cập nhật theo chu kỳ 30 giây khi tab đang mở.
7. Job đã có kết nối được lưu trữ khi xóa, giữ lịch sử. KOL có kết nối được xem lại Job của mình khi đã đóng/ẩn; người khác không được truy cập.

## Database và phân quyền

12 bảng, đầy đủ FK, unique và index: User, Session, KolProfile, OrganizerProfile, SocialLink, Job, Application, Invitation, Participation, LoginAttempt, MediaAsset, Notification. Backend kiểm tra ngân sách, capacity, thứ tự lịch, kinh nghiệm và nền tảng liên kết bằng Zod; transaction kiểm soát chỉ tiêu tuyển.

Cookie HttpOnly, SameSite=Lax, Secure với HTTPS, session 7 ngày, token chỉ lưu hash. Mật khẩu scrypt có salt; đăng nhập giới hạn lần thử. Register không cho tạo ADMIN. Mỗi service xác minh session/tài khoản đang hoạt động, vai trò và chủ sở hữu; proxy chỉ hỗ trợ điều hướng. Mutation kiểm tra Origin, Zod validation và giới hạn payload.

## Upload ảnh

UploadThing hiện có được giữ lại. Điền UPLOADTHING_TOKEN để upload avatar, cover, portfolio, logo và ảnh Job. Website vẫn dùng được các nghiệp vụ chính khi chưa cấu hình upload. Callback có chữ ký, kiểm tra quyền/target/quota/MIME/kích thước, quản lý xóa ảnh và cleanup. Xem [uploadthing.md](docs/uploadthing.md).

Avatar và ảnh bìa có nút camera nhỏ: chọn ảnh → xem trước trong cửa sổ → Lưu thay đổi hoặc Hủy. KOL được sửa ngay trên hồ sơ công khai của chính mình; Organizer có avatar người đại diện, ảnh bìa và logo riêng. Ảnh tải lên được ưu tiên, sau đó đến chân dung demo/ảnh mặc định. Hai chân dung Organizer hư cấu và prompt gốc ở [demo-organizers/README.md](public/images/demo-organizers/README.md). Xem [luồng ảnh hồ sơ](docs/profile-photos.md).

Các thao tác trong bảng/danh sách dùng nút icon 40px (44px trên thiết bị cảm ứng), có tên truy cập và tooltip. Sửa, xem, gửi duyệt, duyệt/từ chối, khóa/mở khóa, xóa/lưu trữ và đọc thông báo dùng icon thống nhất. Admin từ chối/ẩn Job qua hộp thoại nhập lý do; kiểm tra đầu vào, quyền backend và xác nhận xóa vẫn giữ nguyên. Nút lưu biểu mẫu vẫn có chữ để người dùng biết thao tác xác nhận.

Thông báo dùng Pusher Channels trên kênh riêng của từng tài khoản. Cấu hình bốn biến `PUSHER_APP_*` trong `.env`, khởi động lại dev server. Chuông, nhắc thông báo mới và danh sách `/notifications` cập nhật realtime; đánh dấu đã đọc đồng bộ giữa các tab. Sự kiện chỉ phát sau commit, Pusher lỗi không làm thất bại nghiệp vụ. Chi tiết, giới hạn và cách kiểm tra ở [realtime-notifications.md](docs/realtime-notifications.md).

KOL hủy đơn chờ duyệt hoặc gửi yêu cầu rút sau xác nhận, kèm lý do. Organizer xử lý tại `/organizer/withdrawals` hoặc chi tiết Job. Sau khi bị từ chối, KOL vẫn có thể xác nhận rời tại `/kol/withdrawals`; hệ thống ghi nhận không được chấp thuận. Chỉ khi thực sự rời mới giải phóng chỗ tuyển. Lịch sử và các mốc thời gian được giữ, kể cả đăng ký/tham gia lại. Job hoàn thành không được rút; Organizer đánh dấu hoàn thành trên chi tiết Job sau khi xử lý yêu cầu đang chờ. Áp dụng migration `202610140001_withdrawals` trước khi chạy phiên bản này. Báo cáo Database/Backend/Frontend, file đã sửa và kiểm thử ở [withdrawals.md](docs/withdrawals.md).

TikTok/Facebook/Instagram/YouTube dùng liên kết, không gọi API mạng xã hội. Tại `/kol/profile`, ô **Video TikTok công khai**, **Bài đăng Facebook công khai** và **Video YouTube công khai** nhận URL hoặc mã nhúng sao chép từ nền tảng và hiển thị bản xem trước. Mã nhúng chỉ được trích xuất thành URL; không lưu hoặc thực thi HTML/script do người dùng dán. Bấm **Lưu thay đổi** để lưu URL vào database; nội dung đã lưu cũng hiển thị trên hồ sơ công khai.

TikTok hỗ trợ URL video đầy đủ; Facebook hỗ trợ bài đăng `/posts/`, permalink/story và video/reel/watch. Liên kết rút gọn hoặc chia sẻ cần đổi sang liên kết gốc đầy đủ. Khung nhúng có trạng thái tải và liên kết mở trực tiếp nếu nền tảng không hiển thị nội dung. Nội dung phải còn công khai và được nền tảng cho phép nhúng.

## Kiểm thử

```sh
npm run test:unit
npm run lint
npm run typecheck
npm run build
```

Khi đã cấu hình TEST_DATABASE_URL MySQL riêng:

```sh
npm test
npm run test:api
npm run test:browser
```

Harness tạo database test ngẫu nhiên và chỉ xóa database đã tạo. Browser cần Chromium và quyền mở cổng local. Kết quả hiện tại: 18 unit test đạt; TypeScript, lint, production build đạt. Test nghiệp vụ/API/browser với MySQL server chưa được xác minh vì thiếu kết nối test và sandbox chặn socket. Xem [báo cáo kiểm thử](docs/verification.md).

## Cấu trúc

- `src/app`: App Router pages và API Route Handlers.
- `src/services`: nghiệp vụ, transaction và phân quyền Backend.
- `src/lib`: session, database/query, validation, format và design tokens.
- `src/components`: UI Stitch, shadcn primitives, form và dashboard.
- `prisma`: schema/migration MySQL, seed và bản SQLite cũ.
- `scripts`, `tests`, `docs`: setup/demo/test, kiểm thử và báo cáo.

AI Matching ở Dashboard KOL / trang `/kols` cho Organizer và trợ lý chat trên Homepage đã được tích hợp. Organizer chọn job trên catalog để xem điểm, xếp hạng và gửi lời mời từ card KOL; chi tiết job có nút dẫn tới catalog với job đã chọn sẵn. Dashboard KOL hiển thị card lời mời và job gợi ý. Điểm tính tại Backend từ dữ liệu thật; Gemini Tool Calling chỉ chọn truy vấn đọc có phân quyền. Cấu hình `API_KEY_AI`, `AI_CHAT_BASE_URL`, `AI_MODEL=gemini-3-flash` ở `.env` phía server. Chi tiết trọng số, cấu hình và kiểm thử ở [ai-features.md](docs/ai-features.md).

Thanh toán, hợp đồng điện tử và API mạng xã hội chưa triển khai. Báo cáo các giai đoạn trước ở [implementation-plan.md](docs/implementation-plan.md).
