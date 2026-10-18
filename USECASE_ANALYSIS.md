# PHÂN TÍCH USE CASE HỆ THỐNG KOLVIA

**Ngày khảo sát:** 18/10/2026.  
**Mục đích:** Cung cấp căn cứ xác định Actor, Use Case và quan hệ UML cho báo cáo đồ án; không tạo sơ đồ trong tài liệu này.

## 1. Phạm vi khảo sát và cách đọc tài liệu

Tài liệu đối chiếu các trang, thành phần giao diện, API, service nghiệp vụ, phân quyền, truy vấn Prisma, schema, migration, dữ liệu khởi tạo, công cụ vận hành và các kịch bản kiểm thử trong dự án. Cấu trúc hiện tại có **163 tệp TypeScript/TSX trong `src`, 28 trang `page.tsx`, 36 tệp API `route.ts`, 14 model Prisma và 3 migration MySQL**. Thư viện cài đặt, kết quả biên dịch, bộ nhớ đệm và tài nguyên ảnh không được coi là chức năng nghiệp vụ riêng.

**Giới hạn xác minh database:** Đã thử kết nối chỉ đọc bằng Prisma với `DATABASE_URL` đang cấu hình. Kết quả là `PrismaClientInitializationError`, mã **`P1001` — không kết nối được máy chủ database**. Vì vậy:

- Các bảng, trường, ràng buộc và trạng thái dưới đây được xác định từ **schema và SQL migration hiện có**, cùng cách service đọc/ghi dữ liệu.
- Chưa xác minh được cấu trúc bảng đang tồn tại trên máy chủ, lịch sử migration đã áp dụng, số lượng bản ghi hoặc dữ liệu nghiệp vụ hiện hành. Dữ liệu seed chỉ chứng minh kịch bản khởi tạo, không chứng minh dữ liệu đó đã tồn tại trên database đang chạy.
- Không khẳng định chức năng đã vận hành thành công với MySQL, Gemini, UploadThing hoặc Pusher thật chỉ vì có code hay có bài kiểm thử.
- Trong lần khảo sát này không chạy migration, seed, công cụ đặt lại Admin, ứng dụng development hoặc bộ kiểm thử tạo/ghi database. Chỉ bổ sung tài liệu này.

### 1.1. Quy ước trạng thái

| Ký hiệu | Ý nghĩa trong tài liệu | Giới hạn kết luận |
| --- | --- | --- |
| **HT** | Đã triển khai trong source: có đường đi giao diện và logic xử lý tương ứng | Không đồng nghĩa đã kiểm thử thành công trên hệ thống đang vận hành |
| **ĐK** | Đã có code tích hợp, cần dịch vụ/cấu hình ngoài để sử dụng đầy đủ | Chưa xác minh kết nối dịch vụ thật trong lần khảo sát |
| **MP** | Mới có một phần khả năng sử dụng, ví dụ có API nhưng chưa có thao tác trên giao diện | Không suy ra nhóm phát triển đang thực hiện công việc này |
| **CĐ** | Chưa tìm thấy triển khai trong phạm vi source/schema hiện tại | Không đưa vào sơ đồ mô tả chức năng đã có |

Các mã UC là **đề xuất phân rã để nghiên cứu**, không phải mã có sẵn trong chương trình. Một UC có thể dùng nhiều API; một API cũng có thể phục vụ nhiều UC. Các thao tác nhỏ cùng mục tiêu, như phân trang hoặc chọn bộ lọc, được mô tả trong UC tương ứng.

### 1.2. Danh mục bằng chứng dùng trong các bảng

Các ký hiệu S01–S16 dưới đây dẫn tới tệp nguồn thực tế, giúp bảng chức năng không phải lặp lại đường dẫn dài.

| Mã nguồn tham chiếu | Tệp và nội dung cần đối chiếu |
| --- | --- |
| **S01** | `prisma/schema.prisma`; `prisma/migrations/202610120004_mysql_initial/migration.sql`; `prisma/migrations/202610120006_mysql_features/migration.sql`; `prisma/migrations/202610140001_withdrawals/migration.sql`: cấu trúc dữ liệu, trạng thái, ràng buộc |
| **S02** | `src/services/auth.ts`; `src/lib/auth/session.ts`; `src/lib/auth/password.ts`: đăng ký, đăng nhập, đổi mật khẩu, phiên đăng nhập |
| **S03** | `src/lib/permissions/guards.ts`; `src/lib/validations/index.ts`; `src/lib/http.ts`; `src/lib/request-origin.ts`; `src/proxy.ts`: vai trò, chủ sở hữu, điều kiện đầu vào và bảo vệ yêu cầu |
| **S04** | `src/lib/db/queries.ts`: danh sách/chi tiết công khai, bộ lọc, thống kê trang chủ |
| **S05** | `src/services/profiles.ts`; `src/components/kol/profile-form.tsx`; `src/lib/profile-samples.ts`; `src/lib/social-embeds.ts`; `src/components/kol/social-post-input.tsx`; `src/components/customer/social-embed.tsx`: hồ sơ, nội dung mẫu và mạng xã hội |
| **S06** | `src/services/jobs.ts`; `src/components/organizer/job-form.tsx`; `src/components/organizer/job-table.tsx`: quản lý Job |
| **S07** | `src/services/admin.ts`; `src/components/admin/jobs.tsx`; `src/components/admin/activity-chart.tsx`: quản trị, kiểm duyệt, biểu đồ |
| **S08** | `src/services/collaborations.ts`; `src/components/collaboration-list.tsx`: ứng tuyển, lời mời, xử lý phản hồi và lịch sử đơn |
| **S09** | `src/lib/db/recruitment.ts`; `src/lib/db/participation.ts`: xác nhận tham gia và cách tính số chỗ |
| **S10** | `src/services/withdrawals.ts`; `src/lib/withdrawal-policy.ts`; `src/components/withdrawal-controls.tsx`; `src/components/withdrawal-list.tsx`: yêu cầu rút, xét duyệt, xác nhận rời |
| **S11** | `src/services/dashboard.ts`; `src/services/kol-offers.ts`: tổng quan theo vai trò, lịch sử tham gia và thẻ lời mời |
| **S12** | `src/services/notifications.ts`; `src/components/notification-bell.tsx`; `src/lib/realtime/pusher.ts`; `src/lib/realtime/transaction.ts`; `src/lib/realtime/channels.ts`: hộp thông báo và cập nhật tức thời |
| **S13** | `src/services/media.ts`; `src/lib/validations/media.ts`; `src/app/api/uploadthing/core.ts`; `src/components/ui/image-upload.tsx`; `src/lib/uploadthing/server.ts`: quản lý ảnh và UploadThing |
| **S14** | `src/services/recommendations.ts`; `src/lib/ai/matching.ts`; `src/components/ai/recommendations-panel.tsx`; `src/components/ai/match-details.tsx`: gợi ý và chấm điểm phù hợp |
| **S15** | `src/services/ai-assistant.ts`; `src/components/ai/floating-chat.tsx`; `src/components/ai/chat-job-choices.tsx`; `src/types/ai-assistant.ts`: trợ lý hội thoại và dữ liệu theo quyền |
| **S16** | `src/lib/ai/gemini.ts`; `src/lib/ai/schemas.ts`; `src/lib/ai/rate-limit.ts`; `src/lib/ai/assistant-context.ts`: kết nối mô hình, giới hạn yêu cầu, ngữ cảnh hội thoại |

## 2. Tổng quan hệ thống

### 2.1. Mục đích và ranh giới nghiệp vụ

KOLVIA là nền tảng kết nối **KOL/KOC với nhà tổ chức sự kiện hoặc công việc hợp tác**. Nhà tổ chức đăng nhu cầu dưới dạng **Job**, Admin kiểm duyệt trước khi công khai, KOL ứng tuyển hoặc nhận lời mời, sau đó hệ thống ghi nhận người đã xác nhận tham gia. KOL có thể yêu cầu rút khỏi một hợp tác đã xác nhận; nhà tổ chức xử lý yêu cầu và hệ thống giữ lịch sử.

| Nhóm nghiệp vụ | Kết quả hệ thống cung cấp |
| --- | --- |
| Khám phá công khai | Xem thông tin nền tảng, tìm Job đang tuyển, tìm hồ sơ KOL công khai |
| Tài khoản và hồ sơ | Đăng ký theo vai trò, đăng nhập, đổi mật khẩu, cập nhật hồ sơ và ảnh |
| Tuyển KOL cho Job | Tạo bản nháp, gửi kiểm duyệt, xét duyệt, mở/đóng tuyển, hoàn thành, xóa hoặc lưu trữ |
| Kết nối hai phía | Gửi đơn ứng tuyển; nhà tổ chức mời KOL; chấp nhận hoặc từ chối; ghi nhận tham gia |
| Hủy và rút tham gia | Hủy đơn đang chờ; gửi yêu cầu rút sau xác nhận; chấp thuận/từ chối; ghi nhận rời khi không được chấp thuận |
| Theo dõi và quản trị | Tổng quan, lịch sử, thông báo, thống kê hoạt động và khóa/mở tài khoản |
| Hỗ trợ lựa chọn bằng AI | Xếp hạng phù hợp từ dữ liệu hồ sơ/Job; chatbot tra cứu thông tin và hướng dẫn theo quyền |

**Job và sự kiện không phải hai phân hệ độc lập.** `Job` lưu cả công việc hợp tác, thời điểm sự kiện, hạn tuyển, ngân sách và số người cần tuyển. Chưa có model `Event` riêng. “Brand”, “nhãn hàng”, “nhà tổ chức” xuất hiện ở giao diện nhưng cùng vai trò `ORGANIZER`. “Creator”, “KOL”, “KOC” cùng vai trò `KOL`.

Kiến trúc triển khai là Next.js App Router, React/TypeScript và Prisma với nguồn dữ liệu `mysql`. Một số trang phía máy chủ gọi trực tiếp service/truy vấn; do đó không phải chức năng nào cũng có API GET riêng. Tham chiếu: `package.json`, S01, S04–S16.

### 2.2. Quy trình hoạt động chính

1. Khách khám phá Job/KOL, đăng ký một trong hai vai trò hoặc đăng nhập bằng tài khoản có sẵn.
2. KOL hoàn thiện hồ sơ; bật công khai để xuất hiện trong danh sách và có thể nhận lời mời mới. Organizer cập nhật thông tin tổ chức.
3. Organizer tạo Job bản nháp, kiểm tra nội dung và gửi Admin kiểm duyệt.
4. Admin duyệt hoặc từ chối; Job được duyệt chỉ xuất hiện công khai khi vẫn thỏa điều kiện tuyển.
5. KOL gửi đơn và Organizer xét duyệt, hoặc Organizer gửi lời mời và KOL phản hồi.
6. Khi một phía chấp nhận đúng luồng, hệ thống xác nhận tham gia, bảo đảm không vượt chỉ tiêu tuyển.
7. Các bên theo dõi kết nối, lịch sử và thông báo; có thể xử lý rút tham gia trước khi Job hoàn thành.
8. Organizer quản lý trạng thái Job và đánh dấu hoàn thành thủ công; Admin có các quyền quản trị Job tương ứng ở phạm vi hệ thống.

AI là kênh hỗ trợ tìm kiếm và lựa chọn trong các bước trên. Chatbot không tự gửi đơn, gửi lời mời hoặc phê duyệt.

## 3. Danh sách Actor

### 3.1. Actor con người có bằng chứng trong hệ thống

| Actor | Căn cứ tồn tại | Mục tiêu và giới hạn |
| --- | --- | --- |
| **Guest — Khách chưa đăng nhập** | `currentActor()` trả `null`; trang công khai không yêu cầu phiên; chatbot dùng nhãn `GUEST` | Khám phá dữ liệu công khai, xem hướng dẫn, đăng ký/đăng nhập; không xem dữ liệu cá nhân |
| **KOL/KOC** | `Role.KOL`; có `KolProfile` | Xây dựng hồ sơ, tìm cơ hội, ứng tuyển, phản hồi lời mời, theo dõi và rút tham gia của mình |
| **Organizer — Nhà tổ chức** | `Role.ORGANIZER`; có `OrganizerProfile`; `Job.organizerId` | Đăng và quản lý Job của mình, tuyển/mời KOL, xử lý đơn và yêu cầu rút thuộc Job của mình |
| **Admin — Quản trị viên** | `Role.ADMIN`; `authorize(..., ["ADMIN"])` | Kiểm duyệt Job, quản trị tài khoản KOL/Organizer, theo dõi toàn hệ thống và quản lý trạng thái Job |

**Không có vai trò KOC, Brand, doanh nghiệp, nhân viên duyệt rút hoặc siêu quản trị riêng trong enum `Role`.** Tài khoản bị khóa là trạng thái `User.active = false`, không phải Actor mới. Mỗi `User` có một trường `role`, không có cơ chế một tài khoản đồng thời mang nhiều vai trò hay tự chuyển vai trò. Admin cũng không mặc nhiên được dùng mọi chức năng của KOL/Organizer.

### 3.2. Actor hệ thống ngoài

Các Actor sau chỉ cần đưa vào sơ đồ nếu chọn ranh giới bao gồm tương tác với dịch vụ ngoài.

