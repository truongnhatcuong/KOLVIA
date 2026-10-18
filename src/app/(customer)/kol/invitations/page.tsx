import { CollaborationWorkspace } from "@/components/collaboration-workspace";
import { WorkspaceTabs } from "@/components/workspace-tabs";
import { pageActor } from "@/lib/permissions/guards";
import { invitations } from "@/services/collaborations";
import { PageHeading, StatCards } from "@/components/ui";
import { CollaborationList } from "@/components/collaboration-list";
export const metadata = { title: "Lời mời hợp tác" };
export default async function Page() {
  const actor = await pageActor("KOL");
  const items = await invitations(actor);
  return (
    <>
      <PageHeading
        title="Quản lý Đơn ứng tuyển & Lời mời"
        description="Những lời mời đang chờ bạn phản hồi."
      />
      <StatCards
        items={[
          { label: "Tổng kết nối", value: items.length },
          { label: "Chờ phản hồi", value: items.filter((i) => i.status === "PENDING").length },
          { label: "Đã chấp nhận", value: items.filter((i) => i.status === "ACCEPTED").length },
          {
            label: "Đã kết thúc",
            value: items.filter((i) => !["PENDING", "ACCEPTED"].includes(i.status)).length,
          },
        ]}
      />
      <WorkspaceTabs role="kol" active="invitations" />
      <CollaborationWorkspace role="KOL">
        <CollaborationList items={items} filterable kind="invitations" role="KOL" />
      </CollaborationWorkspace>
    </>
  );
}
