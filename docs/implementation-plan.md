# KOLVIA — kế hoạch hoàn thiện

## Kiểm kê trước khi sửa

Đã duyệt schema, migration, toàn bộ nhóm routes Public/KOL/Organizer/Admin/API, các service, validation, permission guards, component form/upload/cards/navigation và harness test hiện có. Giữ App Router + TypeScript + Tailwind, session cookie HttpOnly, scrypt, kiểm tra Origin, kiểm tra quyền trong service và upload hiện có.

| Nhóm | Có trước lượt này | Bổ sung |
| --- | --- | --- |
| Database | User, Session, KolProfile, OrganizerProfile, SocialLink, Job, Application, Invitation, Participation, LoginAttempt, MediaAsset trên MySQL | Notification, kỹ năng/kinh nghiệm, quyền lợi, số lượng tuyển, constraints |
| Authentication | Register/login/logout, admin provisioning, rate limiting, backend roles | Sửa Origin local đã hoàn tất trước lượt này; kiểm thử hồi quy và rate limiter atomic |
| KOL | Hồ sơ, TikTok/Facebook, Job, ứng tuyển/rút đơn, lời mời, dashboard | Instagram/YouTube, kỹ năng/kinh nghiệm, lọc lịch/thù lao, job xác nhận riêng, thông báo |
| Organizer | Hồ sơ, CRUD/submit Job, quản lý đơn/lời mời, xác nhận, dashboard | Quyền lợi/capacity, lọc kỹ năng/kinh nghiệm, khóa transaction chống vượt chỉ tiêu |
| Admin | Stats, quản lý users/jobs, khóa/mở, duyệt/từ chối | Biểu đồ từ dữ liệu database, phân loại tài khoản, ẩn Job có lý do, thông báo |
| UI | Export Stitch local, font/ảnh local, responsive CSS/Tailwind | shadcn/ui primitives, thông báo, trường form và thống kê mới |

Không có tool Stitch MCP khả dụng trong phiên. Dùng `stitch_kol_connect_ai_ui_ux_design 2/` đã lưu. AI, thanh toán và mạng xã hội API nằm ngoài phạm vi.

## Giai đoạn 1 — Database

Prisma dùng MySQL theo yêu cầu mới. Khôi phục migration ban đầu `202610120004_mysql_initial` nguyên nội dung, thêm `202610120006_mysql_features` cho Notification, skills/experienceYears, benefits/capacity/recruitmentVersion. Các trường mới có default, chỉ tiêu ban đầu không thấp hơn số người đã xác nhận. Giữ URL và dữ liệu MySQL hiện hữu.

Đã bỏ database nhúng, script local, dependencies và test bridge. Harness test tạo database MySQL ngẫu nhiên, chỉ xóa database do nó tạo. Generate/validate đạt; migration trên server còn phụ thuộc kết nối MySQL truy cập được.

## Giai đoạn 2 — Authentication

Giữ register/login/logout, cookie HttpOnly, role guard Backend và tạo Admin bằng script. `services/auth.ts` chuyển bộ đếm đăng nhập sang upsert tăng nguyên tử. Origin vẫn strict trong production. Unit Origin đạt; đăng nhập với MySQL server còn cần TEST_DATABASE_URL.

## Giai đoạn 3 — KOL

Sửa validation, profiles service, public queries, form hồ sơ, social links, danh sách/chi tiết Job/KOL. Thêm Instagram/YouTube, kỹ năng/kinh nghiệm, khoảng thù lao và ngày sự kiện; trang `/kol/jobs`; read-only access cho Job gắn với kết nối của chính KOL; UI/API thông báo. Unit validation và TypeScript đạt. Chưa kiểm thử HTTP/browser trên database server.

## Giai đoạn 4 — Organizer

Sửa JobForm, JobTable, chi tiết/dashboard, services jobs/collaborations/recruitment. Thêm benefits/capacity, giữ CRUD/draft/submit. Khóa hàng Job trước đọc số KOL đã xác nhận, dùng chung hai luồng; capacity không được giảm thấp hơn số người hiện có. Đơn rút và lời mời đã từ chối có thể gửi lại cùng record, không cho trùng hiệu lực. Notifications ghi cùng transaction. TypeScript đạt; concurrency suite đã bổ sung, cần MySQL server đa kết nối.

## Giai đoạn 5 — Admin

Sửa services/admin, dashboard, AdminJobs; thêm activity-chart và API hide. Biểu đồ 30 ngày, thống kê từng vai trò và yêu cầu/lời mời, kết nối gần đây từ database; ẩn Job cần lý do và giữ lịch sử. User management có lọc vai trò; khóa/mở và backend guards giữ nguyên. TypeScript/ESLint/build đạt; chưa kiểm thử thao tác browser.

## Giai đoạn 6 — Kiểm thử và demo

Đã mở rộng business/API tests và wizard browser, giữ shadcn primitives. 16 unit test không cần database đạt. TypeScript, ESLint và production build được kiểm tra sau khi generate Client MySQL. Test nghiệp vụ/API/browser cần TEST_DATABASE_URL MySQL và quyền mở cổng.

Kiểm tra kết nối MySQL hiện tại báo P1001 trong môi trường agent; chưa xác nhận migration/seed/demo HTTP trên server. Xem `verification.md` và `mysql.md`.
