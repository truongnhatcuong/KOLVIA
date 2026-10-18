# Hủy đăng ký và rút tham gia

## Kiểm tra source trước khi sửa

Đã rà schema/migrations, service ứng tuyển/lời mời/Job/Admin, toàn bộ nơi đọc số Participation, phân quyền/session/Origin, API, các trang KOL/Organizer, upload ảnh, notification transaction/Pusher và bộ test. Hủy đơn chờ duyệt đã có dưới trạng thái WITHDRAWN. Trước thay đổi, chưa có yêu cầu rút sau xác nhận, trạng thái Participation hoặc Job hoàn thành; số lượng tuyển đếm mọi bản ghi Participation. Đăng ký lại còn ghi đè nội dung đơn mà không có bảng lịch sử.

## Database

File: `prisma/schema.prisma`, `prisma/migrations/202610140001_withdrawals/migration.sql`, `scripts/check-database.mjs`, `src/lib/db/client.ts`, `prisma/seed.ts`.

- Job thêm COMPLETED và completedAt. Hoàn thành được Organizer/Admin xác nhận thủ công; không suy đoán từ eventDate vì đây là thời điểm bắt đầu, không có thời điểm kết thúc.
- Participation thêm trạng thái, confirmedAt và leftAt. Người chờ duyệt rút/bị từ chối rút vẫn chiếm chỗ tuyển. Chỉ WITHDRAWN_APPROVED/WITHDRAWN_UNAPPROVED không chiếm chỗ.
- WithdrawalRequest lưu lý do, thời điểm yêu cầu/xử lý/rời, người xử lý, phản hồi, nguồn tham gia và lịch sự kiện tại thời điểm gửi. Thời điểm do server ghi; không nhận timestamp hoặc quyền sở hữu từ client. Phân loại trước sự kiện, trong 24 giờ trước sự kiện, đã bắt đầu.
- activeSlot unique nullable chỉ tồn tại cho yêu cầu đang chờ hoặc đã bị từ chối nhưng KOL chưa rời. Tránh hai yêu cầu đang hiệu lực cho cùng Participation; khi rời thì giải phóng slot để cho phép yêu cầu mới sau lần tham gia lại.
- ApplicationHistory giữ bản chụp nội dung/trạng thái khi đăng ký, hủy, gửi lại, duyệt và rời. Migration chụp trạng thái hiện có với action SNAPSHOT; không tự dựng các mốc lịch sử/actor không được lưu trước đây. createdAt của đơn cũ không bị thay khi đăng ký lại.
- Migration thêm cột/bảng/index/FK, không reset hoặc xóa dữ liệu. FK RESTRICT ở lịch sử và yêu cầu rút bảo vệ dữ liệu khỏi xóa vật lý. Service xóa Job vẫn đếm toàn bộ liên kết lịch sử để chọn lưu trữ, kể cả khi số KOL đang tham gia là 0.

Prisma generate/validate đạt. Migration deploy đã thử nhưng MySQL báo P1001, chưa áp dụng SQL trên database thật.

## Backend

File: `src/services/withdrawals.ts`, `collaborations.ts`, `jobs.ts`, `dashboard.ts`, `admin.ts`, `notifications.ts`, `media.ts`; `src/lib/db/participation.ts`, `recruitment.ts`, `queries.ts`, `withdrawal-policy.ts`, `validations/index.ts`, `http.ts`; API `/api/withdrawals`, `/api/withdrawals/[id]`, `/api/withdrawals/[id]/depart`.

| Trạng thái hiện tại | Thao tác | Kết quả và chỗ tuyển |
| --- | --- | --- |
| Đơn PENDING | KOL hủy đăng ký, có xác nhận | Đơn WITHDRAWN; giữ lịch sử; không tạo/xóa Participation |
| Participation CONFIRMED | KOL gửi lý do rút | WITHDRAWAL_PENDING; vẫn giữ chỗ |
| Yêu cầu PENDING | Organizer chấp thuận | WITHDRAWN_APPROVED; lưu departedAt, giải phóng chỗ |
| Yêu cầu PENDING | Organizer từ chối kèm lý do | WITHDRAWAL_REJECTED; vẫn giữ chỗ |
| Yêu cầu REJECTED | KOL xác nhận vẫn rời | WITHDRAWN_UNAPPROVED, request LEFT_WITHOUT_APPROVAL; giữ phản hồi cũ và giải phóng chỗ |
| Job COMPLETED hoặc có completedAt | Hủy/rút/xác nhận rời | Từ chối; không đổi dữ liệu |

Yêu cầu rút không phụ thuộc deadline, trạng thái mở tuyển hoặc sự kiện đã bắt đầu; Job ẩn/lưu trữ vẫn có thể xử lý rút nếu chưa hoàn thành. Chỗ trống tăng khi thực sự rời, nhưng không tự mở lại Job đã đóng/lưu trữ hoặc đổi hạn ứng tuyển.

