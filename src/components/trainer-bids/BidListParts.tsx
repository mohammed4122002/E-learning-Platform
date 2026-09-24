import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { BidIcon, StatusPill, TONE_TEXT, type BidIconKey, type BidTone } from "@/components/trainer-bids/parts";
import { bidPill } from "@/components/trainer-bids/OpportunityParts";
import { WithdrawBidButton } from "@/components/trainer-bids/WithdrawBidButton";
import { pluralAr, toArabicDigits } from "@/lib/format";
import { DECISION_REASON, REJECTION_SUMMARY, WITHDRAW_REASONS, amount, contractHref, daysAgo, daysLabel, daysLeft, formatDayRange } from "@/lib/trainer-bids";
import type { TrainerBid } from "@/lib/data/trainer-bids";

/* TRR-BID-03 · عروضي وحالتها — default 309:10184, filtered / many 328:12395. */

/** Stat card (309:10324): r16, p22/24, 48px tile, H1 value, 17 muted label; `alert` = error tint + 2px stroke. */
export function BidStat({ icon, tone, value, label, tile = "brand", alert }: { icon: BidIconKey; tone: BidTone; value: ReactNode; label: string; tile?: "brand" | "surface"; alert?: boolean }) {
  return (
    <li
      className={`flex min-w-0 flex-col items-center gap-2 rounded-16 px-2 pt-[22px] pb-6 text-center shadow-card ${
        alert ? "border-2 border-state-error bg-state-error-bg" : "border border-border-default bg-bg-card"
      }`}
    >
      <span className={`flex size-12 items-center justify-center rounded-12 ${tile === "brand" ? "bg-bg-brand-tint" : "bg-bg-surface"} ${TONE_TEXT[tone]}`}>
        <BidIcon name={icon} size={20} />
      </span>
      <span dir="auto" className="text-[36px] leading-[1.2] font-bold text-text-primary">
        {value}
      </span>
      <span className="type-body text-text-muted">{label}</span>
    </li>
  );
}

/** Pill + tile tone of a bid, including the negotiation step of an accepted one. */
function presentation(b: TrainerBid): { pill: { icon: BidIconKey; tone: BidTone; label: string }; tileTone: BidTone } {
  if (b.status === "accepted") {
    if (b.negotiationStatus === "draft") return { pill: { icon: "edit", tone: "brand", label: "مسودة تفاوض" }, tileTone: "success" };
    if (b.negotiationStatus === "awaiting_org") return { pill: { icon: "hourglass", tone: "info", label: "بانتظار رد الجهة" }, tileTone: "success" };
    if (b.negotiationStatus === "countered") return { pill: { icon: "reply", tone: "warning", label: "اقتراح مقابل من الجهة" }, tileTone: "success" };
    return { pill: { icon: "check", tone: "success", label: "مقبول — بانتظار تعاقدك" }, tileTone: "success" };
  }
  const p = bidPill(b);
  return { pill: p, tileTone: p.tone === "warning" ? "warning" : p.tone === "neutral" ? "neutral" : p.tone };
}

/** Where the title of a bid leads. */
function titleHref(b: TrainerBid): string | null {
  if (b.status === "accepted") return `/trainer/bids/${b.id}/negotiation`;
  if (b.status === "rejected") return `/trainer/bids/${b.id}/decision`;
  return null;
}

function metaLine(b: TrainerBid): string {
  const parts = [b.organizationName];
  if (b.terms.price) parts.push(`${amount(b.terms.price)} ر.س`);
  if (b.terms.days) parts.push(daysLabel(b.terms.days));
  if (b.status !== "withdrawn" && b.status !== "rejected" && b.terms.starts_on && b.terms.ends_on) parts.push(formatDayRange(b.terms.starts_on, b.terms.ends_on));
  return parts.join(" · ");
}

