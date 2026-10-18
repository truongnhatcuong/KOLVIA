import { pageActor } from "@/lib/permissions/guards";
import { adminJobs } from "@/services/admin";
import { PageHeading } from "@/components/ui";
import { AdminJobs } from "@/components/admin/jobs";
export const metadata = { title: "Kiểm duyệt Job" };
export default async function Page() {
  const actor = await pageActor("ADMIN");
  return (
    <>
      <PageHeading
        title="Kiểm duyệt cơ hội mới."
        description="Đọc mô tả và yêu cầu trước khi duyệt. Gửi lý do rõ ràng khi từ chối."
      />
      <AdminJobs jobs={await adminJobs(actor, true)} moderation />
    </>
  );
}
