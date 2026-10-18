"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Actor } from "@/types";
import type {
  AssistantAnswer,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantJobChoice,
} from "@/types/ai-assistant";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/ui/media-image";
import { chatbotBadge } from "@/lib/design-assets";
import { ChatMarkdown, safeChatHref } from "./chat-markdown";
import { ChatJobChoices } from "./chat-job-choices";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  cards?: AssistantAnswer["cards"];
  jobChoices?: AssistantAnswer["jobChoices"];
  failed?: boolean;
};
const questions = {
  GUEST: ["KOLVIA là gì?", "Tìm job Beauty tại TP.HCM.", "Đăng ký tham gia job như thế nào?"],
  KOL: [
    "Gợi ý job phù hợp với tôi.",
    "Tôi đã đăng ký bao nhiêu job?",
    "Tôi có lời mời nào đang chờ?",
  ],
  ORGANIZER: [
    "Tìm KOL Beauty tại Đà Nẵng.",
    "Job của tôi có bao nhiêu KOL xác nhận?",
    "Gợi ý KOL phù hợp cho sự kiện của tôi.",
  ],
  ADMIN: [
    "Hệ thống có bao nhiêu KOL?",
    "Có bao nhiêu job đang chờ duyệt?",
    "KOLVIA hoạt động thế nào?",
  ],
};
export function FloatingChat({ role = "GUEST" }: { role?: Actor["role"] | "GUEST" }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const contextToken = useRef<string | undefined>(undefined);
  const inFlight = useRef(false);
  const lastAttempt = useRef<{
    text: string;
    choice?: AssistantJobChoice;
    questionId: number;
  } | null>(null);
  const [activeChoiceMessage, setActiveChoiceMessage] = useState<number | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();
  const hide = useCallback(() => {
    setOpen(false);
    setExpanded(false);
    trigger.current?.focus();
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(
      () => setVisible(false),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160,
    );
  }, []);
  function show() {
    clearTimeout(closeTimer.current);
    setVisible(true);
    setOpen(true);
  }
  useEffect(
    () => () => {
      request.current?.abort();
      clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (open) {
      input.current?.focus();
      scroll.current?.scrollTo({ top: scroll.current.scrollHeight });
    }
  }, [open, messages, pending]);
  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (expanded) setExpanded(false);
        else hide();
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, expanded, hide]);
  async function send(text = draft, choice?: AssistantJobChoice, retry = false) {
    const message = text.trim();
    if (!message || inFlight.current) return;
    inFlight.current = true;
    const questionId =
      retry && lastAttempt.current ? lastAttempt.current.questionId : ++sequence.current;
    const history = messages
      .filter((item) => !item.failed && item.id !== questionId)
      .slice(-6)
      .map((item) => ({
        role: item.role,
        content:
          `${item.cards?.map((card) => `${card.title}: ${card.href}`).join("\n") ?? ""}\n${item.content}`
            .trim()
            .slice(0, 1000),
      }));
    const question: Message = { id: questionId, role: "user", content: message };
    setMessages((old) =>
      retry
        ? old.map((item) => (item.id === questionId ? question : item))
        : [...old, question].slice(-40),
    );
    lastAttempt.current = { text: message, choice, questionId };
    setDraft("");
    setPending(true);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          contextToken: contextToken.current,
          ...(choice ? { action: { type: "select_job", jobId: choice.jobId } } : {}),
        } satisfies AssistantChatRequest),
      });
      const result: AssistantChatResponse = await response.json();
      if (!response.ok || "error" in result) {
        if (response.status === 409 && choice) {
          contextToken.current = undefined;
          setActiveChoiceMessage(null);
          lastAttempt.current = { text: "Gợi ý KOL phù hợp cho sự kiện của tôi", questionId };
        }
        throw new Error("error" in result ? result.error : "Không nhận được phản hồi.");
      }
      const answer: AssistantAnswer = result.data;
      contextToken.current = answer.contextToken ?? contextToken.current;
      const reply: Message = {
        id: ++sequence.current,
        role: "assistant",
        content: answer.message,
        cards: answer.cards,
        jobChoices: answer.jobChoices,
      };
      if (answer.jobChoices !== undefined)
        setActiveChoiceMessage(answer.jobChoices.length ? reply.id : null);
      setMessages((old) => [...old, reply].slice(-40));
    } catch (error) {
      setError(
        controller.signal.aborted
          ? "Phản hồi quá lâu. Hãy thử lại hoặc dùng tìm kiếm trực tiếp."
          : error instanceof Error
            ? error.message
            : "Không thể kết nối trợ lý.",
      );
      setDraft(message);
      setMessages((old) =>
        old.map((item) => (item.id === questionId ? { ...item, failed: true } : item)),
      );
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
      setPending(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void send();
  }
  return (
    <div className="ai-chat-root">
      {visible && (
        <section
          className={`ai-chat-window ${open ? "is-open" : "is-closing"}${expanded ? " is-expanded" : ""}`}
          id={id}
          role="dialog"
          aria-modal="false"
          aria-hidden={!open}
          inert={!open}
          aria-labelledby={`${id}-title`}
        >
          <header className="ai-chat-header">
            <MediaImage
              src={chatbotBadge}
              alt="Robot trợ lý KOLVIA"
              sizes="40px"
              className="ai-chat-avatar ai-chat-portrait"
            />
            <div>
              <h2 id={`${id}-title`}>Trợ lý KOLVIA</h2>
              <p>Tìm cơ hội · Kết nối đúng người</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={expanded ? "Thu gọn" : "Phóng to"}
              aria-label={expanded ? "Thu gọn trò chuyện" : "Phóng to trò chuyện"}
              aria-pressed={expanded}
              aria-controls={id}
              className="text-white"
              onClick={() => setExpanded((value) => !value)}
            >
              <Icon name={expanded ? "minimize" : "maximize"} size={18} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Đóng"
              aria-label="Đóng trò chuyện"
              onClick={hide}
              className="text-red-500"
            >
              <Icon name="close" size={18}   />
            </Button>
          </header>
          <div
            ref={scroll}
            className="ai-chat-messages"
            role="log"
            aria-label="Tin nhắn trò chuyện"
            aria-live="polite"
            aria-relevant="additions"
          >
            <div className="ai-chat-welcome">
              <MediaImage
                src={chatbotBadge}
                alt="Robot trợ lý KOLVIA"
                sizes="52px"
                className="ai-chat-welcome-portrait ai-chat-portrait"
              />
              <h3>Chào bạn, mình có thể giúp gì?</h3>
              <p>Tìm job, tìm KOL và xem thông tin tài khoản theo quyền của bạn.</p>
            </div>
            {!messages.length && (
              <div className="ai-chat-suggestions">
                {questions[role].map((question) => (
                  <button
                    type="button"
                    key={question}
                    disabled={pending}
                    onClick={() => void send(question)}
                  >
                    {question}
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={`ai-chat-message ai-chat-message-${message.role}`}>
                {message.role === "assistant" ? (
                  <ChatMarkdown content={message.content} />
                ) : (
                  <p>{message.content}</p>
                )}
                {message.jobChoices?.length ? (
                  <ChatJobChoices
                    choices={message.jobChoices}
                    disabled={pending || activeChoiceMessage !== message.id}
                    onSelect={(choice) => void send(`Gợi ý KOL cho ${choice.title}`, choice)}
                  />
                ) : null}
                {message.cards
                  ?.filter((card) => safeChatHref(card.href))
                  .map((card, index) => (
                    <Link className="ai-chat-result" key={`${card.href}-${index}`} href={card.href}>
                      <strong>
                        {card.title}
                        {card.score !== undefined && <span>{card.score}%</span>}
                      </strong>
                      <small>{card.detail}</small>
                      <span className="ai-chat-result-link">
                        {card.href.startsWith("/kols/") ? "Xem hồ sơ ↗" : "Xem chi tiết ↗"}
                      </span>
                    </Link>
                  ))}
              </div>
            ))}
            {pending && (
              <p role="status" className="ai-chat-thinking">
                <Icon name="loader" size={15} />
                Đang tìm thông tin…
              </p>
            )}
            {error && (
              <div role="alert" className="ai-chat-error">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    const attempt = lastAttempt.current;
                    if (attempt) void send(attempt.text, attempt.choice, true);
                  }}
                  disabled={pending}
                >
                  Thử lại
                </button>
                <Link href="/jobs">Tìm job trực tiếp ↗</Link>
              </div>
            )}
          </div>
          <form onSubmit={submit} className="ai-chat-composer">
            <label htmlFor={`${id}-input`} className="sr-only">
              Câu hỏi cho trợ lý KOLVIA
            </label>
            <textarea
              ref={input}
              id={`${id}-input`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Hỏi về job, KOL hoặc tài khoản…"
              disabled={pending}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Gửi câu hỏi"
              title="Gửi"
              disabled={pending || !draft.trim()}
            >
              <Icon name={pending ? "loader" : "send"} size={19} />
            </Button>
          </form>
          <p className="ai-chat-footer">Chỉ tra cứu thông tin · Không tự thực hiện thao tác</p>
        </section>
      )}
      <button
        ref={trigger}
        type="button"
        className="ai-chat-trigger"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "Thu nhỏ trợ lý KOLVIA" : "Mở trợ lý AI KOLVIA"}
        title="Trợ lý AI KOLVIA"
        onClick={() => (open ? hide() : show())}
      >
        <MediaImage
          src={chatbotBadge}
          alt=""
          sizes="64px"
          className="ai-chat-trigger-portrait ai-chat-portrait"
        />
        <span className="ai-chat-trigger-label" aria-hidden="true">
          {open ? <Icon name="chevron-down" size={12} /> : "AI"}
        </span>
      </button>
    </div>
  );
}