| Actor phụ | Tương tác thực tế | UC liên quan và giới hạn |
| --- | --- | --- |
| **Dịch vụ AI tương thích Gemini** | Backend gửi câu hỏi/ngữ cảnh và danh sách công cụ được phép; nhận yêu cầu gọi công cụ | UC08; S15–S16. Endpoint cấu hình được; không khẳng định mọi môi trường đều gọi trực tiếp Google. Dịch vụ này không tính điểm matching |
| **UploadThing** | Cấp luồng tải ảnh, lưu tệp và gọi lại để ghi thông tin ảnh; hỗ trợ xóa tệp | UC17, UC32, UC38; S13. Cần `UPLOADTHING_TOKEN` |
| **Pusher Channels** | Phát sự kiện trên kênh riêng để trình duyệt tải lại thông báo theo tài khoản | UC11–UC12; S12. Cần cấu hình Pusher, có cơ chế kiểm tra định kỳ dự phòng |
| **Nền tảng nội dung mạng xã hội** | Trình duyệt mở liên kết hoặc tải khung nhúng TikTok/Facebook/YouTube; Instagram có liên kết kênh | UC05, UC16; S05. Không có đăng nhập OAuth, đồng bộ hồ sơ hay lấy thống kê qua API mạng xã hội |

MySQL/Prisma, bộ xác thực, bộ đếm số chỗ, bộ chấm điểm và chatbot nội bộ là thành phần triển khai bên trong ranh giới KOLVIA, không phải Actor nghiệp vụ độc lập. Công cụ dòng lệnh tạo Admin/seed/dọn ảnh được liệt kê ở phần 9; chưa đủ căn cứ tạo thêm Actor nghiệp vụ “nhân viên vận hành” trong sơ đồ ứng dụng web.

## 4. Danh mục chức năng theo Actor

Các chức năng công khai UC01–UC05 và UC08 cũng dùng được khi đã đăng nhập. KOL, Organizer và Admin cùng dùng UC09–UC12. Không cần vẽ lặp lại các UC chung cho mỗi vai trò.

### 4.1. Chức năng công khai và Guest

| Mã | Use Case | Mục đích và phạm vi đã triển khai | Trang/API và bằng chứng | Trạng thái |
| --- | --- | --- | --- | --- |
| **UC01** | Xem giới thiệu và tổng quan công khai | Đọc giới thiệu, quy trình kết nối, số KOL công khai, Organizer hoạt động, Job đang tuyển và lượt tham gia đang hiệu lực; xem Job/KOL mới nhất | `/`, `/#how-it-works`; `src/app/(customer)/page.tsx`; S04: `publicStats`, `publicJobs`, `publicKols` | HT |
| **UC02** | Tìm kiếm và xem danh sách Job | Tìm trong tiêu đề/mô tả; lọc lĩnh vực, địa điểm, khoảng ngân sách giao nhau, khoảng ngày sự kiện; sắp xếp mới nhất/tên/hạn/ngân sách; phân trang | `/jobs`; `GET /api/jobs`; S04: `publicJobs`; `src/components/customer/search.tsx` | HT |
| **UC03** | Xem chi tiết Job | Xem nội dung, yêu cầu, quyền lợi, ngân sách, lịch, tổ chức, ảnh và số người đã xác nhận; người có liên quan được xem lại Job theo quyền | `/jobs/[id]`; `GET /api/jobs/[id]` chỉ cung cấp bản công khai; S06: `jobForViewer`; S04: `publicJob` | HT |
| **UC04** | Tìm kiếm và xem danh sách KOL | Tìm theo tên; lọc lĩnh vực, địa điểm, nền tảng kênh, kỹ năng và kinh nghiệm tối thiểu; sắp xếp mới nhất/tên; phân trang | `/kols`; `GET /api/kols`; S04: `publicKols`, `publicKolWhere` | HT |
| **UC05** | Xem hồ sơ KOL | Xem giới thiệu, kỹ năng, kinh nghiệm, ảnh, portfolio, kênh và nội dung chia sẻ; mở liên kết/khung nhúng được hỗ trợ | `/kols/[id]`; `GET /api/kols/[id]` chỉ trả hồ sơ công khai; S05: `kolForViewer`; S04: `publicKol` | HT; khung nhúng phụ thuộc nền tảng |
| **UC06** | Đăng ký tài khoản | Chọn KOL hoặc Organizer, nhập tên/email/mật khẩu; tạo hồ sơ theo vai trò và bắt đầu phiên đăng nhập | `/register`, `/register?role=ORGANIZER`; `POST /api/auth/register`; S02: `register`, `createSession` | HT |
| **UC07** | Đăng nhập | Xác thực email/mật khẩu, kiểm tra tài khoản hoạt động và điều hướng tới không gian theo vai trò | `/login`; `POST /api/auth/login`; S02: `login`, `createSession`; `src/types/index.ts` | HT |
| **UC08** | Tra cứu và nhận hướng dẫn qua trợ lý AI | Hỏi cách dùng, tìm Job/KOL công khai; người đã đăng nhập còn hỏi thông tin và gợi ý theo quyền, chi tiết ở phần 7.2 | Bong bóng chat **chỉ gắn ở `/`**; `POST /api/ai/chat`; S15: `chatAssistant`, `executeAssistantTool`; S16 | ĐK |

Lưu ý UC02: truy vấn danh sách công khai chưa loại Job đủ người khỏi kết quả; thẻ có nhãn “Đủ số lượng”, và thao tác ứng tuyển bị chặn khi hết chỗ. Lưu ý UC04: dù ô tìm kiếm có lời gợi ý nhắc lĩnh vực, tham số `q` thực tế chỉ tìm tên KOL; lĩnh vực dùng bộ lọc `category` riêng.

### 4.2. Chức năng chung cho người dùng đã đăng nhập

| Mã | Use Case | Mục đích và phạm vi đã triển khai | Trang/API và bằng chứng | Trạng thái |
| --- | --- | --- | --- | --- |
| **UC09** | Đăng xuất | Kết thúc phiên hiện tại và trở về trang đăng nhập | Menu tài khoản/thanh điều hướng; `POST /api/auth/logout`; S02: `destroySession` | HT |
| **UC10** | Đổi mật khẩu | Nhập mật khẩu hiện tại, mật khẩu mới và xác nhận; thành công thì kết thúc mọi phiên của chính tài khoản, yêu cầu đăng nhập lại | `/account/security`; `PATCH /api/auth/password`; S02: `changePassword`; `src/components/account/password-settings.tsx` | HT |
| **UC11** | Theo dõi và xem thông báo cá nhân | Xem danh sách 20 thông báo/trang, số chưa đọc và liên kết nghiệp vụ; nhận cập nhật qua chuông, nhắc thông báo mới | `/notifications`; `GET /api/notifications`, `?summary=1`; S12: `notifications`, `notificationUnread` | HT; cập nhật qua Pusher: ĐK |
| **UC12** | Đánh dấu thông báo đã đọc | Đánh dấu một thông báo hoặc toàn bộ thông báo của mình; cập nhật số chưa đọc | `/notifications`; `PATCH /api/notifications/[id]` hoặc `PATCH /api/notifications`, `{read:true}`; S12: `readNotification` | HT |

UC07 áp dụng cho tài khoản của cả ba vai trò, gồm Admin đã được tạo sẵn. Guest không đăng ký được Admin. API `GET /api/auth/session` phục vụ nhận diện phiên, không phải một UC nghiệp vụ riêng.

### 4.3. KOL/KOC

KOL dùng thêm UC01–UC05, UC08–UC12 trong phạm vi quyền tương ứng.

| Mã | Use Case | Mục đích và phạm vi đã triển khai | Trang/API và bằng chứng | Trạng thái |
| --- | --- | --- | --- | --- |
| **UC13** | Xem tổng quan hoạt động KOL | Xem số đơn, đơn chờ, lời mời chờ, hợp tác hiệu lực, đơn gần đây, lời mời mới và lịch hợp tác | `/kol/dashboard`; S11: `overview`, `confirmedJobs`, `kolInvitationCards`; S08 | HT |
| **UC14** | Cập nhật hồ sơ cá nhân | Sửa tên, giới thiệu, lĩnh vực, địa điểm, kỹ năng, số năm kinh nghiệm; có nút điền thông tin mẫu vào ô còn trống để xem lại trước khi lưu | `/kol/profile`; `GET/PATCH /api/profiles/kol`; S05: `kolProfileForEdit`, `updateKolProfile`, `fillMissingProfileValues` | HT |
| **UC15** | Thiết lập công khai hồ sơ | Bật/tắt khả năng xuất hiện trong danh sách công khai và nhận lời mời mới từ Organizer | `/kol/profile`; `PATCH /api/profiles/kol`, trường `isPublic`; S01, S04, S05, S08 | HT |
| **UC16** | Quản lý kênh và nội dung mạng xã hội | Lưu/thay/xóa liên kết kênh TikTok/Facebook/Instagram/YouTube; lưu một nội dung cho mỗi TikTok/Facebook/YouTube; nhận URL hoặc mã nhúng rồi trích URL, xem trước và mở nội dung gốc | `/kol/profile`, kết quả ở `/kols/[id]`; `PATCH /api/profiles/kol`; S05; `src/components/kol/social-content-tabs.tsx` | HT; hiển thị ngoài phụ thuộc nền tảng |
| **UC17** | Quản lý ảnh và portfolio | Thêm/thay/xóa avatar, ảnh bìa, tối đa 6 ảnh portfolio; xem trước ảnh trước khi lưu; chủ hồ sơ công khai có thể thay avatar/bìa tại chính trang hồ sơ | `/kol/profile`, `/kols/[id]` của mình; `/api/uploadthing`; `DELETE /api/media/[id]`; S13 | ĐK |
| **UC18** | Theo dõi đơn ứng tuyển và lịch sử đăng ký | Xem đơn của mình, tìm theo tên Job/KOL và lọc trạng thái; xem lời giới thiệu, kết quả, lịch sử gửi/hủy/gửi lại/duyệt/rời | `/kol/applications`; `GET /api/applications`; S08: `applications`; `CollaborationList` | HT |
| **UC19** | Ứng tuyển Job | Gửi lời giới thiệu cho Job đang tuyển còn chỗ; được gửi lại nếu đơn cũ là `WITHDRAWN`, giữ lịch sử cũ | `/jobs/[id]`; `POST /api/applications`; S08: `applyToJob` | HT |
| **UC20** | Hủy đơn ứng tuyển đang chờ | Rút đơn `PENDING` của mình sau xác nhận; không dùng để rời một tham gia đã xác nhận | `/kol/applications` và danh sách đơn trên tổng quan; `PATCH /api/applications/[id]`, `WITHDRAWN`; S08: `decideApplication` | HT |
| **UC21** | Theo dõi lời mời hợp tác | Xem nội dung lời mời của mình, thông tin Job và trạng thái; tìm/lọc; tổng quan còn có thẻ lời mời kèm điểm phù hợp | `/kol/invitations`, `/kol/dashboard`; `GET /api/invitations`; S08: `invitations`; S11: `kolInvitationCards` | HT |
| **UC22** | Chấp nhận lời mời tham gia | Chấp nhận lời mời `PENDING`; Job phải đủ điều kiện tuyển; hệ thống ghi nhận tham gia theo UC66 | `/kol/invitations`, `/kol/dashboard`; `PATCH /api/invitations/[id]`, `ACCEPTED`; S08: `respondInvitation`; S09 | HT |
| **UC23** | Từ chối lời mời | Phản hồi `DECLINED` cho lời mời `PENDING` của mình, thông báo Organizer | `/kol/invitations`, `/kol/dashboard`; `PATCH /api/invitations/[id]`; S08: `respondInvitation` | HT |
| **UC24** | Xem Job đã xác nhận và lịch sử tham gia | Xem nguồn tham gia, trạng thái, lịch sự kiện, mốc xác nhận/rời và Job đã hoàn thành/đã rời | `/kol/jobs`; S11: `confirmedJobs`; không có API GET riêng cho danh sách này | HT |
| **UC25** | Yêu cầu rút sau khi đã xác nhận | Gửi lý do rút từ một tham gia `CONFIRMED`; chờ Organizer xử lý, vẫn giữ chỗ | `/kol/jobs` hoặc đơn/lời mời `ACCEPTED`; `POST /api/withdrawals`; S10: `requestWithdrawal` | HT |
| **UC26** | Theo dõi yêu cầu rút và lịch sử rời | Xem/lọc trạng thái; đọc lý do, thời điểm gửi, thời điểm sự kiện được chụp khi gửi, phản hồi, người duyệt và thời điểm rời | `/kol/withdrawals`; `GET /api/withdrawals`; S10: `withdrawals` | HT |
| **UC27** | Xác nhận rời khi yêu cầu rút bị từ chối | Sau quyết định từ chối, KOL xác nhận vẫn rời; ghi nhận rời không được chấp thuận và giải phóng chỗ | `/kol/withdrawals` và các vị trí dùng `WithdrawalControls`; `POST /api/withdrawals/[id]/depart`, `{confirm:true}`; S10: `confirmDeparture` | HT |
| **UC28** | Nhận gợi ý Job theo hồ sơ | Nhận danh sách xếp hạng theo dữ liệu cá nhân; lọc khoảng thù lao, làm mới và mở Job để tự ứng tuyển | `/kol/dashboard`; `GET /api/ai/recommendations`; cũng truy cập qua UC08; S14: `recommendations` | HT; matching không cần Gemini |
| **UC29** | Xem căn cứ điểm phù hợp | Xem điểm, lý do, trọng số có dữ liệu và tiêu chí thiếu dữ liệu; dùng chung cho KOL và Organizer | Gợi ý KOL, thẻ lời mời ở tổng quan, catalog KOL khi đối chiếu Job; S14: `MatchDetails`, `scoreMatch` | HT |

