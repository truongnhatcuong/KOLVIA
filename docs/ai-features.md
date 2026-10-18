# AI Matching & trợ lý KOLVIA

## Kiểm tra kiến trúc hiện có

Đã kiểm tra source, API, Prisma schema/migrations, luồng xác thực, hồ sơ, job, ứng tuyển/lời mời, trạng thái tham gia, thông báo, Homepage và dashboard. Dự án dùng Next.js App Router + Prisma/MySQL, session cookie và kiểm tra vai trò tại service. Hai tính năng mới dùng các cấu trúc này, không thay schema hoặc ghi lại dữ liệu seed.

`KolProfile` có lĩnh vực, kỹ năng, giới thiệu, số năm kinh nghiệm và địa điểm; chưa có báo giá, mức thù lao mong muốn hoặc dữ liệu follower được xác minh. Không tạo các trường này bằng AI. KOL có thể chọn khoảng thù lao trên giao diện để lọc job trong lần tìm hiện tại.

## Giai đoạn 1: Matching

- `/kol/dashboard`: tự tải job gợi ý từ hồ sơ tài khoản hiện tại. Có bộ lọc thù lao tùy chọn.
- `/kols`: Organizer chọn job đã duyệt, đang mở, còn hạn/chưa diễn ra và còn vị trí. Tự chọn job gần nhất khi lần đầu vào trang; chọn “không đối chiếu” để xem catalog thông thường. Điểm xuất hiện trên card KOL, xếp hạng toàn bộ tối đa 200 hồ sơ khớp bộ lọc trước khi phân trang. Xem hồ sơ hoặc gửi lời mời trực tiếp qua hộp thoại/API hiện có. Giữ job đã chọn khi tìm kiếm và phân trang, kể cả lựa chọn không đối chiếu. Khách và các vai trò khác dùng catalog công khai hiện có.
- `/organizer/jobs/[id]`: nút dẫn sang `/kols?matchJob=<id>`, không còn phải xem matching bên trong chi tiết job.
- Dashboard KOL: lời mời chờ phản hồi và gợi ý job dạng card có logo tổ chức, thù lao, thời gian, quyền lợi nếu có, điểm và căn cứ chấm. Lời mời có chấp nhận/từ chối qua API hiện có; job gợi ý dẫn tới trang ứng tuyển. Không thêm follower, tương tác, báo giá KOL, hợp đồng hay thương thảo chưa có trong nghiệp vụ.
- Chỉ xét job công khai đang tuyển, Organizer hoạt động; chỉ xét KOL công khai đang hoạt động. Không gợi ý kết nối đang có đơn/lời mời/tham gia hiệu lực. Roster dùng bộ lọc Participation đang tham gia hiện có, loại bỏ người đã rời.
- Tối đa 200 bản ghi gần nhất mỗi lượt, xếp hạng ổn định và trả tối đa 8 kết quả. Giới hạn này được hiển thị trong UI, không gọi là xếp hạng toàn database.

| Tiêu chí | Trọng số | Căn cứ |
| --- | ---: | --- |
| Lĩnh vực | 30 | So sánh lĩnh vực đã lưu |
| Kỹ năng / nội dung | 25 | Tỷ lệ nhóm kỹ năng được nhắc trong nội dung/yêu cầu và trong kỹ năng/giới thiệu của KOL; từ điển đồng nghĩa có giới hạn |
| Kinh nghiệm | 20 | Số năm trong yêu cầu so với số năm KOL đã khai báo |
| Địa điểm | 15 | Chuẩn hóa các tên TP.HCM/Hồ Chí Minh/Sài Gòn, Hà Nội, Đà Nẵng; job trực tuyến/toàn quốc phù hợp địa điểm |
| Thù lao | 10 | Khoảng ngân sách job giao với khoảng KOL chọn; không suy ra báo giá của KOL |

