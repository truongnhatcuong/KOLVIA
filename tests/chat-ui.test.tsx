import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatMarkdown, safeChatHref } from "../src/components/ai/chat-markdown";
import { ChatJobChoices } from "../src/components/ai/chat-job-choices";

test("chat Markdown renders headings, lists, emphasis, links and GFM tables", () => {
  const html = renderToStaticMarkup(<ChatMarkdown content={'## KOL phù hợp\n\n**Hồ sơ nổi bật**\n\n- Kỹ năng review\n- Livestream\n\n[Xem hồ sơ](/kols/creator-1)\n\n| Lĩnh vực | Điểm |\n| --- | --- |\n| Beauty | 80% |'} />);
  for (const tag of ["<h3", "<strong", "<ul", "<li", "<table", "<th", "<td"]) assert.ok(html.includes(tag));
  assert.ok(html.includes('href="/kols/creator-1"')); assert.ok(html.includes("Xem hồ sơ"));
});
test("chat Markdown skips raw HTML and prevents unsafe URL schemes or credential links", () => {
  const html = renderToStaticMarkup(<ChatMarkdown content={'<script>alert(1)</script>\n\n<iframe src="https://evil.test"></iframe>\n\n<img src="x" onerror="alert(1)">\n\n[Nguy hiểm](javascript:alert%281%29)\n\n[Không mở](data:text/html,evil)\n\n[Thông tin](https://example.com/help)'} />);
  assert.ok(!html.includes("<script") && !html.includes("<iframe") && !html.includes("<img") && !html.includes("onerror=") && !html.includes('href="javascript:') && !html.includes('href="data:'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  for (const url of ["javascript:alert(1)", "data:text/html,x", "//evil.test", "/\\evil.test", "https://user:password@evil.test/"]) assert.equal(safeChatHref(url), undefined);
});
test("raw URLs are shown as readable link labels including autolinks and inline code", () => {
  const html = renderToStaticMarkup(<ChatMarkdown content={'https://example.com/help\n\n`https://example.com/raw`\n\nwww.example.com'} />);
  const visible = html.replace(/<[^>]+>/g, "");
  assert.ok(!visible.includes("https://") && !visible.includes("www."));
  assert.ok(visible.includes("Xem liên kết")); assert.ok(html.includes('href="https://example.com/help"'));
});
test("small job choices render real buttons and large lists use a compact selector", () => {
  const choices = [{ jobId: "job-a", title: "Sự kiện Beauty", detail: "Còn 2 vị trí" }, { jobId: "job-b", title: "Sự kiện Tech", detail: "Còn 1 vị trí" }];
  const html = renderToStaticMarkup(<ChatJobChoices choices={choices} disabled={false} onSelect={() => {}} />);
  assert.equal((html.match(/<button/g) ?? []).length, 2); assert.ok(!html.includes('href=')); assert.ok(html.includes("Sự kiện Beauty"));
  const inactive = renderToStaticMarkup(<ChatJobChoices choices={choices} disabled onSelect={() => {}} />);
  assert.equal((inactive.match(/disabled=""/g) ?? []).length, 2);
  const many = renderToStaticMarkup(<ChatJobChoices choices={Array.from({ length: 7 }, (_, index) => ({ jobId: `job-${index}`, title: `Job ${index}`, detail: "Còn chỗ" }))} disabled={false} onSelect={() => {}} />);
  assert.ok(many.includes('<select')); assert.equal((many.match(/<button/g) ?? []).length, 1);
});
