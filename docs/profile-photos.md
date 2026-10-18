# Ảnh hồ sơ KOL và nhà tổ chức

KOL: `/kol/profile` và hồ sơ công khai của chính mình. Organizer: `/organizer/profile`. Bấm camera nhỏ trên ảnh đại diện, ảnh bìa hoặc logo; chọn JPG, PNG hay WebP tối đa 4 MB; xem trước rồi chọn Lưu thay đổi. Hủy hoặc Escape không tải file lên. Khi đang lưu, khóa chọn ảnh/lưu/đóng để tránh gửi trùng và giữ tiến trình rõ ràng. Hộp ảnh cuộn được trên màn hình thấp.

KOL có avatar, cover và portfolio tối đa 6 ảnh. Organizer có avatar người đại diện, cover, logo và ảnh Job thuộc tổ chức. Không cấp portfolio cho Organizer hoặc quyền upload cho Admin. Origin/session/role/chủ sở hữu được kiểm tra trong backend và callback ký của UploadThing. Các asset mới dùng bảng MediaAsset hiện có, không cần migration.

Giữ phần quản lý ảnh bên dưới để thay/xóa ảnh như trước. Khi xóa ảnh tải lên, UI quay về ảnh minh họa mặc định. Hai ảnh Organizer hư cấu nằm trong `public/images/demo-organizers/`; logo và avatar chung là SVG local. Ảnh minh họa chỉ được hiển thị khi thiếu ảnh người dùng, không ghi thành upload giả trong database và không tăng số ảnh portfolio.

File chính: `src/components/ui/image-upload.tsx`, `media-image.tsx`, các trang hồ sơ KOL/Organizer/public KOL, dashboard shell, cards/home/collaboration-list/job detail, `src/lib/demo-assets.ts`, `src/services/media.ts` và các asset trong `public/images`.

Phần đầu Organizer dùng `OrganizerProfileHeader` và `ProfilePhotoUpload` riêng cho cover/avatar/logo. Kích thước ảnh cố định, thông tin có cột minmax tránh tràn, logo ở hàng riêng. Form thông tin và quản lý upload/xóa nằm bên dưới, không đặt dropzone trong hàng ảnh. Component `ImageUpload` chỉ dùng cho mục quản lý upload đầy đủ.

`AccountMenu` trên thanh đầu dashboard: bấm avatar/tên để xem tên, email đăng nhập, vai trò; đi tới Tổng quan, Thông tin hồ sơ, Ảnh hồ sơ, Job, Thông báo, Trang chủ hoặc Đăng xuất. Link tùy vai trò. Escape trả focus về nút; bấm ngoài đóng dropdown. Dropdown giới hạn chiều rộng/chiều cao viewport và cuộn trên màn hình nhỏ.

Bổ sung business test kiểm tra Organizer thay avatar/cover mà giữ logo, không cho tổ chức khác xóa ảnh. Browser harness kiểm tra camera mở file picker, preview mở modal và Hủy không tạo POST upload. Các test tích hợp cần MySQL test/Chromium; chưa xác nhận tải ảnh thật lên UploadThing trong môi trường agent.
