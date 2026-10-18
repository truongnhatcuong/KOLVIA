"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { roleHome } from "@/types";
import { Icon, type IconName } from "./icon";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { SocialPostInput } from "@/components/kol/social-post-input";
import { SocialContentTabs } from "@/components/kol/social-content-tabs";
import { fillMissingProfileValues } from "@/lib/profile-samples";
import { notificationLocalEvent } from "@/lib/realtime/channels";

export type FormField = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "url"
    | "number"
    | "datetime-local"
    | "textarea"
    | "select"
    | "checkbox";
  radio?: boolean;
  options?: { label: string; value: string; description?: string }[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  value?: string | number | boolean;
  socialPlatform?: "TIKTOK" | "FACEBOOK" | "YOUTUBE";
  autoComplete?: string;
};
type ApiReply = {
  data?: { id?: string; role?: "KOL" | "ORGANIZER" | "ADMIN" };
  error?: string;
  fields?: Record<string, string[]>;
};
export function ApiForm({
  endpoint,
  method = "POST",
  fields,
  extra = {},
  submitLabel = "Lưu thay đổi",
  redirectTo,
  auth = false,
  steps,
  sampleValues,
  socialTabs = false,
}: {
  endpoint: string;
  method?: string;
  fields: FormField[];
  extra?: Record<string, unknown>;
  submitLabel?: string;
  redirectTo?: string;
  auth?: boolean;
  steps?: { title: string; fields: string[] }[];
  sampleValues?: Record<string, string | number | boolean>;
  socialTabs?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [ok, setOk] = useState(false);
  const [step, setStep] = useState(0);
  const [review, setReview] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const [prefilled, setPrefilled] = useState<Record<string, string | number | boolean> | null>(null);
  const [fillVersion, setFillVersion] = useState(0);
  const displayFields = fields.map((field) => ({ ...field, domId: `${formId}-${field.name}`, value: prefilled?.[field.name] ?? field.value }));
  function fillSample() {
    if (!formRef.current || !sampleValues) return;
    const values = new FormData(formRef.current);
    const current = Object.fromEntries(fields.map((field) => [field.name,
      field.type === "checkbox" ? values.get(field.name) === "on" : String(values.get(field.name) ?? ""),
    ]));
    setPrefilled(fillMissingProfileValues(current, sampleValues));
    setFillVersion((version) => version + 1);
    setErrors({});
    setOk(true);
    setMessage("Đã điền thông tin còn thiếu. Kiểm tra nội dung rồi bấm Lưu thay đổi.");
  }
  function validFields(form: HTMLFormElement, names: string[]) {
    for (const name of names) {
      const element = form.elements.namedItem(name);
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) {
        if (!element.checkValidity()) {
          element.reportValidity();
          return false;
        }
      }
    }
    return true;
  }
  function nextStep(form: HTMLFormElement) {
    if (!steps || !validFields(form, steps[step].fields)) return;
    const data = new FormData(form);
    setReview(
      Object.fromEntries(fields.map((field) => [field.name, String(data.get(field.name) ?? "")])),
    );
    setStep((old) => Math.min(old + 1, steps.length - 1));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (steps && step < steps.length - 1) {
      nextStep(event.currentTarget);
      return;
    }
    setPending(true);
    setMessage("");
    setErrors({});
    setOk(false);
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = { ...extra };
    for (const field of fields) {
      const value = form.get(field.name);
      const date =
        field.type === "datetime-local" && value ? new Date(`${String(value)}:00+07:00`) : null;
      data[field.name] =
        field.type === "checkbox"
          ? value === "on"
          : field.type === "number"
            ? Number(value)
            : date && !Number.isNaN(date.getTime())
              ? date.toISOString()
              : String(value ?? "");
    }
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result: ApiReply = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Không thể lưu dữ liệu.");
        setErrors(result.fields ?? {});
        if (steps && result.fields) {
          const invalidStep = steps.findIndex((s) =>
            s.fields.some((name) => result.fields?.[name]),
          );
          if (invalidStep >= 0) setStep(invalidStep);
        }
        return;
      }
      setOk(true);
      setMessage("Đã lưu thành công.");
      if (auth && result.data?.role) {
        router.push(roleHome[result.data.role]);
      } else if (redirectTo) router.push(redirectTo.replace("[id]", result.data?.id ?? ""));
      router.refresh();
    } catch {
      setMessage("Không thể kết nối. Kiểm tra mạng và thử lại.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form ref={formRef} onSubmit={submit} className="api-form" noValidate={Boolean(steps)}>
      {sampleValues && <div className="mb-4"><Button type="button" variant="outline" disabled={pending} onClick={fillSample}>Điền thông tin mẫu</Button></div>}
      {steps && (
        <ol className="form-steps">
          {steps.map((item, index) => (
            <li
              key={item.title}
              className={index === step ? "active" : index < step ? "complete" : ""}
            >
              <span>{index + 1}</span>
              {item.title}
            </li>
          ))}
        </ol>
      )}
      <fieldset key={fillVersion} disabled={pending}>
        {displayFields.map((field) => socialTabs && field.socialPlatform ? (
          field.name === displayFields.find((item) => item.socialPlatform)?.name ? <SocialContentTabs key="social-content" fields={displayFields.filter((item) => item.socialPlatform)} errors={errors} /> : null
        ) : (
          <div
            className={`field ${field.type === "checkbox" ? "check-field" : ""}`}
            key={field.name}
            hidden={Boolean(steps && !steps[step].fields.includes(field.name))}
          >
            {field.type === "checkbox" ? (
              <label>
                <Input name={field.name} type="checkbox" defaultChecked={Boolean(field.value)} />
                {field.label}
              </label>
            ) : (
              <>
                <label htmlFor={field.domId}>
                  {field.label}
                  {field.required && (
                    <span className="required" aria-hidden="true">
                      {" "}
                      *
                    </span>
                  )}
                </label>
                {field.socialPlatform ? (
                  <SocialPostInput id={field.domId} name={field.name} platform={field.socialPlatform} value={String(field.value ?? "")} invalid={Boolean(errors[field.name])} />
                ) : field.type === "textarea" ? (
                  <Textarea
                    id={field.domId}
                    name={field.name}
                    defaultValue={String(field.value ?? "")}
                    placeholder={field.placeholder}
                    required={field.required}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    rows={5}
                    aria-invalid={Boolean(errors[field.name])}
                    aria-describedby={errors[field.name] ? `${field.domId}-error` : undefined}
                  />
                ) : field.type === "select" && field.radio ? (
                  <div className="role-options" role="group" aria-label={field.label}>
                    {field.options?.map((o, i) => (
                      <label className="role-option" key={o.value}>
                        <Input
                          type="radio"
                          name={field.name}
                          value={o.value}
                          defaultChecked={(field.value ?? field.options?.[0]?.value) === o.value}
                          required={field.required}
                        />
                        <span>
                          <Icon name={i === 0 ? "profile" : "briefcase"} />
                          <strong>{o.label}</strong>
                          {o.description && <small>{o.description}</small>}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : field.type === "select" ? (
                  <select
                    id={field.domId}
                    name={field.name}
                    defaultValue={String(field.value ?? field.options?.[0]?.value ?? "")}
                    required={field.required}
                  >
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={`input-wrap ${auth ? "auth-input-wrap" : ""}`}>
                   
                    <Input
                      id={field.domId}
                      name={field.name}
                      type={
                        field.type === "password" && visiblePasswords[field.name]
                          ? "text"
                          : (field.type ?? "text")
                      }
                      defaultValue={String(field.value ?? "")}
                      placeholder={field.placeholder}
                      required={field.required}
                      min={field.min}
                      max={field.max}
                      minLength={field.minLength}
                      maxLength={field.maxLength}
                      autoComplete={
                        field.autoComplete ?? (field.type === "password"
                          ? endpoint.endsWith("register")
                            ? "new-password"
                            : "current-password"
                          : field.type === "email"
                            ? "email"
                            : undefined)
                      }
                      aria-invalid={Boolean(errors[field.name])}
                      aria-describedby={errors[field.name] ? `${field.domId}-error` : undefined}
                    />
                    {field.type === "password" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="password-toggle size-8! p-1!"
                        aria-label={visiblePasswords[field.name] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        aria-pressed={Boolean(visiblePasswords[field.name])}
                        onClick={() =>
                          setVisiblePasswords((old) => ({ ...old, [field.name]: !old[field.name] }))
                        }
                      >
                        <Icon name={visiblePasswords[field.name] ? "eye-off" : "eye"} size={20} />
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
            {field.hint && <small className="muted">{field.hint}</small>}
            {errors[field.name] && (
              <small className="field-error" id={`${field.domId}-error`}>
                {errors[field.name][0]}
              </small>
            )}
          </div>
        ))}
        {steps && step === steps.length - 1 && (
          <section className="form-review">
            <h2>Kiểm tra nội dung Job</h2>
            <p className="muted">
              Job được lưu thành bản nháp. Bạn có thể tải ảnh bìa và gửi kiểm duyệt sau khi tạo.
            </p>
            <dl>
              {fields.map((field) => (
                <div key={field.name}>
                  <dt>{field.label}</dt>
                  <dd>
                    {field.options?.find((o) => o.value === review[field.name])?.label ??
                      review[field.name] ??
                      ""}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <div className="actions">
          {steps && step > 0 && (
            <Button
              type="button"
              variant="outline"
              className="button secondary"
              onClick={() => setStep((old) => old - 1)}
            >
              ← Quay lại
            </Button>
          )}
          <Button className="button" type="submit">
            {pending ? "Đang xử lý…" : steps && step < steps.length - 1 ? "Tiếp tục" : submitLabel}
            <span aria-hidden="true">↗</span>
          </Button>
        </div>
      </fieldset>
      {message && (
        <p role={ok ? "status" : "alert"} className={ok ? "notice success" : "notice danger"}>
          {message}
        </p>
      )}
    </form>
  );
}

export function MutationButton({
  endpoint,
  method = "PATCH",
  body,
  children,
  confirm,
  redirectTo,
  variant = "secondary",
  icon,
  label,
}: {
  endpoint: string;
  method?: string;
  body?: Record<string, unknown>;
  children: React.ReactNode;
  confirm?: string;
  redirectTo?: string;
  variant?: string;
  icon?: IconName;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const actionLabel = label ?? (typeof children === "string" ? children : undefined);
  async function act() {
    if (confirm && !window.confirm(confirm)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Thao tác thất bại.");
        return;
      }
      if (redirectTo) router.push(redirectTo);
      if (/^\/api\/notifications(?:\/|$)/.test(endpoint)) window.dispatchEvent(new Event(notificationLocalEvent));
      router.refresh();
    } catch {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mutation">
      <Button type="button" variant={variant === "danger" ? "destructive" : variant === "quiet" ? "ghost" : variant ? "outline" : "default"} className={`button small ${variant} ${icon ? "icon-action" : ""}`} disabled={pending} onClick={act}
        title={icon ? actionLabel : undefined} aria-label={icon ? actionLabel : undefined} aria-busy={pending}>
        {icon ? <span className={pending ? "animate-spin" : undefined}><Icon name={pending ? "loader" : icon} size={18} /></span> : pending ? "Đang xử lý…" : children}
      </Button>
      {error && (
        <small role="alert" className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}
