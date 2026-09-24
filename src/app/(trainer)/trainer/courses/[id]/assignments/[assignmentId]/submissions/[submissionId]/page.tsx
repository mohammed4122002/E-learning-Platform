import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, FileSpreadsheet, FileText, Hourglass, MessageCircle, TriangleAlert, Zap } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { DismissibleAlert } from "@/components/trainings/DismissibleAlert";
import { GradeForm } from "@/components/trainer-ops/GradeForm";
import { daysWord } from "@/components/trainer-ops/Grading";
import { MiniPill, SideCard, TagPill, toneText, type OpsTone } from "@/components/trainer-ops/parts";
import { requireTrainer } from "@/lib/auth";
import { getManagedCourse } from "@/lib/data/trainer-course";
import { getGradingList, getGradingSubmission } from "@/lib/data/trainer-grading";
import { formatDayMonth, formatTime, pluralAr, toArabicDigits } from "@/lib/format";
import { fileSize } from "@/lib/trainings";

type Props = PageProps<"/trainer/courses/[id]/assignments/[assignmentId]/submissions/[submissionId]">;

const n = toArabicDigits;
const shortTitle = (t: string) => t.split(" · ")[0];

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id, assignmentId } = await props.params;
  const course = await getManagedCourse(id);
  const list = await getGradingList(course, assignmentId);
  return { title: `تقييم تسليم · ${list.assignment.title}` };
}

const KIND: Record<string, string> = { xlsx: "Excel", xls: "Excel", csv: "CSV", pdf: "PDF", docx: "Word", doc: "Word", pptx: "PowerPoint", zip: "ZIP", png: "صورة", jpg: "صورة", jpeg: "صورة" };

function StatusRow({ label, count, tone, current }: { label: string; count: number; tone: OpsTone; current?: boolean }) {
  const ring = current ? (tone === "success" ? "border-[1.5px] border-state-success bg-state-success-bg" : "border-[1.5px] border-action-primary bg-bg-brand-tint") : "bg-bg-page";
  return (
    <li aria-current={current ? "step" : undefined} className={`flex items-center gap-3 rounded-12 px-4 py-3.5 ${ring}`}>
      <span className={`type-small font-bold ${toneText[tone]}`}>{n(count)}</span>
      <span className={`min-w-0 flex-1 type-small ${toneText[tone]}`}>{label}</span>
      {current && (
        <MiniPill icon={Zap} tone={tone}>
          الآن
        </MiniPill>
      )}
    </li>
  );
}

