"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Recommendations } from "@/services/recommendations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { ActionDialog } from "@/components/ui/action-controls";
import { ApiForm } from "@/components/ui/api-form";
import { RecommendedJobCard } from "@/components/kol/job-offer-card";

export function RecommendationsPanel({ jobId }: { jobId?: string }) {
  const [data, setData] = useState<Recommendations | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/ai/recommendations?${jobId ? `jobId=${encodeURIComponent(jobId)}&` : ""}${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Không tải được gợi ý."); return result.data as Recommendations; })
      .then((result) => { setData(result); setError(""); })
      .catch((error) => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Không tải được gợi ý."); })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [jobId, query, version]);
  function refresh(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const values = form.current ? new FormData(form.current) : null;
    const params = new URLSearchParams();
    for (const field of ["minBudget", "maxBudget"]) { const value = values?.get(field); if (value) params.set(field, String(value)); }
    setQuery(params.toString()); setData(null); setError(""); setPending(true); setVersion((old) => old + 1);
  }
  return <section className="ai-matching-panel" aria-labelledby={jobId ? "job-matching-heading" : "kol-matching-heading"}>
    <div className="ai-matching-heading"><span className="ai-matching-symbol"><Icon name="spark" size={21} /></span><div><h2 id={jobId ? "job-matching-heading" : "kol-matching-heading"}>{jobId ? "KOL phù hợp với job" : "Job phù hợp với bạn"}</h2><p>Dựa trên hồ sơ, kỹ năng và yêu cầu tuyển dụng.</p></div><Button type="button" variant="ghost" size="icon" aria-label="Cập nhật gợi ý" title="Cập nhật gợi ý" disabled={pending} onClick={() => refresh()}><Icon name={pending ? "loader" : "search"} size={18} /></Button></div>
    {!jobId && <form ref={form} className="ai-matching-budget" onSubmit={refresh}><label>Thù lao từ (đ)<Input type="number" name="minBudget" min={0} max={2000000000} placeholder="Không giới hạn" /></label><label>Đến (đ)<Input type="number" name="maxBudget" min={0} max={2000000000} placeholder="Không giới hạn" /></label><Button type="submit" variant="outline" disabled={pending}>Lọc gợi ý</Button></form>}
    {pending && <p role="status" className="ai-matching-loading"><Icon name="loader" size={18} />Đang đối chiếu dữ liệu…</p>}
    {error && <div role="alert" className="notice danger"><p>{error}</p><Button type="button" variant="outline" size="sm" onClick={() => refresh()} className="mt-3">Thử lại</Button></div>}
    {!pending && !error && data && <>
      {data.items.length ? data.kind === "jobs" ? <div className="kol-offer-list">{data.items.slice(0, 3).map((item) => <RecommendedJobCard item={item} key={item.id} />)}{data.items.length > 3 && <details className="kol-offer-more"><summary>Xem thêm {data.items.length - 3} gợi ý</summary><div className="kol-offer-list">{data.items.slice(3).map((item) => <RecommendedJobCard item={item} key={item.id} />)}</div></details>}</div> : <div className="ai-matching-list">{data.items.map((item) => <article className="ai-matching-item" key={item.id}>
        <div className="ai-matching-item-heading"><div className="min-w-0"><Link href={item.href} className="ai-matching-title">{item.name}</Link><p>{item.category} · {item.location || "Chưa có địa điểm"}</p><small>{item.detail}</small></div><span className="ai-match-score" aria-label={`Điểm phù hợp ${item.score} phần trăm`}>{item.score}<small>% phù hợp</small></span></div>
        <ul className="ai-match-reasons">{item.reasons.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}</ul>
        <details className="ai-match-details"><summary>Cách tính điểm · {item.assessedWeight}/100 trọng số có dữ liệu</summary><dl>{item.factors.map((factor) => <div key={factor.key}><dt>{factor.label} ({factor.weight}%)</dt><dd><strong>{factor.points === null ? "Chưa đánh giá" : `${factor.points}/${factor.weight} điểm`}</strong><span>{factor.reason}</span></dd></div>)}</dl></details>
        <div className="ai-match-actions"><Link className="button secondary small" href={item.href}>{jobId ? "Xem hồ sơ" : "Xem job"} ↗</Link>{jobId && <ActionDialog icon="send" label={`Mời ${item.name} tham gia`} title={`Gửi lời mời đến ${item.name}`}><ApiForm endpoint="/api/invitations" extra={{ jobId, kolId: item.id }} submitLabel="Gửi lời mời" redirectTo="/organizer/invitations" fields={[{ name: "message", label: "Nội dung lời mời", type: "textarea", required: true, minLength: 10, maxLength: 2000, placeholder: "Giới thiệu sự kiện và lý do bạn muốn hợp tác…" }]} /></ActionDialog>}</div>
      </article>)}</div> : <p className="muted py-5 text-sm">Chưa có gợi ý còn tuyển. Hãy cập nhật hồ sơ hoặc thử lại khi có job mới.</p>}
      <p className="ai-matching-note">{data.notice}</p>
    </>}
  </section>;
}
