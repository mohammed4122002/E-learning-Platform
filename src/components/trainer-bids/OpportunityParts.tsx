import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Feedback";
import { Breadcrumb } from "@/components/ui/Navigation";
import { BidIcon, StatusPill, TONE_TEXT, type BidIconKey, type BidTone } from "@/components/trainer-bids/parts";
import { formatPercent, toArabicDigits } from "@/lib/format";
import { MATCH_WEIGHTS, budgetRange, closesIn, daysLabel, formatDayRange, seatsLabel, MODE_LABEL } from "@/lib/trainer-bids";
import type { Opportunity } from "@/lib/data/trainer-bids";
import type { TrainerBid } from "@/lib/data/trainer-bids";

/* TRR-BID-01 · طلبات التدريب المتاحة — default 280:6393, empty 313:10693, loading 464:36381. */

/** Location part of the meta line: city for in-person requests, «عن بُعد» otherwise. */
export function placeOf(o: Pick<Opportunity, "mode" | "city">): string {
  return o.mode === "live_remote" ? MODE_LABEL.live_remote : (o.city ?? MODE_LABEL.in_person);
}

/** «تعارض: لديك دورة في ٠٢ – ٠٣ يونيو. قدّم بتواريخ بديلة أو عدّل جدولك.» */
export function conflictSentence(c: NonNullable<Opportunity["conflict"]>): string {
  const what = c.kind === "course" || c.kind === "external" ? "دورة" : c.kind === "leave" ? "إجازة" : c.kind === "bid" ? "عرض مقبول" : "موعد";
  return `تعارض: لديك ${what} في ${formatDayRange(c.from, c.to)}. قدّم بتواريخ بديلة أو عدّل جدولك.`;
}

function MetaItem({ icon, children }: { icon: BidIconKey; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap type-caption text-text-secondary">
      {children}
      <BidIcon name={icon} size={16} className="text-text-muted" />
    </span>
  );
}

/** Opportunity card (280:6563): r16, p20/22/22, gap14; the best match gets a 2px success stroke and a primary CTA. */
export function OpportunityCard({ o, top }: { o: Opportunity; top: boolean }) {
  const href = `/trainer/opportunities/${o.id}/bid`;
  return (
    <li
      className={`flex w-full flex-col gap-3.5 rounded-16 bg-bg-card px-4 pt-5 pb-[22px] shadow-card sm:px-[22px] ${
        top ? "border-2 border-state-success" : "border border-border-default"
      }`}
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <h3 className="type-title text-text-primary">
            <Link href={href} className="rounded-8 hover:underline focus-ring">
              {o.title}
            </Link>
          </h3>
          <p className="flex items-center gap-2 type-subtitle text-text-secondary">
            <BidIcon name="landmark" size={16} className="text-text-muted" />
            <span className="min-w-0 flex-1">{o.organizationName}</span>
          </p>
        </div>
        <ButtonLink href={href} variant={top ? "primary" : "outline"} className="w-full sm:w-[120px]">
          {o.myBidStatus === "draft" ? "أكمل عرضك" : "قدّم عرضًا"}
        </ButtonLink>
      </div>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-8 bg-bg-page px-3.5 py-3">
        <MetaItem icon="clock">{closesIn(o.bidsCloseAt)}</MetaItem>
        <MetaItem icon="hourglass">{budgetRange(o.budgetMin, o.budgetMax)}</MetaItem>
        <MetaItem icon="calendar">{formatDayRange(o.startsOn, o.endsOn)}</MetaItem>
        <MetaItem icon="users">{`${daysLabel(o.days)} · ${seatsLabel(o.seats)} · ${placeOf(o)}`}</MetaItem>
      </div>
      {o.conflict ? (
        <p className="flex w-full items-start gap-2.5 rounded-8 bg-state-error-bg px-3.5 py-[11px] type-caption text-state-error">
          <BidIcon name="alert" size={16} className="mt-0.5" />
          <span className="min-w-0 flex-1">{conflictSentence(o.conflict)}</span>
        </p>
      ) : (
        <p className="flex w-full items-start gap-2.5 rounded-8 bg-state-success-bg px-3.5 py-[11px] type-caption text-state-success">
          <BidIcon name="check" size={16} className="mt-0.5" />
          <span className="min-w-0 flex-1">تواريخ الطلب متاحة في تقويمك — لا تعارض.</span>
        </p>
      )}
    </li>
  );
}

const MATCH_ROWS: { label: string; icon: BidIconKey; weight: number; tone: BidTone }[] = [
  { label: "تخصصك", icon: "tags", weight: MATCH_WEIGHTS.specialty, tone: "brand" },
  { label: "تقييمك", icon: "star", weight: MATCH_WEIGHTS.rating, tone: "warning" },
  { label: "توفّرك في التواريخ", icon: "calendar", weight: MATCH_WEIGHTS.availability, tone: "success" },
  { label: "قربك من الموقع", icon: "pin", weight: MATCH_WEIGHTS.location, tone: "info" },
];

