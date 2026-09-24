import type { Metadata } from "next";
import { CircleCheck, CircleX, ClipboardCheck, ClipboardList, Hourglass, TrendingUp, TriangleAlert } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { ChipLink } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { SubmissionRow } from "@/components/trainer-ops/Grading";
import { AccentBar, OpsCard, SideCard, StatCard } from "@/components/trainer-ops/parts";
import { requireTrainer } from "@/lib/auth";
import { getManagedCourse, runLabel } from "@/lib/data/trainer-course";
import { getGradingList, type GradeState } from "@/lib/data/trainer-grading";
import { formatDayMonth, pluralAr, toArabicDigits } from "@/lib/format";

type Props = PageProps<"/trainer/courses/[id]/assignments/[assignmentId]/submissions">;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id, assignmentId } = await props.params;
  const course = await getManagedCourse(id);
  const list = await getGradingList(course, assignmentId);
  return { title: `تقييم الواجبات · ${list.assignment.title}` };
}

const n = toArabicDigits;
const FILTERS = ["missing", "flagged", "graded", "all", "pending"] as const;
type Filter = (typeof FILTERS)[number];

/** TRR-CRS-11 · تقييم الواجبات — قائمة التسليمات (444:22796). */
export default async function SubmissionsPage(props: Props) {
  const { id, assignmentId } = await props.params;
  const sp = await props.searchParams;
  await requireTrainer(`/trainer/courses/${id}/assignments/${assignmentId}/submissions`);
  const course = await getManagedCourse(id);
  const v = await getGradingList(course, assignmentId);
  const a = v.assignment;
  const c = v.counts;
  const base = `/trainer/courses/${course.id}/assignments/${a.id}/submissions`;
  const filter: Filter = FILTERS.includes(sp.filter as Filter) ? (sp.filter as Filter) : "all";
  const rows = filter === "all" ? v.rows : v.rows.filter((r) => r.state === (filter as GradeState));
  const firstOpen = v.rows.find((r) => r.state === "pending") ?? v.rows.find((r) => r.state === "flagged");
  const firstHref = firstOpen?.submissionId ? `${base}/${firstOpen.submissionId}` : null;
  const open = c.pending + c.flagged;
  const pct = c.submitted ? Math.round((c.graded / c.submitted) * 100) : 0;
  const missingNames = v.rows.filter((r) => r.state === "missing").map((r) => r.name.split(" ")[0]);
  const due = a.dueAt ? (new Date(a.dueAt).getTime() < new Date().getTime() ? `موعد التسليم انتهى ${formatDayMonth(a.dueAt)}` : `موعد التسليم ${formatDayMonth(a.dueAt)}`) : null;
  const subtitle = [
    `${pluralAr(c.submitted, ["تسليم واحد", "تسليمان", "تسليمات", "تسليمًا"])} من ${n(c.enrolled)}`,
    due,
    a.weightPercent ? `وزن الواجب ${n(a.weightPercent)}٪ من الدرجة` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const label: Record<Filter, string> = {
    missing: `لم يُسلَّم · ${n(c.missing)}`,
    flagged: `تحتاج مراجعة · ${n(c.flagged)}`,
    graded: `مقيّمة · ${n(c.graded)}`,
    all: `الكل · ${n(c.enrolled)}`,
    pending: `بانتظار التقييم · ${n(c.pending)}`,
  };

  return (
    <>
      <TopBar title="تقييم الواجبات" subtitle={`واجب ${n(a.position)} · ${a.title.split(" · ").slice(-1)[0]}`} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel(course), href: `/trainer/courses/${course.id}` }, { label: "الواجبات" }]} />
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{a.title}</h1>
            <p className="type-body text-text-secondary">{subtitle}</p>
          </div>
          {firstHref && !v.resultsApproved && (
            <ButtonLink href={firstHref} size="l" className="w-full sm:w-auto sm:min-w-[198px]">
              ابدأ التقييم من الأول
            </ButtonLink>
          )}
        </header>

        {c.enrolled === 0 ? (
          <EmptyState icon={ClipboardList} title="لا متدربين في الدورة بعد" description="تظهر التسليمات هنا عندما يسجّل المتدربون ويرفعون واجباتهم." />
        ) : (
          <>
            <ul aria-label="ملخص التسليمات" className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-5">
              <StatCard icon={CircleX} iconTone="neutral" label={c.missing === 1 ? "لم يسلّم" : "لم يسلّموا"} value={n(c.missing)} caption={missingNames.length ? missingNames.slice(0, 3).join(" و") : "الجميع سلّم"} captionTone="muted" />
              <StatCard icon={TriangleAlert} iconTone="warning" label="تحتاج مراجعة" value={n(c.flagged)} caption="علّمتها للعودة" captionTone="warning" />
              <StatCard icon={CircleCheck} iconTone="success" label="مقيَّمة" value={n(c.graded)} caption="مكتملة" captionTone="success" />
              <StatCard icon={Hourglass} iconTone="error" label="لم يبدأ تقييمها" value={n(c.pending)} caption="بانتظارك" captionTone="error" />
              <StatCard icon={ClipboardCheck} label="تسليمًا" value={n(c.submitted)} caption={`من ${pluralAr(c.enrolled, ["متدرب واحد", "متدربَين", "متدربين", "متدربًا"])}`} />
            </ul>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-5">
                {c.submitted > 0 && (
                  <section aria-label="تقدّم التقييم" className="flex flex-col gap-4 rounded-22 border-2 border-action-primary bg-bg-brand-tint px-5 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-16 bg-bg-surface text-text-brand">
                      <Glyph icon={TrendingUp} size={24} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="type-h4 font-bold! text-text-primary">{`${n(c.graded)} من ${n(c.submitted)} مقيَّمة · ${n(pct)}٪`}</span>
                      <AccentBar percent={pct} label="نسبة التسليمات المقيَّمة" start={open ? `تبقّى ${pluralAr(open, ["تسليم واحد", "تسليمان", "تسليمات", "تسليمًا"])}` : "اكتمل التقييم"} end={`${n(pct)}٪`} />
                    </div>
                    {firstHref && !v.resultsApproved && (
                      <ButtonLink href={firstHref} size="m" className="w-full sm:w-auto sm:min-w-[114px]">
                        أكمل التقييم
                      </ButtonLink>
                    )}
                  </section>
                )}

                <nav aria-label="تصفية التسليمات" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap">
                  {FILTERS.map((f) => (
                    <ChipLink key={f} href={f === "all" ? base : `${base}?filter=${f}`} selected={filter === f}>
                      {label[f]}
                    </ChipLink>
                  ))}
                </nav>

                <OpsCard title="التسليمات" titleId="subs-title" titleSize="h2" className="gap-6!">
                  {rows.length === 0 ? (
                    <p className="rounded-16 bg-bg-page px-5 py-6 text-center type-body text-text-muted">لا تسليمات في هذا التصنيف.</p>
                  ) : (
                    <ul className="flex flex-col gap-4">
                      {rows.map((r) => (
                        <SubmissionRow key={r.traineeId} r={r} base={base} max={a.maxScore} assignmentId={a.id} courseId={course.id} locked={v.resultsApproved} />
                      ))}
                    </ul>
                  )}
                </OpsCard>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[360px]">
                {v.resultsApproved ? (
                  <OpsCard tone="success" title="اعتُمدت النتائج" titleId="lock-title" description="اعتُمدت نتائج الدورة نهائيًا — لا يمكن تعديل درجات الواجبات بعدها." />
                ) : (
                  open > 0 && (
                    <OpsCard tone="error" title="النتائج معلّقة" titleId="lock-title">
                      <p className="type-body text-text-secondary">
                        {`لا يمكن اعتماد نتائج الدورة قبل تقييم كل التسليمات. تبقّى ${n(open)}`}
                        {c.pending && c.flagged
                          ? ` – ${pluralAr(c.pending, ["تسليم بلا تقييم", "تسليمان بلا تقييم", "تسليمات بلا تقييم", "تسليمًا بلا تقييم"])} و${c.flagged === 1 ? "واحد يحتاج" : `${n(c.flagged)} تحتاج`} مراجعتك.`
                          : c.flagged
                            ? " – كلها تحتاج مراجعتك."
                            : "."}
                      </p>
                      {firstHref && (
                        <ButtonLink href={firstHref} size="l" fullWidth>
                          قيّم المتبقي
                        </ButtonLink>
                      )}
                    </OpsCard>
                  )
                )}
                {a.rubric.length > 0 && (
                  <SideCard title="معيار التقييم" titleId="rubric-title">
                    <ul className="flex flex-col gap-3">
                      {a.rubric.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-3 rounded-12 bg-bg-page px-3.5 py-3.5">
                          <span className="type-body text-text-primary">{r.label}</span>
                          <span className="shrink-0 type-small text-text-brand">{pluralAr(r.max, ["درجة واحدة", "درجتان", "درجات", "درجة"])}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="type-caption text-text-muted">المعيار من البرنامج – يظهر لك وللمتدرب معًا.</p>
                  </SideCard>
                )}
              </div>
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}
