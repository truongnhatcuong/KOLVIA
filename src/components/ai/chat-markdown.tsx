import { Children } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function safeChatHref(value: string | undefined): string | undefined {
  if (!value || /[\\\u0000-\u0020]/.test(value)) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.toString() : undefined; }
  catch { return undefined; }
}
function hideRawUrls() {
  return (tree: { type: string; children?: unknown[] }) => {
    function walk(value: unknown) {
      if (!value || typeof value !== "object") return;
      const node = value as { type?: string; value?: string; children?: unknown[] };
      if (["text", "inlineCode", "code"].includes(node.type ?? "") && node.value) node.value = node.value.replace(/\bhttps?:\/\/[^\s<>]+|\bwww\.[^\s<>]+/gi, "Xem liên kết");
      for (const child of node.children ?? []) walk(child);
    }
    walk(tree);
  };
}

export function ChatMarkdown({ content }: { content: string }) {
  return <div className="ai-chat-markdown space-y-3 text-xs leading-6 text-ink">
    <Markdown skipHtml remarkPlugins={[remarkGfm, hideRawUrls]} urlTransform={(url) => safeChatHref(url) ?? ""}
      allowedElements={["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "strong", "em", "del", "a", "blockquote", "code", "pre", "br", "hr", "table", "thead", "tbody", "tr", "th", "td"]}
      components={{
        h1: ({ children }) => <h3 className="text-sm font-semibold leading-6">{children}</h3>,
        h2: ({ children }) => <h3 className="text-sm font-semibold leading-6">{children}</h3>,
        h3: ({ children }) => <h4 className="text-xs font-semibold leading-6">{children}</h4>,
        h4: ({ children }) => <h4 className="text-xs font-semibold leading-6">{children}</h4>,
        h5: ({ children }) => <h4 className="text-xs font-semibold leading-6">{children}</h4>,
        h6: ({ children }) => <h4 className="text-xs font-semibold leading-6">{children}</h4>,
        ul: ({ children }) => <ul className="list-disc space-y-1 pl-4">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal space-y-1 pl-4">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/30 pl-3 text-muted">{children}</blockquote>,
        code: ({ children }) => <code className="rounded bg-white/70 px-1 py-0.5 text-[11px]">{children}</code>,
        pre: ({ children }) => <pre className="overflow-x-auto rounded-lg bg-white/70 p-3 text-[11px]">{children}</pre>,
        table: ({ children }) => <div className="overflow-x-auto"><table className="w-full border-collapse text-[11px]">{children}</table></div>,
        th: ({ children }) => <th className="border border-line px-2 py-1 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="border border-line px-2 py-1">{children}</td>,
        a: ({ href, children }) => {
          const safe = safeChatHref(href);
          const text = Children.toArray(children).filter((child) => typeof child === "string").join("");
          const label = /^(https?:\/\/|www\.)/i.test(text) ? "Xem liên kết" : children;
          return safe ? <a href={safe} target={safe.startsWith("/") ? undefined : "_blank"} rel={safe.startsWith("/") ? undefined : "noopener noreferrer"} className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{label}</a> : <span>{label}</span>;
        },
      }}>{content}</Markdown>
  </div>;
}
