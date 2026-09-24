import Link from "next/link";
import { BadgeCheck, BookOpen, ChevronLeft, CircleCheckBig, Clock, FileText, Hourglass, Info } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { PrintReceipt } from "@/components/trainer-courses/sales/PrintReceipt";
import type { LedgerRow, Settlement, SettlementLine } from "@/lib/data/trainer-finance";
import { formatDate, formatPercent, formatPrice, pluralAr, toArabicDigits } from "@/lib/format";
import { amount2, dayMonth, dayMonth2, minusSar, monthNameOf, msSince, periodMonthName, sar, settlementLastDay } from "@/lib/trainer-finance";
import { AmountRow, FinCard, FinColumns, FinTitle, IconBox, StepTile } from "./parts";

/* TRR-FIN-02 · تفاصيل التسوية: overview (301:8728) and «with refund deducted» (310:10328). */

const trainees = (n: number) => pluralAr(n, ["متدرب واحد", "متدربان", "متدربين", "متدربًا"]);
const buyers = (n: number) => pluralAr(n, ["مشترٍ واحد", "مشتريان", "مشترين", "مشتريًا"]);
const purchases = (n: number) => pluralAr(n, ["عملية واحدة", "عمليتان", "عمليات", "عملية"]);

function lineTitle(l: SettlementLine, recordedLabel: string) {
  return `${l.title} · ${l.mode === "recorded" ? recordedLabel : l.startsAt ? `دورة ${monthNameOf(l.startsAt)}` : "دورة"}`;
}

function commissionLabel(p: number) {
  return `عمولة المنصة ${formatPercent(p)} · قيمة تشغيلية مؤقتة وفق إعدادات المنصة`;
}

function Hero({ s, variant }: { s: Settlement; variant: "overview" | "refund" }) {
  const month = periodMonthName(s.period);
  const last = settlementLastDay(s.period);
  const closedText = s.closed ? "أُغلقت" : "تُغلق";
  const parts: string[] = [];
  if (s.scheduledCourses > 0) parts.push(`${pluralAr(s.scheduledCourses, ["دورة منتهية واحدة", "دورتين منتهيتين", "دورات منتهية", "دورة منتهية"])}`);
  if (s.recordedPurchases > 0) parts.push(`${pluralAr(s.recordedPurchases, ["عملية شراء واحدة", "عمليتي شراء", "عمليات شراء", "عملية شراء"])} لكورس مسجَّل`);
  const summary =
    variant === "overview"
      ? `تسوية ${month}${parts.length ? ` · تشمل ${parts.join(" و")}` : ""} · ${closedText} ${dayMonth(last)}`
      : `صافي تسوية ${month}${s.lines.length ? ` من ${pluralAr(s.lines.length, ["دورة واحدة", "دورتين", "دورات", "دورة"])}` : ""} · ${closedText} في ${formatDate(last)}`;
  return (
    <section
      aria-labelledby="stl-amount"
      className="flex w-full flex-col items-stretch gap-6 rounded-22 border-2 border-state-success bg-state-success-bg px-5 py-6 sm:flex-row sm:items-center sm:px-[30px] sm:py-7"
    >
      <IconBox icon={variant === "overview" ? FileText : Hourglass} size={68} glyph={32} radius="rounded-16" className="hidden text-state-success sm:flex" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {s.status === "withdrawn" && s.withdrawnAt ? (
            <span className="flex items-center gap-[7px] rounded-full bg-bg-surface px-3.5 py-[9px] type-subtitle text-text-muted">سُحبت {dayMonth2(s.withdrawnAt)}</span>
          ) : (
            <span className="flex items-center gap-[7px] rounded-full bg-bg-surface px-3.5 py-[9px] type-subtitle text-state-success">
              <Glyph icon={CircleCheckBig} size={20} />
              متاحة للسحب
            </span>
          )}
          <span className="type-caption text-text-muted">رقم التسوية</span>
          <span dir="ltr" className="font-mono text-[14px] leading-[1.5] text-text-muted">
            {s.number}
          </span>
        </div>
        <p id="stl-amount" className={`leading-[1.15] font-bold text-text-primary ${variant === "overview" ? "text-[36px] sm:text-[48px]" : "text-[38px] sm:text-[52px]"}`}>
          {sar(s.net)}
        </p>
        <p className="type-body-lg text-text-secondary">{summary}</p>
      </div>
      {variant === "overview" && <PrintReceipt label="نزّل كشف التسوية" size="l" />}
      {variant === "refund" && (
        <div className="sm:w-[178px]">
          <PrintReceipt label="نزّل كشف التسوية" size="l" fullWidth />
        </div>
      )}
    </section>
  );
}

