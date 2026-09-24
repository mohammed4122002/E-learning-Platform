import { BadgeCheck, ChevronLeft, Clock, Hourglass, Landmark, Lightbulb, TrendingUp, Tv, User, Users, Wallet } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import type { BankAccount, Balance, PendingGroup, Settlement, SourceRow } from "@/lib/data/trainer-finance";
import { formatPercent, pluralAr } from "@/lib/format";
import { dayMonth2, maskedIban, minusSar, monthNameOf, periodMonthName, sar, wholeAmount } from "@/lib/trainer-finance";
import { AmountRow, FinCard, FinColumns, FinTitle, IconBox, KpiTile, TextLink } from "./parts";

/* TRR-FIN-01 · الرصيد والمستحقات: default (279:5729), empty (313:10503), «العمليات» income by source (328:12108). */

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export type BalanceViewData = {
  balance: Balance;
  pending: PendingGroup[];
  settlements: Settlement[];
  month: { name: string; net: number; commission: number; gross: number; prevName: string; prevNet: number };
  allTime: { net: number; courses: number };
  bank: BankAccount | null;
  bankPending: BankAccount | null;
  example: { unit: number; commissionPercent: number } | null;
};

export function BalanceHero({ balance }: { balance: Balance }) {
  return (
    <section
      aria-labelledby="available-title"
      className="flex w-full flex-col items-stretch gap-6 rounded-22 border-2 border-state-success bg-state-success-bg px-5 py-6 sm:flex-row sm:items-center sm:px-[30px] sm:py-7"
    >
      <IconBox icon={Hourglass} size={68} glyph={32} radius="rounded-16" className="hidden text-state-success sm:flex" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p id="available-title" className="type-body-lg text-text-secondary">
          الرصيد المتاح للسحب
        </p>
        <p className="text-[40px] leading-[1.15] font-bold text-text-primary sm:text-[56px]">{sar(balance.available)}</p>
        <p className="type-caption text-text-secondary">
          الحد الأدنى للسحب {wholeAmount(balance.min)} ر.س · التحويل خلال ٣ إلى ٥ أيام عمل إلى حسابك المسجَّل.
        </p>
      </div>
      <ButtonLink href="/trainer/finance/withdraw" size="l" className="sm:w-[120px] sm:px-0">
        اطلب سحبًا
      </ButtonLink>
    </section>
  );
}

function BankCard({ bank, bankPending }: { bank: BankAccount | null; bankPending: BankAccount | null }) {
  const shown = bank ?? bankPending;
  return (
    <FinCard labelledBy="bank-title">
      <FinTitle id="bank-title">حساب التحويل</FinTitle>
      {shown ? (
        <div className={`flex items-center gap-3 rounded-12 p-3.5 ${bank ? "bg-state-success-bg" : "bg-state-warning-bg"}`}>
          <IconBox icon={bank ? BadgeCheck : Hourglass} size={44} radius="rounded-8" className={bank ? "text-state-success" : "text-state-warning"} />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <p className={`type-subtitle ${bank ? "text-state-success" : "text-state-warning"}`}>
              {shown.bankName} · {bank ? "موثَّق" : "قيد التحقق"}
            </p>
            <p dir="ltr" className="text-end font-mono text-[14px] leading-[1.5] text-text-muted">
              {maskedIban(shown.last4)}
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-12 bg-state-warning-bg p-3.5 type-subtitle text-state-warning">لم تُضف حسابًا بنكيًا بعد</p>
      )}
      <p className="type-caption text-text-secondary">تغيير الحساب يتطلب تحققًا جديدًا ويوقف السحب ٤٨ ساعة — حماية من الاحتيال.</p>
      <ButtonLink href="/trainer/finance/bank" variant="outline" fullWidth>
        {shown ? "عدّل بيانات التحويل" : "جهّز بيانات التحويل"}
      </ButtonLink>
    </FinCard>
  );
}

