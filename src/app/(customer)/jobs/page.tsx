import { publicJobs } from "@/lib/db/queries";
import { JobCard } from "@/components/customer/cards";
import { SearchFilters, Pagination } from "@/components/customer/search";
import { PageHeading, Empty } from "@/components/ui";
import { filtersSchema } from "@/lib/validations";
import Link from "next/link";
export const metadata = { title: "Tìm cơ hội" };
export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = await searchParams;
  const values = filtersSchema.safeParse(input);
  const filters = values.success ? values.data : filtersSchema.parse({});
  const result = await publicJobs(filters);
  return (
    <main id="main-content" className="site-container catalog-page jobs-catalog">
      <div className="catalog-breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span>›</span>Khám phá Job
      </div>
      <PageHeading
        eyebrow="KOLVIA Marketplace"
        title="Khám phá Cơ hội Hợp tác & Sự kiện"
        description="Tìm sự kiện và chiến dịch phù hợp với phong cách của bạn."
      />
      {!values.success && <p className="notice danger">{values.error.issues[0]?.message}</p>}
      <SearchFilters key={JSON.stringify(filters)} action="/jobs" values={filters} />
      <div className="results-bar">
        <p className="results-count">
          Tìm thấy <strong>{result.total}</strong> Job đang tuyển
        </p>
        <Link href="/jobs">Xóa bộ lọc</Link>
      </div>
      {result.items.length ? (
        <div className="card-grid">
          {result.items.map((job) => (
            <JobCard job={job} key={job.id} />
          ))}
        </div>
      ) : (
        <Empty
          title="Chưa tìm thấy cơ hội phù hợp"
          description="Thử từ khóa khác hoặc mở rộng lĩnh vực và địa điểm."
          href="/jobs"
          label="Xem tất cả Job"
        />
      )}
      <Pagination
        page={result.page}
        pages={result.pages}
        pathname="/jobs"
        values={{
          q: filters.q,
          category: filters.category,
          location: filters.location,
          minBudget: String(filters.minBudget),
          maxBudget: String(filters.maxBudget),
          eventFrom: filters.eventFrom,
          eventTo: filters.eventTo,
          sort: filters.sort,
        }}
      />
      <section className="catalog-cta">
        <div>
          <h2>Bạn đang tìm KOL cho sự kiện?</h2>
          <p>Đăng Job và kết nối với nhà sáng tạo phù hợp.</p>
        </div>
        <Link href="/organizer/jobs/new" className="button">
          Đăng Job mới ↗
        </Link>
      </section>
    </main>
  );
}