function LineCardOverview({ l }: { l: SettlementLine }) {
  const sub =
    l.mode === "recorded"
      ? `${purchases(l.count)}${l.unit !== null ? ` × ${formatPrice(l.unit / 100)}` : ""}`
      : `${trainees(l.count)}${l.unit !== null ? ` × ${formatPrice(l.unit / 100)}` : ""}`;
  return (
    <li>
      <Link href={`/trainer/courses/${l.courseId}/sales`} className="flex flex-col gap-3 rounded-16 bg-bg-page px-5 pt-[18px] pb-5 hover:ring-1 hover:ring-border-default focus-ring">
        <div className="flex items-center gap-3.5">
          <IconBox icon={BookOpen} size={48} className="text-text-brand" />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <p className="type-title text-text-primary">{lineTitle(l, "كورس مسجَّل")}</p>
            <p className="type-body text-text-muted">{sub}</p>
          </div>
          <Glyph icon={ChevronLeft} size={20} className="text-text-muted" />
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0">
          <div className="flex flex-col gap-1">
            <dt className="type-caption text-text-muted">الإجمالي</dt>
            <dd className="type-title text-text-primary">{sar(l.gross)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="type-caption text-text-muted">{commissionLabel(l.commissionPercent)}</dt>
            <dd className="type-title text-state-error">{minusSar(l.commission)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="type-caption text-text-muted">الصافي</dt>
            <dd className="type-title text-state-success">{sar(l.net)}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}

function LineCardRefund({ l }: { l: SettlementLine }) {
  const sub = `${l.mode === "recorded" ? buyers(l.count) : trainees(l.count)}${l.unit !== null ? ` × ${amount2(l.unit)}` : ""}`;
  return (
    <li>
      <Link href={`/trainer/courses/${l.courseId}/sales`} className="flex flex-col gap-3 rounded-16 bg-bg-page px-5 pt-[18px] pb-5 hover:ring-1 hover:ring-border-default focus-ring">
        <div className="flex flex-wrap items-center gap-3">
          <IconBox icon={BookOpen} size={44} className="text-text-brand" />
          <div className="flex min-w-[min(100%,220px)] flex-1 flex-col gap-[3px]">
            <p className="type-title text-text-primary">{lineTitle(l, "مسجَّل")}</p>
            <p className="type-body text-text-muted">{sub}</p>
          </div>
          <p className="shrink-0 type-h3 whitespace-nowrap text-state-success">{sar(l.net)}</p>
        </div>
        <dl className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-12 bg-bg-surface px-3.5 py-3">
          <div className="flex items-center gap-1.5">
            <dt className="type-body text-text-muted">الإجمالي:</dt>
            <dd className="type-subtitle text-text-primary">{amount2(l.gross)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="type-body text-text-muted">{commissionLabel(l.commissionPercent)}:</dt>
            <dd className="type-subtitle whitespace-nowrap text-state-warning">− {amount2(l.commission)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="type-body text-text-muted">الصافي:</dt>
            <dd className="type-subtitle text-state-success">{amount2(l.net)}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}

function refundText(r: LedgerRow): string {
  const pct = r.refundPercent !== null ? ` · استرداد ${formatPercent(r.refundPercent)}` : "";
  if (r.kind === "chargeback") return `${r.courseTitle} · استُرد المبلغ كاملًا عبر بوابة الدفع${pct}`;
  if (r.courseMode === "recorded") return `${r.courseTitle} · خلال مهلة الاسترداد${pct}`;
  if (r.daysBeforeStart !== null) return `${r.courseTitle} · انسحب قبل بدء الدورة بـ${toArabicDigits(r.daysBeforeStart)} ${r.daysBeforeStart >= 3 && r.daysBeforeStart <= 10 ? "أيام" : "يومًا"}${pct}`;
  return `${r.courseTitle} · انسحب بعد بدء الدورة${pct}`;
}

function Totals({ s, withRefundLines }: { s: Settlement; withRefundLines: boolean }) {
  const refundCount = s.refunds.length;
  return (
    <FinCard size="l" labelledBy="totals-title">
      <FinTitle id="totals-title" size="l">
        الإجمالي
      </FinTitle>
      <AmountRow label="إجمالي المبيعات" value={sar(s.salesGross)} labelClass="type-body-lg text-text-secondary" valueClass="type-title text-text-primary" />
      <AmountRow
        label={commissionLabel(s.commissionPercent)}
        value={minusSar(s.commission)}
        labelClass="type-body-lg text-text-secondary"
        valueClass={`type-title ${withRefundLines ? "text-state-warning" : "text-state-error"}`}
      />
      {withRefundLines && (
        <>
          <AmountRow
            label={`استرداد ${trainees(refundCount)}`}
            value={minusSar(s.refundGross)}
            labelClass="type-body-lg text-text-secondary"
            valueClass="type-title text-state-error"
          />
          {s.refundFees > 0 && (
            <AmountRow label="رسوم معالجة الاسترداد" value={minusSar(s.refundFees)} labelClass="type-body-lg text-text-secondary" valueClass="type-title text-state-error" />
          )}
        </>
      )}
      <hr className="border-border-divider" />
      <AmountRow label="صافي التسوية" value={sar(s.net)} labelClass="type-h3 text-text-secondary" valueClass="type-h2 text-state-success" />
      {withRefundLines && (
        <p className="flex items-start gap-3 rounded-16 bg-state-info-bg px-4 pt-3.5 pb-4 type-body-lg text-state-info">
          <Glyph icon={Info} size={20} className="mt-1.5" />
          <span className="flex-1">ضريبة القيمة المضافة تُحصَّل من المتدرب وتُورَّد للجهة الضريبية مباشرة — لا تدخل في حسابك ولا تُخصم منك.</span>
        </p>
      )}
    </FinCard>
  );
}

export function SettlementView({ s, refundFeePercent }: { s: Settlement; refundFeePercent: number }) {
  const month = periodMonthName(s.period);
  const last = settlementLastDay(s.period);
  const canWithdraw = s.status === "available" && s.net > 0;
  const withdrawHref = `/trainer/finance/withdraw?amount=${(s.net / 100).toFixed(2)}`;

  if (s.refunds.length > 0) {
    const disputeOpen = msSince(s.closesAt) <= 30 * 86_400_000;
    return (
      <>
        <Breadcrumb items={[{ label: "الرصيد", href: "/trainer/finance" }, { label: "العمليات", href: "/trainer/finance?tab=operations" }, { label: `تسوية ${month}` }]} />
        <Hero s={s} variant="refund" />
        <FinColumns
          main={
            <>
              <FinCard size="l" labelledBy="lines-title">
                <FinTitle id="lines-title" size="l">
                  من أين جاء هذا المبلغ؟
                </FinTitle>
                <p className="type-body text-text-muted">كل سطر يمثّل دورة مكتملة انقضت مهلة استرداد متدربيها.</p>
                <ul className="flex flex-col gap-[18px]">
                  {s.lines.map((l) => (
                    <LineCardRefund key={l.courseId} l={l} />
                  ))}
                </ul>
              </FinCard>
              <Totals s={s} withRefundLines />
            </>
          }
          side={
            <>
              <FinCard size="l" labelledBy="refund-title">
                <FinTitle id="refund-title" size="l">
                  الاسترداد المخصوم
                </FinTitle>
                <ul className="flex flex-col gap-3">
                  {s.refunds.map((r) => (
                    <li key={r.id} className="flex flex-col gap-2 rounded-16 bg-state-error-bg px-4 pt-3.5 pb-4">
                      <p className="type-subtitle text-state-error">متدرب واحد انسحب</p>
                      <p className="type-body text-text-secondary">{refundText(r)}</p>
                      {r.reference && (
                        <>
                          <p className="type-caption text-text-muted">رقم الاسترداد</p>
                          <p dir="ltr" className="text-end font-mono text-[14px] leading-[1.5] text-text-muted">
                            {r.reference}
                          </p>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="type-caption text-text-secondary">
                  رسوم المعالجة {formatPercent(refundFeePercent)} تُخصم منك في الاسترداد قبل بدء الدورة. الانسحاب بعد البدء لا يُخصم منك شيئًا.
                </p>
              </FinCard>
              <FinCard size="l" labelledBy="actions-title">
                <FinTitle id="actions-title" size="l">
                  إجراءات
                </FinTitle>
                <ButtonLink href={withdrawHref} size="l" fullWidth disabled={!canWithdraw}>
                  اطلب سحب هذا المبلغ
                </ButtonLink>
                <PrintReceipt label="نزّل كشف التسوية PDF" size="l" fullWidth />
                {disputeOpen && (
                  <ButtonLink href="/messages?f=support" size="l" variant="ghost" fullWidth>
                    اعترض على التسوية
                  </ButtonLink>
                )}
                <p className="type-caption text-text-secondary">الاعتراض متاح خلال ٣٠ يومًا من إغلاق التسوية.</p>
              </FinCard>
            </>
          }
        />
      </>
    );
  }

  const recordedOnly = s.scheduledCourses === 0;
  return (
    <>
      <Breadcrumb items={[{ label: "الرصيد", href: "/trainer/finance" }, { label: `تسوية ${month}` }]} />
      <Hero s={s} variant="overview" />
      <FinColumns
        main={
          <>
            <FinCard size="l" labelledBy="lines-title">
              <FinTitle id="lines-title" size="l">
                سطور التسوية
              </FinTitle>
              <p className="type-body text-text-muted">كل مصدر دخل وما خُصم منه. اضغط أي سطر لرؤية المتدربين.</p>
              <ul className="flex flex-col gap-[18px]">
                {s.lines.map((l) => (
                  <LineCardOverview key={l.courseId} l={l} />
                ))}
              </ul>
            </FinCard>
            <Totals s={s} withRefundLines={false} />
          </>
        }
        side={
          <>
            <FinCard size="l" labelledBy="cycle-title">
              <FinTitle id="cycle-title" size="l">
                دورة التسوية
              </FinTitle>
              <ol className="flex flex-col gap-[18px]">
                {!recordedOnly && s.coursesEndedAt && (
                  <StepTile icon={CircleCheckBig} title="انتهت الدورات" caption={dayMonth(s.coursesEndedAt)} iconClass="text-state-success" />
                )}
                <StepTile
                  icon={Clock}
                  title="انقضت مهلة الاسترداد"
                  caption={recordedOnly ? "١٤ يومًا بعد كل عملية شراء" : "٧ أيام بعد الانتهاء"}
                  iconClass="text-state-success"
                />
                <StepTile
                  icon={BadgeCheck}
                  title={s.closed ? "أُغلقت التسوية" : "تُغلق التسوية"}
                  caption={dayMonth(last)}
                  iconClass={s.closed ? "text-state-success" : "text-text-muted"}
                />
                {s.status === "withdrawn" && s.withdrawnAt ? (
                  <StepTile icon={Hourglass} title="سُحبت" caption={dayMonth(s.withdrawnAt)} iconClass="text-text-muted" />
                ) : (
                  <StepTile icon={Hourglass} title="متاحة للسحب" caption="الآن" tone="success" iconClass="text-state-success" />
                )}
              </ol>
            </FinCard>
            {canWithdraw && (
              <ButtonLink href={withdrawHref} size="l" fullWidth>
                اسحب هذا المبلغ
              </ButtonLink>
            )}
          </>
        }
      />
    </>
  );
}
