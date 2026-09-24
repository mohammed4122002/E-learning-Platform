import type { ReactNode } from "react";
import { BidCard, BidIcon, CardTitle, HeroPill, type BidIconKey } from "@/components/trainer-bids/parts";
import { placeOf } from "@/components/trainer-bids/OpportunityParts";
import { formatPercent, toArabicDigits } from "@/lib/format";
import { budgetRange, closesIn, daysLabel, formatDayRange, seatsLabel } from "@/lib/trainer-bids";
import type { Opportunity } from "@/lib/data/trainer-bids";

/* TRR-BID-02 (303:9392): request hero with the match score and the «ما تطلبه الجهة» card. */

/** Hero (303:9532): brand-tint r22 p28/30, title + meta + three surface pills, match box at the end. */
export function RequestHero({ o }: { o: Opportunity }) {
  const meta = [o.organizationName, daysLabel(o.days), seatsLabel(o.seats), placeOf(o), formatDayRange(o.startsOn, o.endsOn)].join(" · ");
  return (
    <section className="flex w-full flex-col gap-6 rounded-22 bg-bg-brand-tint px-5 py-6 sm:flex-row sm:items-center sm:px-[30px] sm:py-7">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{o.title}</h2>
        <p className="type-body-lg text-text-secondary">{meta}</p>
        <div className="flex flex-wrap items-center gap-2">
          {o.conflict ? (
            <HeroPill icon="alert" tone="error">
              تعارض مع تقويمك
            </HeroPill>
          ) : (
            <HeroPill icon="check" tone="success">
              تواريخك متاحة
            </HeroPill>
          )}
          <HeroPill icon="clock" tone="warning">
            {closesIn(o.bidsCloseAt)}
          </HeroPill>
          <HeroPill icon="hourglass" tone="success">
            {`الميزانية ${budgetRange(o.budgetMin, o.budgetMax)}`}
          </HeroPill>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 self-start rounded-16 bg-state-success-bg px-6 py-5 sm:self-auto">
        <span dir="ltr" className="text-[48px] leading-[1.15] font-bold text-state-success">
          {formatPercent(o.score)}
        </span>
        <span className="type-body text-text-muted">مطابقة</span>
      </div>
    </section>
  );
}

function Fact({ icon, title, caption }: { icon: BidIconKey; title: ReactNode; caption?: ReactNode }) {
  return (
    <li className="flex flex-col items-center gap-2 rounded-16 bg-bg-page px-2 pt-[18px] pb-5 text-center">
      <span className="flex size-11 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
        <BidIcon name={icon} size={20} />
      </span>
      <span className="type-title text-text-primary">{title}</span>
      {caption && <span className="type-caption text-text-muted">{caption}</span>}
    </li>
  );
}

/** «ما تطلبه الجهة» (303:9558): summary + three fact tiles (dates, place, audience). */
export function RequestCard({ o }: { o: Opportunity }) {
  const perDay = o.hoursPerDay ? ` · ${toArabicDigits(Number.isInteger(o.hoursPerDay) ? o.hoursPerDay : o.hoursPerDay.toFixed(1))} ساعات يوميًا` : "";
  return (
    <BidCard pad={26} labelledBy="request-title">
      <CardTitle id="request-title">ما تطلبه الجهة</CardTitle>
      {o.summary && <p className="type-body-lg whitespace-pre-line text-text-secondary">{o.summary}</p>}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Fact icon="calendar" title={formatDayRange(o.startsOn, o.endsOn)} caption={`${daysLabel(o.days)}${perDay}`} />
        <Fact icon="pin" title={o.venue ?? placeOf(o)} caption={o.venueArea ?? o.city ?? undefined} />
        <Fact icon="users" title={seatsLabel(o.seats)} caption={o.audience ?? undefined} />
      </ul>
    </BidCard>
  );
}
