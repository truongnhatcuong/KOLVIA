import Link from "next/link";
import { currentActor } from "@/lib/auth/session";
import { roleHome } from "@/types";
import { MutationButton } from "@/components/ui/api-form";
import { Brand } from "@/components/brand";
import { NotificationBell } from "@/components/notification-bell";
import { Icon } from "@/components/ui/icon";
import { db } from "@/lib/db/client";
import { publicPusherConfig } from "@/lib/realtime/pusher";
import { PublicNav } from "./public-nav";

export async function Header() {
  const actor = await currentActor();
  const unread = actor ? await db.notification.count({ where: { userId: actor.id, readAt: null } }) : 0;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-xl">
      <div className="site-container relative flex min-h-16 items-center justify-between gap-3">
        <Brand />
        <div className="order-last lg:order-none"><PublicNav /></div>
        <div className="ml-auto flex items-center gap-3 sm:gap-5 lg:ml-0">
          {actor ? (
            <>
              <NotificationBell key={actor.id} initialUnread={unread} userId={actor.id} pusher={publicPusherConfig()} />
              <Link className="button small" href={roleHome[actor.role]} aria-label="Không gian của tôi">
                <span className="sm:hidden"><Icon name="grid" size={18} /></span><span className="hidden sm:inline">Không gian của tôi ↗</span>
              </Link>
              <div className="hidden sm:block"><MutationButton
                endpoint="/api/auth/logout"
                method="POST"
                redirectTo="/login"
                variant="quiet"
              >
                Đăng xuất
              </MutationButton></div>
            </>
          ) : (
            <>
              <Link className="hidden text-xs font-semibold text-ink sm:block" href="/login">
                Đăng nhập
              </Link>
              <Link className="button small text-[11px]! sm:text-xs!" href="/register">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-grid">
        <div>
          <Brand />
          <p>Nền tảng kết nối KOL và nhà tổ chức sự kiện. Cùng tạo nên những hợp tác ý nghĩa.</p>
        </div>
        <div>
          <h3>Khám phá</h3>
          <Link href="/jobs">Cơ hội hợp tác</Link>
          <Link href="/kols">Cộng đồng KOL</Link>
        </div>
        <div>
          <h3>Dành cho KOL</h3>
          <Link href="/kol/profile">Hồ sơ cá nhân</Link>
          <Link href="/kol/applications">Đơn ứng tuyển</Link>
          <Link href="/kol/invitations">Lời mời hợp tác</Link>
        </div>
        <div>
          <h3>Dành cho tổ chức</h3>
          <Link href="/organizer/jobs/new">Đăng Job mới</Link>
          <Link href="/organizer/applications">Quản lý ứng viên</Link>
          <Link href="/register">Tham gia KOLVIA</Link>
        </div>
      </div>
      <div className="site-container footer-bottom">
        <span>© {new Date().getFullYear()} KOLVIA</span>
        <span>Kết nối sáng tạo · Đồng hành cùng thành công</span>
      </div>
    </footer>
  );
}
