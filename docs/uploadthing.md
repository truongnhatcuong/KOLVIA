# UploadThing – cấu hình và kiểm tra

Đã tích hợp `uploadthing@7.7.4` và `@uploadthing/react@7.3.3` theo [hướng dẫn Next.js App Router](https://docs.uploadthing.com/getting-started/appdir). Không có token thật trong repository.

## Bật upload

1. Tạo/chọn một ứng dụng tại UploadThing Dashboard, sao chép token của ứng dụng.
2. Điền trực tiếp trên máy của bạn vào `.env` (file đã được Git ignore):

```dotenv
UPLOADTHING_TOKEN="token-cua-ung-dung-uploadthing"
APP_URL="http://127.0.0.1:3000"
```

3. Chạy `npm run db:generate`, `npm run db:migrate` nếu chưa chạy migration mới, rồi khởi động lại `npm run dev`.
4. `APP_URL` phải trùng origin đang mở trên trình duyệt. Không dùng tiền tố `NEXT_PUBLIC_` cho token và không đặt token trong source/frontend.
5. Khi deploy, dùng Node runtime, đặt token trong biến môi trường server, bảo đảm `/api/uploadthing` nhận được callback có chữ ký. Proxy chỉ bảo vệ `/kol`, `/organizer`, `/admin`, không chặn callback.

Khi chưa có token, các trang vẫn chạy và nút upload bị vô hiệu hóa với thông báo cấu hình còn thiếu. Phiên triển khai đã thêm chỗ điền token trong `.env` và `.env.example`, nhưng chưa thực hiện upload thật.

## Vị trí và giới hạn

| Vai trò   | Vị trí                                                  | Ảnh                                           |
| --------- | ------------------------------------------------------- | --------------------------------------------- |
| KOL       | `/kol/profile`                                          | Một avatar, một cover, tối đa 6 ảnh portfolio |
| Organizer | `/organizer/profile`                                    | Một logo tổ chức                              |
| Organizer | `/organizer/jobs/[id]` hoặc `/organizer/jobs/[id]/edit` | Một cover cho Job thuộc sở hữu                |

Chỉ JPG/JPEG, PNG, WebP; mỗi lần một ảnh, tối đa 4 MB. UI có chọn/kéo thả file, xem trước trước khi lưu, hủy lựa chọn, tiến trình, thay/xóa ảnh và lỗi. Sau khi chọn, bấm **Tải ảnh này** để lưu; file chưa được gửi khi chỉ đang xem trước. Khi lỗi, giữ lựa chọn để thử lại. Job mới cần được lưu nháp trước khi thêm ảnh để kiểm tra quyền sở hữu bằng ID thật.

Ảnh hiển thị ở hồ sơ công khai, cards KOL/Job, chi tiết Job và khu vực kiểm duyệt. Hồ sơ chưa công khai không được trả qua API công khai. Các ảnh UploadThing sử dụng URL CDN công khai: lựa chọn công khai hồ sơ kiểm soát hiển thị hồ sơ, không biến URL CDN thành file private.

## Luồng server

`src/app/api/uploadthing/core.ts` → middleware kiểm tra Origin, session, role, input Zod, Job ownership và giới hạn → UploadThing tải file → callback SDK xác minh chữ ký → service kiểm tra lại tài khoản/Job, lưu `MediaAsset` trong transaction → client nhận metadata từ server.

Client không được gửi URL, file key hoặc ownerId để gắn ảnh vào dữ liệu. Callback dùng `file.ufsUrl`, lưu key/owner/target/jobId/name/size để truy vết; DTO công khai chỉ trả id/target/url/name. Giới hạn portfolio được kiểm tra lại trong transaction để xử lý callback đến đồng thời. Callback lặp không tạo ảnh trùng hoặc khôi phục ảnh đã xóa.

Thay ảnh chuyển bản cũ ra khỏi slot đang dùng. Xóa ảnh kiểm tra đúng chủ sở hữu trong transaction; thay/xóa cover đang dùng của Job APPROVED đưa Job về PENDING để kiểm duyệt lại. Xóa lại cover cũ không làm thay đổi Job đã duyệt, và không cho xóa cover đang dùng của Job đã lưu trữ.

## Xóa file và thử lại

File không còn dùng được xóa qua `UTApi` sau khi database bỏ liên kết hiển thị. Xóa/thay ảnh và xóa Job chưa có lịch sử tự chạy cleanup. Callback không được gắn ảnh (ví dụ tài khoản đã khóa hoặc quota đã đầy) cũng tạo receipt ngoài slot trước khi cleanup để tránh mất dấu file. Cleanup tiếp tục các file còn lại nếu một file lỗi. Khi mạng hoặc nhà cung cấp lỗi, giữ receipt có `slot = null`, `deletedAt = null` trong database để thử lại ở lần thao tác tiếp theo. Có thể thử lại thủ công:

```sh
npm run media:cleanup
```

Lệnh này chỉ xóa file không còn slot và chưa xóa trên CDN, không xóa ảnh đang hiển thị. Khi xóa thành công, lưu `deletedAt` thay vì bỏ receipt để callback lặp không khôi phục ảnh. Job có lịch sử được lưu trữ và giữ ảnh. Tài khoản ứng dụng UploadThing và MySQL cần dùng cùng môi trường.

## Kiểm tra trên máy của bạn

- KOL tải avatar/cover/portfolio, mở hồ sơ công khai và danh sách KOL; tải ảnh quá 4 MB hoặc SVG phải bị từ chối.
- Đến ảnh thứ 6, nút thêm portfolio bị khóa; xóa một ảnh rồi thêm lại.
- Organizer tải logo và cover của Job nháp. Gửi Job, Admin xem ảnh trước khi duyệt.
- Thay cover đã duyệt: Job về PENDING và tạm biến mất khỏi Public cho đến khi được duyệt lại.
- Thử tài khoản khác sửa/xóa ảnh, hoặc dùng KOL tải logo/cover Job: server từ chối.
- Xem UploadThing Dashboard để xác nhận file cũ được xóa sau thay/xóa; kiểm tra lại sau restart.

Chưa kiểm chứng upload thật, callback thật hoặc xóa file trên CDN vì chưa có token. Bộ kiểm thử local dùng receipt/token giả để kiểm tra quyền và validation, từ chối callback giả và xử lý callback có chữ ký. Callback/xóa file có chữ ký dùng mock provider, không gửi upload lên dịch vụ thật.

`package.json` pin peer dependency Effect của `@effect/platform` về 3.17.7 cho cùng runtime UploadThing. Prisma vẫn sử dụng Effect 3.21.0 riêng, không thay ORM/database/authentication.
