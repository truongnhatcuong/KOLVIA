import { assert, AppError } from "@/lib/errors";

export type ToolDeclaration = { name: string; description: string; parameters: Record<string, unknown> };
export type ToolCall = { name: string; args: unknown };
export type ChatTurn = { role: "user" | "assistant"; content: string };

export function geminiConfig(env: Record<string, string | undefined> = process.env) {
  const key = env.API_KEY_AI || env.GEMINI_API_KEY;
  const model = env.AI_MODEL || "gemini-3-flash";
  assert(key, 503, "Trợ lý AI chưa được cấu hình. Bạn vẫn có thể tìm kiếm trực tiếp trên website.");
  assert(/^gemini-[a-zA-Z0-9._-]{1,90}$/.test(model), 503, "Cấu hình model AI chưa hợp lệ.");
  let url: URL;
  try { url = new URL(env.AI_CHAT_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"); }
  catch { throw new AppError(503, "Cấu hình kết nối AI chưa hợp lệ."); }
  assert(url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash, 503, "Cấu hình kết nối AI chưa hợp lệ.");
  url.pathname = url.pathname.replace(/\/$/, "");
  if (!url.pathname.endsWith("/chat/completions")) url.pathname = `${url.pathname}/chat/completions`;
  return { key, model, url: url.toString() };
}

/** One bounded function-calling turn. Server formats database facts itself. */
export async function planTools(system: string, history: ChatTurn[], message: string, tools: ToolDeclaration[]): Promise<ToolCall[]> {
  const config = geminiConfig();
  let response: Response;
  try {
    response = await fetch(config.url, {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.key}` },
      body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: system }, ...history, { role: "user", content: message }],
        tools: tools.map((tool) => ({ type: "function", function: tool })), tool_choice: "required", parallel_tool_calls: false, max_tokens: 1000,
      }),
    });
  } catch { throw new AppError(503, "Không kết nối được trợ lý AI. Vui lòng thử lại sau hoặc dùng trang tìm kiếm."); }
  if (!response.ok) {
    if (response.status === 429) throw new AppError(503, "Dịch vụ AI đang quá tải hoặc hết hạn mức. Vui lòng thử lại sau.");
    throw new AppError(503, "Dịch vụ AI chưa sẵn sàng. Vui lòng thử lại sau.");
  }
  try {
    const text = await response.text();
    assert(text.length <= 64_000, 502, "Phản hồi AI quá lớn.");
    const body = JSON.parse(text) as { choices?: { message?: { tool_calls?: { function?: { name?: string; arguments?: string } }[] } }[] };
    const calls = body.choices?.[0]?.message?.tool_calls;
    assert(calls?.length && calls.length <= 3, 502, "AI chưa xác định được yêu cầu. Hãy hỏi cụ thể hơn.");
    return calls.map((call) => {
      assert(call.function?.name && typeof call.function.arguments === "string" && call.function.arguments.length <= 4000, 502, "AI trả về yêu cầu không hợp lệ.");
      assert(tools.some((tool) => tool.name === call.function!.name), 403, "Trợ lý không được thực hiện thao tác này.");
      return { name: call.function.name, args: JSON.parse(call.function.arguments) as unknown };
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, "AI trả về dữ liệu không hợp lệ. Hãy thử lại.");
  }
}