Điểm = `round(tổng điểm tiêu chí đã đánh giá / tổng trọng số tiêu chí có dữ liệu × 100)`. Tiêu chí không có căn cứ có `points = null` và được bỏ khỏi mẫu số. UI luôn hiển thị trọng số có dữ liệu và bảng giải thích để một hồ sơ ít thông tin không bị hiểu là đã được đánh giá đầy đủ. Điểm không phải xác suất trúng tuyển. Gemini không được tạo/sửa điểm; giải thích matching lấy trực tiếp từ căn cứ của bộ chấm điểm, nên không cần gọi AI cho mỗi thẻ.

File: `src/lib/ai/matching.ts`, `schemas.ts`, `src/services/recommendations.ts`, `kol-offers.ts`, `/api/ai/recommendations`, `src/components/ai/recommendations-panel.tsx`, `match-details.tsx`, `job-match-select.tsx`, `src/components/kol/job-offer-card.tsx`, catalog KOL, Dashboard KOL, thẻ KOL, bộ lọc/phân trang và chi tiết job Organizer. `jobSummary` trong collaborations được bổ sung trường có sẵn để hiển thị và chấm lời mời; schema database giữ nguyên.

## Giai đoạn 2: Gemini Tool Calling

`.env` hiện có `API_KEY_AI`, `AI_CHAT_BASE_URL`, `AI_MODEL=gemini-3-flash`. Đã giữ nguyên key, endpoint và model. Endpoint hiện tại là gateway tương thích Chat Completions; dùng REST phía server với `tools` và `tool_choice=required`, không cần thêm SDK. Model/endpoint phải được gateway hỗ trợ; không âm thầm đổi model khi lỗi. Khi chuyển sang endpoint Google trực tiếp, cấu hình mã model thực được Google hỗ trợ cho tài khoản, không mặc định rằng alias của gateway cũng tồn tại tại Google.

