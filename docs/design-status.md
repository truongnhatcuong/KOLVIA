# Đối chiếu thiết kế Stitch

Nguồn UI chính: thư mục người dùng cung cấp `stitch_kol_connect_ai_ui_ux_design 2/`. Đã đọc 12 file `code.html`, xem 12 `screen.png` và đọc `kol_connect_ai/DESIGN.md` ngày 12/10/2026. Không sửa bản export gốc.

Đây là bản export local. Chưa truy cập thành công project qua Google Stitch MCP, nên không xác nhận nội dung hoặc phiên bản hiện tại trên project `15323104794696825472` trùng bản export này.

## Ánh xạ màn hình

| Màn hình export                                      | Trang triển khai                                    | Điều chỉnh theo phạm vi đồ án                                                    |
| ---------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `trang_ch_kol_connect_ai`                            | `/`                                                 | Hero, số liệu thực, Job/KOL cards, các bước hợp tác, CTA, footer                 |
| `danh_s_ch_job_kol_connect_ai`                       | `/jobs`                                             | Từ khóa, category chips, địa điểm, ngân sách, sắp xếp và phân trang              |
| `kh_m_ph_kol_kol_connect_ai`                         | `/kols`                                             | Lọc tên/lĩnh vực/địa điểm/kênh; không follower, ER hoặc điểm AI                  |
| `ng_nh_p_ng_k_kol_connect_ai`                        | `/login`, `/register`                               | Form bên trái, lợi ích bên phải; role cards chỉ khi đăng ký                      |
| `chi_ti_t_job_ng_tuy_n_kol_connect_ai`               | `/jobs/[id]`                                        | Cover, thông tin, ngân sách, Organizer, form ứng tuyển                           |
| `dashboard_kol_t_ng_quan_ai_matching`                | `/kol/dashboard`                                    | Stats, Job mới, ứng tuyển, lời mời, lịch hợp tác; thay AI bằng khám phá thủ công |
| `dashboard_nh_t_ch_c_kol_connect_ai`                 | `/organizer/dashboard`                              | Stats, Job của mình, ứng viên, tìm KOL, cập nhật tổ chức                         |
| `h_s_c_nh_n_portfolio_kol_connect_ai`                | `/kol/profile`, `/kols/[id]`                        | Cover/avatar, thông tin, URL mạng xã hội, portfolio; UploadThing                 |
| `ng_tin_tuy_n_d_ng_job_m_i_kol_connect_ai`           | `/organizer/jobs/new`                               | 4 bước nhập/review, lưu nháp, thêm ảnh rồi gửi kiểm duyệt                        |
| `qu_n_l_n_ng_tuy_n_l_i_m_i_kol_connect_ai`           | `/kol/applications`, `/kol/invitations`             | Tabs, stats, bộ lọc thực, trạng thái và phản hồi                                 |
| `qu_n_l_ng_vi_n_duy_t_b_i_nh_p_kol_connect_ai`       | `/organizer/applications`, `/organizer/invitations` | Hồ sơ ứng viên, duyệt/từ chối, trạng thái; phần duyệt bài nháp triển khai sau    |
| `b_o_c_o_roi_chi_n_d_ch_h_p_ng_i_n_t_kol_connect_ai` | Chưa triển khai                                     | ROI, eContract và nghiệp vụ tài chính nằm ngoài phạm vi hiện tại                 |

Không có màn Admin hoặc hồ sơ tổ chức riêng trong export: áp dụng hệ màu, sidebar, cards và form dùng chung. Màn chỉnh sửa Job và trạng thái lỗi/loading/empty cũng dùng component chung.

## Design system

- Font: Be Vietnam Pro, 400/500/600/700; lưu tại `public/fonts/`, tải từ repository Google Fonts, kèm giấy phép OFL. Dùng `next/font/local`, không cần kết nối Google Fonts khi chạy.
- Primary `#3525cd`, primary-container `#4f46e5`, secondary `#712ae2`, nền `#faf8ff`, surface trắng, các lớp lavender `#f2f3ff`/`#eaedff`.
- Text `#131b2e`, text phụ `#464555`, success `#006e4b`, error `#ba1a1a`.
- Public container tối đa 1280px, gutters 24px, cards bo 14–20px; sidebar desktop 260px, header 72px.
- Breakpoints được điều chỉnh cho tablet/mobile; export không có screenshot mobile riêng. CSS hỗ trợ 1100/900/760/480px và reduced-motion.
- Component dùng chung: Icon SVG, Button, Badge, PageHeading, cards, form, image/fallback, upload, tabs, filters và empty/loading.

## Tài nguyên ảnh

