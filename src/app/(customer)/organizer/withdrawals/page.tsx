import { paginate } from "@/lib/pagination";
import { Pagination } from "@/components/customer/search";
import { pageActor } from "@/lib/permissions/guards";
import { withdrawals } from "@/services/withdrawals";
import { PageHeading } from "@/components/ui";
import { WithdrawalList } from "@/components/withdrawal-list";
export const metadata = { title: "Quản lý yêu cầu rút" };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await pageActor("ORGANIZER");
  const view = paginate(await withdrawals(actor), (await searchParams).page);
  return <><PageHeading title="Yêu cầu rút tham gia" description="Xem lý do và thời gian yêu cầu; chấp thuận hoặc từ chối, theo dõi KOL đã chính thức rời." /><WithdrawalList items={view.items} role="ORGANIZER" /><Pagination page={view.page} pages={view.pages} pathname="/organizer/withdrawals" values={{}} /></>;
}
