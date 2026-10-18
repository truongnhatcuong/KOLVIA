import { api } from "@/lib/http";
import { publicKol } from "@/lib/db/queries";
import { assert } from "@/lib/errors";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  return api(async () => {
    const kol = await publicKol(id);
    assert(kol, 404, "Không tìm thấy KOL công khai.");
    return kol;
  }, false)(request);
}
