import { pageActor } from "@/lib/permissions/guards";
import { PageHeading } from "@/components/ui";
import { JobForm } from "@/components/organizer/job-form";
import { Icon } from "@/components/ui/icon";
export const metadata = { title: "Tạo Job" };
export default async function Page() {
  await pageActor("ORGANIZER");
  return (
    <>
      <PageHeading
        title="Đăng tin tuyển dụng Job mới"
        description="Lưu bản nháp, kiểm tra nội dung rồi gửi Job đi kiểm duyệt."
      />
      <div className="form-layout">
        <div className="panel form-panel">
          <JobForm />
        </div>
        <aside className="panel form-guidance">
          <span className="icon-tile">
            <Icon name="briefcase" />
          </span>
          <h2>Một Job rõ ràng, một kết nối tốt</h2>
          <ul>
            <li>Nêu rõ nội dung sự kiện và công việc của KOL.</li>
            <li>Chọn lĩnh vực và địa điểm phù hợp.</li>
            <li>Công khai ngân sách và lịch trình.</li>
            <li>Tạo bản nháp, thêm ảnh bìa rồi gửi kiểm duyệt.</li>
          </ul>
          <p>Job xuất hiện công khai sau khi quản trị viên phê duyệt.</p>
        </aside>
      </div>
    </>
  );
}
