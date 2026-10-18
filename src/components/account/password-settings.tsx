"use client";

import { useState } from "react";
import type { Actor } from "@/types";
import { ApiForm } from "@/components/ui/api-form";
import { Icon } from "@/components/ui/icon";

export function PasswordSettings({ actor }: { actor: Actor }) {
  const [draft, setDraft] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const started = Boolean(draft.newPassword);
  const checks = [
    { label: "Có ít nhất 10 ký tự", passed: draft.newPassword.length >= 10 },
    { label: "Khác mật khẩu hiện tại", passed: started && Boolean(draft.currentPassword) && draft.newPassword !== draft.currentPassword },
    { label: "Mật khẩu xác nhận trùng khớp", passed: started && draft.newPassword === draft.confirmPassword },
  ];
  const roleLabel = { KOL: "KOL / Nhà sáng tạo", ORGANIZER: "Nhà tổ chức sự kiện", ADMIN: "Quản trị viên" }[actor.role];
  return <div className="password-settings">
    <section className="password-settings-form" aria-labelledby="password-form-title" onChange={(event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement && ["currentPassword", "newPassword", "confirmPassword"].includes(input.name)) {
        setDraft((old) => ({ ...old, [input.name]: input.value }));
      }
    }}>
      <header className="password-settings-heading">
        <span className="password-settings-icon"><Icon name="lock" size={23} /></span>
        <div><h2 id="password-form-title">Cập nhật mật khẩu</h2><p>Nhập mật khẩu hiện tại để xác nhận tài khoản.</p></div>
      </header>
      <ApiForm endpoint="/api/auth/password" method="PATCH" submitLabel="Lưu mật khẩu mới" redirectTo="/login?passwordChanged=1" fields={[
        { name: "currentPassword", label: "Mật khẩu hiện tại", type: "password", required: true, maxLength: 128, placeholder: "Nhập mật khẩu đang sử dụng", autoComplete: "current-password" },
        { name: "newPassword", label: "Mật khẩu mới", type: "password", required: true, minLength: 10, maxLength: 128, placeholder: "Tạo mật khẩu mới, ít nhất 10 ký tự", autoComplete: "new-password" },
        { name: "confirmPassword", label: "Xác nhận mật khẩu mới", type: "password", required: true, minLength: 10, maxLength: 128, placeholder: "Nhập lại mật khẩu mới", autoComplete: "new-password" },
      ]} />
    </section>
    <aside className="password-settings-aside" aria-label="Thông tin bảo mật tài khoản">
      <div className="password-settings-account">
        <span className="password-settings-avatar" aria-hidden="true">{actor.name.trim().split(/\s+/).slice(-2).map((word) => word[0]).join("").toUpperCase()}</span>
        <div className="min-w-0"><strong>{actor.name}</strong><span>{actor.email}</span><small>{roleLabel}</small></div>
      </div>
      <section className="password-settings-checks" aria-labelledby="password-check-title">
        <h3 id="password-check-title">Yêu cầu mật khẩu mới</h3>
        <ul>{checks.map((check) => <li key={check.label} className={check.passed ? "is-passed" : ""}>
          <span className="password-settings-check-icon" aria-hidden="true">{check.passed ? <Icon name="check" size={13} /> : <span />}</span>
          <span>{check.label}{check.passed && <span className="sr-only">: đã đáp ứng</span>}</span>
        </li>)}</ul>
        <p className="password-settings-match" role="status">{draft.confirmPassword ? checks[2].passed ? "Mật khẩu xác nhận đã khớp." : "Mật khẩu xác nhận chưa khớp." : "Tránh dùng tên, ngày sinh hoặc mật khẩu đã dùng ở nơi khác."}</p>
      </section>
      <div className="password-settings-session">
        <span className="password-settings-session-icon"><Icon name="logout" size={18} /></span>
        <div><h3>Đăng nhập lại sau khi lưu</h3><p>Các phiên đăng nhập sẽ kết thúc. Dùng mật khẩu mới để tiếp tục sử dụng KOLVIA.</p></div>
      </div>
    </aside>
  </div>;
}
