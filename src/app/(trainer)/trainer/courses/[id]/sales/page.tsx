import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, FileText, RefreshCw, RotateCcw, Search, Target, Users, X, CircleCheckBig, Hourglass } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { SortSelect } from "@/components/trainer-courses/SortSelect";
import {
  DiscountsCard, EmptySales, NoResults,
  NoResultsTotals, PayoutCard, RefundsCard, SalesError, SalesTable, Tile, money, netOfSale, saleState, soldAt,
} from "@/components/trainer-courses/sales/SalesView";
import { ButtonLink } from "@/components/ui/Button";
import { ChipLink } from "@/components/ui/Chip";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb, Pagination } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getCourseSales, salesTotals, type SaleRow } from "@/lib/data/trainer-course-page";
import { getLedger } from "@/lib/data/trainer-finance";
import { getCourseHeader } from "@/lib/data/trainer-courses";
import { env } from "@/lib/env";
import { pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "مبيعات الدورة", description: "سجل عمليات البيع والاسترداد وموعد وصول المال" };

const PER_PAGE = 7;
const DAY = 86_400_000;
const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "month", label: "هذا الشهر" },
  { key: "failed", label: "فشلت" },
  { key: "refunded", label: "مستردة" },
  { key: "paid", label: "مدفوعة" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];
const SORTS = [
  { value: "newest", label: "الأحدث أولًا" },
  { value: "oldest", label: "الأقدم أولًا" },
  { value: "amount", label: "الأعلى مبلغًا" },
];

const monthStart = () => {
  const now = new Date(new Date().getTime() + 3 * 3_600_000);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 3 * 3_600_000;
};

function matches(r: SaleRow, f: FilterKey): boolean {
  if (f === "all") return true;
  if (f === "month") return Date.parse(soldAt(r)) >= monthStart();
  if (f === "failed") return r.paymentStatus === "failed";
  if (f === "refunded") return saleState(r) === "refunded";
  return saleState(r) !== "refunded";
}

