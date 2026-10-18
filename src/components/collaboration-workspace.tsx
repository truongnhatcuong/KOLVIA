import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./ui/icon";

export function CollaborationWorkspace({
  role,
  children,
}: {
  role: "KOL" | "ORGANIZER";
  children: ReactNode;
}) {
  return (
    <div className="workspace-grid connection-workspace">
      <div>{children}</div>
      <aside>
        <section className="panel">
          <span className="icon-tile">
            <Icon name="check" />
          </span>
          <h2>Quy trình hợp tác</h2>
          <ol className="recruitment-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Kết nối</strong>
                <p>KOL ứng tuyển hoặc nhà tổ chức gửi lời mời cho Job đã duyệt.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Xét duyệt & phản hồi</strong>
                <p>Nhà tổ chức duyệt đơn; KOL xác nhận hoặc từ chối lời mời.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Xác nhận tham gia</strong>
                <p>Kết nối được chấp nhận xuất hiện trong danh sách KOL đã xác nhận.</p>
              </div>
            </li>
          </ol>
        </section>
        <section className="panel welcome-panel">
          <h2>{role === "KOL" ? "Hồ sơ tạo ấn tượng" : "Tìm người đồng hành"}</h2>
          <p className="muted">
            {role === "KOL"
              ? "Cập nhật ảnh, giới thiệu và liên kết kênh để nhà tổ chức hiểu về phong cách của bạn."
              : "Khám phá KOL theo lĩnh vực và địa điểm, sau đó gửi lời mời từ hồ sơ công khai."}
          </p>
          <Link
            href={role === "KOL" ? "/kol/profile" : "/kols"}
            className="button secondary full-width"
          >
            {role === "KOL" ? "Cập nhật Portfolio" : "Khám phá KOL"}
          </Link>
        </section>
      </aside>
    </div>
  );
}