function noteLine(b: TrainerBid): string {
  if (b.status === "accepted") {
    const d = b.contractDueAt ? daysLeft(b.contractDueAt) : 0;
    if (b.negotiationStatus === "awaiting_org") return "أرسلت اقتراح تفاوض — مهلة التعاقد متوقفة حتى ردّ الجهة.";
    if (b.negotiationStatus === "countered") return "ردّت الجهة باقتراح مقابل — راجعه وقرّر قبل انتهاء مهلة الرد.";
    return `قبلت الجهة عرضك. أكمل التعاقد خلال ${pluralAr(Math.max(d, 1), ["يوم واحد", "يومين", "أيام", "يومًا"])} وإلا يُعرض على مدرب آخر.`;
  }
  if (b.status === "submitted" || b.status === "shortlisted") {
    const parts = [`قُدّم ${daysAgo(b.submittedAt ?? b.updatedAt)}`];
    const left = daysLeft(b.bidsCloseAt);
    parts.push(left > 0 ? `تُغلق المهلة بعد ${pluralAr(left, ["يوم واحد", "يومين", "أيام", "يومًا"])}` : "أُغلقت المهلة وينتظر قرار الجهة");
    parts.push(b.otherBids === 0 ? "لا عروض منافسة" : pluralAr(b.otherBids, ["عرض منافس واحد", "عرضان منافسان", "عروض منافسة", "عرضًا منافسًا"]));
    return parts.join(" · ");
  }
  if (b.status === "rejected") {
    const reason = b.decisionReason ? DECISION_REASON[b.decisionReason] : null;
    if (b.decisionReason === "other_trainer" || !reason) return "اختارت الجهة مدربًا آخر";
    return `اختارت الجهة مدربًا آخر · السبب المعلن: ${reason}`;
  }
  if (b.status === "withdrawn") {
    if (b.withdrawnAfterAccept) return "اعتذرت عنه بعد القبول";
    return WITHDRAW_REASONS.find((r) => r.value === b.withdrawReason)?.sentence ?? "سحبته";
  }
  if (b.status === "expired") return "انتهت مهلة التعاقد دون إكماله.";
  return "مسودة لم تُرسل بعد.";
}

function RowAction({ b }: { b: TrainerBid }) {
  if (b.status === "accepted")
    return (
      <ButtonLink href={contractHref(b.id)} className="w-full sm:w-[120px] sm:px-3">
        أكمل التعاقد
      </ButtonLink>
    );
  if (b.status === "submitted" || b.status === "shortlisted") return <WithdrawBidButton bidId={b.id} title={b.requestTitle} className="w-full sm:w-[120px] sm:px-3" />;
  if (b.status === "rejected")
    return (
      <ButtonLink href={`/trainer/bids/${b.id}/decision`} variant="outline" className="w-full sm:w-[120px] sm:px-3">
        اعرض السبب
      </ButtonLink>
    );
  if (b.status === "draft")
    return (
      <ButtonLink href={`/trainer/opportunities/${b.requestId}/bid`} variant="outline" className="w-full sm:w-[120px] sm:px-3">
        أكمل عرضك
      </ButtonLink>
    );
  return null;
}

function Title({ b, className }: { b: TrainerBid; className: string }) {
  const href = titleHref(b);
  return (
    <h3 className={className}>
      {href ? (
        <Link href={href} className="rounded-8 hover:underline focus-ring">
          {b.requestTitle}
        </Link>
      ) : (
        b.requestTitle
      )}
    </h3>
  );
}

/** Default card (309:10369): r22, p20/22/22, gap14; accepted = success tint + 2px stroke. */
export function BidCardRow({ b }: { b: TrainerBid }) {
  const { pill, tileTone } = presentation(b);
  const accepted = b.status === "accepted";
  const action = <RowAction b={b} />;
  return (
    <li
      className={`flex w-full flex-col gap-3.5 rounded-22 px-4 pt-5 pb-[22px] shadow-card sm:px-[22px] ${
        accepted ? "border-2 border-state-success bg-state-success-bg" : "border border-border-default bg-bg-card"
      }`}
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <span className={`hidden size-14 shrink-0 items-center justify-center rounded-16 bg-bg-surface sm:flex ${TONE_TEXT[tileTone]}`}>
          <BidIcon name="compass" size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <Title b={b} className="min-w-0 flex-1 basis-40 type-title text-text-primary" />
            <StatusPill icon={pill.icon} tone={pill.tone} size="m">
              {pill.label}
            </StatusPill>
          </div>
          <p className="flex items-center gap-2 type-body text-text-secondary">
            <span className="min-w-0 flex-1">{metaLine(b)}</span>
            <BidIcon name="landmark" size={16} className="text-text-muted" />
          </p>
        </div>
        {action}
      </div>
      <p className={`flex w-full items-start gap-2.5 rounded-12 px-3.5 py-3 type-body ${accepted ? "bg-bg-surface text-state-success" : "bg-bg-page text-text-secondary"}`}>
        <BidIcon name={accepted ? "alert" : "info"} size={20} className={`mt-[5px] ${accepted ? "text-state-success" : "text-text-muted"}`} />
        <span className="min-w-0 flex-1">{noteLine(b)}</span>
      </p>
    </li>
  );
}

