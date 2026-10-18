import Image from "next/image";
import Link from "next/link";
import type { publicStats } from "@/lib/db/queries";
import { beautyLandingReference } from "@/lib/design-assets";
import { Arrow } from "@/components/ui";

export function HomeHero({ stats }: { stats: Awaited<ReturnType<typeof publicStats>> }) {
  const metrics = [
    { value: stats.kols, label: "KOL & nhà sáng tạo" },
    { value: stats.organizers, label: "Nhà tổ chức" },
    { value: stats.jobs, label: "Job đang tuyển" },
    { value: stats.collaborations, label: "Hợp tác đã xác nhận" },
  ];
  return <section className="home-beauty-hero" aria-labelledby="home-hero-title">
    <div className="site-container home-beauty-layout">
      <div className="home-beauty-copy">
        <p className="home-beauty-eyebrow">KOLVIA · Kết nối sáng tạo</p>
        <h1 id="home-hero-title">Kết nối thương hiệu<br /><span>cùng những KOL phù hợp</span></h1>
        <p className="home-beauty-description">KOLVIA giúp thương hiệu tìm đúng KOL và giúp KOL khám phá những cơ hội hợp tác phù hợp.</p>
        <div className="home-beauty-actions"><Link href="/jobs" className="home-beauty-button">Khám phá Job <Arrow /></Link><Link href="/kols" className="home-beauty-button home-beauty-button-outline">Tìm KOL <Arrow /></Link></div>
      </div>
      <div className="home-beauty-collage">
        <Image src={beautyLandingReference} alt="Minh họa hợp tác Beauty giữa thương hiệu và nhà sáng tạo nội dung" width={1723} height={913} priority sizes="(min-width: 1280px) 1320px, (min-width: 768px) 1100px, 900px" className="home-beauty-collage-image" />
      </div>
      <dl className="home-beauty-metrics">{metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value.toLocaleString("vi-VN")}</dd></div>)}</dl>
    </div>
  </section>;
}
