import { publicJobs, publicKols, publicStats } from "@/lib/db/queries";
import { HomeView } from "@/components/customer/home-view";
import { currentActor } from "@/lib/auth/session";
import { FloatingChat } from "@/components/ai/floating-chat";

export default async function HomePage() {
  const [jobs, kols, stats, actor] = await Promise.all([publicJobs(), publicKols(), publicStats(), currentActor()]);
  return <><HomeView jobs={jobs} kols={kols} stats={stats} /><FloatingChat key={actor?.id ?? "guest"} role={actor?.role ?? "GUEST"} /></>;
}