Nút “Điền thông tin mẫu” là nhánh hỗ trợ UC14; chưa lưu database cho đến khi người dùng bấm lưu. Nội dung mẫu và liên kết công khai trong `prisma/profile-fixtures.ts`, `src/lib/profile-samples.ts` không chứng minh kỹ năng, kinh nghiệm hay quyền sở hữu kênh của người dùng đã được xác minh.

### 4.4. Organizer — Nhà tổ chức

Organizer dùng thêm UC01–UC05, UC08–UC12 và UC29. Việc đọc hồ sơ riêng tư có liên quan được giải thích ở phần 5.1.

| Mã | Use Case | Mục đích và phạm vi đã triển khai | Trang/API và bằng chứng | Trạng thái |
| --- | --- | --- | --- | --- |
| **UC30** | Xem tổng quan hoạt động tổ chức | Xem Job mở/chờ duyệt, ứng viên chờ, người đã xác nhận, Job gần đây và ứng viên cần xử lý | `/organizer/dashboard`; S11: `overview`; S06: `ownJobs`; S08: `applications` | HT |
| **UC31** | Cập nhật hồ sơ tổ chức | Sửa tên đại diện, tên tổ chức, giới thiệu, địa điểm và website HTTPS | `/organizer/profile`; `GET/PATCH /api/profiles/organizer`; S05: `organizerProfileForEdit`, `updateOrganizerProfile` | HT |
| **UC32** | Quản lý ảnh nhận diện tổ chức | Thêm/thay/xóa avatar đại diện, ảnh bìa và logo; mỗi loại có ảnh hiện hành riêng | `/organizer/profile`; `/api/uploadthing`; `DELETE /api/media/[id]`; S13; `src/components/organizer/profile-header.tsx` | ĐK |
| **UC33** | Tìm và quản lý danh sách Job của mình | Xem Job theo quyền sở hữu; tìm tiêu đề/địa điểm, lọc kiểm duyệt/trạng thái; phân trang 8 Job/trang | `/organizer/jobs`; S06: `ownJobPage`; `GET /api/jobs?scope=mine` trả danh sách của mình nhưng không dùng bộ phân trang này | HT |
| **UC34** | Xem chi tiết Job của mình | Xem nội dung, ghi chú kiểm duyệt, lịch, ảnh, số chỗ và các khu vực quản lý người tham gia/yêu cầu rút | `/organizer/jobs/[id]`; `GET /api/jobs/[id]?scope=mine`; S06: `ownJob` | HT |
| **UC35** | Tạo Job bản nháp | Nhập thông tin chung, mô tả, yêu cầu, quyền lợi, số người, ngân sách và lịch qua các bước; xem lại rồi lưu nháp | `/organizer/jobs/new`; `POST /api/jobs`; S06: `createJob`; `JobForm` | HT |
| **UC36** | Chỉnh sửa nội dung Job | Sửa Job chưa hoàn thành/lưu trữ; không giảm chỉ tiêu dưới số người còn tham gia; Job đã gửi/duyệt chuyển về chờ kiểm duyệt | `/organizer/jobs/[id]/edit`; `PATCH /api/jobs/[id]`; S06: `updateJob` | HT |
| **UC37** | Gửi Job kiểm duyệt hoặc gửi lại | Gửi Job `DRAFT`/`REJECTED` đang mở và còn hạn; báo cho Admin hoạt động | Danh sách/chi tiết Job; `POST /api/jobs/[id]/submit`; S06: `submitJob` | HT |
| **UC38** | Quản lý ảnh bìa Job | Thêm/thay/xóa ảnh bìa cho Job của mình; đổi ảnh của Job đã duyệt làm Job chờ duyệt lại | Trang chi tiết/chỉnh sửa Job; `/api/uploadthing`, `DELETE /api/media/[id]`; S13: `recordUpload`, `detachMedia` | ĐK |
| **UC39** | Đóng tuyển Job | Ngừng nhận thêm ứng tuyển/lời mời/chấp nhận mới bằng trạng thái `CLOSED` | `/organizer/jobs`; `PATCH /api/jobs/[id]/status`; S06: `setJobStatus` | HT |
| **UC40** | Mở tuyển lại Job | Chuyển Job chưa hoàn thành/lưu trữ về `OPEN` nếu hạn tuyển còn trong tương lai; công khai vẫn cần được duyệt | `/organizer/jobs`; `PATCH /api/jobs/[id]/status`; S06: `setJobStatus` | HT |
| **UC41** | Đánh dấu Job hoàn thành | Xác nhận hoàn thành thủ công; chỉ với Job đã duyệt và không còn yêu cầu rút chờ xử lý; khóa sửa/mở lại/rút sau đó | `/organizer/jobs/[id]`; `PATCH /api/jobs/[id]/status`, `COMPLETED`; S06: `setJobStatus` | HT |
| **UC42** | Xóa hoặc lưu trữ Job | Yêu cầu loại bỏ Job; xóa vật lý nếu không có đơn/lời mời/tham gia; nếu đã có bất kỳ lịch sử kết nối nào thì lưu trữ | `/organizer/jobs`; `DELETE /api/jobs/[id]`; S06: `deleteJob` | HT |
| **UC43** | Xem và lọc đơn ứng tuyển | Xem ứng viên, lời giới thiệu, hồ sơ và lịch sử đơn thuộc Job của mình; tìm theo Job/KOL và lọc trạng thái | `/organizer/applications`, tổng quan; `GET /api/applications`; S08: `applications` | HT |
| **UC44** | Chấp nhận ứng viên | Chấp nhận đơn `PENDING` của Job mình; kiểm tra điều kiện tuyển và ghi nhận tham gia theo UC66 | Danh sách ứng viên/tổng quan; `PATCH /api/applications/[id]`, `ACCEPTED`; S08: `decideApplication`; S09 | HT |
| **UC45** | Từ chối ứng viên | Chuyển đơn `PENDING` sang `REJECTED`, giữ lịch sử và thông báo KOL; chưa có ô lý do từ chối đơn | `/organizer/applications`; `PATCH /api/applications/[id]`; S08: `decideApplication` | HT |
| **UC46** | Gửi lời mời hợp tác cho KOL | Chọn Job của mình và viết lời mời cho KOL công khai/hoạt động; có thể mời lại khi lời mời cũ `DECLINED`/`WITHDRAWN` | `/kols/[id]#collaborate`; thẻ KOL tại `/kols?matchJob=...`; `POST /api/invitations`; S08: `inviteKol`; `src/components/customer/cards.tsx` | HT |
| **UC47** | Theo dõi lời mời đã gửi | Xem lời mời và phản hồi, tìm theo Job/KOL, lọc trạng thái; không có thao tác Organizer tự thu hồi lời mời | `/organizer/invitations`; `GET /api/invitations`; S08: `invitations` | HT |
| **UC48** | Xem danh sách KOL còn tham gia Job | Xem KOL, trạng thái và nguồn xác nhận qua ứng tuyển/lời mời; theo dõi số chỗ còn lại | `/organizer/jobs/[id]`; `GET /api/jobs/[id]/participants`; S06: `participants`; S09 | HT |
| **UC49** | Xem và theo dõi yêu cầu rút | Xem yêu cầu của các Job mình sở hữu; lọc trạng thái, đọc lý do/thời điểm/lịch sử/phản hồi | `/organizer/withdrawals`, `/organizer/jobs/[id]`; `GET /api/withdrawals`; S10: `withdrawals`; bộ lọc theo Job được gọi trực tiếp từ trang | HT |
| **UC50** | Chấp thuận yêu cầu rút | Duyệt yêu cầu `PENDING`; ghi nhận KOL đã rời có chấp thuận, kết thúc kết nối liên quan và giải phóng chỗ | `/organizer/withdrawals` hoặc chi tiết Job; `PATCH /api/withdrawals/[id]`, `APPROVED`; S10: `decideWithdrawal` | HT |
| **UC51** | Từ chối yêu cầu rút | Từ chối yêu cầu `PENDING` kèm lý do tối thiểu 5 ký tự; KOL vẫn chiếm chỗ và có thể xác nhận rời sau đó | Cùng các trang xử lý yêu cầu rút; `PATCH /api/withdrawals/[id]`, `REJECTED`; S10: `decideWithdrawal` | HT |
| **UC52** | Tìm KOL phù hợp cho Job | Chọn Job hợp lệ của mình, lọc hồ sơ công khai rồi xếp hạng trước phân trang; xem điểm/căn cứ và tự gửi lời mời; chatbot cũng hỗ trợ chọn Job và nhận gợi ý | `/kols?matchJob=[id]`; liên kết từ chi tiết Job; `GET /api/ai/recommendations?jobId=[id]`; S14: `matchedKolCatalog`, `organizerMatchJobs`, `recommendations`; S15 | HT; phần hội thoại phụ thuộc AI |

UC46 có thể thực hiện độc lập với matching. Thẻ “Mời hợp tác” công khai chỉ là đường dẫn tới hồ sơ; backend vẫn yêu cầu đúng vai trò Organizer và Job thuộc mình.

### 4.5. Admin — Quản trị viên

Admin dùng thêm UC01–UC05, UC08–UC12. Admin không kế thừa quyền xét duyệt ứng viên, gửi lời mời hoặc duyệt yêu cầu rút của Organizer.

| Mã | Use Case | Mục đích và phạm vi đã triển khai | Trang/API và bằng chứng | Trạng thái |
| --- | --- | --- | --- | --- |
| **UC53** | Xem thống kê toàn hệ thống | Xem số tài khoản theo vai trò, Job, Job chờ duyệt, đơn, lời mời và lượt tham gia còn hiệu lực | `/admin`; `GET /api/admin`; S07: `adminOverview` | HT |
| **UC54** | Theo dõi hoạt động và kết nối gần đây | Xem biểu đồ/bảng 30 ngày về Job, đơn và kết nối mới; phân bố kiểm duyệt; 8 kết nối gần đây | `/admin`; S07: `adminActivity`; `ActivityChart`; chưa có API riêng hoặc xuất báo cáo | HT |
| **UC55** | Tra cứu danh sách tài khoản | Xem tên/email/vai trò/trạng thái/ngày tạo; tìm tên/email/vai trò và lọc vai trò | `/admin/users`; S07: `adminUsers`; `GET /api/admin/users` chỉ trả danh sách, không xử lý bộ lọc của trang | HT |
| **UC56** | Khóa tài khoản KOL/Organizer | Đặt tài khoản không hoạt động, thu hồi toàn bộ phiên; không được khóa chính mình hoặc tài khoản Admin khác qua web | `/admin/users`; `PATCH /api/admin/users/[id]`, `{active:false}`; S07: `setUserActive` | HT |
| **UC57** | Mở khóa tài khoản KOL/Organizer | Cho phép hoạt động/đăng nhập lại; không khôi phục các phiên đã bị thu hồi | `/admin/users`; `PATCH /api/admin/users/[id]`, `{active:true}`; S07: `setUserActive` | HT |
| **UC58** | Xem và kiểm tra toàn bộ Job | Đọc thông tin, mô tả, yêu cầu, quyền lợi, ghi chú và trạng thái Job của mọi Organizer | `/admin/jobs`; `GET /api/admin/jobs`; S07: `adminJobs`; `AdminJobs` | HT |
| **UC59** | Xem danh sách Job chờ kiểm duyệt | Tập trung các Job `PENDING` để xử lý, gồm một phần danh sách ở tổng quan | `/admin/moderation`, `/admin`; `GET /api/admin/moderation`; S07: `adminJobs(actor,true)` | HT |
| **UC60** | Duyệt công khai Job | Phê duyệt Job còn `PENDING`, đang mở/còn hạn và Organizer còn hoạt động; gửi kết quả cho chủ Job | `/admin/moderation`, `/admin`; `PATCH /api/admin/jobs/[id]/moderation`, `APPROVED`; S07: `moderateJob` | HT |
| **UC61** | Từ chối duyệt Job | Từ chối Job `PENDING`, yêu cầu lý do tối thiểu 5 ký tự, thông báo chủ Job để sửa/gửi lại | Cùng màn hình kiểm duyệt; cùng API, `REJECTED`; S07: `moderateJob` | HT |
| **UC62** | Ẩn Job đã được duyệt | Đưa Job đã duyệt về `REJECTED` kèm lý do; gỡ khỏi truy cập công khai và thông báo các bên liên quan; giữ lịch sử kết nối | `/admin/jobs`; `PATCH /api/admin/jobs/[id]/hide`; S07: `hideJob` | HT |
| **UC63** | Đóng hoặc mở tuyển lại Job ở phạm vi quản trị | Thay trạng thái tuyển của Job bất kỳ; cùng điều kiện trạng thái/hạn tuyển như service dùng cho Organizer | `/admin/jobs`; `PATCH /api/admin/jobs/[id]`; cũng được service cho phép ở `/api/jobs/[id]/status`; S06: `setJobStatus` | HT |
| **UC64** | Xóa hoặc lưu trữ Job ở phạm vi quản trị | Áp dụng cùng quy tắc bảo toàn lịch sử như UC42 nhưng không giới hạn chủ Job | `/admin/jobs`; `DELETE /api/admin/jobs/[id]`; S06: `deleteJob` | HT |
| **UC65** | Đánh dấu Job hoàn thành bằng quyền quản trị | API cho phép Admin gửi `COMPLETED`, có kiểm tra đã duyệt và không còn yêu cầu rút chờ; chưa có nút hoàn thành cho Admin | `PATCH /api/admin/jobs/[id]` hoặc `PATCH /api/jobs/[id]/status`; S06: `setJobStatus`; đối chiếu `src/components/admin/jobs.tsx` | MP: có backend/API, thiếu thao tác giao diện |

