"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./ui/icon";

export function DashboardNav({ links }: { links: string[][] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Không gian làm việc">
      {links.map(([href, label]) => {
        const active = path === href || (href !== "/admin" && path.startsWith(`${href}/`));
        const icon: IconName = href.endsWith("dashboard") || href === "/admin" ? "grid" : href.endsWith("profile") ? "profile" : href === "/notifications" ? "bell" : href.endsWith("invitations") ? "mail" : href.endsWith("applications") || href.endsWith("users") ? "users" : href === "/kols" ? "search" : "briefcase";
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-xs font-medium transition ${active ? "bg-primary-container text-white shadow-sm" : "text-muted hover:bg-surface-low hover:text-primary"}`}><span className="shrink-0"><Icon name={icon} size={18} /></span>{label}</Link>;
      })}
    </nav>
  );
}