function HowCard({ example, commissionPercent }: { example: BalanceViewData["example"]; commissionPercent: number }) {
  const unit = example?.unit ?? 0;
  const p = example?.commissionPercent ?? commissionPercent;
  const commission = Math.round((unit * p) / 100);
  return (
    <FinCard labelledBy="how-title">
      <FinTitle id="how-title">كيف يُحسب إيرادك؟</FinTitle>
      <AmountRow label="سعر الدورة للمتدرب" value={sar(unit)} valueClass="type-subtitle text-text-primary" />
      <AmountRow
        label={`عمولة المنصة ${formatPercent(p)} · قيمة تشغيلية مؤقتة وفق إعدادات المنصة`}
        value={minusSar(commission)}
        valueClass="type-subtitle text-state-error"
      />
      <AmountRow label="ضريبة القيمة المضافة" value="تُحصَّل وتُورَّد" valueClass="type-subtitle text-text-muted" />
      <hr className="border-border-divider" />
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 type-title text-text-secondary">صافي لكل متدرب</p>
        <p className="shrink-0 type-h3 whitespace-nowrap text-state-success">{sar(unit - commission)}</p>
      </div>
    </FinCard>
  );
}

function PendingCard({ pending, total }: { pending: PendingGroup[]; total: number }) {
  return (
    <FinCard labelledBy="pending-title">
      <div className="flex flex-wrap items-center gap-3">
        <FinTitle id="pending-title">المبالغ المعلّقة ومتى تُفرَج</FinTitle>
        <span className="ms-auto flex items-center gap-1.5 rounded-full bg-state-warning-bg px-2.5 py-[5px] type-caption text-state-warning">
          <Glyph icon={Hourglass} size={16} />
          {sar(total)}
        </span>
      </div>
      <p className="type-caption text-text-muted">يُفرَج عن المبلغ بعد انتهاء الدورة وانقضاء مهلة استرداد المتدربين (٧ أيام) — حماية للطرفين.</p>
      {pending.length === 0 ? (
        <p className="rounded-12 bg-bg-page px-3.5 py-[13px] type-small text-text-muted">لا مبالغ معلّقة الآن.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {pending.map((g) => (
            <li key={g.courseId} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="type-small text-text-primary">
                  {g.title} · {g.mode === "recorded" ? "مسجَّل" : g.startsAt ? monthNameOf(g.startsAt) : "—"}
                </p>
                <p className="type-caption text-text-muted">
                  {g.mode === "recorded"
                    ? "يُفرَج بعد ١٤ يومًا من كل عملية شراء"
                    : `${g.endsAt ? `تنتهي ${dayMonth2(g.endsAt)}` : "لم يُحدَّد موعد انتهائها"}${g.releaseAt ? ` · يُفرَج ${dayMonth2(g.releaseAt)}` : ""}`}
                </p>
              </div>
              <p className={`shrink-0 type-subtitle whitespace-nowrap ${g.mode === "recorded" ? "text-state-info" : "text-state-warning"}`}>{sar(g.net)}</p>
            </li>
          ))}
        </ul>
      )}
    </FinCard>
  );
}

export function SettlementStatusChip({ s }: { s: Settlement }) {
  return s.status === "withdrawn" && s.withdrawnAt ? (
    <span className="shrink-0 rounded-full bg-bg-disabled px-2.5 py-[5px] type-caption whitespace-nowrap text-text-muted">سُحبت {dayMonth2(s.withdrawnAt)}</span>
  ) : (
    <span className="shrink-0 rounded-full bg-state-success-bg px-2.5 py-[5px] type-caption whitespace-nowrap text-state-success">متاحة للسحب</span>
  );
}