### 4.6. Use Case nghiệp vụ dùng chung trong hai luồng kết nối

| Mã | Use Case | Actor tham gia và mục tiêu | Bằng chứng | Trạng thái |
| --- | --- | --- | --- | --- |
| **UC66** | Ghi nhận xác nhận tham gia Job | Organizer kích hoạt qua UC44 hoặc KOL kích hoạt qua UC22; kết quả chung là một KOL có một lượt tham gia hiệu lực cho Job | S09: `confirmParticipant`; S01: `Participation`, khóa duy nhất `(jobId,kolId)`; không có nút/API xác nhận độc lập | HT, UC được bao gồm |

UC66 mô tả kết quả nghiệp vụ tái sử dụng, không phải UC “INSERT bảng Participation” hoặc “khóa hàng database”. Nếu cần sơ đồ gọn, có thể giữ kết quả này bên trong UC22/UC44; không thêm một bước KOL xác nhận lần nữa sau khi Organizer chấp nhận đơn.

## 5. Luồng nghiệp vụ và quy tắc xử lý

### 5.1. Khám phá và truy cập theo quan hệ

| Đối tượng | Điều kiện thực tế trong code | Ý nghĩa khi mô hình hóa |
| --- | --- | --- |
| Job công khai | `APPROVED`, `OPEN`, `completedAt = null`, hạn tuyển chưa qua, Organizer hoạt động | Guest không thấy bản nháp/chờ duyệt/bị từ chối/đóng/lưu trữ/hoàn thành/hết hạn |
| Job đủ người | Vẫn có thể nằm trong danh sách công khai; ứng tuyển, gửi lời mời và xác nhận mới kiểm tra số chỗ | Không coi “đang hiển thị” đồng nghĩa “còn tuyển được” |
| Trang Job không còn công khai | KOL từng có đơn/lời mời/tham gia được xem lại; Organizer chỉ Job của mình; Admin được xem mọi Job | Đây là mở rộng phạm vi đọc theo quyền, không phải tự công khai lại Job |
| Hồ sơ KOL công khai | `isPublic = true`, tài khoản `KOL` và đang hoạt động | Guest và danh sách tìm kiếm chỉ dùng tập này |
| Hồ sơ KOL riêng tư có liên quan | Trang `/kols/[id]` cho Organizer đã có đơn hoặc lời mời liên quan đến Job mình; Admin xem hồ sơ KOL hoạt động dù riêng tư | Tắt công khai không cắt toàn bộ quyền đọc của các bên đã có quan hệ |
| KOL tự mở hồ sơ riêng tư | `kolForViewer` không có nhánh đặc biệt cho chủ KOL khi `isPublic=false` | Sửa/xem dữ liệu riêng của mình tại `/kol/profile`; không suy ra luôn xem được qua `/kols/[id]` |

Trang `/jobs/[id]` dùng `jobForViewer`, còn API GET thông thường dùng `publicJob`; trang `/kols/[id]` dùng `kolForViewer`, còn API GET chỉ dùng `publicKol`. Không dùng kết quả API công khai để phủ nhận khả năng xem lại có phân quyền của trang. Căn cứ: S04–S06.

### 5.2. Đăng ký, đăng nhập, đăng xuất và đổi mật khẩu

**Đăng ký — UC06:**

1. Guest chọn `KOL` hoặc `ORGANIZER`, nhập tên, email và mật khẩu.
2. Backend chuẩn hóa email, kiểm tra dữ liệu; mật khẩu đăng ký dài 10–128 ký tự. Không chấp nhận role `ADMIN` hoặc trường quyền bổ sung.
3. Lưu tài khoản cùng hồ sơ tương ứng. Hồ sơ KOL mới mặc định chưa công khai; hồ sơ Organizer dùng tên đăng ký làm tên tổ chức ban đầu.
4. Tạo phiên 7 ngày, trả cookie và chuyển đến `/kol/dashboard` hoặc `/organizer/dashboard`.
5. Email trùng bị chặn bởi khóa duy nhất. Không có bước xác minh email/OTP hay Admin duyệt tài khoản trong luồng đăng ký.

**Đăng nhập — UC07:**

1. Nhập email/mật khẩu; backend kiểm tra số lần thử, thông tin xác thực và trạng thái hoạt động.
2. Đăng nhập thành công thì tạo phiên và chuyển tới trang theo vai trò; Admin tới `/admin`.
3. Email/mật khẩu không đúng hoặc tài khoản khóa trả lỗi chung. Giới hạn hiện tại là 10 lần trong cửa sổ 15 phút theo khóa từ email.

**Đăng xuất — UC09:** Thu hồi phiên hiện tại và xóa cookie, không có màn hình quản lý từng thiết bị.

**Đổi mật khẩu — UC10:** Kiểm tra phiên/tài khoản, mật khẩu hiện tại, mật khẩu mới khác cũ và khớp xác nhận; cập nhật mật khẩu, thu hồi **mọi phiên của chính người dùng**, xóa cookie, chuyển về đăng nhập. Đây là đổi mật khẩu khi còn biết mật khẩu cũ, không phải chức năng quên mật khẩu.

Cookie, băm mật khẩu, lưu hash token, kiểm tra nguồn yêu cầu và kiểm tra vai trò là cơ chế nội bộ của các UC này, không cần tách thành Actor hoặc UC nghiệp vụ. Căn cứ: S02–S03, các route `/api/auth/*`.

### 5.3. Tạo, gửi duyệt, kiểm duyệt và sửa Job

| Bước | Actor và xử lý chính | Kết quả/nhánh ngoại lệ |
| --- | --- | --- |
| 1 | Organizer nhập nội dung theo UC35 và xem lại | Lưu `moderation=DRAFT`, `status=OPEN`. Tạo nháp vẫn phải thỏa validation, không phải lưu tùy ý biểu mẫu thiếu trường |
| 2 | Organizer thêm ảnh bìa nếu cần, rồi gửi duyệt theo UC37 | Chỉ `DRAFT`/`REJECTED`, đang mở và còn hạn; đổi sang `PENDING`, gửi thông báo Admin hoạt động |
| 3 | Admin đọc Job qua UC59 | Xem mô tả/yêu cầu/quyền lợi/ảnh/ngân sách/lịch trước khi quyết định |
| 4a | Admin duyệt UC60 | `PENDING` thành `APPROVED`; cần đang mở, còn hạn, chủ Job hoạt động; thông báo Organizer |
| 4b | Admin từ chối UC61 | `PENDING` thành `REJECTED`; lưu lý do tối thiểu 5 ký tự, thông báo Organizer |
| 5 | Organizer sửa theo UC36 hoặc gửi lại theo UC37 | Sửa nháp vẫn là `DRAFT`; sửa bất kỳ Job không còn là nháp đưa về `PENDING`. Có thể gửi lại Job bị từ chối nếu đủ điều kiện |
| 6 | Admin ẩn Job đã duyệt theo UC62 | Đổi `moderation` về `REJECTED`, lưu lý do, báo các bên; giữ đơn/lời mời/tham gia |

Quy tắc đầu vào: ngân sách không âm, tối đa 1 tỷ đồng mỗi cận; ngân sách tối đa không nhỏ hơn tối thiểu; chỉ tiêu 1–1.000; hạn tuyển trong tương lai; ngày sự kiện không trước hạn tuyển. Giao diện yêu cầu quyền lợi tối thiểu 10 ký tự, trong khi schema backend cho phép chuỗi rỗng/default; không mô tả quyền lợi là bắt buộc tuyệt đối ở mọi kênh gọi API.

Sửa nội dung Job đã hoàn thành hoặc lưu trữ bị chặn. Thay hoặc xóa ảnh bìa của Job `APPROVED` cũng đưa về `PENDING`; đường xử lý ảnh hiện không gọi cùng luồng gửi thông báo Admin/KOL như `updateJob`. Không khẳng định mọi kiểu sửa Job đều phát cùng bộ thông báo. Căn cứ: S03, S06–S07, S13.

### 5.4. KOL ứng tuyển và Organizer xét duyệt

1. KOL mở Job, nhập lời giới thiệu 10–2.000 ký tự và gửi UC19.
2. Hệ thống kiểm tra Job đã duyệt, đang mở, chưa hoàn thành, còn hạn, Organizer hoạt động, còn chỉ tiêu và KOL chưa có tham gia hiệu lực.
3. Tạo đơn `PENDING`; nếu đơn cũ `WITHDRAWN`, dùng lại bản ghi và bổ sung lịch sử `RESUBMITTED`. Đơn `PENDING`/`ACCEPTED`/`REJECTED` cũ không được ứng tuyển lại trực tiếp.
4. Ghi lịch sử nội dung và thông báo Organizer.
5. Organizer chỉ được xử lý đơn thuộc Job của mình, còn `PENDING`:
   - **Chấp nhận UC44:** kiểm tra lại Job, tài khoản KOL và chỉ tiêu; thực hiện UC66; đơn thành `ACCEPTED`, thông báo KOL.
   - **Từ chối UC45:** đơn thành `REJECTED`, ghi lịch sử và thông báo KOL; không tạo tham gia.
6. KOL theo dõi ở UC18/UC24. **Không có bước KOL bấm xác nhận thêm sau khi đơn được chấp nhận.**

Hồ sơ KOL không bắt buộc công khai hoặc phải được Admin xác minh để gửi đơn trong `applyToJob`. Điều kiện công khai áp dụng cho tìm kiếm/nhận lời mời mới, không nên áp thêm vào luồng ứng tuyển. Căn cứ: S08–S09.

### 5.5. Organizer gửi lời mời và KOL phản hồi

1. Organizer mở hồ sơ KOL, hoặc chọn Job đối chiếu trên catalog KOL.
2. Chọn Job của mình, nhập lời mời 10–2.000 ký tự và thực hiện UC46.
3. Backend kiểm tra quyền sở hữu, điều kiện tuyển và số chỗ; KOL phải có hồ sơ công khai/hoạt động và chưa còn tham gia Job.
4. Tạo lời mời `PENDING` và thông báo KOL. Nếu lời mời trước `DECLINED`/`WITHDRAWN`, dùng lại bản ghi, cập nhật nội dung/thời điểm và trạng thái. Lời mời đang hiệu lực không được gửi trùng.
5. KOL được mời xem nội dung rồi chọn:
   - **UC22:** chấp nhận; kiểm tra lại điều kiện Job/chỉ tiêu; thực hiện UC66; lời mời thành `ACCEPTED`, thông báo Organizer.
   - **UC23:** từ chối; lời mời thành `DECLINED`, thông báo Organizer; không ghi nhận tham gia.
6. Organizer theo dõi kết quả qua UC47/UC48.

Không có thao tác Organizer duyệt lại sau khi KOL chấp nhận lời mời. Không có API hoặc nút Organizer tự hủy lời mời đã gửi. Trạng thái `Invitation.WITHDRAWN` được cập nhật khi KOL thực sự rời tham gia, không phải bằng chứng tồn tại chức năng thu hồi lời mời của Organizer. Căn cứ: S08, S10.

### 5.6. Ghi nhận tham gia và kiểm soát chỉ tiêu — UC66

| Tình huống | Hành vi theo source |
| --- | --- |
| Chấp nhận đơn ứng tuyển | Ghi nguồn `APPLICATION` |
| Chấp nhận lời mời | Ghi nguồn `INVITATION` |
| Cùng Job/KOL được chấp nhận qua hai luồng | Dùng cùng một `Participation`; nếu đã còn tham gia thì không tăng số người thêm |
| Chưa có tham gia hoặc đã rời rồi muốn tham gia lại | Phải còn chỗ; tạo hoặc cập nhật lại `CONFIRMED`, cập nhật `confirmedAt`, xóa `leftAt`, đặt nguồn mới |
| Nhiều yêu cầu xác nhận đồng thời | Các quyết định và thay đổi chỉ tiêu cùng khóa hàng Job trước khi đếm/cập nhật, nhằm tránh vượt số chỗ |
| KOL đang chờ duyệt rút hoặc bị từ chối rút | Vẫn tính vào số người còn tham gia |
| KOL đã thực sự rời | Không còn tính vào số chỗ đang sử dụng; bản ghi vẫn giữ lại |

