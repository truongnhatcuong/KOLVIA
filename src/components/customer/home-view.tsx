import Link from "next/link";
import type { publicJobs, publicKols, publicStats } from "@/lib/db/queries";
import { JobCard, KolCard } from "@/components/customer/cards";
import { Arrow, Empty } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/icon";
import { HomeHero } from "./home-hero";

type Props = {
  jobs: Awaited<ReturnType<typeof publicJobs>>;
  kols: Awaited<ReturnType<typeof publicKols>>;
  stats: Awaited<ReturnType<typeof publicStats>>;
};

export function HomeView({ jobs, kols, stats }: Props) {
  return (
    <main id="main-content">
      <HomeHero stats={stats} />
      <section className="site-container py-16"><HomeSectionHeading eyebrow="Cơ hội hợp tác" title="Cơ hội hợp tác sự kiện mới nhất" description="Các sự kiện đang tìm kiếm gương mặt đồng hành cùng mức thù lao minh bạch." href="/jobs" link="Xem tất cả Job" />{jobs.items.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{jobs.items.slice(0, 3).map((job) => <JobCard key={job.id} job={job} variant="featured" />)}</div> : <Empty title="Cơ hội mới đang được chuẩn bị" />}</section>
      <div className="bg-surface-low"><section className="site-container py-16"><HomeSectionHeading eyebrow="Gương mặt nổi bật" title="KOL tiêu biểu" description="Tìm người đồng hành phù hợp với phong cách và lĩnh vực của sự kiện." href="/kols" link="Khám phá KOL" />{kols.items.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{kols.items.slice(0, 3).map((kol) => <KolCard key={kol.id} kol={kol} />)}</div> : <Empty title="Cộng đồng đang bắt đầu" />}</section></div>
      <section id="how-it-works" className="site-container py-16"><div className="mx-auto mb-8 max-w-2xl text-center"><p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-primary">Cơ chế kết nối</p><h2 className="text-2xl font-bold sm:text-[30px]">Hợp tác dễ dàng với KOLVIA</h2><p className="mt-3 text-xs leading-6 text-muted">Ba bước để biến một kết nối thành cơ hội.</p></div><div className="grid gap-6 md:grid-cols-3">{([
        ["profile", "Tạo hồ sơ của bạn", "Giới thiệu bản thân, lĩnh vực sáng tạo và liên kết các kênh nội dung."],
        ["search", "Tìm kiếm cơ hội phù hợp", "Khám phá Job hoặc tìm KOL theo lĩnh vực và địa điểm mong muốn."],
        ["check", "Kết nối và hợp tác", "Ứng tuyển, phản hồi lời mời và theo dõi những hợp tác đã xác nhận."],
      ] as [IconName, string, string][]).map(([icon, title, description], index) => <article key={title} className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-ink/5"><span className="mb-6 flex size-12 items-center justify-center rounded-xl bg-surface-container text-primary"><Icon name={icon} size={25} /></span><p className="mb-2 text-[10px] uppercase tracking-wider text-primary">Bước 0{index + 1}</p><h3 className="text-base font-semibold">{title}</h3><p className="mt-3 text-xs leading-6 text-muted">{description}</p></article>)}</div></section>
      <section className="site-container pb-4 pt-12"><div className="rounded-2xl border border-primary bg-gradient-to-r from-primary to-secondary px-6 py-14 text-center text-white shadow-lg sm:px-12"><span className="rounded-full bg-white/20 px-3 py-1 text-[9px] font-semibold uppercase tracking-wide">Đồng hành cùng sự kiện tiếp theo</span><h2 className="mx-auto mt-5 max-w-3xl text-2xl font-bold leading-snug sm:text-[30px]">Sẵn sàng tạo nên sự kiện bùng nổ cùng KOL hàng đầu?</h2><p className="mx-auto mt-5 max-w-lg text-xs leading-6 text-white/85">Tham gia KOLVIA để tìm người đồng hành, mở rộng cơ hội và bắt đầu hành trình hợp tác của bạn.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/register?role=KOL" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-medium text-primary"><Icon name="profile" size={16} />Đăng ký làm KOL</Link><Link href="/register?role=ORGANIZER" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-5 py-3 text-xs font-medium text-white"><Icon name="briefcase" size={16} />Dành cho nhà tổ chức</Link></div></div></section>
    </main>
  );
}

function HomeSectionHeading({ eyebrow, title, description, href, link }: { eyebrow: string; title: string; description: string; href: string; link: string }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-primary">{eyebrow}</p><h2 className="text-2xl font-bold sm:text-[30px]">{title}</h2><p className="mt-2 text-xs leading-6 text-muted">{description}</p></div><Link href={href} className="inline-flex items-center gap-2 text-xs font-medium text-primary">{link}<Arrow className="size-4" /></Link></div>;
}
