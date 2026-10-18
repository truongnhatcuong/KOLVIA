"use client";

import Link from "next/link";
import { useId, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "./icon";
import { Button } from "./button";

export function ActionLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return <Link href={href} className="button small secondary icon-action" title={label} aria-label={label}><Icon name={icon} size={18} /></Link>;
}

export function ActionDialog({ icon, label, title, children, danger = false, triggerText }: {
  icon: IconName; label: string; title?: string; children: ReactNode; danger?: boolean; triggerText?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <>
      <Button type="button" variant={danger ? "destructive" : triggerText ? "default" : "outline"} size={triggerText ? "sm" : "icon"}
        className={`button small ${triggerText ? "" : "icon-action"} ${danger ? "danger" : triggerText ? "" : "secondary"}`}
        title={label} aria-label={label} aria-haspopup="dialog" aria-controls={id}
        onClick={() => dialog.current?.showModal()}>
        <Icon name={icon} size={18} />
        {triggerText}
      </Button>
      <dialog ref={dialog} id={id} aria-labelledby={`${id}-title`} className="action-dialog">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={`${id}-title`} className="text-lg font-semibold">{title ?? label}</h2>
          <Button type="button" variant="ghost" size="icon" title="Đóng" aria-label="Đóng" onClick={() => dialog.current?.close()}><Icon name="close" size={18} /></Button>
        </div>
        {children}
      </dialog>
    </>
  );
}
