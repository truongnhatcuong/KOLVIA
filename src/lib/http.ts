import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError, assert } from "@/lib/errors";
import { checkOrigin } from "./request-origin";
export { checkOrigin } from "./request-origin";

export async function jsonBody(request: Request): Promise<unknown> {
  const content = await request.text();
  assert(content.length <= 32_000, 413, "Dữ liệu gửi lên quá lớn.");
  try {
    return JSON.parse(content);
  } catch {
    throw new AppError(400, "Dữ liệu JSON không hợp lệ.");
  }
}
export function api(handler: (request: Request) => Promise<unknown>, mutation = false) {
  return async (request: Request) => {
    try {
      if (mutation) checkOrigin(request);
      const data = await handler(request);
      return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof ZodError)
        return NextResponse.json(
          {
            error: error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
            fields: error.flatten().fieldErrors,
          },
          { status: 422 },
        );
      if (error instanceof AppError)
        return NextResponse.json({ error: error.message }, { status: error.status });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002")
          return NextResponse.json(
            { error: "Dữ liệu đã tồn tại. Bạn không thể gửi trùng." },
            { status: 409 },
          );
        if (error.code === "P2025")
          return NextResponse.json({ error: "Không tìm thấy dữ liệu." }, { status: 404 });
        if (error.code === "P2034") return NextResponse.json({ error: "Trạng thái đang được cập nhật đồng thời. Tải lại và thử lại thao tác." }, { status: 409 });
      }
      console.error("KOLVIA request failed", error instanceof Error ? error.name : "Unknown error");
      return NextResponse.json(
        { error: "Không thể xử lý yêu cầu. Vui lòng thử lại." },
        { status: 500 },
      );
    }
  };
}
