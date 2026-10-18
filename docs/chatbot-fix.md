# Sửa luồng gợi ý KOL và hiển thị chatbot

## Nguyên nhân

1. `my_recommendations` không có `jobId` trước đây gọi `my_organizer_jobs`, vốn là công cụ thống kê toàn bộ job thuộc Organizer. Job chờ duyệt/bị từ chối vì thế xuất hiện trong bước chọn job để matching.
2. Client chỉ gửi văn bản và URL trong lịch sử. Không có bước chọn job có cấu trúc hoặc ngữ cảnh được server xác thực, nên model dễ hỏi lại tên job hoặc gọi lại danh sách tổng quát.
3. Tin nhắn dùng thẻ `<p>` thuần; Markdown không được parse. Retry còn thêm lại câu hỏi đã thất bại.

## Thay đổi logic

- Dùng `organizerMatchJobs` hiện có: đúng Organizer, APPROVED, OPEN, chưa hoàn thành, còn hạn/chưa diễn ra và còn vị trí tính theo Participation đang hiệu lực.
- Không có job hợp lệ: thông báo ngắn và link quản lý job. Một job: tự gọi matching. Nhiều job: trả lựa chọn có ID, tiêu đề và số vị trí còn trống; không đưa danh sách job tổng quát vào bước này.
- Click job gửi action `select_job`; backend xử lý ngay, không gọi model để đoán tên/ID. Cũng hỗ trợ chọn bằng tên hoặc số thứ tự.
- Ngữ cảnh có chữ ký HMAC, gắn ID/vai trò tài khoản và hạn 30 phút. Lưu job đã chọn, các lựa chọn đã cấp và hồ sơ đã hiển thị; không ghi database. Chữ ký dùng server API key đã cấu hình, không trả key sang browser. Khi job đóng/đủ người trong lúc chọn, kiểm tra lại rồi chuyển về các lựa chọn hợp lệ.
- Khi hỏi tiếp, giữ job đã chọn. “Gợi ý tiếp” không lặp các hồ sơ vừa hiển thị; có link catalog giữ đúng job để xem thêm. “Đổi job” tạo bước chọn mới. Thống kê vẫn là ý định riêng.
- Loại công cụ/câu trả lời/card trùng. Retry dùng lại câu hỏi cũ thay vì thêm bản sao. Nếu lựa chọn hết hạn, retry khởi tạo lại luồng chọn hợp lệ.

`my_organizer_jobs` vẫn phục vụ câu hỏi thống kê job của Organizer, gồm các trạng thái thực trong tài khoản; không còn được dùng làm fallback chọn job matching.

## Hiển thị

- `react-markdown@10.1.0` + `remark-gfm@4.0.1`, ghi vào package/lockfile; cài offline từ npm cache do DNS registry không truy cập được.
- Hỗ trợ heading, list, strong/emphasis, bảng GFM, liên kết có nhãn và khoảng cách. `skipHtml`, allowlist tag, kiểm tra URL, không `rehype-raw`/`dangerouslySetInnerHTML`, không hiện URL thô ở Markdown.
- Job/KOL là React Card. Tối đa 6 job chọn bằng nút; danh sách lớn dùng select gọn. Chọn cũ bị vô hiệu sau khi xử lý.
- Giữ cửa sổ, ảnh robot, bong bóng, hiệu ứng đóng/mở và responsive hiện tại.
- Gemini vẫn chọn công cụ cho các ý định cần phân tích; số liệu/điểm vẫn từ kết quả backend và được định dạng có căn cứ. Không dùng text model tự viết để thay số liệu thực.

Tài liệu thư viện: [react-markdown](https://github.com/remarkjs/react-markdown), [remark-gfm](https://github.com/remarkjs/remark-gfm).

## Phạm vi file

`src/services/ai-assistant.ts`, `src/lib/ai/schemas.ts`, `src/lib/ai/assistant-context.ts`, `src/components/ai/floating-chat.tsx`, `chat-markdown.tsx`, `chat-job-choices.tsx`, CSS chatbot, package/lockfile và các test liên quan.

Không sửa `src/lib/ai/matching.ts`, các trọng số hoặc `src/services/recommendations.ts`; không sửa schema, lời mời/ứng tuyển, trang catalog hay các nghiệp vụ khác.

## Kiểm thử

- Unit/service: 0/1/nhiều job, lọc đủ điều kiện/đúng owner, chọn nút/tên/số, hỏi tiếp/thống kê, job thay đổi trong lúc chọn, token giả/khác tài khoản/khác vai trò/hết hạn, bỏ lời đáp trùng.
- UI SSR: heading/list/strong/link/GFM, chặn HTML và URL không an toàn, không hiện URL thô, lựa chọn bằng nút hoặc select, vô hiệu lựa chọn cũ.
- Thêm kịch bản compiled API/MySQL: tự chọn một job, nhiều job có pending/rejected bị loại, chọn rồi tiếp tục, chống dùng context của người khác. Thêm Playwright: mở chat → chọn job → kiểm tra action/token → Markdown/card và overflow desktop/mobile; phản hồi test được mock, không gọi dịch vụ trả phí.

- Kết quả: **96/96 unit test đạt**; `npm run typecheck`, `npm run lint` và `npm run build` đều thành công.
- MySQL hiện tại báo **P1001**, chưa có `TEST_DATABASE_URL`; bộ MySQL/API/trình duyệt chưa chạy. Unit dùng database/provider test double, không thay thế xác nhận end-to-end với database/Gemini thật.
