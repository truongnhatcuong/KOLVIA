import { CollaborationWorkspace } from "@/components/collaboration-workspace";
import { WorkspaceTabs } from "@/components/workspace-tabs";
import { pageActor } from "@/lib/permissions/guards";
import { applications } from "@/services/collaborations";
import { PageHeading, StatCards } from "@/components/ui";
import { CollaborationList } from "@/components/collaboration-list";
export const metadata = { title: "Đơn ứng tuyển" };
export default async function Page() {
  const actor = await pageActor("ORGANIZER");
  const items = await applications(actor);
  return (
    <>
      <PageHeading
        title="Quản lý Ứng viên & Xét duyệt hồ sơ"
        description="Xem và duyệt ứng viên cho Job của bạn."
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
      <WorkspaceTabs role="organizer" active="applications" />
      <CollaborationWorkspace role="ORGANIZER">
        <CollaborationList items={items} filterable kind="applications" role="ORGANIZER" />
      </CollaborationWorkspace>
    </>
  );
}
