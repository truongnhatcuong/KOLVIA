# Thông báo realtime

Pusher dùng các biến `PUSHER_APP_ID`, `PUSHER_APP_KEY`, `PUSHER_APP_SECRET`, `PUSHER_APP_CLUSTER`. Các giá trị người dùng đã thêm dưới tên `app_id`, `key`, `secret`, `cluster` đã được chuyển tên, giữ nguyên giá trị. Backend vẫn hỗ trợ tên cũ. Không cần biến `NEXT_PUBLIC_*`; DashboardShell chỉ truyền key và cluster công khai đến trình duyệt. Secret và app ID chỉ dùng ở backend.

Frontend dùng Pusher JS 8.3.0 từ CDN chính thức qua `next/script`; backend gửi HTTP API bằng `fetch` và chữ ký HMAC SHA-256 theo [tài liệu Pusher](https://pusher.com/docs/channels/library_auth_reference/rest-api/). Việc tải package npm bị chặn DNS trong môi trường triển khai, nên không thêm dependency chưa cài được. CDN và HTTP API đều là cách tích hợp được Pusher hỗ trợ.

Mỗi tài khoản nhận kênh `private-notifications-<userId>`. `/api/pusher/auth` kiểm tra Origin, session, tài khoản hoạt động, socket ID và quyền sở hữu kênh. Auth trả `{ data: { auth } }` theo chuẩn API dự án; `channelAuthorization.customHandler` lấy `data` để đưa chữ ký cho SDK. Người dùng không đăng nhập hoặc đăng ký kênh của người khác bị từ chối. Xem [private channels](https://pusher.com/docs/channels/using_channels/private-channels/).

Thông báo được ghi trong transaction nghiệp vụ. Chỉ sau COMMIT mới phát `notifications.changed`; rollback không phát sự kiện. Gộp người nhận trùng, mỗi HTTP request tối đa 100 kênh. Payload chỉ có `{ changed: true }`, không gửi nội dung cá nhân qua Pusher. Browser đọc số chưa đọc từ API được xác thực; trang `/notifications` tự refresh danh sách. Các luồng ứng tuyển/rút đơn, lời mời/phản hồi, kiểm duyệt, sửa/đóng/mở/lưu trữ/ẩn Job đều dùng cơ chế này. Đánh dấu đã đọc cũng phát sự kiện để đồng bộ giữa các tab/thiết bị.

Nếu Pusher chậm/lỗi, thao tác database vẫn thành công. Request Pusher có timeout 3 giây; việc phát sự kiện là best effort, không có outbox/retry bền vững. Browser đối soát sau kết nối lại, trở lại tab, mỗi 2 phút khi realtime hoạt động và mỗi 30 giây khi mất kết nối/thiếu SDK hoặc cấu hình. Các timer, request và subscription được dọn khi rời trang/đổi tài khoản. Đánh dấu đã đọc cập nhật ngay tab hiện tại qua sự kiện nội bộ.

## Kiểm tra trên máy chạy dự án

1. Khởi động lại `npm run dev` sau khi đổi `.env`.
2. Mở hai phiên trình duyệt riêng: KOL và Organizer.
3. KOL ứng tuyển vào Job mở đã duyệt: chuông Organizer tăng và hiện thông báo mới.
4. Organizer gửi lời mời hoặc duyệt đơn: KOL nhận thay đổi tương ứng.
5. Để `/notifications` đang mở: danh sách tự cập nhật. Đánh dấu đã đọc ở một tab và kiểm tra số chưa đọc tại tab khác.
6. Trong Network, `/api/pusher/auth` phải trả 200 cho kênh của chính người đang đăng nhập. Kênh tài khoản khác phải trả 403.

Unit tests kiểm tra cấu hình, chữ ký, commit/rollback, giới hạn kênh và xử lý lỗi. Test API cho quyền truy cập endpoint Pusher đã bổ sung nhưng cần `TEST_DATABASE_URL` để chạy. Chưa xác minh kết nối thật do DNS Pusher bị ENOTFOUND và database MySQL báo P1001 trong môi trường kiểm tra; không khẳng định key đã được Pusher xác nhận.
