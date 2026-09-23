import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Bell, ChevronLeft, CircleCheck, EyeOff, FileCheck, Info, Scale, ShieldCheck } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Select } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { IconPill, KeyValue, StatusHero, StepRow, TipStrip } from "@/components/ui/InfoBlocks";
import { PageHeading, SectionCard } from "@/components/ui/PageHeading";
import { ReportForm } from "@/components/support/ReportForm";
import { ReportTypeCards } from "@/components/support/ReportTypeCards";
import { WithdrawReportButton } from "@/components/support/WithdrawReportButton";
import { requireTrainee } from "@/lib/auth";
import { getMyReport, getReportCandidates, getReportTarget, type MyReport } from "@/lib/data/support";
import { formatDayMonth, formatRelative, formatTime } from "@/lib/format";
import { REPORT_REASONS, REPORT_TARGETS, type ReportTarget } from "@/lib/validation/engagement";

export const metadata: Metadata = { title: "الإبلاغ عن مخالفة", description: "بلاغ سرّي يراجعه فريق الامتثال خلال ٤٨ ساعة عمل." };

const TYPES = Object.keys(REPORT_TARGETS) as ReportTarget[];
const STATUS_LABEL: Record<MyReport["status"], { label: string; cls: string }> = {
  open: { label: "قيد المراجعة", cls: "text-state-warning" },
  reviewing: { label: "قيد المراجعة", cls: "text-state-warning" },
  actioned: { label: "اتُّخذ إجراء", cls: "text-state-success" },
  dismissed: { label: "حُفظ البلاغ", cls: "text-text-secondary" },
  withdrawn: { label: "مسحوب", cls: "text-text-secondary" },
};

async function SentView({ report, userId }: { report: MyReport; userId: string }) {
  const target = await getReportTarget(userId, report.type, report.targetId);
  const withdrawn = report.status === "withdrawn";
  const decided = report.status === "actioned" || report.status === "dismissed";
  const at = `${formatDayMonth(report.createdAt)} · ${formatTime(report.createdAt)}`;
  return (
    <>
      <StatusHero
        tone={withdrawn ? "info" : "success"}
        icon={ShieldCheck}
        title={withdrawn ? "سحبت هذا البلاغ" : "استلمنا بلاغك"}
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <span className="type-caption text-text-muted">رقم البلاغ</span>
            <span dir="ltr" className="font-mono text-[14px] leading-[1.5] text-text-primary">
              {report.reference}
            </span>
            <IconPill icon={EyeOff} tone="surface-success">
              سرّي
            </IconPill>
          </div>
        }
      >
        {withdrawn
          ? "لن يُراجع هذا البلاغ. يمكنك تقديم بلاغ جديد في أي وقت إن لزم."
          : "يراجعه فريق الامتثال خلال ٤٨ ساعة عمل. هويتك لن تُكشف للمبلَّغ عنه، ولن يتأثر تسجيلك أو شهادتك بأي شكل."}
      </StatusHero>

      <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
          <SectionCard title="ما الذي يحدث الآن؟" titleId="next-title">
            <ol className="flex flex-col gap-4">
              <StepRow disc={40} state="done" icon={CircleCheck} title="استُلم البلاغ" description={`${at} — سُجّل برقم مرجعي`} />
              <StepRow
                disc={40}
                state={withdrawn ? "todo" : decided ? "done" : "current"}
                icon={Scale}
                title="مراجعة فريق الامتثال"
                description={withdrawn ? "أُوقفت بعد سحب البلاغ" : "خلال ٤٨ ساعة عمل — قد نطلب توضيحًا منك"}
              />
              <StepRow disc={40} state={decided ? "done" : "todo"} icon={FileCheck} title="القرار" description="إجراء تصحيحي على العنصر المُبلَّغ عنه أو حفظ البلاغ" />
              <StepRow disc={40} state={decided ? "done" : "todo"} icon={Bell} title="إشعارك بالنتيجة" description="يصلك إشعار بالقرار دون تفاصيل الإجراء ضد الطرف الآخر" />
            </ol>
          </SectionCard>
          <SectionCard title="هل يؤثر البلاغ على تسجيلي؟" titleId="impact-title">
            <p className="type-body text-text-secondary">
              لا. تسجيلك في البرنامج ودروسك وحضورك ودرجاتك وشهادتك تسير كالمعتاد. إن كنت ترغب في الانسحاب فذلك قرار منفصل تمامًا وتُطبَّق عليه شرائح الاسترداد المعتادة.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/trainee/trainings" variant="secondary">
                تابع دورتي
              </ButtonLink>
              <ButtonLink href="/trainee/help/refund-policy" variant="ghost">
                اعرض سياسة الانسحاب
              </ButtonLink>
            </div>
          </SectionCard>
        </div>

        <aside aria-label="تفاصيل البلاغ" className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
          <SectionCard title="تفاصيل البلاغ" titleId="details-title">
            <dl className="flex flex-col gap-4">
              <KeyValue label="رقم البلاغ" value={<span dir="ltr" className="font-mono text-[14px]">{report.reference}</span>} />
              <KeyValue label="الحالة" value={STATUS_LABEL[report.status].label} valueClass={STATUS_LABEL[report.status].cls} />
              <KeyValue label="الموضوع" value={`${REPORT_TARGETS[report.type].label} · ${REPORT_REASONS[report.reason] ?? "سبب آخر"}`} />
              {target && <KeyValue label="المُبلَّغ عنه" value={<span className="line-clamp-1">{target.title}</span>} />}
              <KeyValue label="قُدّم في" value={formatRelative(report.createdAt)} />
              {!withdrawn && !decided && <KeyValue label="أقصى مدة للرد" value="خلال ٤٨ ساعة عمل" valueClass="text-state-warning" />}
              {report.hasEvidence && <KeyValue label="الأدلة" value="مرفقة" valueClass="text-state-success" />}
            </dl>
          </SectionCard>
          {report.status === "open" && <WithdrawReportButton id={report.id} reference={report.reference} />}
          <ButtonLink href="/trainee/help" variant="ghost" size="l" fullWidth>
            تواصل مع الدعم
          </ButtonLink>
        </aside>
      </div>
    </>
  );
}

