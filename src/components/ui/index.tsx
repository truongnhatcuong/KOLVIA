import Link from "next/link";
import type { ReactNode } from "react";
import { statusLabels } from "@/lib/format";
import { Icon, type IconName } from "./icon";
import { Card } from "./card";

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Badge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>{label ?? statusLabels[status] ?? status}</span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title = "Chưa có dữ liệu",
  description = "Các cập nhật mới sẽ xuất hiện tại đây.",
  href,
  label,
}: {
  title?: string;
  description?: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol" aria-hidden="true">
        ✳
      </span>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {href && (
        <Link href={href} className="button secondary">
          {label ?? "Khám phá"}
          <Arrow />
        </Link>
      )}
    </div>
  );
}
export function StatCards({ items }: { items: { label: string; value: number; hint?: string }[] }) {
  const accents = ["bg-primary", "bg-secondary", "bg-success", "bg-primary-container"];
  return (
    <div className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-5">
      {items.map((item, index) => (
        <Card className="relative flex flex-col border-0 p-5 ring-1 ring-ink/5" key={item.label}>
          <div className="flex items-start justify-between gap-3"><span className="max-w-[160px] text-[11px] leading-5 text-ink">{item.label}</span><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary"><Icon name={(["briefcase", "calendar", "mail", "check"] as IconName[])[index % 4]} size={18} /></span></div>
          <strong className="mt-3 text-[30px] font-semibold leading-tight tracking-tight text-ink">{item.value}</strong>
          {item.hint && <small className="mt-1 text-[10px] text-muted">{item.hint}</small>}
          <div aria-hidden="true" className={`mt-5 h-1 rounded-full ${accents[index % accents.length]}`} />
        </Card>
      ))}
    </div>
  );
}
