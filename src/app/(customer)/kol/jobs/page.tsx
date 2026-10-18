import { paginate } from "@/lib/pagination";
import { Pagination } from "@/components/customer/search";
import { pageActor } from "@/lib/permissions/guards";
import { confirmedJobs } from "@/services/dashboard";
import { PageHeading, Badge, Empty } from "@/components/ui";
import { dateLabel, dateTimeLabel, money } from "@/lib/format";
import { WithdrawalControls } from "@/components/withdrawal-controls";
import { ActionLink } from "@/components/ui/action-controls";
export const metadata = { title: "Job đã xác nhận" };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await pageActor("KOL");
  const view = paginate(await confirmedJobs(actor), (await searchParams).page);
  const jobs = view.items;
  return <>
    <PageHeading title="Job đã xác nhận & lịch sử tham gia" description="Theo dõi hợp tác, gửi yêu cầu rút và xem những Job đã rời." />
    {jobs.length ? <div className="grid gap-5 md:grid-cols-2">{jobs.map(({ id, source, status, confirmedAt, leftAt, withdrawals, job }) => <article className="panel" key={id}>
      <div className="mb-3 flex items-center justify-between gap-3"><span className="tag">{source === "APPLICATION" ? "Qua ứng tuyển" : "Qua lời mời"}</span><Badge status={job.status} /></div>
      <h2 className="text-lg!">{job.title}</h2><p className="mt-2 text-xs text-muted">{job.organizer.organizer?.companyName ?? job.organizer.name}</p>
      <div className="mt-3"><Badge status={status} /></div>
      <p className="mt-3 text-xs text-muted">Xác nhận lúc: {dateTimeLabel(confirmedAt)}{leftAt && <> · Rời lúc: {dateTimeLabel(leftAt)}</>}</p>
      <p className="mt-4 text-sm">{dateLabel(job.eventDate)} · {job.location}</p><p className="mt-2 text-sm font-medium text-primary">{money(job.budgetMin)} – {money(job.budgetMax)}</p>
      <div className="actions mt-5"><ActionLink href={`/jobs/${job.id}`} icon="eye" label="Xem yêu cầu và quyền lợi" /><WithdrawalControls participationId={id} status={status} job={job} request={withdrawals[0]} /></div>
    </article>)}</div> : <Empty title="Chưa có Job được xác nhận" href="/jobs" label="Khám phá Job" />}
    <Pagination page={view.page} pages={view.pages} pathname="/kol/jobs" values={{}} />
  </>;
}