Theo yêu cầu triển khai lại và thêm ảnh KOL giả lập, đã tạo 6 chân dung AI cho các tài khoản seed (`linh`, `an`, `khanh`, `mai`, `huy`, `thao` @kolvia.local), lưu tại `public/images/demo-kols/`. Ảnh bìa không gian sáng tạo được tạo riêng và lưu tại `public/images/creator-workspace.png`. Bộ ảnh chạy từ asset local, không phụ thuộc URL Google trong export. Prompt và nguồn tạo ảnh được ghi tại `public/images/demo-kols/README.md`.

`demoPortrait` chỉ ánh xạ email demo chính xác. Query công khai loại email ra khỏi DTO sau khi xác định ảnh minh họa, không phát hành email qua API. Ảnh người dùng đã upload được ưu tiên trên danh sách, trang chủ, hồ sơ và dashboard. Card demo có nhãn Demo, trang hồ sơ có chú thích ảnh AI. Ảnh local được tối ưu qua Next Image với kích thước phù hợp avatar.

## Đợt chỉnh sửa theo phản hồi giao diện

Đối chiếu lại screenshot và HTML: homepage dùng tiêu đề đen không ngắt dòng cứng, hero 7/5, preview thẳng với thanh tiêu đề và thẻ KOL nằm trong khung; dải số liệu dọc, nền riêng cho KOL và CTA căn giữa. Header cao 64px, có điều hướng quy trình và brand lockup. Danh sách Job/KOL có breadcrumb, tiêu đề, card thông tin và CTA theo bố cục export. Login/register tách form trắng bên trái và panel lợi ích lavender bên phải, thẻ vai trò, icon input và nút hiện/ẩn mật khẩu.

Dashboard KOL dùng một cột Job lớn cạnh sidebar lời mời/lịch; Organizer dùng panel Job với các thẻ lavender, tìm KOL và hướng dẫn quy trình. Thanh tìm kiếm dashboard dùng form GET thật. Trang quản lý đơn/lời mời có cột hướng dẫn và tiến trình dựa trên trạng thái bản ghi. Chi tiết Job gộp cover/thông tin thành một card, chia riêng ứng tuyển, tổ chức và quy trình tuyển dụng ở cột phải. Nút Mời hợp tác trên card KOL chuyển đến form tại hồ sơ, nơi kiểm tra role và Job đủ điều kiện trước khi gửi.

Các chức năng đã hoãn vẫn được đối chiếu trong bảng phạm vi; không dựng điểm AI, ví, hợp đồng, số follower hoặc thống kê giả để lấp ô trong thiết kế. Nội dung và ảnh thực tế phụ thuộc dữ liệu MySQL/ảnh đã upload. Chưa khẳng định khớp pixel; Chromium độc lập vẫn không khởi chạy được. Script browser đã bổ sung screenshot riêng từng trang ở 1440/390px, cả chi tiết KOL và nút hiện/ẩn mật khẩu; cần TEST_DATABASE_URL để chạy trên máy có MySQL và Chromium.

## Những phần được hoãn

AI matching, AI recommendation, chatbot, điểm tương thích và thống kê mạng xã hội tự động chưa triển khai. Escrow, thanh toán, eContract, ROI, đánh giá KOL và kiểm duyệt nội dung bàn giao ngoài phạm vi được duyệt cũng chưa triển khai. Không tạo dữ liệu giả cho các phần này.

## Giới hạn đối chiếu

Đã đối chiếu nguồn HTML/screenshot và áp dụng vào code. Chưa so sánh pixel hoặc xem giao diện chạy thực tế bằng trình duyệt trong phiên này vì môi trường chặn server local và Chromium. Không khẳng định khớp 100% hoặc responsive đã đạt kiểm thử trực quan.

## Triển khai lại bằng Next.js + Tailwind CSS

- Tách `HomeView` khỏi phần lấy dữ liệu, dựng lại hero, preview cơ hội, metrics, danh sách, quy trình và CTA theo bố cục HTML Stitch.
- Dựng lại JobCard/KolCard bằng Tailwind; giữ dữ liệu thật từ database. Card KOL hiển thị lĩnh vực, số kênh và ảnh portfolio thực tế thay cho chỉ số AI/follower chưa có nghiệp vụ.
- Đưa CSS component vào `@layer components`, khai báo design tokens trong `@theme inline` để utility Tailwind điều chỉnh đúng thứ tự ưu tiên. Container riêng `site-container` tránh xung đột utility container.
- Header có điều hướng active và menu điện thoại. Bộ lọc dùng nhãn lĩnh vực tiếng Việt, chọn lĩnh vực gửi form GET thật và phân trang dùng các số trang.
- Dựng lại shell/sidebar điều hướng và StatCards bằng Tailwind, desktop có sidebar cố định theo cuộn và mobile có thanh điều hướng ngang. Dùng ảnh avatar upload/demo trong dashboard.
- Không thay bản HTML export gốc, schema database hoặc API ghi dữ liệu.

Đã kiểm tra production build, TypeScript và ESLint. Database hiện dừng tại P1001; chưa xác minh nghiệp vụ hoặc đối chiếu screenshot ứng dụng chạy thực tế.