KOL chỉ tác động dữ liệu của mình. Organizer chỉ xử lý yêu cầu thuộc Job mình sở hữu; Admin không thay Organizer duyệt yêu cầu rút. Tất cả mutation kiểm tra session, tài khoản hoạt động, Origin và input ở backend. Chỉ được xác nhận rời không chấp thuận sau một quyết định REJECTED.

Các thao tác khóa cùng hàng Job trong transaction ReadCommitted trước khi đọc trạng thái, đếm chỗ hoặc đổi dữ liệu. Yêu cầu/duyệt/xác nhận rời trùng trả 409; write conflict P2034 được thử lại tối đa 3 lần rồi trả 409. Thông báo cho cả hai bên ghi cùng transaction; Pusher chỉ phát sau commit, không phát khi rollback.

Hoàn thành Job không cho phép còn yêu cầu rút PENDING để tránh yêu cầu bị bỏ dở. Sau hoàn thành không mở lại/sửa; lưu trữ Job hoàn thành vẫn giữ completedAt nên không thể lách quy tắc rút. Khi chính thức rời, cả đơn/lời mời còn đang chờ hoặc đã chấp nhận của KOL cho Job đó kết thúc; tránh dùng đơn cũ để vô tình xác nhận lại. Người dùng vẫn có thể đăng ký/nhận lời mời mới khi Job đang tuyển, và lịch sử rút trước đó vẫn được giữ.

Đã cập nhật đếm đang tham gia ở roster, giới hạn capacity, thẻ/danh sách Job, dashboards, public stats và Admin overview. Biểu đồ hoạt động Admin vẫn thể hiện kết nối lịch sử, không xóa số liệu quá khứ khi một KOL rời.

## Frontend

File: `src/components/withdrawal-controls.tsx`, `withdrawal-list.tsx`, `collaboration-list.tsx`, `dashboard-shell.tsx`, `organizer/job-table.tsx`, `admin/jobs.tsx`, `notification-bell.tsx`, `ui/index.tsx`; `src/lib/format.ts`, `realtime/channels.ts`; các trang KOL jobs/withdrawals, Organizer withdrawals/job detail/jobs/dashboard/job edit, public job detail và `src/app/globals.css`.

- Hủy đăng ký ở danh sách đơn PENDING, giữ xác nhận trước thao tác.
- Rút tham gia ở `/kol/jobs`, đơn/lời mời ACCEPTED, mở hộp thoại nhập lý do rồi xác nhận gửi.
- `/kol/withdrawals`: lý do, thời điểm, phản hồi và lịch sử; nút xác nhận rời sau khi bị từ chối.
- `/organizer/withdrawals` và chi tiết Job: lọc/xem yêu cầu, chấp thuận/từ chối với xác nhận hoặc hộp nhập lý do, roster và số chỗ còn trống.
- Nút hoàn thành trên chi tiết Job của Organizer; trạng thái COMPLETED có trong bộ lọc. Job đã rời vẫn hiện trong lịch sử KOL.
- Giữ các nút icon/tooltip, trạng thái pending/lỗi và tên truy cập. Realtime/fallback cập nhật các trang kết nối/yêu cầu/roster; bỏ qua trang đang sửa Job/hồ sơ để giữ bản nháp người dùng.

## Kiểm thử và phần chưa xác nhận

File: `tests/withdrawal-policy.test.ts`, `withdrawal-services.test.ts`, `profile-ui.test.tsx`, `realtime.test.ts`, `business.test.ts`, `routes.test.mjs`, `scripts/browser-check.mjs`, `scripts/test.mjs`, `package.json`.

- 56/56 unit/service/UI tests đạt. Test service gọi logic production với transaction/database test double, kiểm tra quyền, thời điểm, trạng thái, giữ chỗ/giải phóng, thông báo, lịch sử, thao tác trùng, retry/rollback và tham gia lại. Không chứng minh cơ chế khóa của MySQL thật bằng mô phỏng này.
- TypeScript, lint và build: kiểm tra lại ở báo cáo verification.
- Bộ business trên MySQL có 48 tests, bao gồm các race về rút/duyệt/tuyển và hoàn thành/yêu cầu rút. Bộ Route Handler có 19 tests, có login/Origin/ownership/input và luồng từ chối rồi xác nhận rời. Chưa chạy vì TEST_DATABASE_URL chưa được cấu hình và MySQL hiện không kết nối được.
- Kịch bản trình duyệt đã thêm luồng rút từ đơn và lời mời, từ chối rồi vẫn rời, chấp thuận, roster giảm và hoàn thành. Đã kiểm tra cú pháp; chưa chạy browser/kiểm chứng Pusher trực tiếp trong môi trường hiện tại.

Khi MySQL hoạt động: `npm run db:migrate`, sau đó `npm run dev`. Cấu hình TEST_DATABASE_URL là kết nối MySQL cho phép tạo/drop database test riêng; chạy `npm test`, `npm run test:api`, `npm run test:browser`. Không chạy test trực tiếp trên database nghiệp vụ hoặc reset dữ liệu.
