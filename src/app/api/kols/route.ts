import { api } from "@/lib/http";
import { publicKols } from "@/lib/db/queries";
export const GET = api(async (r) => publicKols(Object.fromEntries(new URL(r.url).searchParams)));
