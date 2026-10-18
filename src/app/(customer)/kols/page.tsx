import { publicKols } from "@/lib/db/queries";
import { KolCard } from "@/components/customer/cards";
import { SearchFilters, Pagination } from "@/components/customer/search";
import { PageHeading, Empty } from "@/components/ui";
import { filtersSchema } from "@/lib/validations";
import Link from "next/link";
import { currentActor } from "@/lib/auth/session";
import { matchedKolCatalog, organizerMatchJobs } from "@/services/recommendations";
import { AppError } from "@/lib/errors";
import { Icon } from "@/components/ui/icon";
import { JobMatchSelect } from "@/components/ai/job-match-select";
export const metadata = { title: "Khám phá KOL" };
export default async function KolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const values = filtersSchema.safeParse(raw);
  const filters = values.success ? values.data : filtersSchema.parse({});
  const actor = await currentActor();
  const jobs = actor?.role === "ORGANIZER" ? await organizerMatchJobs(actor) : [];
  const matchJob = actor?.role === "ORGANIZER" ? typeof raw.matchJob === "string" ? raw.matchJob : jobs[0]?.id ?? "" : "";
  let matchError = "";
  const ranked = matchJob ? await matchedKolCatalog(actor, matchJob, filters).catch((error) => {
    if (error instanceof AppError) { matchError = error.message; return null; }
    throw error;
  }) : null;
  const result = ranked ?? await publicKols(filters);
  return (
    <main id="main-content" className="site-container catalog-page kols-catalog">
      <div className="catalog-breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span>›</span>Khám phá KOL
      </div>
      <PageHeading
        eyebrow="Mạng lưới nhà sáng tạo & KOL chuyên nghiệp"
        title="Khám phá KOL & Nhà sáng tạo nội dung hàng đầu"
        description="Khám phá hồ sơ KOL và bắt đầu một lời mời hợp tác."
      />
      {!values.success && <p className="notice danger">{values.error.issues[0]?.message}</p>}
      {actor?.role === "ORGANIZER" && <section className="catalog-match-selector" aria-labelledby="catalog-match-title">
        <div className="catalog-match-intro"><span><Icon name="spark" size={21} /></span><div><h2 id="catalog-match-title">Tìm KOL phù hợp với job của bạn</h2><p>Chọn job để đối chiếu hồ sơ, xem điểm và gửi lời mời ngay tại đây.</p></div></div>
        {jobs.length ? <form action="/kols">{Object.entries({ q: filters.q, category: filters.category, location: filters.location, platform: filters.platform, skills: filters.skills, minExperience: String(filters.minExperience), sort: filters.sort }).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}<label htmlFor="matching-job">Job dùng để đối chiếu</label><div><JobMatchSelect key={matchJob} jobs={jobs} value={matchJob} /><button className="button" type="submit"><Icon name="spark" size={16} />Xem điểm phù hợp</button></div></form> : <p className="text-xs text-muted">Bạn cần có job được duyệt, còn hạn và còn chỗ để đối chiếu. <Link className="text-primary underline" href="/organizer/jobs">Quản lý job →</Link></p>}
      </section>}
      {matchError && <p role="alert" className="notice danger">{matchError}</p>}
      <SearchFilters key={`${JSON.stringify(filters)}:${matchJob}`} action="/kols" values={filters} hiddenValues={actor?.role === "ORGANIZER" ? { matchJob } : {}} matching={Boolean(ranked)} />
      <div className="results-bar">
        <p className="results-count">
          {ranked ? <>Đối chiếu <strong>{result.total}</strong> KOL cho <strong>{ranked.jobTitle}</strong></> : <>Tìm thấy <strong>{result.total}</strong> nhà sáng tạo</>}
        </p>
        <Link href={matchJob ? `/kols?matchJob=${encodeURIComponent(matchJob)}` : "/kols?matchJob="}>Xóa bộ lọc</Link>
      </div>
      {result.items.length ? (
        <div className="card-grid">
          {result.items.map((kol) => (
            <KolCard kol={kol} key={kol.id} match={ranked?.items.find((item) => item.id === kol.id)?.match} jobId={ranked ? matchJob : undefined} />
          ))}
        </div>
      ) : (
        <Empty
          title="Chưa tìm thấy nhà sáng tạo"
          description="Thử thay đổi từ khóa, lĩnh vực hoặc địa điểm."
          href="/kols"
          label="Xem tất cả KOL"
        />
      )}
      {ranked && <p className="catalog-match-note">Điểm tính từ hồ sơ và yêu cầu job đã chọn. Tối đa {ranked.limit} hồ sơ phù hợp bộ lọc được đối chiếu trước khi phân trang; KOL đã có lời mời hiệu lực hoặc đã xác nhận được loại khỏi gợi ý.</p>}
      <Pagination
        page={result.page}
        pages={result.pages}
        pathname="/kols"
        values={{
          q: filters.q,
          category: filters.category,
          location: filters.location,
          platform: filters.platform,
          skills: filters.skills,
          minExperience: String(filters.minExperience),
          sort: filters.sort,
          ...(actor?.role === "ORGANIZER" ? { matchJob } : {}),
        }}
      />
      <section className="catalog-cta">
        <div>
          <h2>Bạn là Nhà sáng tạo nội dung hoặc KOL?</h2>
          <p>Tạo hồ sơ, khám phá sự kiện và mở rộng cơ hội hợp tác.</p>
        </div>
        <Link href="/register?role=KOL" className="button">
          Tạo hồ sơ KOL miễn phí
        </Link>
      </section>
    </main>
  );
}
