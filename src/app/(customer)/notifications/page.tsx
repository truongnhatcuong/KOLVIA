import Link from "next/link";
import { redirect } from "next/navigation";
import { currentActor } from "@/lib/auth/session";
import { authorize } from "@/lib/permissions/guards";
import { notifications } from "@/services/notifications";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeading, Empty } from "@/components/ui";
import { MutationButton } from "@/components/ui/api-form";
import { Pagination } from "@/components/customer/search";
import { dateLabel } from "@/lib/format";
import { filtersSchema } from "@/lib/validations";
export const metadata = { title: "Thông báo" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  const user = await authorize(actor, ["KOL", "ORGANIZER", "ADMIN"]);
  const { page } = filtersSchema.parse(await searchParams);
  const result = await notifications(user, page);
  return <DashboardShell actor={user}>
    <PageHeading title="Thông báo của bạn" description={`${result.unread} thông báo chưa đọc. Theo dõi yêu cầu, lời mời và thay đổi trạng thái Job.`} action={<MutationButton endpoint="/api/notifications" body={{ read: true }} icon="check" label="Đánh dấu tất cả đã đọc">Đánh dấu tất cả đã đọc</MutationButton>} />
    {result.items.length ? <div className="grid gap-3">{result.items.map((item) => <article key={item.id} className={`rounded-2xl border p-5 ${item.readAt ? "border-line bg-white" : "border-primary/15 bg-surface-low"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={item.href} className="text-sm font-semibold hover:text-primary">{item.title}</Link><p className="mt-2 text-xs leading-6 text-muted">{item.message}</p><p className="mt-2 text-[10px] text-muted">{dateLabel(item.createdAt)} · {item.readAt ? "Đã đọc" : "Chưa đọc"}</p></div>{!item.readAt && <MutationButton endpoint={`/api/notifications/${item.id}`} body={{ read: true }} icon="check" label="Đánh dấu thông báo đã đọc">Đã đọc</MutationButton>}</div>
    </article>)}</div> : <Empty title="Chưa có thông báo" description="Thông báo mới sẽ xuất hiện khi có yêu cầu, lời mời hoặc cập nhật Job." />}
    <Pagination page={result.page} pages={result.pages} pathname="/notifications" values={{}} />
  </DashboardShell>;
}
