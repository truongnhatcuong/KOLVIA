import { pageActor } from "@/lib/permissions/guards";
import { withdrawals } from "@/services/withdrawals";
import { PageHeading } from "@/components/ui";
import { WithdrawalList } from "@/components/withdrawal-list";
export const metadata = { title: "Yêu cầu rút tham gia" };
export default async function Page() {
  const actor = await pageActor("KOL");
  return <><PageHeading title="Yêu cầu rút & lịch sử tham gia" description="Theo dõi lý do, thời điểm gửi, phản hồi và trạng thái rời sự kiện/job." /><WithdrawalList items={await withdrawals(actor)} role="KOL" /></>;
}
