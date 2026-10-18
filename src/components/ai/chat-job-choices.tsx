"use client";

import { useState } from "react";
import type { AssistantJobChoice } from "@/types/ai-assistant";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export function ChatJobChoices({ choices, disabled, onSelect }: { choices: AssistantJobChoice[]; disabled: boolean; onSelect: (choice: AssistantJobChoice) => void }) {
  const [selected, setSelected] = useState("");
  if (choices.length > 6) return <div className="ai-chat-job-select"><label>Chọn job đang tuyển<select value={selected} disabled={disabled} onChange={(event) => setSelected(event.target.value)}><option value="">Chọn một job…</option>{choices.map((choice) => <option key={choice.jobId} value={choice.jobId}>{choice.title}</option>)}</select></label><Button type="button" size="sm" disabled={disabled || !selected} onClick={() => { const choice = choices.find((item) => item.jobId === selected); if (choice) onSelect(choice); }}>Gợi ý KOL cho job này</Button></div>;
  return <div className="ai-chat-job-choices" aria-label="Chọn job để gợi ý KOL">{choices.map((choice, index) => <button type="button" key={choice.jobId} disabled={disabled} onClick={() => onSelect(choice)}><span className="ai-chat-choice-number">{index + 1}</span><span><strong>{choice.title}</strong><small>{choice.detail}</small><span className="ai-chat-result-link">Gợi ý KOL cho job này</span></span><Icon name="chevron-down" size={14} /></button>)}</div>;
}
