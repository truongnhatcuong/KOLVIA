# Hồ sơ và nội dung mẫu

Tên của tài khoản được giữ nguyên. Phần giới thiệu/kỹ năng mẫu được viết theo lĩnh vực để kiểm thử giao diện và luồng lưu hồ sơ. Không sao chép tiểu sử, thông tin liên hệ, số follower hoặc thành tích của người khác. Ảnh hiện có vẫn được giữ nguyên.

Các liên kết mẫu được lưu tập trung tại `src/lib/profile-samples.ts`:

- TikTok: `@scout2015`, video `6718335390845095173`, lấy từ ví dụ trong [tài liệu nhúng chính thức TikTok](https://developers.tiktok.com/docs/en/embed-videos).
- Facebook: bài đăng của `TiramisuMrHuan` trong mã iframe người dùng đã cung cấp; không xác nhận quyền sở hữu hoặc trạng thái công khai hiện tại.
- YouTube: [Google for Developers](https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw), video [Introducing Google for Developers](https://www.youtube.com/watch?v=bC8fvcpocBU). Khung phát dựa trên [tài liệu YouTube](https://developers.google.com/youtube/player_parameters).

Nội dung này chỉ phục vụ test và không xác nhận thuộc tài khoản KOL. Bài đăng có thể bị gỡ hoặc ngừng cho phép nhúng; luôn có liên kết mở trực tiếp. Người dùng thay được từng URL trong form.

**Điền thông tin mẫu** giữ thông tin đã nhập, chỉ điền ô trống, không ghi database. **Lưu thay đổi** gửi dữ liệu qua API KOL có kiểm tra quyền và dữ liệu đầu vào. `npm run profile:complete -- <ID_KOL>` chỉ cập nhật đúng KOL được chỉ định, chạy trong transaction, giữ ảnh, tên, email, liên kết và trạng thái công khai. Lỗi P1001 là kết nối MySQL thất bại; không chuyển qua dữ liệu giả trong phần đọc/ghi nghiệp vụ.
