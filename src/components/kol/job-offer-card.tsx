import Link from "next/link";
import type { ReactNode } from "react";
import type { Recommendation } from "@/services/recommendations";
import type { kolInvitationCards } from "@/services/kol-offers";
import type { MatchScore } from "@/lib/ai/matching";
import { categoryLabels, organizationLogo } from "@/lib/demo-assets";
import { dateLabel, dateTimeLabel, money } from "@/lib/format";
import { Icon } from "@/components/ui/icon";
import { MediaImage } from "@/components/ui/media-image";
import { MutationButton } from "@/components/ui/api-form";
import { MatchBadge, MatchDetails } from "@/components/ai/match-details";

type Offer = { title: string; href: string; category: string; organizerName?: string; organizerLogo?: string; budget: string; location: string; eventDate?: string; deadline?: string; benefits?: string; message?: string; match?: MatchScore; requestedAt?: Date };
function OfferCard({ offer, children }: { offer: Offer; children: ReactNode }) {
  return <article className="kol-offer-card">
    <div className="kol-offer-heading"><MediaImage src={offer.organizerLogo ?? organizationLogo(offer.organizerName)} alt={`Logo ${offer.organizerName ?? "tổ chức"}`} sizes="64px" className="kol-offer-logo" /><div className="kol-offer-identity"><p className="kol-offer-company">{offer.organizerName ?? "Nhà tổ chức sự kiện"}</p><span className="kol-offer-category">{categoryLabels[offer.category] ?? offer.category}</span><Link href={offer.href}><h3>{offer.title}</h3></Link></div>{offer.match && <div className="kol-offer-match"><MatchBadge match={offer.match} /></div>}</div>
    <div className="kol-offer-timing"><span><Icon name="pin" size={14} />{offer.location || "Chưa cập nhật địa điểm"}</span>{offer.eventDate && <span><Icon name="calendar" size={14} />Sự kiện {dateLabel(offer.eventDate)}</span>}{offer.deadline && <span className="kol-offer-deadline"><Icon name="calendar" size={14} />Hạn tuyển {dateLabel(offer.deadline)}</span>}{offer.requestedAt && <span>Nhận lúc {dateTimeLabel(offer.requestedAt)}</span>}</div>
    {offer.message && <p className="kol-offer-message">{offer.message}</p>}
    <div className="kol-offer-benefits"><div><span className="kol-offer-fact-icon"><Icon name="briefcase" size={20} /></span><div><small>Thù lao của job</small><strong>{offer.budget}</strong></div></div>{offer.benefits && <div><span className="kol-offer-fact-icon"><Icon name="check" size={20} /></span><div><small>Quyền lợi</small><p>{offer.benefits}</p></div></div>}</div>
    {offer.match && <><p className="kol-offer-reason">{offer.match.reasons.slice(0, 2).join(" ")}</p><MatchDetails match={offer.match} /></>}
    <div className="kol-offer-actions">{children}</div>
  </article>;
}

export function RecommendedJobCard({ item }: { item: Recommendation }) {
  return <OfferCard offer={{ title: item.name, href: item.href, category: item.category, organizerName: item.organizerName, organizerLogo: item.organizerLogo, budget: item.detail, location: item.location, eventDate: item.eventDate, deadline: item.deadline, benefits: item.benefits, match: item }}><Link href={item.href} className="button"><Icon name="briefcase" size={16} />Xem job & ứng tuyển</Link></OfferCard>;
}

export function InvitationOfferCard({ item }: { item: Awaited<ReturnType<typeof kolInvitationCards>>[number] }) {
  const job = item.job;
  const organization = job.organizer.organizer?.companyName ?? job.organizer.name;
  const publicJobAvailable = job.status === "OPEN" && job.moderation === "APPROVED" && !job.completedAt && job.deadline > new Date();
  const detailHref = publicJobAvailable ? `/jobs/${job.id}` : "/kol/invitations";
  const canAccept = item.status === "PENDING" && publicJobAvailable && job._count.participations < job.capacity;
  const canDecline = item.status === "PENDING" && job.status !== "COMPLETED" && !job.completedAt;
  return <OfferCard offer={{ title: job.title, href: detailHref, category: job.category, organizerName: organization, organizerLogo: job.organizer.media[0]?.url ?? organizationLogo(organization), budget: `${money(job.budgetMin)} – ${money(job.budgetMax)}`, location: job.location, eventDate: job.eventDate.toISOString(), deadline: job.deadline.toISOString(), benefits: job.benefits, message: item.message, match: item.match, requestedAt: item.createdAt }}>
    {canAccept && <MutationButton endpoint={`/api/invitations/${item.id}`} body={{ status: "ACCEPTED" }} variant="" confirm={`Chấp nhận lời mời tham gia ${job.title}?`}> <Icon name="check" size={16} />Chấp nhận lời mời</MutationButton>}
    <Link href={detailHref} className="button secondary"><Icon name="eye" size={16} />{publicJobAvailable ? "Xem chi tiết job" : "Xem lời mời"}</Link>
    {canDecline && <MutationButton endpoint={`/api/invitations/${item.id}`} body={{ status: "DECLINED" }} variant="quiet" confirm={`Từ chối lời mời tham gia ${job.title}?`}>Từ chối</MutationButton>}
    {!canAccept && <p className="kol-offer-unavailable">Job hiện không nhận thêm KOL. Bạn vẫn có thể xem lời mời và theo dõi trạng thái.</p>}
  </OfferCard>;
}
