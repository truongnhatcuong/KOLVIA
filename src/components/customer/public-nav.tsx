"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [["/", "Trang chủ"], ["/jobs", "Khám phá Job"], ["/kols", "Khám phá KOL"], ["/#how-it-works", "Quy trình hợp tác"]] as const;
export function PublicNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return <>
    <nav aria-label="Điều hướng chính" className="hidden items-center gap-6 text-xs lg:flex xl:gap-8">
      {links.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={path === href ? "font-semibold text-primary" : "text-muted transition hover:text-primary"}>{label}</Link>)}
    </nav>
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Đóng menu" : "Mở menu"} className="flex size-9 items-center justify-center rounded-lg border border-line text-primary">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={open ? "m6 6 12 12M6 18 18 6" : "M4 6h16M4 12h16M4 18h16"} /></svg>
      </button>
      {open && <nav id="mobile-navigation" aria-label="Điều hướng trên điện thoại" className="absolute inset-x-0 top-full grid gap-1 border-b border-line bg-white p-4 shadow-lg">{links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={path === href ? "page" : undefined} className={`rounded-xl px-4 py-3 text-sm ${path === href ? "bg-surface-low font-semibold text-primary" : "text-muted"}`}>{label}</Link>)}</nav>}
    </div>
  </>;
}
