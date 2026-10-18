import type { MatchScore } from "@/lib/ai/matching";
import { Icon } from "@/components/ui/icon";

export function MatchBadge({ match }: { match: MatchScore }) {
  return <span className="match-pill" aria-label={`Điểm phù hợp ${match.score} phần trăm`}><Icon name="spark" size={13} />{match.score}% phù hợp</span>;
}
export function MatchDetails({ match }: { match: MatchScore }) {
  return <details className="ai-match-details"><summary>Căn cứ chấm điểm · {match.assessedWeight}/100 trọng số có dữ liệu</summary><dl>{match.factors.map((factor) => <div key={factor.key}><dt>{factor.label} ({factor.weight}%)</dt><dd><strong>{factor.points === null ? "Chưa đánh giá" : `${factor.points}/${factor.weight} điểm`}</strong><span>{factor.reason}</span></dd></div>)}</dl></details>;
}