Code không tự đồng bộ trạng thái đơn và lời mời về cùng một kết quả ngay khi xác nhận qua một trong hai luồng; điểm chung được bảo đảm là một lượt tham gia cho cặp Job/KOL. Không dựng thêm quy tắc “chấp nhận lời mời thì tự chấp nhận/hủy mọi đơn” nếu không đi qua luồng rời ở S10. Căn cứ: S01, S08–S10.

### 5.7. Hủy đăng ký, yêu cầu rút và rời không được chấp thuận

**A. Chưa được xác nhận — UC20:**

1. KOL chọn hủy đơn đang `PENDING`, xác nhận thao tác.
2. Backend kiểm tra chủ đơn và Job chưa hoàn thành, chuyển đơn sang `WITHDRAWN`.
3. Giữ bản ghi, nội dung và lịch sử `CANCELLED`; thông báo cả KOL và Organizer. Không tạo hoặc xóa `Participation` trong nhánh này.
4. Có thể gửi lại UC19 nếu Job thỏa điều kiện tuyển; giữ lịch sử lần trước.

**B. Đã xác nhận — UC25, UC49–UC51:**

1. KOL đang `CONFIRMED` gửi lý do 5–2.000 ký tự.
2. Tạo `WithdrawalRequest.PENDING`, đặt tham gia `WITHDRAWAL_PENDING`; ghi thời điểm, lịch sự kiện và nguồn tham gia tại lúc gửi. **Vẫn chiếm chỗ tuyển.**
3. Organizer xem lý do và chọn chấp thuận hoặc từ chối:
   - **Chấp thuận:** yêu cầu `APPROVED`; tham gia `WITHDRAWN_APPROVED`; lưu mốc xử lý/rời; giải phóng chỗ.
   - **Từ chối:** yêu cầu `REJECTED`; tham gia `WITHDRAWAL_REJECTED`; bắt buộc lý do, vẫn giữ chỗ.
4. Hai bên nhận thông báo và theo dõi lịch sử.

**C. Bị từ chối nhưng KOL vẫn muốn rời — UC27:**

1. Chỉ sau khi yêu cầu bị `REJECTED` và tham gia là `WITHDRAWAL_REJECTED`, KOL mới có quyền xác nhận rời.
2. Backend yêu cầu `{confirm:true}`, kiểm tra chủ sở hữu và Job chưa hoàn thành.
3. Yêu cầu thành `LEFT_WITHOUT_APPROVAL`; tham gia thành `WITHDRAWN_UNAPPROVED`; lưu mốc rời, giữ nguyên lý do/phản hồi trước đó và giải phóng chỗ.
4. Thông báo hai bên. Không có xử phạt tiền, trừ điểm uy tín hoặc cấm tham gia tự động trong code.

**Quy tắc chung:**

- Được yêu cầu rút khi Job đóng tuyển, ẩn, lưu trữ hoặc sự kiện đã bắt đầu, miễn chưa hoàn thành. Không cần hạn tuyển còn hiệu lực.
- Khi rời thực sự, đơn của cùng cặp Job/KOL nếu `PENDING`/`ACCEPTED` chuyển `WITHDRAWN` và ghi lịch sử; lời mời nếu `PENDING`/`ACCEPTED` cũng chuyển `WITHDRAWN`.
- `activeSlot` và kiểm tra trạng thái ngăn nhiều yêu cầu rút cùng hiệu lực. Yêu cầu bị từ chối vẫn giữ slot cho đến khi rời; chưa có thao tác tự hủy yêu cầu rút hoặc gửi lại yêu cầu khi vẫn ở trạng thái bị từ chối.
- Giải phóng chỗ không tự mở lại Job, không kéo dài hạn tuyển và không tự khôi phục đơn/lời mời cũ. Muốn tham gia lại phải qua luồng ứng tuyển/lời mời đủ điều kiện.
- Job đã `COMPLETED` hoặc có `completedAt` chặn yêu cầu rút, xét duyệt rút, xác nhận rời và hủy đơn. Admin không được duyệt rút thay Organizer.

Căn cứ: S08–S10; `prisma/migrations/202610140001_withdrawals/migration.sql`.

### 5.8. Đóng, mở lại, hoàn thành và xóa/lưu trữ Job

| Thao tác | Điều kiện và kết quả thực tế |
| --- | --- |
| Đóng tuyển — UC39/UC63 | Chuyển `CLOSED`; giữ dữ liệu kết nối, ngừng xác nhận tuyển mới; chưa đồng nghĩa Job đã hoàn thành |
| Mở lại — UC40/UC63 | Chuyển `OPEN` khi hạn tuyển còn tương lai; không mở lại Job lưu trữ/hoàn thành; việc mở không thay thế kiểm duyệt |
| Hoàn thành — UC41/UC65 | Chỉ khi được duyệt, chưa lưu trữ/chưa hoàn thành, không còn yêu cầu rút `PENDING`; ghi `completedAt`; không bắt buộc ngày sự kiện đã qua hoặc phải có người tham gia |
| Sau hoàn thành | Không sửa nội dung/ảnh, mở lại hoặc rút tham gia; không tự kết thúc đơn/lời mời còn `PENDING` trong `setJobStatus` |
| Xóa/lưu trữ — UC42/UC64 | Nếu có bất kỳ đơn/lời mời/tham gia, kể cả lịch sử đã rời, đặt `ARCHIVED`; nếu chưa có các liên kết đó, xóa Job và bỏ liên kết ảnh để dọn sau |
| Lưu trữ Job đã hoàn thành | Vẫn giữ `completedAt`; không biến Job thành có thể rút chỉ vì `status` đổi thành `ARCHIVED` |
| Xóa lặp Job lưu trữ | Service trả `{archived:true}`; không xóa vật lý lịch sử dù nhãn nút có thể là “Xóa Job” |

Hết hạn làm Job không còn xuất hiện trong truy vấn công khai và không nhận tuyển mới; chưa có tác vụ tự đổi `status` thành `CLOSED`. Thời điểm sự kiện là mốc bắt đầu, chưa có ngày kết thúc riêng hay tự hoàn thành theo lịch. Căn cứ: S04, S06, S09–S10, S13.

### 5.9. Hồ sơ, ảnh và mạng xã hội

1. KOL/Organizer mở biểu mẫu của mình; backend lấy chủ sở hữu từ phiên, không từ trường tùy ý trong yêu cầu.
2. Hồ sơ KOL lưu kỹ năng/kinh nghiệm/lĩnh vực và trạng thái công khai. Liên kết kênh hỗ trợ 4 nền tảng; nội dung bài đăng hỗ trợ 3 nền tảng.
3. Có thể dán mã nhúng nhưng ứng dụng chỉ trích xuất URL hợp lệ, không lưu/thực thi đoạn HTML/script được dán.
4. Lưu hồ sơ cập nhật thông tin và thay tập `SocialLink` bằng các URL không rỗng. Ràng buộc `(profileId,platform,kind)` giới hạn một liên kết cho mỗi nền tảng/loại.
5. Tải ảnh có bước chọn và xem trước; xác nhận lưu mới gọi UploadThing. Ảnh JPG/PNG/WebP, một ảnh/lần, tối đa 4 MB; portfolio tối đa 6 ảnh.
6. Backend kiểm tra vai trò/chủ Job, callback kiểm tra lại tài khoản/quyền; ảnh mới thay ảnh hiện hành của cùng vị trí. Xóa ảnh bỏ khỏi vị trí hiển thị và có cơ chế dọn tệp ngoài.

Chưa có lấy follower, lượt xem, tương tác hoặc xác minh quyền sở hữu tài khoản mạng xã hội. Khung nhúng phụ thuộc bài còn công khai và khả năng nhúng của nền tảng; có liên kết mở trực tiếp nếu không hiển thị được. Căn cứ: S05, S13.

### 5.10. Thông báo và trạng thái được đồng bộ

| Sự kiện nghiệp vụ | Người nhận theo code |
| --- | --- |
| Gửi Job duyệt; cập nhật nội dung thành chờ duyệt | Admin hoạt động |
| Duyệt/từ chối Job | Organizer chủ Job |
| Cập nhật nội dung Job | Các KOL có đơn hoặc lời mời liên quan |
| Đổi trạng thái Job; ẩn Job | Chủ Job và các bên có đơn/lời mời/tham gia theo truy vấn từng service |
| Lưu trữ Job có lịch sử | KOL có đơn hoặc lời mời liên quan |
| Gửi đơn ứng tuyển | Organizer chủ Job |
| Chấp nhận/từ chối đơn | KOL của đơn |
| KOL hủy đơn chờ | Organizer và chính KOL |
| Gửi lời mời | KOL được mời |
| KOL chấp nhận/từ chối lời mời | Organizer chủ Job |
| Gửi/xét duyệt/xác nhận rời theo yêu cầu rút | Cả KOL và Organizer |

Thông báo nghiệp vụ được ghi cùng giao dịch; sự kiện Pusher chỉ phát sau khi giao dịch thành công. Trình duyệt nhận tín hiệu rồi đọc dữ liệu có phân quyền. Khi không kết nối kênh, có kiểm tra mỗi 30 giây; khi đã kết nối, có đối chiếu định kỳ khoảng 120 giây, chỉ khi tab đang hiển thị. Pusher lỗi không làm mất thông báo đã lưu. Đây là hành vi của UC11, không phải một chức năng gửi tin nhắn tự do giữa người dùng. Căn cứ: S06–S08, S10, S12.

## 6. Dữ liệu nghiệp vụ và trạng thái

### 6.1. Các bảng/model hiện tại

| Model | Ý nghĩa trong nghiệp vụ | Ràng buộc/quy tắc quan trọng |
| --- | --- | --- |
| `User` | Tài khoản KOL/Organizer/Admin | Email duy nhất, một `role`, cờ `active` |
| `KolProfile` | Hồ sơ KOL | Một hồ sơ cho mỗi tài khoản; mặc định không công khai |
| `OrganizerProfile` | Hồ sơ tổ chức | Một hồ sơ cho mỗi tài khoản |
| `SocialLink` | Kênh hoặc nội dung chia sẻ | Duy nhất theo hồ sơ/nền tảng/loại `CHANNEL` hoặc `POST` |
| `Job` | Nhu cầu hợp tác và lịch sự kiện | Thuộc Organizer; tách trạng thái kiểm duyệt và trạng thái hoạt động; có `capacity`, `completedAt` |
| `Application` | Đơn KOL gửi tới Job | Duy nhất `(jobId,kolId)`; đơn rút được tái sử dụng khi gửi lại |
| `ApplicationHistory` | Lịch sử biến đổi đơn và nội dung tại thời điểm thao tác | Lưu hành động, trạng thái, thời gian, người thực hiện nếu có; liên kết được bảo vệ bằng FK `RESTRICT` |
| `Invitation` | Lời mời Organizer gửi tới KOL cho Job | Duy nhất `(jobId,kolId)`; lời mời từ chối/đã rút được dùng lại |
| `Participation` | Quan hệ tham gia đã được xác nhận | Duy nhất `(jobId,kolId)`; lưu nguồn, trạng thái, thời điểm xác nhận/rời |
| `WithdrawalRequest` | Yêu cầu rút sau xác nhận | Lưu lý do/quyết định/mốc thời gian/nguồn/lịch sự kiện tại lúc gửi; `activeSlot` duy nhất khi yêu cầu còn hiệu lực |
| `MediaAsset` | Thông tin ảnh hồ sơ/tổ chức/Job | `key` duy nhất; `slot` duy nhất cho ảnh hiện hành; hỗ trợ bỏ hiển thị và ghi nhận dọn tệp |
| `Notification` | Thông báo thuộc người nhận | Có nội dung, đường dẫn và `readAt`; chưa có thông báo email/SMS |
| `Session` | Dữ liệu kỹ thuật của phiên đăng nhập | Lưu hash token và hạn phiên; không phải tài nguyên do người dùng CRUD |
| `LoginAttempt` | Dữ liệu kỹ thuật giới hạn thử mật khẩu | Dùng cả cho đăng nhập và đổi mật khẩu |

Đây là **14 model trong schema**, không bao gồm bảng theo dõi migration do Prisma quản lý. README và `docs/mysql.md` còn có mô tả “12 bảng” từ giai đoạn trước; hai bảng lịch sử/yêu cầu rút có trong migration mới hơn. Chưa xác minh được migration này đã áp dụng lên máy chủ.

### 6.2. Trạng thái Job

| Nhóm | Giá trị | Ý nghĩa |
| --- | --- | --- |
| Kiểm duyệt `Moderation` | `DRAFT` | Bản nháp chưa gửi |
| Kiểm duyệt `Moderation` | `PENDING` | Chờ Admin xét duyệt hoặc duyệt lại |
| Kiểm duyệt `Moderation` | `APPROVED` | Đã được duyệt; còn phải thỏa trạng thái/hạn/tài khoản để công khai |
| Kiểm duyệt `Moderation` | `REJECTED` | Bị từ chối hoặc bị Admin ẩn; phân biệt ngữ cảnh bằng thao tác và ghi chú, không có trạng thái `HIDDEN` riêng |
| Hoạt động `JobStatus` | `OPEN` | Đang ở trạng thái mở, có thể đồng thời còn là bản nháp/chờ duyệt |
| Hoạt động `JobStatus` | `CLOSED` | Đóng tuyển |
| Hoạt động `JobStatus` | `ARCHIVED` | Lưu trữ, giữ lịch sử |
| Hoạt động `JobStatus` | `COMPLETED` | Hoàn thành thủ công; có `completedAt` để giữ dấu hoàn thành kể cả khi lưu trữ sau đó |

