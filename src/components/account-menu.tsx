"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Actor } from "@/types";
import { roleHome } from "@/types";
import { MediaImage } from "@/components/ui/media-image";
import { Icon, type IconName } from "@/components/ui/icon";
import { MutationButton } from "@/components/ui/api-form";

const roleLabels = { KOL: "Nhà sáng tạo KOL/KOC", ORGANIZER: "Nhà tổ chức sự kiện", ADMIN: "Quản trị viên" };
export function AccountMenu({ actor, portrait, portraitAlt }: { actor: Actor; portrait: string; portraitAlt: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const profile = actor.role === "KOL" ? "/kol/profile" : actor.role === "ORGANIZER" ? "/organizer/profile" : "/admin/users";
  const links: { href: string; label: string; icon: IconName }[] = [
    { href: roleHome[actor.role], label: "Tổng quan", icon: "grid" },
    { href: profile, label: actor.role === "ADMIN" ? "Quản lý tài khoản" : "Thông tin hồ sơ", icon: "profile" },
    ...(actor.role !== "ADMIN" ? [
      { href: `${profile}#profile-images`, label: "Ảnh đại diện & ảnh bìa", icon: "camera" as const },
      { href: actor.role === "ORGANIZER" ? "/organizer/jobs" : "/kol/jobs", label: actor.role === "ORGANIZER" ? "Job của tổ chức" : "Job đã xác nhận", icon: "briefcase" as const },
    ] : []),
    { href: "/notifications", label: "Thông báo", icon: "bell" },
    { href: "/account/security", label: "Đổi mật khẩu", icon: "lock" },
    { href: "/", label: "Về trang chủ", icon: "eye" },
  ];
  return (
    <div ref={root} className="relative shrink-0">
      <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} aria-label={`Menu tài khoản của ${actor.name}`} onClick={() => setOpen((value) => !value)} className={`flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-surface-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${open ? "bg-surface-low" : ""}`}>
        <MediaImage src={portrait} alt={portraitAlt} sizes="40px" className="size-10 shrink-0 rounded-full" />
        <span className="hidden max-w-40 sm:block"><strong className="block truncate text-xs font-semibold">{actor.name}</strong><span className="mt-0.5 block truncate text-[10px] text-muted">{roleLabels[actor.role]}</span></span>
        <span className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}><Icon name="chevron-down" size={15} /></span>
      </button>
      {open && <div id={id} role="region" aria-label={`Tài khoản của ${actor.name}`} className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-6rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white p-2 shadow-xl">
        <div className="flex items-center gap-3 border-b border-line p-3 pb-4">
          <MediaImage src={portrait} alt={portraitAlt} sizes="48px" className="size-12 shrink-0 rounded-full" />
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{actor.name}</p><p className="mt-1 break-all text-xs text-muted">{actor.email}</p><p className="mt-2 inline-flex rounded-full bg-surface-container px-2 py-1 text-[10px] font-medium text-primary">{roleLabels[actor.role]}</p></div>
        </div>
        <nav aria-label="Menu tài khoản" className="grid gap-0.5 py-2">
          {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-ink transition hover:bg-surface-low focus-visible:outline-2 focus-visible:outline-primary"><span className="text-muted"><Icon name={link.icon} size={18} /></span>{link.label}</Link>)}
        </nav>
        <div className="border-t border-line px-2 pb-1 pt-2"><MutationButton endpoint="/api/auth/logout" method="POST" redirectTo="/login" variant="quiet"><Icon name="logout" size={18} />Đăng xuất</MutationButton></div>
      </div>}
    </div>
  );
}