/** TRR-CRS-11 · تقييم تسليم (444:23127) and «حُفظ التقييم» (444:23412). */
export default async function GradeSubmissionPage(props: Props) {
  const { id, assignmentId, submissionId } = await props.params;
  const sp = await props.searchParams;
  await requireTrainer(`/trainer/courses/${id}/assignments/${assignmentId}/submissions/${submissionId}`);
  const course = await getManagedCourse(id);
  const list = await getGradingList(course, assignmentId);
  const { submission: s, record, nav } = await getGradingSubmission(course, list, submissionId);
  const a = list.assignment;
  const base = `/trainer/courses/${course.id}/assignments/${a.id}/submissions`;
  const graded = Boolean(s.reviewedAt);
  const saved = graded && sp.saved === "1";
  const c = list.counts;
  const ext = (s.fileName ?? "").split(".").pop()?.toLowerCase() ?? "";
  const late = s.lateDays !== null && s.lateDays > 0;
  const firstName = s.name.split(" ")[0];
  const remainingLabel = nav.remaining ? `يتبقى ${pluralAr(nav.remaining, ["تسليم واحد", "تسليمان", "تسليمات", "تسليمًا"])} بعد هذا` : "لا تسليمات أخرى بانتظار التقييم";
  const pending = c.pending - (s.state === "pending" ? 1 : 0);
  const flagged = c.flagged - (s.state === "flagged" ? 1 : 0);

  return (
    <>
      <TopBar title="تقييم تسليم" subtitle={`${s.name} · ${shortTitle(a.title)}`} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: "الواجبات", href: base }, { label: "تقييم" }]} />

        <nav aria-label="التنقل بين التسليمات" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card px-5 py-4 shadow-card sm:flex-row sm:items-center sm:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="type-h4 font-bold! text-text-primary">{`التسليم ${n(nav.index)} من ${n(nav.total)}`}</span>
            <span className="type-small text-text-muted">{remainingLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={base} className="px-3 type-small text-text-brand hover:underline focus-ring">
              عُد للقائمة
            </Link>
            <ButtonLink href={nav.next ? `${base}/${nav.next}` : base} variant="outline" size="m" className="min-w-24" disabled={!nav.next}>
              التالي
            </ButtonLink>
            <ButtonLink href={nav.prev ? `${base}/${nav.prev}` : base} variant="outline" size="m" className="min-w-24" disabled={!nav.prev}>
              السابق
            </ButtonLink>
          </div>
        </nav>

        {saved && (
          <DismissibleAlert tone="success" title="حُفظ التقييم">
            {`${n(s.score ?? 0)} من ${n(a.maxScore)} وصلت درجة ${firstName} للمتدرب مع ملاحظتك. `}
            {nav.remaining ? `يتبقى ${pluralAr(nav.remaining, ["تسليم واحد", "تسليمان", "تسليمات", "تسليمًا"])} لتصبح النتائج قابلة للاعتماد.` : "اكتمل تقييم تسليمات هذا الواجب."}
          </DismissibleAlert>
        )}
        {list.resultsApproved && (
          <DismissibleAlert tone="info" title="اعتُمدت نتائج الدورة">
            الدرجات نهائية بعد اعتماد النتائج ولا يمكن تعديلها.
          </DismissibleAlert>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <section aria-label="المتدرب" className="flex flex-col gap-4 rounded-22 bg-bg-brand-tint px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <Avatar name={s.name} size="l" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h1 className="type-h2 text-text-primary">{s.name}</h1>
                <p className={`type-small ${late ? "text-state-warning" : "text-text-muted"}`}>
                  {`سلّم في ${formatDayMonth(s.submittedAt)} ${formatTime(s.submittedAt)}`}
                  {s.lateDays !== null && (s.lateDays > 0 ? ` · متأخر ${daysWord(s.lateDays)} عن الموعد` : s.lateDays === 0 ? " · في الموعد" : ` · قبل الموعد ${s.lateDays === -1 ? "بيوم" : s.lateDays === -2 ? "بيومين" : `بـ${n(-s.lateDays)} أيام`}`)}
                </p>
              </div>
              {graded ? (
                <TagPill icon={CircleCheck} tone="success" surface>
                  مقيَّم
                </TagPill>
              ) : s.flagged ? (
                <TagPill icon={TriangleAlert} tone="warning" surface>
                  تحتاج مراجعة
                </TagPill>
              ) : (
                <TagPill icon={Hourglass} tone="error" surface>
                  بانتظار تقييمك
                </TagPill>
              )}
            </section>

            <section aria-labelledby="answer-title" className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
              <h2 id="answer-title" className="type-h2 text-text-primary">
                إجابة المتدرب
              </h2>
              <div className="flex flex-wrap items-center gap-3 rounded-16 bg-bg-page px-4 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-state-success-bg text-state-success">
                  <Glyph icon={ext.startsWith("xls") || ext === "csv" ? FileSpreadsheet : FileText} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <bdi className="truncate type-subtitle font-bold! text-text-primary">{s.fileName ?? "ملف التسليم"}</bdi>
                  <span className="type-small text-text-muted">
                    {[s.fileSize ? fileSize(s.fileSize) : null, KIND[ext] ?? (ext ? ext.toUpperCase() : null), `رُفع ${formatDayMonth(s.submittedAt)}`].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {s.fileUrl ? (
                  <ButtonLink href={s.fileUrl} variant="outline" size="m" className="bg-bg-surface" target="_blank" rel="noopener noreferrer" prefetch={false}>
                    افتح الملف
                  </ButtonLink>
                ) : (
                  <ButtonLink href="#" variant="outline" size="m" disabled>
                    افتح الملف
                  </ButtonLink>
                )}
              </div>
              {s.note && (
                <div className="flex flex-col gap-2 rounded-16 bg-bg-page px-4 py-4">
                  <span className="flex items-center gap-2 type-small text-text-muted">
                    <Glyph icon={MessageCircle} size={16} />
                    ملاحظة المتدرب مع التسليم
                  </span>
                  <p className="type-body text-text-primary">{`«${s.note}»`}</p>
                </div>
              )}
            </section>

            <GradeForm
              key={`${s.id}:${s.reviewedAt ?? "draft"}`}
              courseId={course.id}
              submissionId={s.id}
              rubric={a.rubric}
              maxScore={a.maxScore}
              initialScores={s.scores}
              initialFeedback={s.feedback ?? ""}
              graded={graded}
              locked={list.resultsApproved}
              selfHref={`${base}/${s.id}`}
              nextHref={nav.nextUngraded ? `${base}/${nav.nextUngraded.id}` : null}
              nextName={nav.nextUngraded?.name ?? null}
            />
          </div>

          <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[340px]">
            <SideCard title="حالة التقييم" titleId="status-title">
              <ul className="flex flex-col gap-3">
                <StatusRow label="لم يبدأ" count={pending} tone="error" />
                <StatusRow label="قيد التقييم" count={graded ? 0 : 1} tone="brand" current={!graded} />
                <StatusRow label="تم التقييم" count={c.graded} tone="success" current={graded} />
                <StatusRow label="يحتاج مراجعة" count={flagged} tone="warning" />
                <StatusRow label="لم يسلّم" count={c.missing} tone="neutral" />
              </ul>
            </SideCard>
            <SideCard title="سجل هذا المتدرب" titleId="record-title">
              <ul className="flex flex-col gap-3">
                {record.assignments.map((r) => {
                  const current = r.state === "current";
                  const shown = current ? (graded ? "graded" : "current") : r.state;
                  const value =
                    shown === "graded" ? `${n(current ? (s.score ?? 0) : (r.score ?? 0))} من ${n(r.maxScore)}` : shown === "current" ? "قيد التقييم" : shown === "pending" ? "بانتظار التقييم" : "لم يسلّم";
                  const tone: OpsTone = shown === "graded" ? "success" : shown === "current" ? "brand" : shown === "pending" ? "warning" : "neutral";
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 rounded-12 bg-bg-page px-4 py-3.5">
                      <span className="type-small text-text-secondary">{shortTitle(r.title)}</span>
                      <span className={`shrink-0 type-small font-bold ${toneText[tone]}`}>{value}</span>
                    </li>
                  );
                })}
                {record.attendance !== null && (
                  <li className="flex items-center justify-between gap-3 rounded-12 bg-bg-page px-4 py-3.5">
                    <span className="type-small text-text-secondary">الحضور</span>
                    <span className={`shrink-0 type-small font-bold ${record.attendance < 75 ? "text-state-warning" : "text-state-success"}`}>
                      {`${n(record.attendance)}٪${record.attendance < 75 ? " · دون الحد" : ""}`}
                    </span>
                  </li>
                )}
              </ul>
              {record.attendance !== null && record.attendance < 75 && <p className="type-caption text-state-warning">حضوره دون ٧٥٪ – لن يجتاز حتى بدرجة عالية في الواجبات.</p>}
            </SideCard>
          </div>
        </div>
      </PageBody>
    </>
  );
}
