"use client";

import { useState, type KeyboardEvent } from "react";
import type { FormField } from "@/components/ui/api-form";
import { SocialPostInput } from "./social-post-input";

type SocialField = FormField & { domId: string };
export function SocialContentTabs({ fields, errors }: { fields: SocialField[]; errors: Record<string, string[]> }) {
  // Reveal a newly returned server error, including one on a hidden platform.
  const firstError = fields.find((field) => errors[field.name])?.name;
  const [active, setActive] = useState(firstError ?? fields[0]?.name);
  const [seenError, setSeenError] = useState(firstError);
  if (firstError !== seenError) {
    setSeenError(firstError);
    if (firstError) setActive(firstError);
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "Home" ? 0 : event.key === "End" ? fields.length - 1 : event.key === "ArrowRight" ? (index + 1) % fields.length : event.key === "ArrowLeft" ? (index - 1 + fields.length) % fields.length : -1;
    if (next < 0) return;
    event.preventDefault();
    setActive(fields[next].name);
    document.getElementById(`${fields[next].domId}-tab`)?.focus();
  }
  return <section className="social-content-card" aria-labelledby={`${fields[0]?.domId}-heading`}>
    <div className="social-content-heading">
      <h3 id={`${fields[0]?.domId}-heading`}>Nội dung mạng xã hội</h3>
      <span className="social-content-help" tabIndex={0} title="Dán URL HTTPS hoặc mã nhúng. Nút Lưu lưu toàn bộ thay đổi trong hồ sơ. Chỉ nội dung công khai mới xem được." aria-label="Hướng dẫn nhập và lưu nội dung mạng xã hội">?</span>
    </div>
    <div className="social-content-tabs" role="tablist" aria-label="Nền tảng mạng xã hội">
      {fields.map((field, index) => <button key={field.name} type="button" role="tab" id={`${field.domId}-tab`} aria-controls={`${field.domId}-panel`} aria-selected={active === field.name} tabIndex={active === field.name ? 0 : -1} onClick={() => setActive(field.name)} onKeyDown={(event) => navigate(event, index)}>
        {{ TIKTOK: "TikTok", FACEBOOK: "Facebook", YOUTUBE: "YouTube" }[field.socialPlatform!]}
        {errors[field.name] && <span aria-label="Có lỗi" className="text-red-600"> •</span>}
      </button>)}
    </div>
    {fields.map((field) => <div key={field.name} role="tabpanel" id={`${field.domId}-panel`} aria-labelledby={`${field.domId}-tab`} hidden={active !== field.name} className="social-content-panel">
      <label htmlFor={field.domId} className="social-content-label">Liên kết hoặc mã nhúng</label>
      <SocialPostInput id={field.domId} name={field.name} platform={field.socialPlatform!} value={String(field.value ?? "")} invalid={Boolean(errors[field.name])} active={active === field.name} />
      {errors[field.name] && <small role="alert" className="field-error" id={`${field.domId}-error`}>{errors[field.name][0]}</small>}
    </div>)}
  </section>;
}
