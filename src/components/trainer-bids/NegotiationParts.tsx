import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { BidIcon, TONE_BG, TONE_TEXT, type BidIconKey, type BidTone } from "@/components/trainer-bids/parts";
import { toArabicDigits } from "@/lib/format";
import { LOCKED_TERMS } from "@/lib/trainer-bids";

/*
 * TRR-BID-05 components «Trainer / Negotiation · Term Row» (455:4776) and «· Timeline» (455:4900).
 * Presentational only (no hooks) — used by the server page and by the client composer.
 */

function Chevron() {
  return (
    <span aria-hidden className="hidden w-10 shrink-0 items-center justify-center text-text-muted sm:flex">
      <ChevronLeft size={20} strokeWidth={1.4} absoluteStrokeWidth />
    </span>
  );
}

/** A value box inside a term row: caption + H3 value (surface, or the row tint when highlighted). */
function ValueBox({ label, value, tone, highlight }: { label: string; value: ReactNode; tone?: BidTone; highlight?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-1.5 rounded-12 px-[18px] pt-3.5 pb-4 ${highlight && tone ? TONE_BG[tone] : "bg-bg-surface"}`}>
      <span className="type-caption text-text-muted">{label}</span>
      <span className={`type-h3 ${highlight && tone ? TONE_TEXT[tone] : tone === undefined ? "text-text-primary" : "text-text-muted"}`}>{value}</span>
    </div>
  );
}

function ReasonBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-12 bg-bg-surface px-[18px] pt-3.5 pb-4">
      <div className="flex items-center gap-2">
        <BidIcon name="comment" size={16} className="text-text-secondary" />
        <span className="flex-1 type-caption text-text-muted">{label}</span>
      </div>
      <div className="type-body text-text-primary">{children}</div>
    </div>
  );
}

export type TermRowProps =
  | { state: "editable"; title: string; current: string; input: ReactNode }
  | { state: "proposed"; title: string; current: string; proposal: string; reason?: string | null; editor?: ReactNode }
  | { state: "countered"; title: string; current: string; proposal: string; counter: string; reason?: string | null }
  | { state: "agreed"; title: string; original: string; agreed: string; pill?: string; agreedLabel?: string };

const HEAD: Record<TermRowProps["state"], { tone: BidTone | null; icon: BidIconKey; pill?: string }> = {
  editable: { tone: null, icon: "edit" },
  proposed: { tone: "info", icon: "info", pill: "اقتراحك" },
  countered: { tone: "warning", icon: "reply", pill: "اقتراح مقابل من الجهة" },
  agreed: { tone: "success", icon: "check", pill: "متَّفق عليه" },
};

/** One negotiable term. */
export function TermRow(props: TermRowProps) {
  const head = HEAD[props.state];
  const tone = head.tone;
  const pill = props.state === "agreed" && props.pill ? props.pill : head.pill;
  return (
    <li className={`flex w-full flex-col gap-3.5 rounded-16 px-4 pt-5 pb-[22px] sm:px-[22px] ${tone ? `${TONE_BG[tone]} border-2 ${tone === "info" ? "border-state-info" : tone === "warning" ? "border-state-warning" : "border-state-success"}` : "bg-bg-page"}`}>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface ${tone ? TONE_TEXT[tone] : "text-text-brand"}`}>
          <BidIcon name={head.icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 basis-40 flex-col gap-[3px]">
          <h3 className="type-title text-text-primary">{props.title}</h3>
          <p className="type-caption text-text-muted">قابل للتفاوض</p>
        </div>
        {pill && tone && (
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg-surface px-[11px] py-1.5 type-caption ${TONE_TEXT[tone]}`}>
            <BidIcon name={head.icon} size={16} />
            {pill}
          </span>
        )}
      </div>
      {props.state === "editable" && (
        <>
          <ValueBox label="الشرط الحالي" value={props.current} />
          {props.input}
        </>
      )}
      {props.state === "proposed" && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
            <ValueBox label="الشرط الحالي" value={props.current} tone="info" />
            <ValueBox label="اقتراحك" value={props.proposal} tone="info" highlight />
            <Chevron />
          </div>
          {props.editor}
          {!props.editor && props.reason && <ReasonBox label="سببك">«{props.reason}»</ReasonBox>}
        </>
      )}
      {props.state === "countered" && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
            <ValueBox label="اقتراحك" value={props.proposal} tone="warning" />
            <Chevron />
            <ValueBox label="الشرط الحالي" value={props.current} tone="warning" />
            <Chevron />
            <ValueBox label="ردّ الجهة" value={props.counter} tone="warning" highlight />
          </div>
          {props.reason && <ReasonBox label="سبب الجهة">«{props.reason}»</ReasonBox>}
        </>
      )}
      {props.state === "agreed" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
          <ValueBox label={props.agreedLabel ?? "المتَّفق عليه"} value={props.agreed} tone="success" highlight />
          <Chevron />
          <ValueBox label="الشرط الأصلي" value={props.original} tone="success" />
        </div>
      )}
    </li>
  );
}

/** The three fixed platform terms (State=Locked). */
export function LockedTermRows() {
  return (
    <>
      {LOCKED_TERMS.map((t) => (
        <li key={t.title} className="flex w-full flex-wrap items-center gap-x-3.5 gap-y-2 rounded-16 bg-bg-disabled px-4 pt-5 pb-[22px] sm:px-[22px]">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-muted">
            <BidIcon name="lock" size={20} />
          </span>
          <div className="flex min-w-0 flex-1 basis-40 flex-col gap-[3px]">
            <h3 className="type-title text-text-disabled">{t.title}</h3>
            <p className="type-caption text-text-disabled">{t.caption}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg-surface px-[11px] py-1.5 type-caption text-text-muted">
            <BidIcon name="lock" size={16} />
            غير قابل للتفاوض
          </span>
        </li>
      ))}
    </>
  );
}

/** «٤ قابلة للتفاوض · ٣ ثابتة» pill of the terms card. */
export function TermsCountPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full bg-bg-brand-tint px-3.5 py-[9px] type-subtitle text-text-brand">
      <BidIcon name="info" size={20} />
      {`${toArabicDigits(4)} قابلة للتفاوض · ${toArabicDigits(3)} ثابتة`}
    </span>
  );
}

/** Wide strip under the term list (457:29897): tint r16, 24px icon, 18 body in the tone. */
export function TermsStrip({ icon, tone, children }: { icon: BidIconKey; tone: BidTone; children: ReactNode }) {
  return (
    <p className={`flex w-full items-start gap-3 rounded-16 px-[18px] pt-[15px] pb-4 type-body-lg ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}>
      <BidIcon name={icon} size={24} className="mt-1" />
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

/** Terms card (457:29354): r22 p28 gap20 — title + count pill, optional intro, rows, strip. */
export function TermsCard({ title, intro, children, strip }: { title: string; intro?: string; children: ReactNode; strip?: ReactNode }) {
  return (
    <section aria-labelledby="terms-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="terms-title" className="min-w-0 flex-1 type-h2 text-text-primary">
          {title}
        </h2>
        <TermsCountPill />
      </div>
      {intro && <p className="type-body text-text-muted">{intro}</p>}
      <ul className="flex flex-col gap-5">{children}</ul>
      {strip}
    </section>
  );
}

export type TimelineItem = { key: string; actor: string; tone: BidTone; icon: BidIconKey; text: string; at: string | null };

/** «سجل التفاوض» (455:4900): badge, rounds, privacy note, reply deadline. */
export function NegotiationTimeline({
  badge,
  items,
  deadline,
  empty,
}: {
  badge: { label: string; tone: BidTone; icon: BidIconKey };
  items: TimelineItem[];
  deadline?: string | null;
  empty?: string;
}) {
  return (
    <section aria-labelledby="timeline-title" className="flex w-full flex-col gap-4 rounded-22 border border-border-default bg-bg-card px-[26px] pt-[26px] pb-7 shadow-card">
      <div className="flex items-center gap-3">
        <h2 id="timeline-title" className="min-w-0 flex-1 type-h3 text-text-primary">
          سجل التفاوض
        </h2>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-[11px] py-1.5 type-caption ${badge.tone === "neutral" ? "bg-bg-page" : TONE_BG[badge.tone]} ${TONE_TEXT[badge.tone]}`}>
          <BidIcon name={badge.icon} size={16} />
          {badge.label}
        </span>
      </div>
      {items.length === 0 && empty ? (
        <p className="rounded-12 bg-bg-page px-4 py-3.5 type-small text-text-muted">{empty}</p>
      ) : (
        <ol className="flex flex-col">
          {items.map((it, i) => (
            <li key={it.key} className="flex flex-col">
              {i > 0 && <span aria-hidden className="my-0 ms-auto me-4 h-5 w-0.5 bg-border-default" />}
              <div className={`flex items-start gap-3 rounded-12 px-4 pt-3.5 pb-[15px] ${TONE_BG[it.tone]}`}>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${it.tone === "error" ? "text-text-muted" : TONE_TEXT[it.tone]}`}>
                  <BidIcon name={it.icon} size={16} />
                </span>
                <div className="flex min-w-0 flex-1 basis-40 flex-col gap-[3px]">
                  <span className={`type-caption ${it.tone === "error" ? "text-text-muted" : TONE_TEXT[it.tone]}`}>{it.actor}</span>
                  <span className="type-small text-text-primary">{it.text}</span>
                  {it.at && <span className="type-caption text-text-muted">{it.at}</span>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="flex items-start gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px] type-caption text-text-secondary">
        <BidIcon name="shield" size={20} className="text-text-secondary" />
        <span className="min-w-0 flex-1">لا يظهر لك عروض المدربين الآخرين ولا أسعارهم — التفاوض بينك وبين الجهة وحدها.</span>
      </p>
      {deadline && (
        <p className="flex items-center gap-2.5 rounded-12 bg-state-warning-bg px-3.5 pt-3 pb-[13px] type-subtitle text-state-warning">
          <BidIcon name="clock" size={20} />
          <span className="min-w-0 flex-1">{deadline}</span>
        </p>
      )}
    </section>
  );
}

/** Side card with note rows (457:29553 «قبل أن تتفاوض»). */
export function SideNotes({ title, rows, tone }: { title: string; rows: { icon: BidIconKey; tone: BidTone; text: ReactNode }[]; tone?: BidTone }) {
  return (
    <section
      aria-label={title}
      className={`flex w-full flex-col gap-5 rounded-22 bg-bg-card p-5 shadow-card sm:p-7 ${tone ? `border-2 ${tone === "success" ? "border-state-success" : "border-border-default"}` : "border border-border-default"}`}
    >
      <h2 className="type-h3 text-text-primary">{title}</h2>
      <ul className="flex flex-col gap-5">
        {rows.map((r, i) => (
          <li key={i} className="flex w-full items-start gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px]">
            <BidIcon name={r.icon} size={20} className={`mt-[5px] ${r.tone === "neutral" ? "text-text-muted" : r.tone === "brand" ? "text-text-brand" : TONE_TEXT[r.tone]}`} />
            <span className="min-w-0 flex-1 type-body text-text-primary">{r.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Action card (457:29493 «الإجراء»): H2, then buttons each followed by a caption that states the outcome. */
export function ActionCard({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
      <h2 className="type-h2 text-text-primary">{title}</h2>
      {intro && <p className="type-body text-text-secondary">{intro}</p>}
      {children}
    </section>
  );
}

export function ActionCaption({ children }: { children: ReactNode }) {
  return <p className="-mt-2.5 type-caption text-text-muted">{children}</p>;
}
