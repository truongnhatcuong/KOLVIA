import Link from "next/link";
import type { ReactNode } from "react";
import type { Actor } from "@/types";
import { demoPortrait, defaultAvatar } from "@/lib/demo-assets";
import { MediaImage } from "@/components/ui/media-image";
import { Brand } from "@/components/brand";
import { MutationButton } from "@/components/ui/api-form";
import { DashboardNav } from "@/components/dashboard-nav";
import { Icon } from "@/components/ui/icon";
import { db } from "@/lib/db/client";
import { NotificationBell } from "./notification-bell";
import { AccountMenu } from "./account-menu";
import { ownMedia } from "@/services/media";
import { publicPusherConfig } from "@/lib/realtime/pusher";

export async function DashboardShell({ actor, children }: { actor: Actor; children: ReactNode }) {
  const [media, unread] = await Promise.all([actor.role === "ADMIN" ? Promise.resolve([]) : ownMedia(actor), db.notification.count({ where: { userId: actor.id, readAt: null } })]);
  const uploadedAvatar = media.find((item) => item.target === "AVATAR")?.url;
  const portrait = uploadedAvatar ?? demoPortrait(actor.email) ?? defaultAvatar;
  const portraitAlt = `Ảnh đại diện của ${actor.name}`;
  const kind = actor.role === "KOL" ? "kol" : actor.role === "ORGANIZER" ? "organizer" : "admin";
  const links =
    kind === "kol"
      ? [
          ["/kol/dashboard", "Tổng quan"],
          ["/jobs", "Khám phá Job"],
          ["/kol/applications", "Đơn ứng tuyển"],
          ["/kol/jobs", "Job đã xác nhận"],
          ["/kol/withdrawals", "Yêu cầu rút tham gia"],
          ["/kol/invitations", "Lời mời hợp tác"],
          ["/kol/profile", "Hồ sơ cá nhân & Portfolio"],
        ]
      : kind === "organizer"
        ? [
            ["/organizer/dashboard", "Tổng quan"],
            ["/organizer/profile", "Hồ sơ tổ chức"],
            ["/organizer/jobs", "Quản lý Job"],
            ["/organizer/applications", "Đơn ứng tuyển"],
            ["/organizer/invitations", "Lời mời hợp tác"],
            ["/organizer/withdrawals", "Yêu cầu rút tham gia"],
            ["/kols", "Tìm kiếm KOL"],
          ]
        : [
            ["/admin", "Tổng quan"],
            ["/admin/users", "Tài khoản"],
            ["/admin/jobs", "Quản lý Job"],
            ["/admin/moderation", "Kiểm duyệt"],
          ];
  return (
    <div className="dashboard flex min-h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-line bg-white p-4 lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:border-r lg:border-b-0 lg:p-5">
        <Brand />
        <p className="mb-3 mt-6 text-[10px] uppercase tracking-wider text-muted">
          {kind === "kol"
            ? "Không gian nhà sáng tạo"
            : kind === "organizer"
              ? "Không gian tổ chức"
              : "Quản trị nền tảng"}
        </p>
        <DashboardNav links={[...links, ["/notifications", "Thông báo"]]} />
        <div className="mt-auto hidden pt-6 lg:block">
          <div className="sidebar-tip">
            <Icon name="check" />
            <strong>{kind === "admin" ? "Kiểm duyệt nội dung" : "Kết nối cùng KOLVIA"}</strong>
            <p>
              {kind === "kol"
                ? "Hoàn thiện hồ sơ và phản hồi lời mời để bắt đầu hợp tác."
                : kind === "organizer"
                  ? "Đăng Job, gửi kiểm duyệt và tìm người đồng hành."
                  : "Đọc nội dung Job trước khi duyệt hoặc từ chối."}
            </p>
          </div>
          <Link href="/" className="back-site">
            ↗ Về trang chủ
          </Link>
          <div className="sidebar-user">
            <MediaImage src={portrait} alt={portraitAlt} sizes="38px" className="avatar" />
            <div className="hidden sm:block">
              <strong className="block text-xs font-semibold">{actor.name}</strong>
              <small className="block text-[10px] text-muted">{actor.role}</small>
            </div>
          </div>
          <MutationButton
            endpoint="/api/auth/logout"
            method="POST"
            redirectTo="/login"
            variant="quiet"
          >
            Đăng xuất
          </MutationButton>
        </div>
      </aside>
      <main id="main-content" className="min-w-0 flex-1 px-4 pb-8 sm:px-6 lg:px-8">
        <div className="-mx-4 flex min-h-16 items-center gap-4 border-b border-line bg-white px-4 text-xs sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <form
            className="workspace-search"
            action={kind === "kol" ? "/jobs" : kind === "organizer" ? "/kols" : "/admin/users"}
          >
            <Icon name="search" size={18} />
            <label className="sr-only" htmlFor="workspace-search">
              Tìm kiếm
            </label>
            <input
              id="workspace-search"
              name="q"
              placeholder={
                kind === "kol"
                  ? "Tìm kiếm Job sự kiện, nhãn hàng, chiến dịch…"
                  : kind === "organizer"
                    ? "Tìm kiếm KOL, lĩnh vực, nhà sáng tạo…"
                    : "Tìm kiếm tài khoản…"
              }
              maxLength={100}
            />
          </form>
          <div className="ml-auto flex items-center gap-4">
            <NotificationBell key={actor.id} initialUnread={unread} userId={actor.id} pusher={publicPusherConfig()} />
            {kind === "organizer" && (
              <Link href="/organizer/jobs/new" className="button small hidden sm:inline-flex">
                + Tạo Job mới
              </Link>
            )}
            {kind !== "admin" && (
              <Link href={`/${kind}/invitations`} className="top-icon" aria-label="Lời mời hợp tác">
                <Icon name="mail" />
              </Link>
            )}
          </div>
          <div className="border-l border-line pl-2 sm:pl-4"><AccountMenu actor={actor} portrait={portrait} portraitAlt={portraitAlt} /></div>
        </div>
        {children}
      </main>
    </div>
  );
}
