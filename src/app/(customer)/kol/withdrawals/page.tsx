import { paginate } from "@/lib/pagination";
import { Pagination } from "@/components/customer/search";
import { pageActor } from "@/lib/permissions/guards";
import { withdrawals } from "@/services/withdrawals";
import { PageHeading } from "@/components/ui";
import { WithdrawalList } from "@/components/withdrawal-list";
export const metadata = { title: "Yêu cầu rút tham gia" };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await pageActor("KOL");
  const view = paginate(await withdrawals(actor), (await searchParams).page);
  return <><PageHeading title="Yêu cầu rút & lịch sử tham gia" description="Theo dõi lý do, thời điểm gửi, phản hồi và trạng thái rời sự kiện/job." /><WithdrawalList items={view.items} role="KOL" /><Pagination page={view.page} pages={view.pages} pathname="/kol/withdrawals" values={{}} /></>;
}