Không gộp “đã duyệt”, “đang tuyển” và “còn chỗ” thành một trạng thái duy nhất. Chỉ tiêu đầy và hết hạn là điều kiện truy vấn/xử lý, chưa có enum `FULL` hoặc `EXPIRED`.

### 6.3. Trạng thái đơn, lời mời, tham gia và yêu cầu rút

| Đối tượng | Giá trị thực tế | Chuyển đổi cần thể hiện trong mô tả UC |
| --- | --- | --- |
| Đơn ứng tuyển | `PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN` | Chờ → chấp nhận/từ chối/hủy; đã hủy → gửi lại; đang chờ/đã chấp nhận → đã rút khi rời tham gia |
| Lời mời | `PENDING`, `ACCEPTED`, `DECLINED`, `WITHDRAWN` | Chờ → chấp nhận/từ chối; từ chối/đã rút → mời lại; đang chờ/đã chấp nhận → đã rút khi rời |
| Tham gia | `CONFIRMED` | Đang tham gia, tính chỗ |
| Tham gia | `WITHDRAWAL_PENDING` | Chờ duyệt rút, vẫn tính chỗ |
| Tham gia | `WITHDRAWAL_REJECTED` | Rút bị từ chối, chưa rời, vẫn tính chỗ |
| Tham gia | `WITHDRAWN_APPROVED` | Đã rời có chấp thuận, không tính chỗ |
| Tham gia | `WITHDRAWN_UNAPPROVED` | Đã rời không được chấp thuận, không tính chỗ |
| Yêu cầu rút | `PENDING`, `APPROVED`, `REJECTED`, `LEFT_WITHOUT_APPROVAL` | Chờ → chấp thuận/từ chối; từ chối → KOL xác nhận rời |

Thời điểm yêu cầu rút được phân loại `BEFORE_EVENT` khi còn hơn 24 giờ, `WITHIN_24H` khi còn trên 0 đến 24 giờ, `EVENT_STARTED` khi đã đến hoặc qua mốc sự kiện. Các nhãn này ghi nhận bối cảnh, không tự chặn rút hoặc tính phạt.

Lịch sử đơn có các hành động `SUBMITTED`, `RESUBMITTED`, `CANCELLED`, `ACCEPTED`, `REJECTED`, `WITHDRAWN_APPROVED`, `WITHDRAWN_UNAPPROVED`; migration/seed có `SNAPSHOT`. Bản chụp không dựng lại người thực hiện hoặc thời điểm quá khứ không được lưu. `Participation.confirmedAt` được cập nhật khi tham gia lại; chưa có bảng ghi riêng mọi lần tái xác nhận. Lịch sử yêu cầu rút trước đó vẫn được giữ. Căn cứ: S01, S08–S11.

## 7. Các chức năng AI

### 7.1. Matching và gợi ý từ dữ liệu có cấu trúc — UC28, UC29, UC52

Matching được hiện thực bằng `scoreMatch` trong backend, **không gọi Gemini để suy đoán hoặc sinh phần trăm phù hợp**.

| Tiêu chí | Trọng số tối đa | Cách tính có trong code |
| --- | --- | --- |
| Lĩnh vực | 30 | So sánh lĩnh vực hồ sơ và Job sau chuẩn hóa |
| Kỹ năng/nội dung | 25 | Nhận diện các nhóm từ khóa cố định trong mô tả/yêu cầu, đối chiếu với kỹ năng/giới thiệu KOL |
| Kinh nghiệm | 20 | Trích số năm trong yêu cầu Job, đối chiếu số năm hồ sơ; không có yêu cầu nhận diện được thì bỏ tiêu chí |
| Địa điểm | 15 | Chuẩn hóa một số tên thành phố; Job trực tuyến/toàn quốc được xét phù hợp địa điểm |
| Thù lao | 10 | Chỉ chấm khi có khoảng thù lao người dùng cung cấp, kiểm tra khoảng giao nhau; không suy ra báo giá KOL |

Điểm cuối = tổng điểm tiêu chí đã đánh giá / tổng trọng số tiêu chí có dữ liệu × 100, làm tròn. Thiếu dữ liệu thì bỏ tiêu chí khỏi mẫu số và hiển thị lý do; điểm không phải xác suất trúng tuyển, điểm uy tín hoặc kết quả huấn luyện từ lịch sử thành công.

**Gợi ý cho KOL:**

1. Lấy hồ sơ của chính người đăng nhập.
2. Lấy tối đa 200 Job mới nhất đã duyệt, mở, chưa hoàn thành, còn hạn, ngày sự kiện trong tương lai và chủ Job hoạt động; áp dụng khoảng thù lao nếu có.
3. Loại Job đã còn tham gia, đã có đơn chưa rút hoặc lời mời `PENDING`/`ACCEPTED`; loại Job đã đủ người.
4. Chấm điểm, xếp hạng và trả tối đa 8 gợi ý. Giao diện hiện 3 mục đầu, có xem thêm/làm mới/lọc.
5. KOL tự mở Job và thực hiện UC19; hệ thống không ứng tuyển tự động.

**Gợi ý cho Organizer:**

1. Chọn Job của mình đủ điều kiện tuyển và còn chỗ.
2. Xét KOL công khai/hoạt động, chưa có tham gia hiệu lực hoặc lời mời hiệu lực cho Job. Không có quy tắc loại mọi KOL đã ứng tuyển trong nhánh này.
3. API gợi ý chấm tối đa 200 hồ sơ và trả 8 mục. Catalog `/kols?matchJob=...` áp bộ lọc công khai, lấy tối đa 200 hồ sơ, **xếp hạng trước khi phân trang 9 mục/trang**.
4. Xem điểm/căn cứ và tự gửi lời mời UC46. Chưa có báo giá trong `KolProfile`, nên không lọc/chấm ngân sách theo giá của KOL.

`kolInvitationCards` còn chấm mức phù hợp của các lời mời theo hồ sơ KOL hiện tại; đây không phải một lượt tuyển mới hoặc đánh giá kết quả thực hiện Job. Căn cứ: S11, S14.

### 7.2. Chatbot tra cứu có phân quyền — UC08

| Actor | Khả năng được cấp trong chatbot | Công cụ nội bộ tương ứng |
| --- | --- | --- |
| Guest | Hướng dẫn; tìm Job/KOL công khai; được nhắc đăng nhập khi hỏi riêng tư | `get_help`, `search_public_jobs`, `search_public_kols`, `require_login` |
| KOL | Khả năng công khai; số đơn lịch sử/đang chờ, số tham gia hiệu lực, lời mời chờ; gợi ý Job cho chính mình | Thêm `my_kol_activity`, `my_recommendations` |
| Organizer | Khả năng công khai; số Job của mình và người đã xác nhận; gợi ý KOL cho Job thuộc mình | Thêm `my_organizer_jobs`, `my_recommendations` |
| Admin | Khả năng công khai; thống kê toàn hệ thống | Thêm `admin_overview`; không được cấp công cụ gợi ý cá nhân của KOL/Organizer |

Tên công cụ là chi tiết triển khai của UC08, không phải tám Actor hay tám API công khai.

**Luồng xử lý:**

1. Người dùng nhập câu hỏi hoặc chọn câu hỏi gợi ý trên trang chủ.
2. Backend xác định vai trò từ phiên, kiểm tra đầu vào và hạn mức; không nhận vai trò/quyền chủ sở hữu từ mô hình.
3. Với ý định cần phân tích, gửi Gemini danh sách công cụ được phép, câu hỏi và tối đa 6 lượt lịch sử, mỗi lượt 1.000 ký tự. Mô hình chọn tối đa 3 công cụ đọc.
4. Backend xác thực lại từng công cụ/tham số, đọc dữ liệu đúng phạm vi và tự định dạng số liệu/thẻ kết quả. Không dùng văn bản hay số liệu mô hình tự viết làm kết quả nghiệp vụ.
5. Người dùng mở liên kết để xem hoặc tự thực hiện thao tác trên màn hình chức năng.

**Chọn Job để gợi ý KOL cho Organizer:** Không có Job hợp lệ thì trả hướng dẫn quản lý Job; chỉ một Job thì tự chọn; nhiều Job thì hiện lựa chọn. Có thể chọn bằng nút, danh sách, tên hoặc số thứ tự. Ngữ cảnh có chữ ký gắn tài khoản/vai trò, hạn 30 phút, nhớ Job đã chọn và KOL vừa hiển thị. Hỏi tiếp giữ Job; “đổi Job” lấy lựa chọn mới; “gợi ý tiếp” lọc mục vừa hiện và có thể dẫn tới catalog. Các nhánh chọn Job/hỏi tiếp được xử lý trực tiếp tại server khi đã đủ ngữ cảnh, không phải lượt nào cũng gọi Gemini.

Lịch sử giao diện giữ trong bộ nhớ, không có bảng hội thoại hoặc lưu `localStorage`. Câu hỏi tối đa 1.000 ký tự; hạn mức trong một tiến trình là 20 yêu cầu/5 phút theo người dùng hoặc khóa khách và 100 yêu cầu/phút toàn tiến trình. Dịch vụ lỗi có thông báo/thử lại/liên kết tìm trực tiếp; không tự tạo kết quả thay thế. Đây là giới hạn kỹ thuật, không phải UC tính phí AI.

Không có công cụ ghi dữ liệu: chatbot không tạo Job, sửa hồ sơ, gửi đơn/lời mời, duyệt, hủy hoặc rút thay người dùng. Căn cứ: S15–S16; `src/app/(customer)/page.tsx`; `src/app/api/ai/chat/route.ts`.

## 8. Đề xuất quan hệ Use Case UML

Đây là **đề xuất mô hình hóa từ hành vi có trong code**, không phải quan hệ được khai báo trong chương trình. Chỉ cần dùng quan hệ giúp giải thích việc tái sử dụng hoặc mở rộng có điều kiện; không cần nối mọi cặp chức năng.

### 8.1. Quan hệ `<<include>>`

| Use Case cơ sở | Bao gồm Use Case | Giải thích |
| --- | --- | --- |
| UC44 — Chấp nhận ứng viên | **UC66 — Ghi nhận xác nhận tham gia Job** | Mỗi lần chấp nhận thành công phải bảo đảm đã có một tham gia hiệu lực, dùng nguồn `APPLICATION` |
| UC22 — Chấp nhận lời mời | **UC66 — Ghi nhận xác nhận tham gia Job** | Mỗi lần chấp nhận thành công phải bảo đảm cùng kết quả tham gia, dùng nguồn `INVITATION` |

Chiều quan hệ `include` đi từ UC44/UC22 tới UC66. UC66 tái sử dụng kết quả nghiệp vụ; các việc khóa hàng, đếm chỗ và ghi dữ liệu nằm trong đặc tả của nó. Không cần biến mỗi hàm kiểm tra thành UC.

### 8.2. Quan hệ `<<extend>>` có thể dùng

| Use Case mở rộng | Use Case được mở rộng | Điểm mở rộng và điều kiện |
| --- | --- | --- |
| UC19 — Ứng tuyển Job | UC03 — Xem chi tiết Job | Khi người xem là KOL và chọn gửi đơn cho Job đủ điều kiện; xem chi tiết vẫn hoàn chỉnh khi không ứng tuyển |
| UC46 — Gửi lời mời hợp tác | UC05 — Xem hồ sơ KOL | Khi người xem là Organizer có Job đủ điều kiện và chọn mời; hồ sơ vẫn đọc được mà không gửi lời mời |
| UC46 — Gửi lời mời hợp tác | UC52 — Tìm KOL phù hợp cho Job | Từ kết quả xếp hạng, Organizer tùy chọn mời một KOL; matching không bắt buộc gửi lời mời |
| UC29 — Xem căn cứ điểm phù hợp | UC28 hoặc UC52 | Khi người dùng mở phần căn cứ/trọng số sau khi xem điểm trong kết quả gợi ý |
| UC29 — Xem căn cứ điểm phù hợp | UC21 — Theo dõi lời mời | Chỉ ở thẻ lời mời trên tổng quan KOL có phần điểm/căn cứ; không áp cho mọi nơi hiển thị lời mời |
| UC25 — Yêu cầu rút sau xác nhận | UC24 — Xem Job đã xác nhận | Khi KOL chọn rút tại tham gia `CONFIRMED`, Job chưa hoàn thành; còn có điểm vào từ đơn/lời mời đã chấp nhận |
| UC27 — Xác nhận rời khi bị từ chối | UC26 — Theo dõi yêu cầu rút | Khi đang xem yêu cầu đã bị từ chối, tham gia tương ứng còn `WITHDRAWAL_REJECTED` và Job chưa hoàn thành |
| UC12 — Đánh dấu đã đọc | UC11 — Theo dõi và xem thông báo | Khi người dùng chọn đánh dấu một/tất cả; xem danh sách không bắt buộc đánh dấu |

