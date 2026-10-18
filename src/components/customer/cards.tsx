import Link from "next/link";
import type { publicJobs, publicKols } from "@/lib/db/queries";
import { categoryLabels, defaultAvatar, organizationLogo } from "@/lib/demo-assets";
import { money, dateLabel } from "@/lib/format";
import { Arrow } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { MediaImage } from "@/components/ui/media-image";
import type { MatchScore } from "@/lib/ai/matching";
import { MatchBadge, MatchDetails } from "@/components/ai/match-details";
import { ActionDialog } from "@/components/ui/action-controls";
import { ApiForm } from "@/components/ui/api-form";

type JobItem = Awaited<ReturnType<typeof publicJobs>>["items"][number];
type KolItem = Awaited<ReturnType<typeof publicKols>>["items"][number];

export function JobCard({ job, variant = "catalog" }: {
  job: JobItem;
  variant?: "catalog" | "workspace" | "featured";
}) {
  const workspace = variant === "workspace";
  return (
    <Link href={`/jobs/${job.id}`} className={`group flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-ink/5 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:ring-primary/20 ${workspace ? "gap-1 sm:p-7" : ""}`}>
      {variant === "catalog" && job.media[0] && (
        <MediaImage src={job.media[0].url} alt={job.title} className="-mx-6 -mt-6 mb-5 h-40" />
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-medium text-success"><span className="size-1.5 rounded-full bg-success" />{job._count.participations >= job.capacity ? "Đủ số lượng" : "Đang tuyển"}</span>
        <span className="flex items-center gap-1 text-[10px] text-muted"><Icon name="calendar" size={13} />Hạn: {dateLabel(job.deadline)}</span>
      </div>
      <div className="flex items-center gap-3">
        {workspace && <MediaImage src={job.organizer.media[0]?.url ?? organizationLogo(job.organizer.organizer?.companyName)} alt={job.organizer.organizer?.companyName ?? job.organizer.name} className="size-14 shrink-0 rounded-2xl" />}
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-primary">{job.organizer.organizer?.companyName ?? job.organizer.name}</p>
          <h3 className={`${workspace ? "text-xl" : "text-base"} font-semibold leading-relaxed tracking-tight text-ink`}>{job.title}</h3>
        </div>
      </div>
      <div className="my-5 grid gap-2 rounded-xl bg-surface-low p-3.5 text-xs text-muted">
        <p className="flex items-center gap-2"><Icon name="calendar" size={15} />Sự kiện: {dateLabel(job.eventDate)}</p>
        <p className="flex items-center gap-2"><Icon name="pin" size={15} />{job.location}</p>
        <p className="flex items-center gap-2"><Icon name="briefcase" size={15} />{categoryLabels[job.category] ?? job.category}</p>
        <p className="flex items-center gap-2"><Icon name="users" size={15} />{job._count.participations}/{job.capacity} KOL đã xác nhận</p>
      </div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
        <div><p className="mb-1 text-[10px] text-muted">Ngân sách dự kiến</p><strong className={`${workspace ? "text-lg" : "text-sm"} font-semibold text-primary`}>{money(job.budgetMin)} – {money(job.budgetMax)}</strong></div>
        <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium ${workspace ? "bg-primary text-white" : "bg-surface-container text-primary"}`}>Xem chi tiết <Arrow className="size-3.5" /></span>
      </div>
    </Link>
  );
}

export function KolCard({ kol, compact = false, match, jobId }: { kol: KolItem; compact?: boolean; match?: MatchScore; jobId?: string }) {
  const channels = kol.socialLinks.filter((link) => link.kind === "CHANNEL");
  const portrait = kol.user.media.find((media) => media.target === "AVATAR")?.url ?? kol.user.demoAvatar ?? defaultAvatar;
  return (
    <article className={`kol-discovery-card flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-ink/5 transition duration-200 hover:-translate-y-1 hover:shadow-lg ${compact ? "sm:flex-row sm:items-center sm:gap-6" : ""}`}>
      <div className={compact ? "min-w-0 flex-1" : ""}>
        <div className="flex items-start gap-3">
          <MediaImage src={portrait} alt={`Ảnh đại diện của ${kol.user.name}`} sizes="56px" className="size-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Link href={`/kols/${kol.user.id}`} className="hover:text-primary"><h3 className="text-base font-semibold leading-snug tracking-tight">{kol.user.name}</h3></Link>
            <p className="mt-1 text-[11px] text-muted">{categoryLabels[kol.category] ?? kol.category}</p>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted"><Icon name="pin" size={12} />{kol.location || "Toàn quốc"}</p>
          </div>
          {match && <div className="kol-match-badge"><MatchBadge match={match} /></div>}
        </div>
        {!compact && <>
          <div className="my-4 grid grid-cols-3 divide-x divide-primary/10 rounded-xl bg-surface-low py-3 text-center">
            <div className="px-2"><p className="text-[10px] text-muted">Kinh nghiệm</p><p className="mt-1 truncate text-xs font-semibold">{kol.experienceYears} năm</p></div>
            <div className="px-2"><p className="text-[10px] text-muted">Kênh nội dung</p><p className="mt-1 text-xs font-semibold">{channels.length || "Chưa thêm"}</p></div>
            <div className="px-2"><p className="text-[10px] text-muted">Portfolio</p><p className="mt-1 text-xs font-semibold text-success">{kol.user.media.filter((media) => media.target === "PORTFOLIO").length} ảnh</p></div>
          </div>
          <p className="mb-4 line-clamp-3 text-xs leading-6 text-muted">{kol.bio || "Khám phá hồ sơ và kết nối cùng nhà sáng tạo."}</p>
          <div className="mb-5 flex flex-wrap gap-1.5">{kol.skills.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 3).map((skill) => <span key={skill} className="rounded-lg bg-surface-container px-2 py-1 text-[10px] text-muted">{skill}</span>)}<span className="rounded-lg bg-surface-container px-2 py-1 text-[10px] text-muted">{categoryLabels[kol.category] ?? kol.category}</span>{channels.map((link) => <span key={link.id} className="rounded-lg bg-surface-container px-2 py-1 text-[10px] text-muted">{({ TIKTOK: "TikTok", FACEBOOK: "Facebook", INSTAGRAM: "Instagram", YOUTUBE: "YouTube" } as Record<string, string>)[link.platform]}</span>)}</div>
        </>}
        {match && <MatchDetails match={match} />}
      </div>
      <div className={`mt-auto grid grid-cols-2 gap-2 pt-2 ${compact ? "mt-4 shrink-0 sm:mt-0" : ""}`}>
        <Link className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-surface-container px-3 py-2 text-[11px] font-medium text-ink transition hover:bg-surface-high" href={`/kols/${kol.user.id}`}>Xem hồ sơ</Link>
        {jobId ? <div className="kol-match-invite"><ActionDialog icon="send" triggerText="Mời hợp tác" label={`Mời ${kol.user.name} hợp tác`} title={`Mời ${kol.user.name} tham gia`}><ApiForm endpoint="/api/invitations" extra={{ jobId, kolId: kol.user.id }} submitLabel="Gửi lời mời" redirectTo="/organizer/invitations" fields={[{ name: "message", label: "Nội dung lời mời", type: "textarea", required: true, minLength: 10, maxLength: 2000, placeholder: "Giới thiệu job và lý do bạn muốn hợp tác…" }]} /></ActionDialog></div> : <Link className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[11px] font-medium text-white transition hover:bg-primary-container" href={`/kols/${kol.user.id}#collaborate`}><Icon name="mail" size={14} />Mời hợp tác</Link>}
      </div>
    </article>
  );
}
