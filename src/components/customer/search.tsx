"use client";
import Link from "next/link";
import { categories } from "@/types";
import { categoryLabels } from "@/lib/demo-assets";
import { Icon } from "@/components/ui/icon";
export function SearchFilters({
  action,
  values,
  hiddenValues = {},
  matching = false,
}: {
  action: string;
  values: {
    q?: string;
    category?: string;
    location?: string;
    minBudget?: number;
    maxBudget?: number;
    skills?: string;
    minExperience?: number;
    eventFrom?: string;
    eventTo?: string;
    sort?: string;
    platform?: string;
  };
  hiddenValues?: Record<string, string>;
  matching?: boolean;
}) {
  return (
    <form action={action} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/5 sm:p-6">
      {Object.entries(hiddenValues).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={18} /></span>
          <span className="sr-only">Tìm theo tên</span>
          <input
            className="w-full rounded-xl border-transparent bg-surface-low py-3 pl-11 pr-4 text-xs"
            name="q"
            defaultValue={values.q}
            placeholder={action === "/kols" ? "Tìm theo tên KOL, lĩnh vực (Tech, Makeup, Lifestyle…)" : "Tìm Job sự kiện, nhãn hàng, chiến dịch…"}
            maxLength={100}
          />
        </label>
        <button className="button"><Icon name="search" size={17} />Tìm kiếm</button>
      </div>
      <div className="my-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lĩnh vực">
        {["", ...categories].map((category) => (
          <label className="category-chip" key={category}>
            <input
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              type="radio"
              name="category"
              value={category}
              defaultChecked={(values.category ?? "") === category}
            />
            <span className="whitespace-nowrap">{categoryLabels[category] ?? (category || "Tất cả lĩnh vực")}</span>
          </label>
        ))}
      </div>
      <div className="search-secondary">
        <label>
          Địa điểm
          <input
            name="location"
            defaultValue={values.location}
            placeholder="Địa điểm…"
            maxLength={100}
          />
        </label>
        {action === "/jobs" ? (
          <label>
            Ngân sách từ (VNĐ)
            <input
              type="number"
              name="minBudget"
              min={0}
              max={1000000000}
              step={100000}
              defaultValue={values.minBudget || ""}
              placeholder="Không giới hạn"
            />
          </label>
        ) : (
          <label>
            Kênh nội dung
            <select name="platform" defaultValue={values.platform ?? ""}>
              <option value="">Tất cả kênh</option>
              <option value="TIKTOK">TikTok</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="YOUTUBE">YouTube</option>
            </select>
          </label>
        )}
        <label>
          Sắp xếp theo
          {matching ? <select aria-label="Sắp xếp theo" disabled defaultValue="match"><option value="match">Điểm phù hợp giảm dần</option></select> : <select name="sort" defaultValue={values.sort ?? "newest"}>
            <option value="newest">Mới nhất</option>
            <option value="name">Tên A – Z</option>
            {action === "/jobs" && (
              <>
                <option value="deadline">Hạn ứng tuyển gần nhất</option>
                <option value="budget">Ngân sách cao nhất</option>
              </>
            )}
          </select>}
        </label>
        {action === "/jobs" ? <>
          <label>Thù lao tối đa (VNĐ)<input type="number" name="maxBudget" min={0} max={1000000000} step={100000} defaultValue={values.maxBudget === 1000000000 ? "" : values.maxBudget} placeholder="Không giới hạn" /></label>
          <label>Sự kiện từ ngày<input type="date" name="eventFrom" defaultValue={values.eventFrom} /></label>
          <label>Đến ngày<input type="date" name="eventTo" defaultValue={values.eventTo} /></label>
        </> : <>
          <label>Kỹ năng<input name="skills" defaultValue={values.skills} maxLength={100} placeholder="Review, livestream, MC…" /></label>
          <label>Kinh nghiệm tối thiểu<select name="minExperience" defaultValue={values.minExperience ?? 0}><option value="0">Không giới hạn</option><option value="1">Từ 1 năm</option><option value="2">Từ 2 năm</option><option value="3">Từ 3 năm</option><option value="5">Từ 5 năm</option><option value="10">Từ 10 năm</option></select></label>
        </>}
      </div>
    </form>
  );
}
export function Pagination({
  page,
  pages,
  pathname,
  values,
}: {
  page: number;
  pages: number;
  pathname: string;
  values: Record<string, string | undefined>;
}) {
  const href = (p: number) =>
    `${pathname}?${new URLSearchParams(Object.entries({ ...values, page: String(p) }).filter((entry): entry is [string, string] => Boolean(entry[1]) || (entry[0] === "matchJob" && entry[1] === "")))}`;
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const visible = Array.from({ length: Math.min(5, pages) }, (_, index) => start + index);
  return (
    <nav aria-label="Phân trang" className="my-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && <Link href={href(page - 1)} aria-label="Trang trước" className="flex size-10 items-center justify-center rounded-xl bg-white text-muted">‹</Link>}
      {visible.map((number) => <Link key={number} href={href(number)} aria-current={page === number ? "page" : undefined} className={`flex size-10 items-center justify-center rounded-xl text-xs font-medium ${page === number ? "bg-primary text-white" : "bg-white text-ink hover:bg-surface-container"}`}>{number}</Link>)}
      {visible.at(-1)! < pages && <><span className="px-1 text-muted">…</span><Link href={href(pages)} className="flex size-10 items-center justify-center rounded-xl bg-white text-xs">{pages}</Link></>}
      {page < pages && <Link href={href(page + 1)} aria-label="Trang sau" className="flex size-10 items-center justify-center rounded-xl bg-white text-muted">›</Link>}
    </nav>
  );
}
