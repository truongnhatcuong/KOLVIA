import { paginate } from "@/lib/pagination";
import { Pagination } from "@/components/customer/search";
import { pageActor } from "@/lib/permissions/guards";
import { adminJobs } from "@/services/admin";
import { PageHeading } from "@/components/ui";
import { AdminJobs } from "@/components/admin/jobs";
export const metadata = { title: "Quản lý Job" };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await pageActor("ADMIN");
  const view = paginate(await adminJobs(actor), (await searchParams).page);
  return (
    <>
      <PageHeading
        title="Quản lý toàn bộ Job."
        description="Đọc nội dung, theo dõi trạng thái và quản lý Job trên nền tảng."
      />
      <AdminJobs jobs={view.items} />
      <Pagination page={view.page} pages={view.pages} pathname="/admin/jobs" values={{}} />
    </>
  );
}