/** «كيف تُحسب المطابقة؟» (280:6726): r16 p24 gap16, rows bg/page r8 p10/12. */
export function MatchExplainer() {
  return (
    <section aria-labelledby="match-title" className="flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
      <h2 id="match-title" className="type-h3 text-text-primary">
        كيف تُحسب المطابقة؟
      </h2>
      <ul className="flex flex-col gap-4">
        {MATCH_ROWS.map((r) => (
          <li key={r.label} className="flex items-center gap-2.5 rounded-8 bg-bg-page px-3 py-2.5">
            <BidIcon name={r.icon} size={16} className="text-text-secondary" />
            <span className="min-w-0 flex-1 type-caption text-text-primary">{r.label}</span>
            <bdi dir="ltr" className={`type-subtitle ${TONE_TEXT[r.tone]}`}>
              {formatPercent(r.weight)}
            </bdi>
          </li>
        ))}
      </ul>
      <p className="type-caption text-text-secondary">تحديث تقويمك وملفك يرفع مطابقتك مباشرة.</p>
    </section>
  );
}

/** Pill of a bid status as drawn on TRR-BID-01 «عروضي» and TRR-BID-03 cards. */
export function bidPill(b: Pick<TrainerBid, "status" | "withdrawnAfterAccept">): { icon: BidIconKey; tone: BidTone; label: string } {
  switch (b.status) {
    case "accepted":
      return { icon: "check", tone: "success", label: "مقبول — بانتظار التعاقد" };
    case "submitted":
    case "shortlisted":
      return { icon: "hourglass", tone: "warning", label: "قيد المراجعة" };
    case "rejected":
      return { icon: "octagonX", tone: "neutral", label: "لم يُقبل" };
    case "withdrawn":
      return { icon: "octagonX", tone: "neutral", label: b.withdrawnAfterAccept ? "اعتذرت عنه" : "سحبته" };
    case "expired":
      return { icon: "ban", tone: "neutral", label: "انتهت مهلة التعاقد" };
    default:
      return { icon: "edit", tone: "brand", label: "مسودة" };
  }
}