/** TRN-RPT-01 · الإبلاغ عن مخالفة — Figma 227:13498 (النموذج) · 227:13738 (تم الإرسال). `?type=&id=` or `?sent=<report id>`. */
export default async function ReportPage({ searchParams }: PageProps<"/trainee/report">) {
  const sp = await searchParams;
  const user = await requireTrainee("/trainee/report");

  if (typeof sp.sent === "string") {
    if (!z.uuid().safeParse(sp.sent).success) notFound();
    const report = await getMyReport(user.id, sp.sent);
    if (!report) notFound();
    return (
      <>
        <TopBar title="الإبلاغ عن مخالفة" subtitle={report.status === "withdrawn" ? "مسحوب" : "تم الإرسال"} />
        <PageBody className="gap-6">
          <SentView report={report} userId={user.id} />
        </PageBody>
      </>
    );
  }

  const type: ReportTarget = TYPES.includes(sp.type as ReportTarget) ? (sp.type as ReportTarget) : "course";
  const id = typeof sp.id === "string" && z.uuid().safeParse(sp.id).success ? sp.id : null;
  const target = id ? await getReportTarget(user.id, type, id) : null;
  const candidates = !target && type !== "review" ? await getReportCandidates(user.id, type) : [];
  const hrefs = Object.fromEntries(TYPES.map((t) => [t, t === type && id ? `/trainee/report?type=${t}&id=${id}` : `/trainee/report?type=${t}`])) as Record<ReportTarget, string>;
  const cancelHref = target && type === "course" ? "/trainee/trainings" : "/trainee/help";

  return (
    <>
      <TopBar title="الإبلاغ عن مخالفة" subtitle="بلاغ سرّي لإدارة المنصة" />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "مركز المساعدة", href: "/trainee/help" }, { label: "الإبلاغ عن مخالفة" }]} />
        <PageHeading title="الإبلاغ عن مخالفة" description="بلاغك يذهب إلى إدارة المنصة مباشرة — لا إلى الجهة أو المدرب المعنيّ. يُراجَع بسرّية خلال ٤٨ ساعة عمل." />
        <TipStrip icon={Info} tone="page">
          هل تبحث عن شيء آخر؟ للأسئلة عن برنامج استخدم «استفسار قبل التسجيل» · للمشاكل التقنية أو المالية افتح تذكرة دعم · للاعتراض على قرار مالي افتح نزاعًا.
        </TipStrip>
        {id && !target && (
          <EmptyState tone="error" title="لم نعثر على العنصر المُبلَّغ عنه" description="ربما حُذف أو لم يعد متاحًا. اختر العنصر من القائمة أدناه." />
        )}
        {!target && (
          <SectionCard title={`اختر ${REPORT_TARGETS[type].label}`} titleId="pick-target-title">
            {type === "review" ? (
              <p className="type-body text-text-secondary">للإبلاغ عن تقييم أو تعليق افتح صفحة البرنامج واختر «الإبلاغ» بجوار التقييم المعنيّ.</p>
            ) : candidates.length ? (
              <form action="/trainee/report" method="get" className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <input type="hidden" name="type" value={type} />
                <Select name="id" label={REPORT_TARGETS[type].label} required defaultValue="" placeholder="اختر من دوراتك" options={candidates.map((c) => ({ value: c.id, label: c.label }))} className="flex-1" />
                <Button type="submit" icon={<Glyph icon={ChevronLeft} size={16} />}>
                  متابعة
                </Button>
              </form>
            ) : (
              <p className="type-body text-text-secondary">لا عناصر من دوراتك يمكن الإبلاغ عنها هنا. افتح صفحة البرنامج أو المدرب أو الجهة واختر «الإبلاغ عن مخالفة».</p>
            )}
          </SectionCard>
        )}
        <ReportForm key={`${type}-${target?.id ?? "none"}`} userId={user.id} type={type} target={target} cancelHref={cancelHref} typeCards={<ReportTypeCards selected={type} hrefs={hrefs} />} />
      </PageBody>
    </>
  );
}