Chiều `extend` đi từ UC mở rộng tới UC cơ sở. Các quan hệ trên có thể bỏ nếu sơ đồ chỉ cần liên kết trực tiếp Actor–UC; quan trọng là giữ đúng điều kiện mở rộng trong đặc tả.

### 8.3. Kế thừa Actor phù hợp

| Actor khái quát đề xuất | Actor chuyên biệt | Quyền chung được kế thừa |
| --- | --- | --- |
| **Người truy cập** — Actor trừu tượng để mô hình hóa | Guest; Người dùng đã xác thực | UC01–UC05, UC08 với dữ liệu công khai |
| **Người dùng đã xác thực** — Actor trừu tượng để mô hình hóa | KOL/KOC; Organizer; Admin | UC09–UC12; phần dữ liệu riêng của UC08 vẫn theo vai trò cụ thể |

Hai Actor trừu tượng trên không phải role mới trong database. Không cho người dùng đã xác thực kế thừa Guest theo cách kéo theo quyền đăng ký khi đang đăng nhập; hai trang `/login` và `/register` thực tế điều hướng tài khoản đang đăng nhập về trang vai trò. Có thể nối UC07 với các vai trò để diễn đạt đăng nhập bằng tài khoản tương ứng.

Không dùng kế thừa **Admin → Organizer/KOL**: guards không cho Admin xét duyệt đơn, phản hồi lời mời hoặc xử lý rút như hai vai trò đó. KOL và KOC không cần hai Actor riêng vì không có khác biệt phân quyền.

### 8.4. Những quan hệ không nên suy diễn

| Cách gán dễ nhầm | Cách hiểu sát code |
| --- | --- |
| Mọi UC đều `include` đăng nhập | Phiên hợp lệ là tiền điều kiện của UC được bảo vệ; người dùng không đăng nhập lại trong mọi thao tác |
| Tạo Job `include` Admin duyệt Job | Đây là các UC khác Actor, diễn ra ở các thời điểm khác nhau; tạo bản nháp hoàn tất mà chưa gửi duyệt |
| Ứng tuyển `include` Organizer chấp nhận | Gửi đơn kết thúc ở `PENDING`; xét duyệt là mục tiêu riêng xảy ra sau |
| Chấp nhận lời mời `include` Organizer duyệt lại | Không có bước này trong code |
| Từ chối đơn/lời mời là `extend` chấp nhận | Đây là các quyết định thay thế của xử lý đơn/lời mời, không bổ sung vào một lần chấp nhận đã thành công |
| Hủy đơn và rút sau xác nhận là cùng thao tác | Hai đối tượng/quy trình khác nhau: `Application` đang chờ và `WithdrawalRequest` của tham gia đã xác nhận |
| UC27 `include` UC51 | Quyết định từ chối đã xảy ra trước đó, là tiền điều kiện; UC27 không gọi lại hành vi từ chối |
| Gợi ý AI `include` gửi lời mời/ứng tuyển | Gợi ý hoàn tất bằng kết quả đọc; thao tác tuyển phải do người dùng chọn riêng |
| Đổi mật khẩu `include` đăng xuất thông thường | Đổi mật khẩu thu hồi mọi phiên; UC09 chỉ thu hồi phiên hiện tại, không phải cùng hành vi hoàn toàn |
| Xóa Job luôn `include` lưu trữ | Xóa vật lý và lưu trữ là hai nhánh loại trừ theo lịch sử kết nối |
| Mỗi API là một Use Case | Xác thực kênh Pusher, callback upload, đọc phiên, phân trang hay khóa hàng là hỗ trợ kỹ thuật |

## 9. Trạng thái triển khai và khoảng trống có bằng chứng

### 9.1. Đã có đường đi chức năng trong source

| Nhóm | Kết luận có thể đưa vào mô tả hệ thống hiện tại | Bằng chứng |
| --- | --- | --- |
| Tài khoản | Đăng ký KOL/Organizer; đăng nhập 3 vai trò; đăng xuất; đổi mật khẩu | S02–S03; route `/api/auth/*`; trang đăng nhập/đăng ký/bảo mật |
| Khám phá/hồ sơ | Tìm kiếm/lọc/phân trang; xem thông tin theo quyền; hồ sơ, kỹ năng, kinh nghiệm, trạng thái công khai và mạng xã hội | S04–S05; các trang `/jobs`, `/kols`, hồ sơ |
| Vòng đời Job | Nháp, gửi duyệt, duyệt/từ chối/ẩn, sửa và duyệt lại, mở/đóng, hoàn thành, xóa/lưu trữ | S06–S07, S13; S01 có enum/trường cần thiết |
| Kết nối | Ứng tuyển, hủy/gửi lại đơn, xét duyệt; mời/mời lại, KOL phản hồi; xác nhận và kiểm soát chỉ tiêu | S08–S09 |
| Rút tham gia | Yêu cầu, xét duyệt, giữ chỗ khi chờ/bị từ chối, rời có/không chấp thuận, lịch sử và tham gia lại | S08–S11; migration rút tham gia |
| Quản trị | Thống kê/biểu đồ, tài khoản, khóa/mở, quản lý và kiểm duyệt Job | S07; các trang `/admin/*` |
| Thông báo | Lưu thông báo, đọc theo chủ sở hữu, đánh dấu đã đọc; cập nhật qua Pusher và dự phòng định kỳ | S12 |
| AI | Matching có trọng số; catalog xếp hạng; điểm ở lời mời; chatbot chỉ đọc và chọn Job theo ngữ cảnh | S11, S14–S16 |

### 9.2. Một phần, chưa đồng bộ hoặc chưa xác minh vận hành

| Hạng mục | Trạng thái chính xác | Bằng chứng/giới hạn |
| --- | --- | --- |
| Admin hoàn thành Job — UC65 | MP: có xử lý backend và API, thiếu nút giao diện | `jobStatusSchema` chấp nhận `COMPLETED`; `setJobStatus` cho `ADMIN`; `AdminJobs` chỉ có đóng/mở/xóa/ẩn |
| Áp dụng schema lên database thật | Chưa xác minh | Kết nối đọc trong lần khảo sát báo `P1001`; không đọc được bảng thật hoặc lịch sử migration |
| Upload ảnh | ĐK: code có đầy đủ luồng, cần token/dịch vụ | Giao diện kiểm tra `UPLOADTHING_TOKEN`, route/service thực hiện kiểm tra quyền; chưa xác minh upload thật |
| Chatbot Gemini | ĐK: code gọi dịch vụ và xử lý lỗi đã có | Cần `API_KEY_AI` hoặc `GEMINI_API_KEY`, endpoint/model được dịch vụ hỗ trợ; chưa gọi dịch vụ thật trong khảo sát |
| Thông báo tức thời | ĐK: có tích hợp, vẫn có kiểm tra định kỳ | Cần cấu hình Pusher; chưa xác minh kênh thật |
| Nhúng nội dung xã hội | HT ở phần URL/khung nhúng; kết quả hiển thị phụ thuộc nền tảng | Chưa có API kiểm tra quyền sở hữu/còn công khai; có liên kết dự phòng |
| Đồng bộ quy tắc giao diện/backend ở Job hoàn thành | Có giới hạn cần ghi nhận | UI ẩn nút từ chối đơn/lời mời khi Job hoàn thành, nhưng nhánh từ chối trong `decideApplication`/`respondInvitation` chưa kiểm tra hoàn thành như nhánh chấp nhận; không suy ra backend cấm mọi quyết định trên Job hoàn thành |
| Quy tắc ẩn Job đã hoàn thành | Backend vẫn cho phép nếu Job được duyệt, chưa lưu trữ | `hideJob` không chặn `COMPLETED`; không mô tả hoàn thành là khóa tuyệt đối mọi thao tác quản trị |
| Lịch hợp tác tại tổng quan KOL | Dữ liệu hiển thị có thể gồm lịch sử đã rời | `confirmedJobs` lấy mọi Participation của KOL, tổng quan lấy vài mục đầu mà không lọc trạng thái; các số đếm hiệu lực dùng bộ lọc khác |
| Biểu đồ kết nối Admin | Là thống kê theo thời điểm tạo bản ghi, chưa phải số lần tái tham gia | `adminActivity` dùng `Participation.createdAt`; `confirmParticipant` cập nhật lại bản ghi khi tham gia lại |
| Tài liệu cũ | Có thông tin không còn phản ánh source | `docs/design-status.md` nói AI chưa triển khai, nhưng S14–S16 và API/UI đã có; README/MySQL còn số bảng cũ |

**Không tìm thấy dấu hiệu đủ chắc để khẳng định một nhóm UC khác đang được lập trình dở dang chỉ từ nhãn TODO hoặc trang giả.** “Chưa kiểm chứng trên môi trường thật”, “cần cấu hình dịch vụ”, “mới có API” và “chưa triển khai” là các kết luận khác nhau. Nếu báo cáo bắt buộc có mục “đang triển khai”, có thể ghi UC65 là phần giao diện chưa hoàn thiện, đồng thời nêu rõ đây là đánh giá độ đầy đủ từ code, không xác nhận kế hoạch phát triển.

### 9.3. Chưa triển khai trong phạm vi khảo sát

Các mục dưới đây chỉ để xác định giới hạn hệ thống, **không phải danh sách yêu cầu mới hoặc UC đã có**.

| Chức năng dễ bị suy diễn | Kết luận và bằng chứng |
| --- | --- |
| Thanh toán, ví, đặt cọc/giữ tiền, hóa đơn | CĐ: không có model giao dịch/ví/thanh toán, route hay service xử lý; ngân sách Job chỉ là khoảng tiền mô tả |
| Hợp đồng điện tử, chữ ký, thương lượng báo giá | CĐ: không có model/route hợp đồng hoặc báo giá; `KolProfile` không có bảng giá |
| Đánh giá sao, điểm uy tín, phạt rút tham gia | CĐ: không có dữ liệu/logic đánh giá hoặc phạt; trạng thái rời không chấp thuận chỉ được ghi nhận |
| Bàn giao nội dung, duyệt sản phẩm, đo ROI | CĐ: không có model/route nộp sản phẩm, duyệt sản phẩm hoặc đo kết quả chiến dịch |
| Chat trực tiếp KOL–Organizer | CĐ: tin nhắn hiện có là nội dung đơn/lời mời/thông báo và hội thoại với AI; không có phòng chat/tin nhắn hai người |
| Quên mật khẩu, OTP, xác minh email, đăng nhập mạng xã hội | CĐ: không có route/token khôi phục/OTP/OAuth; chỉ có đổi mật khẩu bằng mật khẩu hiện tại |
| Admin tự tạo người dùng/đổi vai trò/xóa tài khoản qua web | CĐ: API quản lý người dùng chỉ cập nhật `active`; schema đầu vào không chấp nhận role; công cụ local tạo Admin không phải màn hình web |
| Admin duyệt hồ sơ KOL hoặc xác minh danh tính | CĐ: hồ sơ chỉ có `isPublic`; không có trạng thái hồ sơ chờ xác minh hoặc giấy tờ xác minh |
| Organizer thu hồi lời mời hoặc tự loại KOL đã xác nhận | CĐ: không có thao tác tương ứng; `WITHDRAWN` của lời mời được ghi trong luồng KOL rời |
| Admin xử lý thay yêu cầu rút | CĐ: `decideWithdrawal` chỉ cấp `ORGANIZER` và kiểm tra chủ Job |
| Thu hồi/hủy yêu cầu rút hoặc gửi lại ngay khi bị từ chối | CĐ: không có route hủy; `requestWithdrawal` chỉ nhận tham gia `CONFIRMED`; sau từ chối chỉ có xác nhận rời |
| Đồng bộ mạng xã hội, follower, tương tác, phân tích nội dung tự động | CĐ: chỉ có `SocialLink` và hiển thị liên kết/nhúng, không có API/token/thống kê mạng xã hội |
| AI tự viết Job/hồ sơ, tự gửi lời mời/ứng tuyển/duyệt, huấn luyện matching | CĐ: công cụ chatbot chỉ đọc; matching là công thức cố định, không có mô hình huấn luyện hoặc thao tác tự động ghi nghiệp vụ |
| Tự đóng/hoàn thành Job theo lịch, tự nhắc hạn bằng tác vụ định kỳ | CĐ: không có bộ lập lịch nghiệp vụ; truy vấn chỉ kiểm tra thời gian lúc đọc/xử lý |
| Lưu hội thoại lâu dài, lịch sử chat qua thiết bị, AI tính phí | CĐ: không có model hội thoại/thu phí; lịch sử chỉ ở bộ nhớ giao diện |
| Yêu thích, theo dõi KOL/Job, khiếu nại, thông báo email/SMS, xuất báo cáo | CĐ: không có model/route/luồng sử dụng tương ứng; biểu đồ Admin chỉ có xem bảng số liệu |
| Danh sách công khai và trang hồ sơ Organizer riêng | CĐ ở dạng phân hệ độc lập: hồ sơ tổ chức có trang chỉnh sửa của chủ và thông tin gắn trong Job; không có catalog/trang công khai Organizer riêng |

### 9.4. Bằng chứng kiểm thử và giới hạn của khảo sát

