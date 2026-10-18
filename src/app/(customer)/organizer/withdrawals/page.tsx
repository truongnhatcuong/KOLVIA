import { pageActor } from "@/lib/permissions/guards";
import { withdrawals } from "@/services/withdrawals";
import { PageHeading } from "@/components/ui";
import { WithdrawalList } from "@/components/withdrawal-list";
export const metadata = { title: "Quản lý yêu cầu rút" };
export default async function Page() {
  const actor = await pageActor("ORGANIZER");
  return <><PageHeading title="Yêu cầu rút tham gia" description="Xem lý do và thời gian yêu cầu; chấp thuận hoặc từ chối, theo dõi KOL đã chính thức rời." /><WithdrawalList items={await withdrawals(actor)} role="ORGANIZER" /></>;
}