/** «عروضي» side card (280:6764): three latest offers with their status. */
export function MyBidsCard({ bids }: { bids: TrainerBid[] }) {
  return (
    <section aria-labelledby="my-bids-title" className="flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
      <h2 id="my-bids-title" className="type-h3 text-text-primary">
        عروضي
      </h2>
      {bids.length === 0 ? (
        <p className="rounded-12 bg-bg-page px-3 py-[11px] type-small text-text-muted">لم تقدّم عروضًا بعد.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {bids.slice(0, 3).map((b) => {
            const p = bidPill(b);
            return (
              <li key={b.id}>
                <Link href={bidHref(b)} className="flex w-full items-center gap-2.5 rounded-12 bg-bg-page px-3 py-[11px] hover:bg-bg-brand-tint focus-ring">
                  <span className="min-w-0 flex-1 truncate type-small text-text-primary">{b.organizationName}</span>
                  <StatusPill icon={p.icon} tone={p.tone}>
                    {p.label}
                  </StatusPill>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <ButtonLink href="/trainer/bids" variant="outline" fullWidth>
        اعرض كل عروضي
      </ButtonLink>
    </section>
  );
}

/** Where a bid row leads: the decision for decided bids, the negotiation for accepted ones, else the list. */
export function bidHref(b: Pick<TrainerBid, "id" | "status" | "requestId">): string {
  if (b.status === "accepted") return `/trainer/bids/${b.id}/negotiation`;
  if (b.status === "rejected") return `/trainer/bids/${b.id}/decision`;
  if (b.status === "draft") return `/trainer/opportunities/${b.requestId}/bid`;
  return "/trainer/bids";
}

/** Empty state (313:10693): brand-tint hero, «ارفع فرصك في المطابقة» tip and three improvement cards. */
export function EmptyOpportunities({ openCount }: { openCount: number }) {
  const cards: { icon: BidIconKey; tone: BidTone; title: string; body: string; cta: string; href: string }[] = [
    { icon: "award", tone: "success", title: "أضف اعتمادًا", body: "يرفع ترتيبك بين المتقدّمين للطلب نفسه", cta: "أضف اعتمادًا", href: "/trainer/profile/edit" },
    { icon: "tags", tone: "brand", title: "أضف تخصصات", body: "٤٠٪ من المطابقة · كلما زادت تخصصاتك زادت الفرص", cta: "أضف تخصصًا", href: "/trainer/profile/edit" },
    { icon: "calendar", tone: "warning", title: "حدّث تقويمك", body: "٢٠٪ من المطابقة · بلا تقويم لا تظهر لك فرص بتواريخ محددة", cta: "افتح التقويم", href: "/trainer/calendar" },
  ];
  return (
    <>
      <section className="flex w-full flex-col items-center gap-5 rounded-22 bg-bg-brand-tint px-5 py-10 text-center sm:px-12 sm:py-[52px]">
        <span className="flex size-24 items-center justify-center rounded-22 bg-bg-surface text-state-info">
          <BidIcon name="compass" size={32} />
        </span>
        <h2 className="text-[32px] leading-[1.15] font-bold text-text-primary sm:text-[44px]">لا فرص مطابقة لك حاليًا</h2>
        <p className="type-body-lg text-text-secondary">
          {openCount > 0
            ? `هناك ${toArabicDigits(openCount)} طلبات مفتوحة على المنصة لكن أيًّا منها لا يطابق تخصصك أو توفّرك. المطابقة تتحسّن كلما اكتمل ملفك وتقويمك.`
            : "لا توجد طلبات مفتوحة على المنصة الآن. المطابقة تتحسّن كلما اكتمل ملفك وتقويمك."}
        </p>
        <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
          {openCount > 0 && (
            <ButtonLink href="/trainer/opportunities?f=all" size="l" className="w-full sm:w-[320px]">
              اعرض كل الطلبات المفتوحة
            </ButtonLink>
          )}
          <ButtonLink href="/trainer/profile/edit" variant="outline" size="l" className="w-full sm:w-[240px]">
            أكمل ملفي المهني
          </ButtonLink>
        </div>
      </section>
      <section className="flex w-full items-start gap-4 rounded-16 bg-state-warning-bg px-6 pt-[22px] pb-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-warning">
          <BidIcon name="lightbulb" size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="type-h3 text-state-warning">ارفع فرصك في المطابقة</h2>
          <p className="type-body-lg text-text-secondary">
            المطابقة تُحسب من تخصصك ٤٠٪ · تقييمك ٢٥٪ · توفّرك في التقويم ٢٠٪ · موقعك ١٥٪. تحديث تقويمك وحده يرفع مطابقتك فورًا.
          </p>
        </div>
      </section>
      <ul className="grid w-full grid-cols-1 gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <li key={c.title} className="flex flex-col gap-3.5 rounded-22 border border-border-default bg-bg-card px-[22px] pt-6 pb-[26px] shadow-card">
            <span className={`flex size-[52px] items-center justify-center rounded-16 bg-bg-brand-tint ${TONE_TEXT[c.tone]}`}>
              <BidIcon name={c.icon} size={20} />
            </span>
            <h3 className="type-h3 text-text-primary">{c.title}</h3>
            <p className="flex-1 type-body text-text-muted">{c.body}</p>
            <ButtonLink href={c.href} variant="outline" fullWidth>
              {c.cta}
            </ButtonLink>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Loading (464:36381): skeleton list with the «جارٍ جلب الفرص» card at the side. */
export function OpportunitiesSkeleton() {
  return (
    <>
      <Breadcrumb items={[{ label: "تصفّح الفرص", href: "/trainer/opportunities" }]} />
      <div className="flex flex-col items-start gap-2.5" aria-hidden>
        <Skeleton className="h-8 w-full max-w-[320px] rounded-8" />
        <Skeleton className="h-[18px] w-full max-w-[240px] rounded-8" />
      </div>
      <div className="grid w-full grid-cols-1 items-start gap-[26px] lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6" aria-hidden>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[38px] w-[120px] rounded-full" />
            ))}
          </div>
          <div className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
            <Skeleton className="h-6 w-[200px] rounded-8" />
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-16 bg-bg-page px-5 pt-[18px] pb-5">
                <Skeleton className="size-[52px] shrink-0 rounded-12" />
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <Skeleton className="h-[18px] w-full max-w-[280px] rounded-8" />
                  <Skeleton className="h-3.5 w-full max-w-[180px] rounded-8" />
                </div>
                <Skeleton className="h-8 w-[110px] shrink-0 rounded-8" />
              </div>
            ))}
          </div>
        </div>
        <section role="status" aria-live="polite" className="flex w-full flex-col items-center gap-4 rounded-22 border border-border-default bg-bg-card px-[26px] pt-10 pb-[42px] text-center">
          <span className="flex size-16 items-center justify-center rounded-16 bg-bg-brand-tint text-text-brand">
            <BidIcon name="loader" size={32} className="animate-spin" />
          </span>
          <h2 className="type-h3 text-text-primary">جارٍ جلب الفرص</h2>
          <p className="type-body text-text-muted">نطابق الفرص المفتوحة مع تخصصك وتوفّرك في التقويم.</p>
        </section>
      </div>
    </>
  );
}