/** TRR-CRS-09 · مبيعات الدورة (414:19534) with empty (415:19914), error (415:20420) and no-results (415:20625) states. */
export default async function CourseSalesPage({ params, searchParams }: PageProps<"/trainer/courses/[id]/sales">) {
  const { id } = await params;
  const sp = await searchParams;
  await requireTrainer(`/trainer/courses/${id}/sales`);
  const course = await getCourseHeader(id);
  if (!course) notFound();
  if (course.status === "draft") redirect(`/trainer/courses/${id}/setup/review`);

  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const filter = (FILTERS.find((f) => f.key === sp.f)?.key ?? "all") as FilterKey;
  const sort = SORTS.some((s) => s.value === sp.sort) ? String(sp.sort) : "newest";
  const page = Math.max(1, Number(sp.page) || 1);
  const base = `/trainer/courses/${id}/sales`;
  const href = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { q: q || undefined, f: filter === "all" ? undefined : filter, sort: sort === "newest" ? undefined : sort, ...p };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };

  let rows: SaleRow[] | null = null;
  try {
    rows = await getCourseSales(id);
  } catch {
    rows = null;
  }

  const crumbs = <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: course.title, href: course.mode === "recorded" ? `/trainer/courses/${id}/dashboard` : `/trainer/courses/${id}` }, { label: "المبيعات" }]} />;
  const exportBtn = (
    <ButtonLink href={`/trainer/courses/export?ids=${id}`} size="l" variant="outline">
      صدّر كشف المبيعات
    </ButtonLink>
  );
  const heading = (sub: string, withExport: boolean) => (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h1 className="text-[30px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">مبيعات الدورة</h1>
        <p className="type-body-lg text-text-secondary">{sub}</p>
      </div>
      {withExport && exportBtn}
    </div>
  );

  if (rows === null) {
    return (
      <>
        <TopBar title="المبيعات" subtitle="تعذّر التحميل" />
        <PageBody className="gap-6">
          {crumbs}
          {heading("تعذّر جلب سجل العمليات", false)}
          <SalesError />
        </PageBody>
      </>
    );
  }

  if (rows.length === 0) {
    const days = course.publishedAt ? Math.max(0, Math.floor((new Date().getTime() - Date.parse(course.publishedAt)) / DAY)) : 0;
    return (
      <>
        <TopBar title="المبيعات" subtitle="لا مبيعات بعد" />
        <PageBody className="gap-6">
          {crumbs}
          {heading(`الدورة منشورة منذ ${pluralAr(Math.max(1, days), ["يوم واحد", "يومين", "أيام", "يومًا"])} · لم تُسجَّل أي عملية بعد`, false)}
          <EmptySales courseId={id} views={course.pageViews} saleUrl={`${env.siteUrl}/courses/${course.slug}`} title={course.title} />
        </PageBody>
      </>
    );
  }

  const all = rows;
  const totals = salesTotals(all);
  const active = all.filter((r) => saleState(r) !== "refunded");
  const monthCount = all.filter((r) => matches(r, "month")).length;
  const now = new Date().getTime();
  // «متى يصلك المال؟» follows the trainer ledger (TRR-FIN, same release rule as /trainer/finance) when the viewer
  // is the course's trainer; other course staff keep the per-sale estimate.
  const ledger = (await getLedger()).filter((r) => r.courseId === id);
  const available = ledger.length
    ? ledger.filter((r) => r.released).reduce((s, r) => s + r.net, 0) / 100
    : active.filter((r) => now - Date.parse(soldAt(r)) >= 14 * DAY).reduce((s, r) => s + netOfSale(r), 0);
  const held = ledger.length
    ? ledger.filter((r) => !r.released).reduce((s, r) => s + r.net, 0) / 100
    : active.filter((r) => now - Date.parse(soldAt(r)) < 14 * DAY).reduce((s, r) => s + netOfSale(r), 0);
  const refundedRows = all.filter((r) => saleState(r) === "refunded");

  const needle = q.toLowerCase();
  const searched = needle ? all.filter((r) => r.name.toLowerCase().includes(needle) || (r.paymentRef ?? "").toLowerCase().includes(needle) || (r.receipt ?? "").toLowerCase().includes(needle)) : all;
  const filtered = searched.filter((r) => matches(r, filter));
  const sorted = filtered.slice().sort((a, b) =>
    sort === "amount" ? b.paid - a.paid : sort === "oldest" ? soldAt(a).localeCompare(soldAt(b)) : soldAt(b).localeCompare(soldAt(a)),
  );
  const pageCount = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const pageRows = sorted.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const noResults = sorted.length === 0;
  const filterLabel = filter === "all" ? null : FILTERS.find((f) => f.key === filter)!.label;

  const tries = [
    ...(filter !== "all" && searched.length > 0 ? [{ icon: RefreshCw, title: `أزل فلتر «${filterLabel}»`, sub: `${pluralAr(searched.length, ["عملية واحدة", "عمليتان", "عمليات", "عملية"])} تطابق البحث بلا فلتر`, badge: `${toArabicDigits(searched.length)} نتيجة`, href: href({ f: undefined, page: undefined }) }] : []),
    ...(filter === "month" && searched.length > searched.filter((r) => matches(r, "month")).length ? [{ icon: CalendarDays, title: "وسّع المدة الزمنية", sub: `${pluralAr(all.length - monthCount, ["عملية واحدة", "عمليتان", "عمليات", "عملية"])} خارج هذا الشهر`, badge: `${toArabicDigits(searched.length)} نتيجة`, href: href({ f: undefined, page: undefined }) }] : []),
    ...(q ? [{ icon: Search, title: "ابحث برقم العملية", sub: all[0]?.paymentRef ? `مثال: ${all[0].paymentRef}` : "رقم العملية من الإيصال", badge: "أدق", href: href({ q: undefined, page: undefined }) }] : []),
  ];

  return (
    <>
      <TopBar title="المبيعات" subtitle={noResults ? "لا نتائج للبحث" : course.title} />
      <PageBody className="gap-6">
        {crumbs}
        {heading(
          noResults
            ? `${pluralAr(all.length, ["عملية واحدة", "عمليتان", "عمليات", "عملية"])} · لا شيء يطابق بحثك`
            : `${pluralAr(all.length, ["عملية واحدة", "عمليتان", "عمليات", "عملية"])} · ${pluralAr(active.length, ["مشترٍ نشط", "مشتريان نشطان", "مشترين نشطين", "مشتريًا نشطًا"])} · صافي ${money(totals.net)} ر.س`,
          true,
        )}
        {!noResults && (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
            <Tile icon={Users} label="مشتريًا نشطًا" value={toArabicDigits(active.length)} sub={`+${toArabicDigits(monthCount)} هذا الشهر`} subTone="text-state-success" />
            <Tile icon={CircleCheckBig} label="صافي إيرادك" value={money(totals.net)} sub={`${money(available)} متاح للسحب`} subTone="text-state-success" iconTone="bg-state-success-bg text-state-success" />
            <Tile
              icon={RotateCcw}
              label={totals.refundCount ? pluralAr(totals.refundCount, ["استرداد واحد", "استردادان", "استردادات", "استردادًا"]) : "لا استردادات"}
              value={totals.refundCount ? `− ${money(totals.refunds)}` : money(0)}
              valueTone={totals.refundCount ? "text-state-error" : "text-text-primary"}
              sub={refundedRows.length === 1 ? refundedRows[0].name : undefined}
              subTone="text-state-error"
              iconTone="bg-state-error-bg text-state-error"
            />
            <Tile icon={Target} label={`عمولة المنصة ${toArabicDigits(totals.pct)}٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة`} value={`− ${money(totals.commission)}`} sub="تُخصم آليًا" />
            <Tile icon={Hourglass} label="إجمالي المبيعات" value={money(totals.gross)} sub={pluralAr(totals.count, ["عملية واحدة", "عمليتان", "عمليات", "عملية"])} />
          </div>
        )}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <form action={base} className="relative flex-1" role="search">
                {filter !== "all" && <input type="hidden" name="f" value={filter} />}
                {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
                <label htmlFor="sales-q" className="sr-only">
                  ابحث في المبيعات
                </label>
                <input
                  id="sales-q"
                  name="q"
                  defaultValue={q}
                  placeholder="ابحث باسم المشتري أو رقم العملية"
                  className="h-12 w-full rounded-12 border-[1.5px] border-border-default bg-bg-surface ps-11 pe-11 type-body text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary"
                />
                <Glyph icon={Search} size={16} className="pointer-events-none absolute start-4 top-4 text-text-secondary" />
                {q && (
                  <Link href={href({ q: undefined, page: undefined })} aria-label="امسح البحث" className="absolute end-3 top-3 flex size-6 items-center justify-center rounded-8 text-text-secondary focus-ring">
                    <Glyph icon={X} size={16} />
                  </Link>
                )}
              </form>
              <SortSelect value={sort} options={SORTS} label="ترتيب العمليات" />
            </div>
            <nav aria-label="تصفية العمليات" className="flex flex-wrap gap-2.5">
              {FILTERS.map((f) => {
                const selected = filter === f.key && f.key !== "all";
                return (
                  <ChipLink key={f.key} href={href({ f: f.key === "all" || selected ? undefined : f.key, page: undefined })} selected={filter === f.key}>
                    {selected && <Glyph icon={X} size={16} className="me-1.5" />}
                    {f.label} · {toArabicDigits(all.filter((r) => matches(r, f.key)).length)}
                  </ChipLink>
                );
              })}
            </nav>
            {noResults ? (
              <NoResults
                query={q}
                filterLabel={filterLabel}
                clearAll={base}
                clearSearch={q && filter !== "all" ? href({ q: undefined, page: undefined }) : null}
                tries={tries}
              />
            ) : (
              <section className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-4 shadow-card sm:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="min-w-[12rem] flex-1 type-h2 text-text-primary">سجل العمليات</h2>
                  <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-brand-tint px-3.5 py-[9px] type-subtitle text-text-brand">
                    <Glyph icon={FileText} size={20} />
                    {pluralAr(sorted.length, ["عملية واحدة", "عمليتان", "عمليات", "عملية"])}
                  </span>
                </div>
                <SalesTable courseId={id} rows={pageRows} />
                <Pagination page={current} pageCount={pageCount} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />
              </section>
            )}
          </div>
          <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[400px]">
            {noResults ? (
              <NoResultsTotals totals={{ gross: totals.gross, net: totals.net, count: all.length }} />
            ) : (
              <>
                <PayoutCard available={available} held={held} />
                <DiscountsCard rows={all} />
                <RefundsCard rows={all} />
              </>
            )}
          </aside>
        </div>
      </PageBody>
    </>
  );
}
