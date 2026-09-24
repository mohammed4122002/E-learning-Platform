import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileX2, Hourglass } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { InfoRow } from "@/components/trainer-programs/bits";
import { ProgramSummaryCard } from "@/components/trainer-programs/FlowPanel";
import { WithdrawFlow } from "@/components/trainer-programs/WithdrawFlow";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getTrainerProgram } from "@/lib/data/trainer-programs";
import { formatDate, formatRelative } from "@/lib/format";
import { businessDaysWord, reviewDaysLeft, versionLabel } from "@/lib/trainer-programs";

export const metadata: Metadata = { title: "سحب طلب النشر" };

/** TRR-PRG-08 · سحب الطلب (454:27489 · 454:27755 · 454:28000 · 454:28258). */
export default async function WithdrawPage({ params }: PageProps<"/trainer/programs/[id]/withdraw">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/programs/${id}/withdraw`);
  const p = await getTrainerProgram(id, user.id);
  if (!p) notFound();
  const underReview = p.phase === "under_review";
  const last = p.requests[0] ?? null;
  const withdrawn = last?.status === "withdrawn" && p.phase === "draft";
  const submittedAt = last?.submittedAt ?? p.submittedAt;
  const left = submittedAt ? reviewDaysLeft(submittedAt) : 0;
  const daysLeftText = left > 0 ? `يتبقى ${businessDaysWord(left)} على القرار` : "القرار متوقع اليوم";
  const decision = p.phase === "published" ? "approved" : p.phase === "needs_changes" || p.phase === "rejected" ? p.phase : p.phase === "draft" ? "draft" : null;

  return (
    <>
      <TopBar title="حالة طلب النشر" subtitle={withdrawn ? "سُحب — مسودة الآن" : underReview ? "قيد المراجعة" : "تعذّر السحب"} />
      <PageBody className="!gap-6">
        <Breadcrumb items={[{ label: "برامجي", href: "/trainer/programs" }, { label: p.title, href: `/trainer/programs/${p.id}` }]} />
        <div className="flex flex-col-reverse gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 justify-center">
            <div className="w-full max-w-[460px]">
              <WithdrawFlow
                programId={p.id}
                reference={p.reference}
                underReview={underReview}
                withdrawn={withdrawn}
                submittedAgo={submittedAt ? formatRelative(submittedAt).replace(/^منذ /, "") : "—"}
                daysLeftText={daysLeftText}
                decision={decision}
              />
            </div>
          </div>
          <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[340px]">
            {withdrawn ? (
              <ProgramSummaryCard
                tone="brand"
                icon={FileX2}
                pill={<span className="rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-text-primary">مسودة</span>}
                reference={p.reference}
                title={p.title}
                meta={`سُحب من المراجعة ${formatRelative(last!.decidedAt ?? p.updatedAt)} · قابل للتعديل الآن`}
              />
            ) : (
              <ProgramSummaryCard
                tone="info"
                icon={Hourglass}
                pill={
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-info">
                    <Glyph icon={Hourglass} size={16} />
                    قيد المراجعة
                  </span>
                }
                reference={p.reference}
                title={p.title}
                meta={submittedAt ? `أُرسل ${formatRelative(submittedAt)} · ${daysLeftText}` : "لا طلب قيد المراجعة"}
              />
            )}
            <section className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-6 shadow-card">
              <h2 className="type-h2 text-text-primary">{withdrawn ? "بعد السحب" : "حالة الطلب"}</h2>
              <dl className="flex flex-col gap-3">
                {withdrawn ? (
                  <>
                    <InfoRow label="الحالة الحالية" value="مسودة" />
                    <InfoRow label="ما حُفظ" value="المحتوى والأهداف والتسعير" valueClass="text-state-success" />
                    <InfoRow label="ملاحظة المراجع" value={last?.note ? "متاحة أدناه" : "لا ملاحظات"} valueClass="text-state-info" />
                    <InfoRow label="إعادة الإرسال" value="متاحة بعد التعديل" valueClass="text-state-success" />
                    <InfoRow label="الدور في الطابور" value="يبدأ من جديد" valueClass="text-state-warning" />
                  </>
                ) : (
                  <>
                    <InfoRow label="تاريخ الإرسال" value={submittedAt ? formatDate(submittedAt) : "—"} />
                    <InfoRow label="المراجع" value="فريق اعتماد المحتوى" />
                    <InfoRow label="المدة المتوقعة" value="٣ أيام عمل" />
                    <InfoRow label="التعديل أثناء المراجعة" value="غير متاح" valueClass="text-state-warning" />
                    <InfoRow label="النسخة المرسَلة" value={versionLabel(last?.revision ?? p.revision)} mono />
                  </>
                )}
              </dl>
            </section>
            <section className="flex flex-col gap-3 rounded-22 border border-border-default bg-bg-card p-6 shadow-card">
              <h2 className="type-h2 text-text-primary">إجراءات</h2>
              {withdrawn ? (
                <>
                  <ButtonLink href={`/trainer/programs/${p.id}/edit/basics`} fullWidth>
                    افتح المحرّر وعدّل
                  </ButtonLink>
                  <ButtonLink href={`/trainer/programs/${p.id}/preview`} variant="outline" fullWidth>
                    أعد الإرسال للمراجعة
                  </ButtonLink>
                  <p className="type-caption text-text-muted">بعد إكمال تعديلاتك</p>
                </>
              ) : (
                <>
                  <p className="type-caption text-text-muted">السحب يعيد البرنامج مسودة — ويفقد دوره في الطابور.</p>
                  <Link href={`/trainer/programs/${p.id}/review`} className="self-center rounded-8 py-2 type-subtitle text-text-brand hover:underline focus-ring">
                    تتبّع الطلب
                  </Link>
                </>
              )}
            </section>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