/** Compact row of the long list (328:12596): r16, p18/20; accepted rows count down to the contract deadline. */
export function BidCompactRow({ b }: { b: TrainerBid }) {
  const accepted = b.status === "accepted";
  const left = accepted && b.contractDueAt ? daysLeft(b.contractDueAt) : null;
  const urgent = left !== null && left <= 5;
  const { pill, tileTone } = presentation(b);
  const box = accepted ? (urgent ? "border-2 border-state-error bg-state-error-bg" : "border-2 border-state-warning bg-bg-card") : "border border-border-default bg-bg-card";
  return (
    <li className={`flex w-full flex-col items-start gap-4 rounded-16 px-4 py-[18px] shadow-card sm:flex-row sm:items-center sm:px-5 ${box}`}>
      <span className={`hidden size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface sm:flex ${accepted ? "text-state-success" : TONE_TEXT[tileTone]}`}>
        <BidIcon name={accepted ? "check" : pill.icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <Title b={b} className="min-w-0 flex-1 basis-40 type-title text-text-primary" />
          {accepted && left !== null ? (
            <span className={`inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full bg-bg-surface px-[11px] py-1.5 type-small ${urgent ? "text-state-error" : "text-state-warning"}`}>
              <BidIcon name="clock" size={16} />
              {left <= 0 ? "انتهت مهلة التعاقد" : `يتبقى ${pluralAr(left, ["يوم واحد", "يومان", "أيام", "يومًا"])} للتعاقد`}
            </span>
          ) : (
            <StatusPill icon={pill.icon} tone={pill.tone} size="m">
              {pill.label}
            </StatusPill>
          )}
        </div>
        <p className="type-body text-text-secondary">{b.terms.price ? `${b.organizationName} · ${amount(b.terms.price)} ر.س` : b.organizationName}</p>
      </div>
      <RowAction b={b} />
    </li>
  );
}

/** «لماذا لم تُقبل عروضك؟» (309:10527). */
export function RejectionReasonsCard({ reasons, rejected }: { reasons: Record<string, number>; rejected: number }) {
  const rows = REJECTION_SUMMARY;
  return (
    <section aria-labelledby="why-title" className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <h2 id="why-title" className="type-h2 text-text-primary">
        لماذا لم تُقبل عروضك؟
      </h2>
      <p className="type-body text-text-muted">نعرض لك السبب المعلن من الجهة — لتحسّن عرضك القادم.</p>
      <ul className="flex flex-col gap-[18px]">
        {rows.map((r) => {
          const n = reasons[r.key] ?? 0;
          return (
            <li key={r.key} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
              <span className="min-w-0 flex-1 type-body text-text-primary">{r.label}</span>
              <span className={`shrink-0 type-subtitle ${n > 0 ? "text-state-warning" : "text-state-success"}`}>
                {n > 0 ? `${toArabicDigits(n)} من ${toArabicDigits(rejected)}` : toArabicDigits(0)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** «ارفع نسبة قبولك» (309:10539). */
export function RaiseAcceptanceCard() {
  const rows: { icon: BidIconKey; tone: BidTone; label: string; href: string }[] = [
    { icon: "calendar", tone: "warning", label: "حدّث تقويمك باستمرار", href: "/trainer/calendar" },
    { icon: "award", tone: "brand", label: "أضف اعتمادًا في مجال الطلب", href: "/trainer/profile/edit" },
    { icon: "star", tone: "warning", label: "اطلب من متدربيك التقييم", href: "/trainer/courses" },
    { icon: "contact", tone: "success", label: "أكمل ملفك المهني", href: "/trainer/profile/edit" },
  ];
  return (
    <section aria-labelledby="raise-title" className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <h2 id="raise-title" className="type-h2 text-text-primary">
        ارفع نسبة قبولك
      </h2>
      <ul className="flex flex-col gap-[18px]">
        {rows.map((r) => (
          <li key={r.label}>
            <Link href={r.href} className="flex w-full items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px] hover:bg-bg-brand-tint focus-ring">
              <BidIcon name={r.icon} size={20} className={TONE_TEXT[r.tone]} />
              <span className="min-w-0 flex-1 type-body text-text-primary">{r.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