function SettlementsCard({ settlements }: { settlements: Settlement[] }) {
  return (
    <FinCard labelledBy="stl-title">
      <div className="flex items-center gap-3">
        <FinTitle id="stl-title">آخر التسويات</FinTitle>
        <TextLink href="/trainer/finance?tab=operations" className="ms-auto type-subtitle">
          كل العمليات
        </TextLink>
      </div>
      {settlements.length === 0 ? (
        <p className="rounded-12 bg-bg-page px-3.5 py-[13px] type-small text-text-muted">تظهر هنا تسوياتك الشهرية بعد إفراج أول مبلغ.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {settlements.slice(0, 3).map((s) => (
            <li key={s.period} className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
              <div className="flex w-full min-w-0 flex-col gap-0.5 sm:w-auto sm:flex-1">
                <p className="type-small text-text-primary">تسوية {periodMonthName(s.period)}</p>
                <p className="type-caption text-text-muted">رقم التسوية</p>
                <p dir="ltr" className="text-end font-mono text-[14px] leading-[1.5] whitespace-nowrap text-text-muted">
                  {s.number}
                </p>
              </div>
              <p className="shrink-0 type-subtitle whitespace-nowrap text-text-primary">{sar(s.net)}</p>
              <SettlementStatusChip s={s} />
              <ButtonLink href={`/trainer/finance/settlements/${s.number}`} variant="ghost" size="s" className="ms-auto w-[120px] sm:ms-0">
                اعرض التفاصيل
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </FinCard>
  );
}

export function BalanceView({ d }: { d: BalanceViewData }) {
  const change = d.month.prevNet > 0 ? Math.round(((d.month.net - d.month.prevNet) / d.month.prevNet) * 100) : null;
  const pendingCourses = d.pending.length;
  return (
    <>
      <BalanceHero balance={d.balance} />
      {/* Figma 279:5729 order from the inline start: منذ انضمامك · عمولة المنصة · إجمالي الشهر · معلّق (W2-FIN-12). */}
      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={Wallet}
          label="منذ انضمامك"
          value={sar(d.allTime.net)}
          note={d.allTime.courses > 0 ? pluralAr(d.allTime.courses, ["دورة واحدة", "دورتان", "دورات", "دورة"]) : null}
          noteClass="text-text-brand"
        />
        <KpiTile
          icon={Hourglass}
          label="عمولة المنصة"
          value={sar(d.month.commission)}
          // «من الإجمالي» is the month total shown in the next tile (Figma 279:5729: ٧٢٠ is ١٢٪ of ٦٬١٢٠) — W2-FIN-13.
          note={d.month.net > 0 ? `${formatPercent(pct(d.month.commission, d.month.net))} من الإجمالي` : null}
        />
        <KpiTile
          icon={TrendingUp}
          label={`إجمالي ${d.month.name}`}
          value={sar(d.month.net)}
          note={change === null ? null : `${change >= 0 ? "+" : "−"}${formatPercent(Math.abs(change))} عن ${d.month.prevName}`}
          noteClass={change !== null && change < 0 ? "text-state-error" : "text-state-success"}
        />
        <KpiTile
          icon={Hourglass}
          label="معلّق حتى انتهاء المهل"
          value={sar(d.balance.pending)}
          note={pendingCourses > 0 ? pluralAr(pendingCourses, ["دورة جارية واحدة", "دورتان جاريتان", "دورات جارية", "دورة جارية"]) : null}
          noteClass="text-state-warning"
        />
      </div>
      <FinColumns
        sideWidth={380}
        main={
          <>
            <PendingCard pending={d.pending} total={d.balance.pending} />
            <SettlementsCard settlements={d.settlements} />
          </>
        }
        side={
          <>
            <BankCard bank={d.bank} bankPending={d.bankPending} />
            <HowCard example={d.example} commissionPercent={d.balance.commissionPercent} />
          </>
        }
      />
    </>
  );
}

/** 313:10503 · الرصيد · فارغة — no earnings yet. */
export function EmptyBalanceView({ hasBank }: { hasBank: boolean }) {
  const steps = [
    { icon: Users, cls: "text-text-brand", title: "متدرب يسجّل", caption: "يُحجز المبلغ معلّقًا" },
    { icon: Clock, cls: "text-state-warning", title: "تنتهي الدورة", caption: "+ ٧ أيام مهلة استرداد" },
    { icon: Hourglass, cls: "text-state-success", title: "يصبح متاحًا", caption: "تطلب سحبه لحسابك" },
  ];
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">الرصيد</h2>
        <p className="type-body-lg text-text-secondary">هنا تتابع أرباحك ومستحقاتك وطلبات السحب.</p>
      </div>
      <section className="flex w-full flex-col items-center gap-5 rounded-22 bg-bg-brand-tint px-5 py-10 text-center sm:px-12 sm:py-[52px]">
        <IconBox icon={Hourglass} size={96} glyph={32} radius="rounded-22" className="text-state-success" />
        <p className="text-[32px] leading-[1.15] font-bold text-text-primary sm:text-[44px]">رصيدك {sar(0)}</p>
        <p className="type-body-lg text-text-secondary">
          يظهر أول مبلغ هنا بعد انتهاء أول دورة وانقضاء مهلة استرداد متدربيها. لا شيء ينقصك الآن — فقط أنشئ دورة واستقبل تسجيلات.
        </p>
        <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
          <ButtonLink href="/trainer/courses/new" size="l" className="w-full sm:w-[320px]">
            أنشئ دورة الآن
          </ButtonLink>
          <ButtonLink href="/trainer/finance/bank" size="l" variant="outline" className="w-full sm:w-[240px]">
            جهّز بيانات التحويل
          </ButtonLink>
        </div>
      </section>
      <FinCard size="l" labelledBy="steps-title">
        <FinTitle id="steps-title" size="l">
          كيف تسير الخطوات؟
        </FinTitle>
        <ol className="flex flex-col items-stretch gap-3 sm:flex-row sm:gap-0">
          {steps.map((s, i) => (
            <li key={s.title} className="contents">
              {i > 0 && (
                <span aria-hidden className="hidden w-12 shrink-0 justify-center pt-[52px] text-text-muted sm:flex">
                  <Glyph icon={ChevronLeft} size={20} />
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col items-center gap-3 rounded-16 bg-bg-page px-[18px] pt-6 pb-[26px] text-center">
                <IconBox icon={s.icon} size={56} radius="rounded-16" className={s.cls} />
                <p className="type-title text-text-primary">{s.title}</p>
                <p className="type-body text-text-muted">{s.caption}</p>
              </div>
            </li>
          ))}
        </ol>
      </FinCard>
      {!hasBank && (
        <section className="flex w-full items-start gap-4 rounded-16 bg-state-warning-bg px-6 pt-[22px] pb-6">
          <IconBox icon={Lightbulb} size={48} className="text-state-warning" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="type-h3 text-state-warning">جهّز بيانات التحويل مبكرًا</p>
            <p className="type-body-lg text-text-secondary">إضافة حسابك البنكي الآن توفّر عليك تأخير ٤٨ ساعة عند أول طلب سحب — التحقق يتم مرة واحدة فقط.</p>
          </div>
        </section>
      )}
    </>
  );
}

// ── «العمليات» · من أين يأتي دخلك؟ (328:12108) ────────────────────────────────────────────────────────────────

export type OperationsData = {
  monthName: string;
  trend: { key: string; label: string; net: number; current: boolean }[];
  quarterChange: number | null;
  recordedJump: boolean;
  sources: SourceRow[];
};

const SOURCE_STYLE = {
  direct: { icon: User, amount: "text-text-brand", bar: "bg-text-brand" },
  organization: { icon: Landmark, amount: "text-state-info", bar: "bg-state-info" },
  recorded: { icon: Tv, amount: "text-state-success", bar: "bg-state-success" },
} as const;

function sourceCaption(s: SourceRow): string {
  if (s.kind === "recorded") return s.people === 0 ? "لا مشترين بعد" : pluralAr(s.people, ["مشترٍ واحد", "مشتريان", "مشترين", "مشتريًا"]);
  if (s.courses === 0) return "لا دورات بعد";
  return `${pluralAr(s.courses, ["دورة واحدة", "دورتان", "دورات", "دورة"])} · ${pluralAr(s.people, ["متدرب واحد", "متدربان", "متدربين", "متدربًا"])}`;
}

export function OperationsView({ d }: { d: OperationsData }) {
  const max = Math.max(...d.trend.map((t) => t.net), 1);
  const total = d.sources.reduce((t, s) => t + Math.max(s.net, 0), 0);
  const share = (kind: SourceRow["kind"]) => pct(d.sources.filter((s) => s.kind === kind).reduce((t, s) => t + Math.max(s.net, 0), 0), total);
  const top = [...d.sources].sort((a, b) => b.net - a.net)[0];
  const insights = [
    top && top.kind === "direct" && top.net > 0 && {
      icon: User,
      tone: "text-state-success",
      title: "البيع المباشر أعلى عائدًا",
      body: "البيع المباشر يمنحك عائدًا أوضح دون وسيط تعاقدي.",
    },
    share("organization") > 0 && {
      icon: Landmark,
      tone: "text-state-info",
      title: "الجهات أقل عائدًا لكن أقل جهدًا",
      body: `${formatPercent(share("organization"))} من دخلك · تتولّى التسويق والقاعات.`,
    },
    share("recorded") > 0 && {
      icon: Tv,
      tone: "text-state-warning",
      title: "الكورس المسجَّل ينمو بلا وقت",
      body: `${formatPercent(share("recorded"))} الآن لكنه يبيع وأنت نائم.`,
    },
  ].filter(Boolean) as { icon: typeof User; tone: string; title: string; body: string }[];
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">من أين يأتي دخلك؟</h2>
        <p className="type-body-lg text-text-secondary">تفصيل إيرادك حسب مصدره واتجاهه عبر الأشهر — يساعدك على معرفة ما يستحق وقتك.</p>
      </div>
      <FinColumns
        main={
          <>
            <FinCard size="l" labelledBy="trend-title">
              <div className="flex flex-wrap items-center gap-3">
                <FinTitle id="trend-title" size="l">
                  اتجاه دخلك
                </FinTitle>
                {d.quarterChange !== null && (
                  <span
                    className={`ms-auto flex items-center gap-[7px] rounded-full px-3.5 py-[9px] type-subtitle ${
                      d.quarterChange >= 0 ? "bg-state-success-bg text-state-success" : "bg-state-error-bg text-state-error"
                    }`}
                  >
                    <Glyph icon={TrendingUp} size={20} />
                    {d.quarterChange >= 0 ? "+" : "−"}
                    {formatPercent(Math.abs(d.quarterChange))} عن الربع الماضي
                  </span>
                )}
              </div>
              <ol className="flex items-end justify-between gap-2 sm:gap-[18px]" aria-label="صافي الدخل في آخر خمسة أشهر">
                {d.trend.map((t) => (
                  <li key={t.key} className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
                    <span className={`type-subtitle whitespace-nowrap ${t.current ? "text-state-success" : "text-text-secondary"}`}>{wholeAmount(t.net)}</span>
                    <span
                      aria-hidden
                      className={`w-full max-w-[100px] rounded-12 ${t.current ? "bg-state-success" : "bg-bg-brand-tint"}`}
                      style={{ height: `${Math.max(8, Math.round((220 * Math.max(t.net, 0)) / max))}px` }}
                    />
                    <span className="type-body text-text-muted">{t.label}</span>
                  </li>
                ))}
              </ol>
              {d.recordedJump && (
                <p className="flex items-start gap-3 rounded-16 bg-state-success-bg px-[18px] pt-4 pb-[18px] type-body-lg text-state-success">
                  <Glyph icon={Lightbulb} size={20} className="mt-1.5" />
                  <span className="flex-1">
                    قفزة {d.monthName} جاءت من إضافة الكورس المسجَّل — يبيع بلا وقت إضافي منك. فكّر في تحويل برنامج آخر إلى كورس مسجَّل.
                  </span>
                </p>
              )}
            </FinCard>
            <FinCard size="l" labelledBy="source-title">
              <FinTitle id="source-title" size="l">
                حسب المصدر — {d.monthName}
              </FinTitle>
              <p className="type-body text-text-muted">اعرف أي قناة تستحق وقتك أكثر.</p>
              <ul className="flex flex-col gap-[18px]">
                {d.sources.map((s) => {
                  const st = SOURCE_STYLE[s.kind];
                  return (
                    <li key={s.key} className="flex flex-col gap-2.5 rounded-16 bg-bg-page px-5 pt-[18px] pb-5">
                      <div className="flex items-center gap-3.5">
                        <IconBox icon={st.icon} size={48} className={st.amount} />
                        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                          <p className="type-title text-text-primary">{s.name}</p>
                          <p className="type-body text-text-muted">{sourceCaption(s)}</p>
                        </div>
                        <p className={`shrink-0 type-h3 whitespace-nowrap ${st.amount}`}>{sar(s.net)}</p>
                      </div>
                      <div
                        className="h-3 w-full overflow-hidden rounded-full bg-border-default"
                        role="img"
                        aria-label={`${formatPercent(pct(Math.max(s.net, 0), total))} من دخل ${d.monthName}`}
                      >
                        <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${pct(Math.max(s.net, 0), total)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </FinCard>
          </>
        }
        side={
          <>
            {insights.length > 0 && (
              <FinCard size="l" labelledBy="insights-title">
                <FinTitle id="insights-title" size="l">
                  ماذا تقول الأرقام؟
                </FinTitle>
                <ul className="flex flex-col gap-[18px]">
                  {insights.map((i) => (
                    <li key={i.title} className="flex items-start gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
                      <IconBox icon={i.icon} radius="rounded-8" className={i.tone} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className={`type-subtitle ${i.tone}`}>{i.title}</p>
                        <p className="type-caption text-text-muted">{i.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </FinCard>
            )}
            <FinCard size="l" labelledBy="export-title">
              <FinTitle id="export-title" size="l">
                تصدير
              </FinTitle>
              <ButtonLink href="/trainer/finance/export?type=income" prefetch={false} size="l" variant="outline" fullWidth>
                صدّر تقرير الدخل
              </ButtonLink>
              <ButtonLink href="/trainer/finance/export?type=all" prefetch={false} size="l" variant="ghost" fullWidth>
                صدّر كل العمليات
              </ButtonLink>
              <p className="type-caption text-text-secondary">Excel أو PDF — يصلح لإقرارك الضريبي أو لمحاسبك.</p>
            </FinCard>
          </>
        }
      />
    </>
  );
}

