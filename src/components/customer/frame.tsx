"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
export function CustomerFrame({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const path = usePathname();
  if (path.startsWith("/kol/") || path.startsWith("/organizer/") || path.startsWith("/account/") || path === "/notifications") return children;
  return (
    <>
      {header}
      {children}
      {footer}
    </>
  );
}
