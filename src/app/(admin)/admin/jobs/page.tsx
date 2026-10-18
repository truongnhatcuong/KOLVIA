import { pageActor } from "@/lib/permissions/guards";
import { adminJobs } from "@/services/admin";
import { PageHeading } from "@/components/ui";
import { AdminJobs } from "@/components/admin/jobs";
export const metadata = { title: "Quản lý Job" };
export default async function Page() {
  const actor = await pageActor("ADMIN");
  return (
    <>
      <PageHeading
        title="Quản lý toàn bộ Job."
        description="Đọc nội dung, theo dõi trạng thái và quản lý Job trên nền tảng."
      />
      <AdminJobs jobs={await adminJobs(actor)} />
    </>
  );
}