Tài liệu giao thức: [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai), [Function Calling](https://ai.google.dev/gemini-api/docs/generate-content/function-calling).

Gemini phân tích câu hỏi và chọn công cụ. Backend xác thực role/owner lại, validate từng tham số, đọc DB và định dạng câu trả lời. Không hiển thị text hoặc số liệu do model tự tạo. Một lượt gọi model, tối đa 3 công cụ đọc; không có công cụ gửi lời mời, sửa, xóa hoặc phê duyệt. Toàn bộ điểm, số lượng và các thẻ liên kết lấy từ Backend.

| Công cụ | Quyền / phạm vi |
| --- | --- |
| get_help | Hướng dẫn sản phẩm, mọi vai trò |
| require_login | Khách hỏi dữ liệu riêng tư |
| search_public_jobs | Job đã kiểm duyệt đang tuyển; tối đa 100 bản ghi trước khi lọc vị trí/chỗ trống, trả 6 |
| search_public_kols | Hồ sơ công khai; tối đa 100 bản ghi trước khi lọc vị trí, trả 6; không email, báo giá hoặc hồ sơ riêng |
| my_kol_activity | KOL hiện tại; số đơn lịch sử/đang chờ, tham gia hiệu lực và lời mời đang chờ |
| my_organizer_jobs | Chỉ job thuộc Organizer hiện tại; tổng số trong phạm vi và 8 job gần nhất cùng số người tham gia |
| my_recommendations | KOL hiện tại hoặc job thuộc Organizer; nếu chưa chọn job, yêu cầu chọn từ danh sách của mình |
| admin_overview | Chỉ Admin; thống kê giống dashboard, số tài khoản gồm cả tài khoản đã khóa |

Không gửi toàn database, email, password hash hoặc session sang AI. Context tối đa 6 tin × 1.000 ký tự; câu hỏi tối đa 1.000 ký tự, output tool plan tối đa 1.000 token. Link kết quả cũ được đưa vào context để chọn đúng job cho câu hỏi tiếp theo, nhưng backend vẫn kiểm tra ownership. Timeout provider 20 giây, timeout client 30 giây; lỗi trả thông báo ngắn, không lộ response/key provider, không tạo số liệu thay thế.

Giới hạn chi phí trong một process: 20 yêu cầu/5 phút theo tài khoản hoặc địa chỉ khách, và 100 yêu cầu/phút toàn process; dọn TTL, không giữ định danh dạng plaintext. Phù hợp demo một instance. Triển khai nhiều instance cần limiter dùng kho chia sẻ và cấu hình trusted proxy cho IP khách. Rate limiter nằm trong bộ nhớ, không ghi nghiệp vụ/database.

File: `src/lib/ai/gemini.ts`, `rate-limit.ts`, `src/services/ai-assistant.ts`, `/api/ai/chat`. API POST dùng kiểm tra Origin hiện có. API GET matching dùng session và role guard. Các biến AI chỉ dùng phía server.

## Giai đoạn 3: giao diện

Bong bóng chỉ gắn ở Homepage, góc dưới phải. Popup có quick questions theo role, input, tin nhắn/thẻ kết quả, loading, lỗi/thử lại, đóng/thu nhỏ/mở lại giữ hội thoại trong bộ nhớ. Escape đóng; có label/accessibility, hỗ trợ mobile, safe area và reduced motion. Giữ layout Homepage hiện có. Toast thông báo trên Homepage chuyển sang trái để tránh đè nút chat.

File: `src/components/ai/floating-chat.tsx`, Homepage, `globals.css`, `notification-bell.tsx`. Không lưu chat vào database/localStorage.

## Giai đoạn 4: kiểm thử & tình trạng kết nối

- Unit/service tests: matching, dữ liệu thiếu, alias địa điểm, ngân sách, giới hạn context, role/tool allowlist, owner, số liệu thực từ test double, loại bỏ text bịa của model, private projection, lỗi provider, quota và matching/lời mời. Fetch provider được mock, không dùng key thật cho fixtures.
- `tests/routes.test.mjs`: thêm luồng MySQL/compiled API từ hồ sơ → job được duyệt → matching → chatbot theo quyền → gửi lời mời thủ công → loại khỏi gợi ý. Kiểm tra Origin, cookie/role, không ghi nghiệp vụ khi chat và số liệu thực. Provider trong bộ này được mock.
- `scripts/browser-check.mjs`: thêm kiểm tra mở chat, hỏi, hiển thị phản hồi/link, thu nhỏ/mở lại giữ nội dung, đóng và overflow desktop/mobile. Phản hồi chatbot là fixture cục bộ chỉ trong test.

Build/TypeScript/lint đã đạt sau cập nhật catalog và Dashboard KOL. **84/84 unit test đạt**, gồm kiểm tra xếp hạng catalog trước phân trang, job được chọn thuộc Organizer, giữ lựa chọn không matching, chấm lời mời theo hồ sơ hiện tại và trạng thái nút chấp nhận lời mời. Kiểm thử backend mới dùng database test double; chưa thay thế kiểm thử MySQL thật.

MySQL thực hiện tại báo **P1001**, không truy vấn được database thực. Test database riêng chưa được cấu hình, nên bộ API/MySQL/trình duyệt chưa chạy. Smoke test Gemini với câu hỏi hướng dẫn công khai thất bại kết nối gateway; không gửi dữ liệu cá nhân trong smoke test. Vì vậy chưa xác nhận end-to-end với key/model thật trong môi trường này.

Khi kết nối hoạt động: `npm run dev`; vào Homepage thử chat và vào Dashboard/chi tiết job thử matching. Kiểm thử độc lập: `npm run test:unit`; cấu hình `TEST_DATABASE_URL` riêng rồi `npm run test:api` và `npm run test:browser`. Không cần migration mới cho hai tính năng AI; các migration nghiệp vụ trước vẫn cần được áp dụng nếu database chưa cập nhật.
