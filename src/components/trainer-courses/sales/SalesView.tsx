import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Banknote, CalendarDays, CircleAlert, CircleCheck, CircleX, Clock, Eye, FileText, Hourglass, LayoutGrid, RefreshCw, RotateCcw, Search, Target,
  Users, X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import type { SaleRow } from "@/lib/data/trainer-course-page";
import { formatDayMonth, formatNumber, formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import { RetryButton, ShareLinkButton } from "../dashboard/DashboardClient";

/* TRR-CRS-09 · مبيعات الدورة: results 414:19534 · empty 415:19914 · error 415:20420 · no results 415:20625. */

export const money = (n: number) => new Intl.NumberFormat("ar-SA-u-nu-arab", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const card = "flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7";
const DAY = 86_400_000;

export type SaleState = "refunded" | "refund_pending" | "paid";
export function saleState(r: SaleRow): SaleState {
  if (r.paymentStatus === "refunded" || r.refundStatus === "approved") return "refunded";
  if (r.refundStatus === "under_review") return "refund_pending";
  return "paid";
}
export const soldAt = (r: SaleRow) => r.paidAt ?? r.confirmedAt ?? r.createdAt;
export const netOfSale = (r: SaleRow) => Math.round((r.paid - r.vat) * (1 - r.commissionPercent / 100) * 100) / 100;

export function Tile({ icon, label, value, sub, valueTone = "text-text-primary", subTone = "text-text-muted", iconTone = "bg-bg-brand-tint text-text-brand" }: { icon: LucideIcon; label: string; value: string; sub?: string; valueTone?: string; subTone?: string; iconTone?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-16 border border-border-default bg-bg-card px-5 pt-5 pb-[22px] shadow-card">
      <div className="flex items-start gap-2.5">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-12 ${iconTone}`}>
          <Glyph icon={icon} size={20} />
        </span>
        <span className="min-w-0 flex-1 type-caption text-text-muted">{label}</span>
      </div>
      <p className={`text-[24px] leading-[1.2] font-bold sm:text-[28px] ${valueTone}`}>{value}</p>
      {sub && <p className={`type-caption ${subTone}`}>{sub}</p>}
    </div>
  );
}

const STATE_CHIP: Record<SaleState, { label: string; icon: LucideIcon; cls: string }> = {
  refunded: { label: "مستردة", icon: RotateCcw, cls: "bg-state-info-bg text-state-info" },
  refund_pending: { label: "طلب استرداد", icon: Clock, cls: "bg-state-warning-bg text-state-warning" },
  paid: { label: "مدفوعة", icon: CircleCheck, cls: "bg-state-success-bg text-state-success" },
};

export function SalesTable({ courseId, rows }: { courseId: string; rows: SaleRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="hidden grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.5fr] gap-3 rounded-12 bg-bg-page px-4 py-2.5 type-caption text-text-muted md:grid">
        <span>المشتري</span>
        <span>المبلغ</span>
        <span>الحالة</span>
        <span>التاريخ</span>
        <span className="sr-only">إجراء</span>
      </div>
      {rows.map((r) => {
        const st = saleState(r);
        const chip = STATE_CHIP[st];
        const at = soldAt(r);
        const refunded = st === "refunded";
        const amount = refunded ? r.refundAmount ?? r.paid - r.vat : r.paid - r.vat;
        const sub = refunded
          ? r.refundDecidedAt
            ? `استُرِد بعد ${pluralAr(Math.max(1, Math.round((Date.parse(r.refundDecidedAt) - Date.parse(at)) / DAY)), ["يوم واحد", "يومين", "أيام", "يومًا"])}`
            : "استُرِد"
          : r.discountCode
            ? `بعد خصم «${r.discountCode}»`
            : r.paid === 0
              ? "تسجيل مجاني"
              : `صافيك ${money(netOfSale(r))} ر.س`;
        return (
          <div key={r.enrollmentId} className="grid grid-cols-2 items-center gap-3 rounded-16 bg-bg-page px-4 py-3.5 md:grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.5fr]">
            <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
              <Avatar name={r.name} src={r.avatar} />
              <span className="min-w-0 truncate type-subtitle text-text-primary">{r.name}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={`type-subtitle ${refunded ? "text-state-error" : "text-text-primary"}`}>
                {refunded ? "− " : ""}
                {money(amount)} ر.س
              </span>
              <span className="type-caption text-text-muted">{sub}</span>
            </div>
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-[11px] py-1.5 type-caption ${chip.cls}`}>
              <Glyph icon={chip.icon} size={16} />
              {chip.label}
            </span>
            <span className="type-small text-text-secondary">{formatDayMonth(at)}</span>
            <Link href={`/trainer/courses/${courseId}/sales/${r.enrollmentId}`} className="justify-self-end rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
              اعرض
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export function PayoutCard({ available, held }: { available: number; held: number }) {
  return (
    <section className={card}>
      <h2 className="type-h2 text-text-primary">متى يصلك المال؟</h2>
      <div className="flex items-center gap-3 rounded-16 bg-state-success-bg px-4 py-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-success">
          <Glyph icon={CircleCheck} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="type-h3 text-state-success">{money(available)} ر.س</p>
          <p className="type-caption text-text-secondary">متاح للسحب الآن</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-16 bg-state-warning-bg px-4 py-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-warning">
          <Glyph icon={Clock} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="type-h3 text-state-warning">{money(held)} ر.س</p>
          <p className="type-caption text-text-secondary">معلّق — يُفرَج خلال ١٤ يومًا</p>
        </div>
      </div>
      <p className="type-caption text-text-muted">كل عملية تصبح متاحة بعد ١٤ يومًا من الشراء — مهلة الاسترداد.</p>
      <ButtonLink href="/trainer/finance" size="l" fullWidth disabled={available <= 0}>
        اطلب سحب {money(available)} ر.س
      </ButtonLink>
    </section>
  );
}

export function DiscountsCard({ rows }: { rows: SaleRow[] }) {
  const byCode = new Map<string, { uses: number; cost: number; pct: number }>();
  for (const r of rows) {
    if (!r.discountCode) continue;
    const e = byCode.get(r.discountCode) ?? { uses: 0, cost: 0, pct: 0 };
    e.uses += 1;
    e.cost += r.discountAmount;
    e.pct = r.listPrice ? Math.round((r.discountAmount / r.listPrice) * 100) : 0;
    byCode.set(r.discountCode, e);
  }
  if (byCode.size === 0) return null;
  return (
    <section className={card}>
      <h2 className="type-h2 text-text-primary">الخصومات</h2>
      {[...byCode.entries()].map(([code, e]) => (
        <p key={code} className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5">
          <span className="min-w-0 flex-1 type-caption text-text-secondary">
            استُخدم {pluralAr(e.uses, ["مرة", "مرتين", "مرات", "مرة"])} · خصم {formatPercent(e.pct)} · كلّفك {money(e.cost)} ر.س
          </span>
          <span dir="ltr" className="type-subtitle text-text-brand">
            {code}
          </span>
        </p>
      ))}
    </section>
  );
}

export function RefundsCard({ rows }: { rows: SaleRow[] }) {
  const refunded = rows.filter((r) => saleState(r) === "refunded");
  const rate = rows.length ? (refunded.length / rows.length) * 100 : 0;
  const latest = refunded[0];
  return (
    <section className={card}>
      <h2 className="type-h2 text-text-primary">الاستردادات</h2>
      {refunded.length === 0 ? (
        <p className="rounded-16 bg-state-success-bg px-4 py-4 type-body text-state-success">لا استردادات — كل مشتريك احتفظوا بالدورة.</p>
      ) : (
        <div className="flex flex-col gap-2 rounded-16 bg-state-error-bg px-4 py-4">
          <p className="type-subtitle text-state-error">
            {pluralAr(refunded.length, ["واحد", "اثنان", "استردادات", "استردادًا"])} من {toArabicDigits(rows.length)} · {new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 1 }).format(rate)}٪
          </p>
          {latest?.refundReason && <p className="type-body text-text-secondary">السبب المعلن: {latest.refundReason}</p>}
        </div>
      )}
      <p className="type-caption text-text-muted">نسبة استرداد تحت ١٠٪ طبيعية. تجاوزها يستدعي مراجعة وصف الدورة.</p>
    </section>
  );
}

/* ── Empty (415:19914) ───────────────────────────────────────────────────────────────────────────── */

export function EmptySales({ courseId, views, saleUrl, title }: { courseId: string; views: number; saleUrl: string; title: string }) {
  const what: { icon: LucideIcon; text: string }[] = [
    { icon: Users, text: "اسم كل مشترٍ وتاريخ شرائه" },
    { icon: Hourglass, text: "المبلغ قبل العمولة وبعدها" },
    { icon: FileText, text: "رقم العملية وإيصالها" },
    { icon: RefreshCw, text: "أي استرداد وسببه" },
    { icon: Target, text: "الخصومات المستخدمة" },
    { icon: Clock, text: "متى يصلك المال" },
  ];
  const steps = [
    { title: "يشتري متدرب", sub: "يُسجَّل المبلغ معلّقًا" },
    { title: "تمرّ ١٤ يومًا", sub: "مهلة الاسترداد" },
    { title: "يصبح متاحًا", sub: "تطلب سحبه لحسابك" },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
        <Tile icon={Eye} label="مشاهدة الصفحة" value={formatNumber(views)} valueTone="text-text-brand" />
        <Tile icon={CircleCheck} label="صافي إيرادك" value={money(0)} />
        <Tile icon={Users} label="مشترٍ" value="٠" />
        <Tile icon={FileText} label="عملية" value="٠" />
        <Tile icon={Hourglass} label="إجمالي المبيعات" value={money(0)} />
      </div>
      <section className="flex flex-col items-center gap-4 rounded-22 bg-bg-brand-tint px-5 py-10 text-center sm:px-12">
        <span className="flex size-16 items-center justify-center rounded-16 bg-bg-surface text-text-brand">
          <Glyph icon={Hourglass} size={24} />
        </span>
        <h2 className="text-[26px] leading-[1.3] font-bold text-text-primary sm:text-[32px]">لا مبيعات بعد</h2>
        <p className="max-w-[720px] type-body-lg text-text-secondary">
          {pluralAr(views, ["زائر واحد فتح", "زائران فتحا", "زوّار فتحوا", "زائرًا فتحوا"])} صفحتك ولم يشترِ أحد بعد. هذا طبيعي في الأيام الأولى — تظهر هنا كل عملية فور إتمامها.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <ShareLinkButton url={saleUrl} title={title} size="l">
            شارك رابط الدورة
          </ShareLinkButton>
          <ButtonLink href={`/trainer/courses/${courseId}/dashboard`} size="l" variant="outline">
            اعرض لوحة الدورة
          </ButtonLink>
        </div>
      </section>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className={`${card} min-w-0 flex-1`}>
          <h2 className="type-h2 text-text-primary">ماذا سيظهر هنا؟</h2>
          <p className="type-body text-text-muted">عند أول عملية بيع تجد في هذه الصفحة:</p>
          {what.map((w) => (
            <p key={w.text} className="flex items-center gap-3 rounded-16 bg-bg-page px-4 py-3.5 type-body text-text-primary">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
                <Glyph icon={w.icon} size={20} />
              </span>
              <span className="flex-1">{w.text}</span>
            </p>
          ))}
        </section>
        <section className={`${card} w-full lg:w-[400px]`}>
          <h2 className="type-h3 text-text-primary">كيف يصلك المال؟</h2>
          {steps.map((s, i) => (
            <div key={s.title} className="flex items-center gap-3 rounded-16 bg-bg-page px-4 py-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint type-subtitle text-text-brand">{toArabicDigits(i + 1)}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="type-subtitle text-text-primary">{s.title}</p>
                <p className="type-caption text-text-muted">{s.sub}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

/* ── Error (415:20420 · ERR-SALES-502) ──────────────────────────────────────────────────────────── */

export function SalesError() {
  const ok: { icon: LucideIcon; title: string; sub: string; bad?: boolean }[] = [
    { icon: CircleCheck, title: "مبيعاتك مسجَّلة ومحفوظة", sub: "لا عملية تضيع بسبب عطل في العرض" },
    { icon: LayoutGrid, title: "الشراء متاح والصفحة تعمل", sub: "المتدربون يشترون طبيعيًا الآن" },
    { icon: Hourglass, title: "رصيدك سليم في «الرصيد»", sub: "اعرضه من القائمة الجانبية" },
    { icon: CircleX, title: "لا يمكنك التصدير مؤقتًا", sub: "حتى يعود سجل العمليات", bad: true },
  ];
  return (
    <>
      <section role="alert" className="flex flex-col items-center gap-4 rounded-22 border-2 border-state-error bg-state-error-bg px-5 py-10 text-center sm:px-12">
        <span className="flex size-16 items-center justify-center rounded-16 bg-bg-surface text-state-error">
          <Glyph icon={CircleAlert} size={24} />
        </span>
        <h2 className="text-[26px] leading-[1.3] font-bold text-text-primary sm:text-[32px]">تعذّر تحميل سجل المبيعات</h2>
        <p className="max-w-[720px] type-body-lg text-text-secondary">لم نتمكن من جلب العمليات. مبيعاتك مسجَّلة كاملة في النظام ولم يضِع منها شيء — المشكلة في العرض فقط.</p>
        <p className="type-caption text-text-muted">
          رمز الخطأ <span dir="ltr" className="font-mono">ERR-SALES-502</span>
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <RetryButton />
          <ButtonLink href="/trainer/help" size="l" variant="outline">
            تواصل مع الدعم
          </ButtonLink>
        </div>
      </section>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className={`${card} min-w-0 flex-1`}>
          <h2 className="type-h2 text-text-primary">ما زال يعمل</h2>
          {ok.map((o) => (
            <div key={o.title} className={`flex items-center gap-3 rounded-16 px-4 py-3.5 ${o.bad ? "bg-state-error-bg" : "bg-state-success-bg"}`}>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface ${o.bad ? "text-state-error" : "text-state-success"}`}>
                <Glyph icon={o.icon} size={20} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className={`type-subtitle ${o.bad ? "text-state-error" : "text-state-success"}`}>{o.title}</p>
                <p className="type-caption text-text-secondary">{o.sub}</p>
              </div>
            </div>
          ))}
        </section>
        <section className={`${card} w-full lg:w-[400px]`}>
          <h2 className="type-h3 text-text-primary">رصيدك</h2>
          <p className="type-body text-text-muted">محفوظ ولا يتأثر بهذا العطل.</p>
          <ButtonLink href="/trainer/finance" size="l" variant="outline" fullWidth>
            افتح صفحة الرصيد
          </ButtonLink>
        </section>
      </div>
    </>
  );
}

/* ── No results (415:20625) ─────────────────────────────────────────────────────────────────────── */

export function NoResults({
  query,
  filterLabel,
  clearAll,
  clearSearch,
  tries,
  totals,
}: {
  query: string;
  filterLabel: string | null;
  clearAll: string;
  clearSearch: string | null;
  tries: { icon: LucideIcon; title: string; sub: string; badge: string; href: string }[];
  totals: { gross: number; net: number; count: number };
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section className="flex flex-col items-center gap-4 rounded-22 border border-border-default bg-bg-card px-5 py-10 text-center shadow-card sm:px-12">
          <span className="flex size-16 items-center justify-center rounded-16 bg-bg-brand-tint text-text-secondary">
            <Glyph icon={Search} size={24} />
          </span>
          <h2 className="text-[26px] leading-[1.3] font-bold text-text-primary sm:text-[32px]">لا نتائج تطابق بحثك</h2>
          <p className="max-w-[560px] type-body text-text-secondary">
            {query ? `بحثت عن «${query}»` : "اخترت"}
            {filterLabel ? ` ضمن ${filterLabel}` : ""} — ولا عملية تطابق هذه الشروط مجتمعة.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href={clearAll} size="l">
              أزل كل الفلاتر
            </ButtonLink>
            {clearSearch && (
              <ButtonLink href={clearSearch} size="l" variant="outline">
                امسح البحث فقط
              </ButtonLink>
            )}
          </div>
        </section>
        {tries.length > 0 && (
          <section className={card}>
            <h2 className="type-h2 text-text-primary">جرّب هذا</h2>
            {tries.map((t) => (
              <Link key={t.title} href={t.href} className="flex items-center gap-3 rounded-16 bg-bg-page px-4 py-3.5 focus-ring hover:bg-bg-brand-tint">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-secondary">
                  <Glyph icon={t.icon} size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="type-subtitle text-text-primary">{t.title}</span>
                  <span className="type-caption text-text-muted">{t.sub}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-brand-tint px-2.5 py-1 type-caption text-text-brand">
                  <Glyph icon={CircleCheck} size={16} />
                  {t.badge}
                </span>
              </Link>
            ))}
          </section>
        )}
      </div>
      <section className={`${card} w-full lg:w-[400px]`}>
        <h2 className="type-h3 text-text-primary">الإجماليات لا تتأثر</h2>
        <p className="type-body text-text-muted">البحث يصفّي العرض فقط — أرقامك الكاملة كما هي.</p>
        {[
          { label: "إجمالي المبيعات", value: `${money(totals.gross)} ر.س`, tone: "text-text-primary" },
          { label: "صافي إيرادك", value: `${money(totals.net)} ر.س`, tone: "text-state-success" },
          { label: "عدد العمليات", value: toArabicDigits(totals.count), tone: "text-text-primary" },
        ].map((r) => (
          <p key={r.label} className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3">
            <span className="min-w-0 flex-1 type-body text-text-secondary">{r.label}</span>
            <span className={`type-subtitle ${r.tone}`}>{r.value}</span>
          </p>
        ))}
      </section>
    </div>
  );
}

export const TRY_ICONS = { refund: RefreshCw, period: CalendarDays, search: Search, x: X, banknote: Banknote };