| Nguồn kiểm thử đã đối chiếu | Nội dung có kịch bản kiểm tra | Cách sử dụng làm bằng chứng |
| --- | --- | --- |
| `tests/business.test.ts` | Tài khoản, phân quyền, Job, kết nối, chỉ tiêu đồng thời, hồ sơ/ảnh, thông báo, rút và hoàn thành | Là các kịch bản dùng database kiểm thử MySQL; không lấy việc tồn tại test làm bằng chứng đã chạy đạt |
| `tests/routes.test.mjs` | Luồng API biên dịch, cookie, nguồn yêu cầu, quyền sở hữu, upload, thông báo, AI và rút | Cần môi trường test và database riêng; khảo sát này không chạy |
| `tests/withdrawal-policy.test.ts`, `tests/withdrawal-services.test.ts` | Điều kiện rút, giữ/giải phóng chỗ, từ chối/rời, lịch sử, retry và đồng thời | Có kiểm thử chính sách và service với đối tượng mô phỏng database; không chứng minh khóa MySQL thật |
| `tests/ai.test.ts`, `tests/chat-ui.test.tsx` | Matching, quyền công cụ, ngữ cảnh chọn Job, lỗi dịch vụ, định dạng hội thoại | Có mô phỏng dịch vụ/database; không chứng minh dịch vụ Gemini đang hoạt động |
| `tests/password-change.test.ts`, `tests/validation.test.ts` | Mật khẩu, thu hồi phiên, đầu vào và dữ liệu hồ sơ | Kiểm tra các quy tắc tương ứng trong code |
| `tests/profile-ui.test.tsx`, `tests/social-embeds.test.tsx`, `tests/realtime.test.ts` | Trạng thái nút, hồ sơ/ảnh, nhúng, kênh riêng và phát sau commit | Kiểm tra cấu trúc/logic; không tương đương xác nhận nền tảng ngoài trực tiếp |
| `scripts/browser-check.mjs` | Kịch bản trình duyệt cho các luồng và giao diện | Có kịch bản, chưa chạy lại trong khảo sát |
| `docs/verification.md`, `docs/verification-history.md`, `docs/chatbot-fix.md` | Báo cáo kiểm thử từ các lần trước | Chỉ là ghi nhận lịch sử; không chuyển kết quả đó thành kết quả của ngày khảo sát |

Không chạy `npm run dev`: `scripts/dev.mjs` tự generate/migrate trước khi chạy. Không chạy `npm test`/kiểm thử API/trình duyệt: harness tạo database, áp migration và ghi dữ liệu. Những thao tác này không cần thiết để lập tài liệu và vượt yêu cầu chỉ đọc database của lần khảo sát.

## 10. Bảng đối chiếu trang, API và xử lý

### 10.1. Quy tắc quy đổi đường dẫn nguồn

Nhóm `(customer)` và `(admin)` chỉ tổ chức thư mục, không xuất hiện trên URL. Ví dụ `/kol/profile` nằm ở `src/app/(customer)/kol/profile/page.tsx`; `/admin/jobs` nằm ở `src/app/(admin)/admin/jobs/page.tsx`.

Mỗi API có tệp `route.ts` trong thư mục tương ứng bên dưới `src/app/api`, giữ nguyên đoạn `[id]`. Ví dụ `PATCH /api/withdrawals/[id]` nằm ở `src/app/api/withdrawals/[id]/route.ts`.

### 10.2. Tất cả 36 tệp API hiện có

| API | Phương thức | Actor/phạm vi xử lý | UC hoặc vai trò kỹ thuật |
| --- | --- | --- | --- |
| `/api/auth/register` | POST | Guest chọn KOL/Organizer | UC06 |
| `/api/auth/login` | POST | Tài khoản bất kỳ trong 3 vai trò, phải hoạt động | UC07 |
| `/api/auth/logout` | POST | Thu hồi phiên hiện tại nếu có | UC09 |
| `/api/auth/password` | PATCH | KOL/Organizer/Admin, chính tài khoản | UC10 |
| `/api/auth/session` | GET | Trả Actor phiên hiện tại hoặc `null` | Hỗ trợ nhận diện phiên, không tách UC |
| `/api/jobs` | GET, POST | GET công khai; `scope=mine` cho Organizer; POST tạo nháp bởi Organizer | UC02, UC33, UC35 |
| `/api/jobs/[id]` | GET, PATCH, DELETE | GET công khai hoặc `scope=mine` của Organizer; PATCH sửa bởi chủ Organizer; DELETE bởi chủ Organizer hoặc Admin | UC03, UC34, UC36, UC42/UC64 |
| `/api/jobs/[id]/submit` | POST | Organizer chủ Job | UC37 |
| `/api/jobs/[id]/status` | PATCH | Organizer chủ Job hoặc Admin | UC39–UC41, UC63/UC65 |
| `/api/jobs/[id]/participants` | GET | Organizer chủ Job | UC48; không cấp Admin trong service này |
| `/api/kols` | GET | Công khai | UC04; API này không xử lý `matchJob` thành xếp hạng |
| `/api/kols/[id]` | GET | Chỉ hồ sơ công khai | UC05; khác phạm vi trang có `kolForViewer` |
| `/api/profiles/kol` | GET, PATCH | KOL chính chủ | UC14–UC16 |
| `/api/profiles/organizer` | GET, PATCH | Organizer chính chủ | UC31 |
| `/api/applications` | GET, POST | GET KOL của mình/Organizer chủ Job; POST chỉ KOL | UC18/UC43, UC19 |
| `/api/applications/[id]` | PATCH | KOL chủ đơn hủy; Organizer chủ Job chấp nhận/từ chối | UC20, UC44–UC45 |
| `/api/invitations` | GET, POST | GET KOL được mời/Organizer chủ Job; POST chỉ Organizer | UC21/UC47, UC46 |
| `/api/invitations/[id]` | PATCH | Chỉ KOL được mời, chấp nhận/từ chối | UC22–UC23 |
| `/api/withdrawals` | GET, POST | GET KOL của mình/Organizer chủ Job; POST KOL chủ tham gia | UC26/UC49, UC25 |
| `/api/withdrawals/[id]` | PATCH | Organizer chủ Job | UC50–UC51 |
| `/api/withdrawals/[id]/depart` | POST | KOL chủ tham gia sau khi yêu cầu bị từ chối | UC27 |
| `/api/notifications` | GET, PATCH | Người nhận trong 3 vai trò; GET hỗ trợ `summary=1` hoặc phân trang; PATCH đọc tất cả | UC11–UC12 |
| `/api/notifications/[id]` | PATCH | Người nhận chính chủ | UC12 |
| `/api/media/[id]` | DELETE | KOL/Organizer chủ ảnh, cần cấu hình UploadThing | UC17/UC32/UC38 |
| `/api/uploadthing` | GET, POST | Luồng UploadThing; phần tải kiểm tra KOL/Organizer, phần gọi lại theo cơ chế dịch vụ | Hỗ trợ UC17/UC32/UC38; router ở `src/app/api/uploadthing/core.ts` |
| `/api/pusher/auth` | POST | Người dùng hoạt động, chỉ kênh thông báo riêng của mình | Hỗ trợ UC11; không phải UC “xác thực Pusher” riêng |
| `/api/ai/recommendations` | GET | KOL nhận Job của mình; Organizer phải truyền Job thuộc mình | UC28/UC52; không cấp Guest/Admin |
| `/api/ai/chat` | POST | Guest hoặc người dùng; danh sách công cụ theo vai trò | UC08 |
| `/api/admin` | GET | Admin | UC53 |
| `/api/admin/users` | GET | Admin; API trả danh sách không áp bộ lọc của trang | UC55 |
| `/api/admin/users/[id]` | PATCH | Admin, đối tượng phải là KOL/Organizer | UC56–UC57; chỉ đổi `active` |
| `/api/admin/jobs` | GET | Admin | UC58 |
| `/api/admin/jobs/[id]` | PATCH, DELETE | Admin | UC63–UC65; không có PATCH sửa nội dung Job tại đây |
| `/api/admin/jobs/[id]/moderation` | PATCH | Admin | UC60–UC61 |
| `/api/admin/jobs/[id]/hide` | PATCH | Admin | UC62 |
| `/api/admin/moderation` | GET | Admin, chỉ Job `PENDING` | UC59 |

### 10.3. Trang đọc trực tiếp service cần chú ý

| Trang | Xử lý trực tiếp | Ý nghĩa khi đối chiếu |
| --- | --- | --- |
| `/` | `publicStats`, `publicJobs`, `publicKols`, `currentActor` | Không có API thống kê trang chủ riêng |
| `/kol/dashboard`, `/organizer/dashboard` | `overview` và các service danh sách | Không có API dashboard KOL/Organizer riêng |
| `/kol/jobs` | `confirmedJobs` | Không có route API `/api/participations` hoặc `/api/kol/jobs` |
| `/organizer/jobs` | `ownJobPage` | Bộ lọc/phân trang riêng của trang; khác API `scope=mine` |
| `/organizer/jobs/[id]` | `ownJob`, `participants`, `withdrawals(actor,id)`, `ownMedia` | Lọc yêu cầu rút theo Job không phải tham số được API `/api/withdrawals` sử dụng |
| `/kols?matchJob=...` | `organizerMatchJobs`, `matchedKolCatalog` | Xếp hạng thực hiện phía máy chủ của trang; GET `/api/kols` vẫn là tìm kiếm công khai |
| `/jobs/[id]`, `/kols/[id]` | `jobForViewer`, `kolForViewer` | Quyền xem lại/riêng tư rộng hơn API công khai tương ứng |
| `/admin` | `adminOverview`, `adminActivity`, `adminJobs` | Biểu đồ và kết nối gần đây không cần API riêng |
| `/admin/users` | `adminUsers(actor,role)` rồi lọc từ khóa trên trang máy chủ | Tìm/lọc có trên trang, dù API GET không nhận bộ lọc đó |

### 10.4. Công cụ vận hành và thao tác kỹ thuật không đưa thành UC web

| Tệp/cơ chế | Khả năng hiện có | Cách phân loại |
| --- | --- | --- |
| `scripts/demo-admin.ts` | Tạo/đặt lại mật khẩu/mở hoạt động Admin demo, thu hồi phiên; không nâng quyền tài khoản KOL/Organizer trùng email | Công cụ local; không phải UC Guest đăng ký Admin hay Admin đổi mật khẩu người khác qua web |
| `prisma/seed.ts`, `prisma/profile-fixtures.ts` | Khởi tạo tài khoản/hồ sơ/Job/quan hệ minh họa | Dữ liệu phục vụ môi trường, không phải Actor hoặc chức năng tự tạo kết nối giả trong nghiệp vụ |
| `scripts/complete-profile.ts` | Bổ sung dữ liệu mẫu cho KOL bằng dòng lệnh | Công cụ local; khác nút điền mẫu rồi lưu của UC14 |
| `scripts/cleanup-media.ts` | Dọn ảnh không còn ở vị trí hiện hành | Bảo trì tích hợp lưu trữ, không phải chức năng Admin quản lý mọi ảnh qua web |
| `scripts/setup.mjs`, `scripts/dev.mjs`, `scripts/prisma.mjs`, `scripts/check-database.mjs` | Cấu hình, generate, migrate, kiểm tra kết nối/schema | Vận hành kỹ thuật; không phải UC nghiệp vụ của nền tảng |
| `authorize`, `assertOwner`, Zod, kiểm tra nguồn yêu cầu, transaction/khóa Job | Bảo vệ tính đúng đắn của đọc/ghi | Điều kiện và xử lý bên trong UC |
| Callback upload, chữ ký kênh Pusher, phát sự kiện sau commit, đọc phiên | Phối hợp các thành phần/dịch vụ | Hỗ trợ các UC đã liệt kê, không tách mỗi endpoint thành mục tiêu người dùng |
| Mở menu, đổi tab, ẩn/hiện mật khẩu, mở/đóng chatbot, tải lại trang lỗi | Tương tác giao diện | Bước giao diện của UC, không phải Use Case nghiệp vụ độc lập |

## 11. Gợi ý phạm vi khi tự xây dựng sơ đồ

Có thể nhóm các UC thành: **khám phá và tài khoản; hồ sơ; vòng đời Job/kiểm duyệt; ứng tuyển và lời mời; tham gia và rút; thông báo; gợi ý và trợ lý; quản trị**. Đây là cách tổ chức sơ đồ, không bổ sung phân hệ hay quyền mới.

Khi cần sơ đồ tổng quan gọn, có thể gộp các cặp quyết định vào UC tổng quát “Xét duyệt đơn”, “Phản hồi lời mời”, “Xử lý yêu cầu rút”, “Kiểm duyệt Job”, rồi giữ UC chấp nhận/từ chối trong đặc tả luồng thay thế. Việc gộp này chỉ thay độ chi tiết của mô hình; cần giữ nguyên quyền Actor, đối tượng dữ liệu, điều kiện trạng thái và hai đường xác nhận tham gia đã phân tích.

Khi mô tả trạng thái triển khai trong báo cáo, nên ghi “đã có triển khai trong source” cho nhóm HT/ĐK, nêu riêng UC65 mới có API và giới hạn chưa truy vấn được MySQL thật. Không dùng thông tin cũ nói AI chưa triển khai, không mặc định 12 bảng, và không đưa các mục CĐ vào sơ đồ chức năng hiện tại.
