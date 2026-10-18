import { paginate } from "@/lib/pagination";
import { Pagination } from "@/components/customer/search";
import { pageActor } from "@/lib/permissions/guards";
import { adminJobs } from "@/services/admin";
import { PageHeading } from "@/components/ui";
import { AdminJobs } from "@/components/admin/jobs";
export const metadata = { title: "Kiểm duyệt Job" };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await pageActor("ADMIN");
  const view = paginate(await adminJobs(actor, true), (await searchParams).page);
  return (
    <>
      <PageHeading
        title="Kiểm duyệt cơ hội mới."
        description="Đọc mô tả và yêu cầu trước khi duyệt. Gửi lý do rõ ràng khi từ chối."
      />
      <AdminJobs jobs={view.items} moderation />
      <Pagination page={view.page} pages={view.pages} pathname="/admin/moderation" values={{}} />
    </>
  );
}
