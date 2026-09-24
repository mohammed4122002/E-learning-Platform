import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleAlert, CircleCheck, Info, RotateCcw, ShieldCheck } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { PrintReceipt } from "@/components/trainer-courses/sales/PrintReceipt";
import { money, saleState, soldAt } from "@/components/trainer-courses/sales/SalesView";
import { Avatar } from "@/components/ui/Data";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getCourseSales, getRecordedDashboard } from "@/lib/data/trainer-course-page";
import { getCourseHeader } from "@/lib/data/trainer-courses";
import { formatDate, formatDayMonth, formatPercent, formatRelative, formatTime, toArabicDigits } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/trainings";

export const metadata: Metadata = { title: "تفاصيل العملية", description: "تفصيل مبلغ عملية بيع وبياناتها" };

const DAY = 86_400_000;

/** TRR-CRS-09 · تفاصيل العملية (414:19967). Read-only: refunds start from the trainee only. */
export default async function SaleDetailPage({ params }: PageProps<"/trainer/courses/[id]/sales/[enrollmentId]">) {
  const { id, enrollmentId } = await params;
  await requireTrainer(`/trainer/courses/${id}/sales/${enrollmentId}`);
  const course = await getCourseHeader(id);
  if (!course) notFound();
  const rows = await getCourseSales(id);
  const r = rows.find((x) => x.enrollmentId === enrollmentId);
  if (!r) notFound();
  const dash = await getRecordedDashboard(id).catch(() => null);
  const learner = dash?.learners.find((l) => l.enrollmentId === enrollmentId) ?? null;

  const st = saleState(r);
  const at = soldAt(r);
  const base = r.paid - r.vat;
  const commission = Math.round(base * r.commissionPercent) / 100;
  const refunded = st === "refunded" ? r.refundAmount ?? base : 0;
  const net = st === "refunded" ? 0 : Math.round((base - commission) * 100) / 100;
  const ref = r.paymentRef ?? r.receipt ?? r.enrollmentId.slice(0, 8).toUpperCase();
  const releaseAt = Date.parse(at) + 14 * DAY;
  const released = new Date().getTime() >= releaseAt;
  const discountPct = r.listPrice ? Math.round((r.discountAmount / r.listPrice) * 100) : 0;
  const progress = learner && dash && dash.lessons ? Math.min(100, Math.round((learner.done / dash.lessons) * 100)) : null;

  const hero =
    st === "refunded"
      ? { box: "border-state-info bg-state-info-bg", chip: "text-state-info", icon: RotateCcw, label: "مستردة", line: `استُرِد المبلغ للمشتري${r.refundDecidedAt ? ` · ${formatDate(r.refundDecidedAt)}` : ""}` }
      : st === "refund_pending"
        ? { box: "border-state-warning bg-state-warning-bg", chip: "text-state-warning", icon: CircleAlert, label: "طلب استرداد قيد المراجعة", line: "صافي هذه العملية معلّق حتى يُحسم الطلب" }
        : { box: "border-state-success bg-state-success-bg", chip: "text-state-success", icon: CircleCheck, label: "مدفوعة ومكتملة", line: `صافي ما وصلك من هذه العملية · ${formatDate(at)} · ${formatTime(at)}` };

  const breakdown = [
    { label: "سعر الدورة", value: `${money(r.listPrice)} ر.س`, tone: "text-text-primary" },
    ...(r.discountAmount > 0 ? [{ label: `خصم «${r.discountCode ?? "—"}» ${formatPercent(discountPct)}`, value: `− ${money(r.discountAmount)} ر.س`, tone: "text-state-warning" }] : []),
    { label: "المبلغ المدفوع من المشتري", value: `${money(base)} ر.س`, tone: "text-text-primary" },
    { label: `عمولة المنصة ${toArabicDigits(r.commissionPercent)}٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة`, value: `− ${money(commission)} ر.س`, tone: "text-state-warning" },
    ...(refunded ? [{ label: "المبلغ المسترد", value: `− ${money(refunded)} ر.س`, tone: "text-state-error" }] : []),
  ];
  const facts = [
    { label: "رقم العملية", value: ref, mono: true },
    { label: "التاريخ", value: formatDate(at) },
    { label: "الوقت", value: formatTime(at) },
    { label: "طريقة الدفع", value: r.paymentMethod ? (PAYMENT_METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod) : r.paid === 0 ? "مجانية" : "—" },
    { label: "حالة الإفراج", value: st === "refunded" ? "مستردة" : released ? "متاح للسحب" : `معلّق حتى ${formatDayMonth(new Date(releaseAt))}` },
    { label: "الإيصال", value: r.receipt ? "صادر للمشتري" : "—" },
  ];

  return (
    <>
      <TopBar title="تفاصيل العملية" subtitle={ref} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "المبيعات", href: `/trainer/courses/${id}/sales` }, { label: "العمليات", href: `/trainer/courses/${id}/sales` }, { label: "تفاصيل" }]} />
        <section className={`flex flex-col gap-5 rounded-22 border-2 px-5 py-6 sm:flex-row sm:items-center sm:px-7 ${hero.box}`}>
          <span className={`flex size-16 shrink-0 items-center justify-center rounded-16 bg-bg-surface ${hero.chip}`}>
            <Glyph icon={hero.icon} size={24} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="flex flex-wrap items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-3 py-1.5 type-subtitle ${hero.chip}`}>
                <Glyph icon={hero.icon} size={16} />
                {hero.label}
              </span>
              <span dir="ltr" className="font-mono text-[14px] text-text-muted">
                {ref}
              </span>
            </p>
            <p className="text-[32px] leading-[1.2] font-bold text-text-primary sm:text-[40px]">{money(st === "refunded" ? refunded : net)} ر.س</p>
            <p className="type-body text-text-secondary">{hero.line}</p>
          </div>
          <PrintReceipt label="نزّل الإيصال" />
        </section>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <section className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
              <h2 className="type-h2 text-text-primary">تفصيل المبلغ</h2>
              {breakdown.map((b) => (
                <p key={b.label} className="flex items-start gap-3 rounded-16 bg-bg-page px-4 py-4">
                  <span className="min-w-0 flex-1 type-body text-text-secondary">{b.label}</span>
                  <span className={`shrink-0 type-subtitle ${b.tone}`}>{b.value}</span>
                </p>
              ))}
              <hr className="border-border-divider" />
              <p className="flex items-center gap-3 rounded-16 bg-state-success-bg px-4 py-4">
                <span className="min-w-0 flex-1 type-title text-text-primary">صافي ما وصلك</span>
                <span className="shrink-0 type-h3 text-state-success">{money(net)} ر.س</span>
              </p>
              <p className="flex items-start gap-3 rounded-16 bg-state-info-bg px-4 py-4 type-body text-state-info">
                <Glyph icon={Info} size={20} className="mt-1" />
                <span className="flex-1">ضريبة القيمة المضافة تُحصَّل من المشتري وتُورَّد للجهة الضريبية مباشرة — لا تدخل في حسابك ولا تُخصم منك.</span>
              </p>
            </section>
            <section className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
              <h2 className="type-h2 text-text-primary">المشتري</h2>
              <div className="flex flex-wrap items-center gap-3 rounded-16 bg-bg-page px-4 py-4">
                <Avatar name={r.name} src={r.avatar} size="l" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="type-title text-text-primary">{r.name}</p>
                  <p className="type-body text-text-muted">
                    اشترى {formatRelative(at)}
                    {progress !== null && ` · أكمل ${formatPercent(progress)} من الدورة`}
                  </p>
                </div>
                <ButtonLink href="/messages" variant="outline" className="w-[120px]">
                  راسله
                </ButtonLink>
              </div>
              <p className="flex items-start gap-3 rounded-16 bg-bg-page px-4 py-4 type-body text-text-secondary">
                <Glyph icon={ShieldCheck} size={20} className="mt-1" />
                <span className="flex-1">بيانات الدفع الكاملة لا تظهر لك — نعرض آخر أربعة أرقام فقط حماية للمشتري.</span>
              </p>
            </section>
          </div>
          <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[400px]">
            <section className="flex flex-col gap-3 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
              <h2 className="type-h3 text-text-primary">بيانات العملية</h2>
              {facts.map((f) => (
                <p key={f.label} className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3">
                  <span className="min-w-0 flex-1 type-body text-text-secondary">{f.label}</span>
                  <span dir={f.mono ? "ltr" : undefined} className={`type-subtitle text-text-primary ${f.mono ? "font-mono text-[14px]" : ""}`}>
                    {f.value}
                  </span>
                </p>
              ))}
            </section>
            <section className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
              <h2 className="type-h3 text-text-primary">إجراءات</h2>
              <PrintReceipt label="نزّل الإيصال PDF" fullWidth size="l" />
              <ButtonLink href="/messages" size="l" variant="outline" fullWidth>
                راسل المشتري
              </ButtonLink>
              <ButtonLink href="/trainer/help" size="l" variant="ghost" fullWidth>
                أبلغ عن مشكلة في العملية
              </ButtonLink>
              <p className="type-caption text-text-muted">يفتح تذكرة لدى الفريق المالي</p>
              <p className="flex items-start gap-3 rounded-16 bg-state-warning-bg px-4 py-3.5 type-body text-state-warning">
                <Glyph icon={CircleAlert} size={20} className="mt-1" />
                <span className="flex-1">لا يمكنك إلغاء عملية أو ردّ مبلغ من هنا — الاسترداد يبدأ من المشتري وحده.</span>
              </p>
            </section>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
