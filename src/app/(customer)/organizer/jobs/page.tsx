import Link from "next/link";
import { pageActor } from "@/lib/permissions/guards";
import { ownJobPage } from "@/services/jobs";
import { overview } from "@/services/dashboard";
import { PageHeading, StatCards, Empty } from "@/components/ui";
import { JobTable } from "@/components/organizer/job-table";
import { Pagination } from "@/components/customer/search";
import { jobManagementFiltersSchema } from "@/lib/validations";
export const metadata = { title: "Quản lý Job" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await pageActor("ORGANIZER");
  const parsed = jobManagementFiltersSchema.safeParse(await searchParams);
  const filters = parsed.success ? parsed.data : jobManagementFiltersSchema.parse({});
  const [result, stats] = await Promise.all([ownJobPage(actor, filters), overview(actor)]);
  return (
    <>
      <PageHeading
        title="Quản lý Job của bạn"
        description="Quản lý nội dung, kiểm duyệt và các kết nối của từng Job."
        action={
          <Link className="button" href="/organizer/jobs/new">
            + Tạo Job mới
          </Link>
        }
      />
      <StatCards items={stats} />
      <form action="/organizer/jobs" className="management-filters">
        <label>
          <span>Tìm kiếm Job</span>
          <input
            name="q"
            placeholder="Tên Job hoặc địa điểm…"
            defaultValue={filters.q}
            maxLength={100}
          />
        </label>
        <label>
          <span>Kiểm duyệt</span>
          <select name="moderation" defaultValue={filters.moderation}>
            <option value="">Tất cả</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PENDING">Chờ kiểm duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Bị từ chối</option>
          </select>
        </label>
        <label>
          <span>Trạng thái Job</span>
          <select name="status" defaultValue={filters.status}>
            <option value="">Tất cả</option>
            <option value="OPEN">Đang mở</option>
            <option value="CLOSED">Đã đóng</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
            <option value="COMPLETED">Đã hoàn thành</option>
          </select>
        </label>
        <button className="button">Lọc Job</button>
      </form>
      <div className="results-bar">
        <p className="results-count">
          <strong>{result.total}</strong> Job phù hợp
        </p>
        <Link href="/organizer/jobs">Xóa bộ lọc</Link>
      </div>
      {result.total === 0 && (filters.q || filters.status || filters.moderation) ? (
        <Empty
          title="Chưa có Job phù hợp"
          description="Thử thay đổi từ khóa hoặc trạng thái kiểm duyệt."
          href="/organizer/jobs"
          label="Xem tất cả Job"
        />
      ) : (
        <JobTable jobs={result.items} />
      )}
      <Pagination
        pathname="/organizer/jobs"
        page={result.page}
        pages={result.pages}
        values={{ q: filters.q, status: filters.status, moderation: filters.moderation }}
      />
    </>
  );
}
