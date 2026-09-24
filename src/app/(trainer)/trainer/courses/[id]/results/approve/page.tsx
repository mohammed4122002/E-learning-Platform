import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Award, CalendarDays, CircleCheck, ClipboardCheck, Users } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Navigation";
import { DismissibleAlert } from "@/components/trainings/DismissibleAlert";
import { ConditionRow, OpsCard, RuleItem } from "@/components/trainer-ops/parts";
import { weightsLabel } from "@/components/trainer-ops/Results";
import { hoursLeft, hoursWord } from "@/components/trainer-ops/Attendance";
import { LOCK_HOURS } from "@/lib/data/trainer-attendance";
import { requireTrainer } from "@/lib/auth";
import { getManagedCourse, runLabel } from "@/lib/data/trainer-course";
import { getResults } from "@/lib/data/trainer-results";
import { formatRelative, toArabicDigits } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/trainer/courses/[id]/results/approve">): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `اعتماد النتائج · ${course.title}` };
}

const n = toArabicDigits;

/** «اعتماد النتائج · شرطان ناقصان» (463:34304): what still withholds the results. */
export default async function ApproveResultsPage(props: PageProps<"/trainer/courses/[id]/results/approve">) {
  const { id } = await props.params;
  await requireTrainer(`/trainer/courses/${id}/results/approve`);
  const course = await getManagedCourse(id);
  const v = await getResults(course);
  const base = `/trainer/courses/${course.id}`;
  // Figma 463:34304 order: ungraded work → unrecorded sessions → sessions still running.
  const order = { submissions_ungraded: 0, attendance_unrecorded: 1, sessions_pending: 2, results_missing: 3 } as const;
  const blocking = v.blockers.filter((b) => b.key !== "results_missing").sort((a, b) => order[a.key] - order[b.key]);
  const attended = v.rows.map((r) => r.attendance).filter((a): a is number => a !== null);
  const avgAttendance = attended.length ? Math.round(attended.reduce((a, x) => a + x, 0) / attended.length) : null;
  if (v.approval || blocking.length === 0) redirect(`${base}/results/record`);
  const countLabel = blocking.length === 1 ? "شرط ناقص" : blocking.length === 2 ? "شرطان ناقصان" : `${n(blocking.length)} شروط ناقصة`;
  const passed = v.rows.filter((r) => r.outcome === "passed").length;

  return (
    <>
      <TopBar title="اعتماد النتائج" subtitle={countLabel} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel(course), href: `${base}/results` }, { label: "النتائج" }]} />
        <DismissibleAlert tone="error" title="لا يمكن اعتماد النتائج الآن">
          {blocking
            .map((b) =>
              b.key === "sessions_pending"
                ? b.count === 1 ? "جلسة واحدة لم تنتهِ" : b.count === 2 ? "جلستان لم تنتهيا" : `${n(b.count)} جلسات لم تنتهِ`
                : b.key === "attendance_unrecorded"
                  ? b.count === 1 ? "جلسة واحدة بلا رصد" : b.count === 2 ? "جلستان بلا رصد" : `${n(b.count)} جلسات بلا رصد`
                  : b.count === 1 ? "واجب مسلَّم بلا تقييم" : b.count === 2 ? "واجبان مسلّمان بلا تقييم" : `${n(b.count)} واجبات مسلّمة بلا تقييم`,
            )
            .join(" و")}
          {". الاعتماد نهائي ولا يُعدَّل — لذلك يشترط اكتمال البيانات."}
        </DismissibleAlert>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <OpsCard title="ما يمنع الاعتماد" titleId="block-title" titleSize="h2" titleClass="text-state-error" className="border-2! border-state-error!">
              <ul className="flex flex-col gap-4">
                {blocking.map((b) =>
                  b.key === "sessions_pending" ? (
                    <ConditionRow key={b.key} tone="error" icon={CalendarDays} title="جلسات لم تنتهِ" caption={b.lastEndsAt ? `تنتهي آخر جلسة ${formatRelative(b.lastEndsAt)}` : undefined} action={<ButtonLink href={`${base}/attendance`} size="s" className="min-w-[120px]">اعرض الجدول</ButtonLink>} />
                  ) : b.key === "attendance_unrecorded" ? (
                    <ConditionRow
                      key={b.key}
                      tone="error"
                      icon={ClipboardCheck}
                      title={`الجلسة ${n(b.sessions[0]?.position ?? 0)} بلا رصد`}
                      caption={
                        b.sessions[0]
                          ? (() => {
                              const lockAt = new Date(new Date(b.sessions[0].ends_at).getTime() + LOCK_HOURS * 3_600_000).toISOString();
                              const h = hoursLeft(lockAt);
                              return `انتهت ${formatRelative(b.sessions[0].ends_at)}${h > 0 ? ` · يتبقى ${hoursWord(h)} على الإقفال` : " · أُقفل الرصد"}`;
                            })()
                          : undefined
                      }
                      action={<ButtonLink href={`${base}/attendance/${b.sessions[0]?.id}`} size="s" className="min-w-[120px]">ارصد الحضور</ButtonLink>}
                    />
                  ) : b.key === "submissions_ungraded" ? (
                    <ConditionRow
                      key={b.key}
                      tone="error"
                      icon={ClipboardCheck}
                      title={b.count === 1 ? "واجب بلا تقييم" : b.count === 2 ? "واجبان بلا تقييم" : `${n(b.count)} واجبات بلا تقييم`}
                      caption={b.items.map((i) => v.names.get(i.trainee_id) ?? "متدرب").join(" و")}
                      action={<ButtonLink href={`${base}/assignments/${b.items[0]?.assignment_id}/submissions`} size="s" className="min-w-[120px]">قيّم الآن</ButtonLink>}
                    />
                  ) : null,
                )}
              </ul>
            </OpsCard>
            <OpsCard title="ما اكتمل" titleId="done-title" titleSize="h2">
              <ul className="flex flex-col gap-4">
                {v.sessions.recorded > 0 && (
                  <ConditionRow
                    tone="success"
                    titleTone
                    icon={CircleCheck}
                    title={`${n(v.sessions.recorded)} ${v.sessions.recorded === 1 ? "جلسة مرصودة" : "جلسات مرصودة"} من ${n(v.sessions.total)}`}
                    caption={avgAttendance !== null ? `متوسط الحضور ${n(avgAttendance)}٪` : undefined}
                  />
                )}
                {v.assignments.graded > 0 && (
                  <ConditionRow tone="success" titleTone icon={CircleCheck} title={`${n(v.assignments.graded)} واجبًا مقيَّمًا من ${n(v.assignments.submissions)}`} caption={`يتبقى ${n(v.assignments.submissions - v.assignments.graded)}`} />
                )}
                <ConditionRow tone="success" titleTone icon={CircleCheck} title="معادلة الدرجة جاهزة" caption={weightsLabel(v)} />
              </ul>
            </OpsCard>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
            <OpsCard title="الاعتماد" titleId="appr-title">
              <p className="type-body text-state-error">نهائي – بعده تصدر الشهادات ولا تُعدَّل النتائج.</p>
              <ButtonLink href={`${base}/results/record`} size="l" fullWidth disabled>
                اعتمد النتائج
              </ButtonLink>
              <p className="type-caption text-state-warning">يُفعَّل بعد إغلاق {blocking.length === 2 ? "الشرطين" : "الشروط"} أعلاه.</p>
              <ButtonLink href={`${base}/results/export`} variant="outline" size="l" fullWidth prefetch={false}>
                صدّر النتائج المبدئية
              </ButtonLink>
            </OpsCard>
            <OpsCard title="أثر التأخير" titleId="delay-title">
              <ul className="flex flex-col gap-4">
                <RuleItem icon={Award} tone="warning">{`${n(passed)} شهادة بانتظار الاعتماد`}</RuleItem>
                <RuleItem icon={Users} tone="brand">المتدربون يرون «النتائج قيد الإعداد»</RuleItem>
              </ul>
            </OpsCard>
          </div>
        </div>
      </PageBody>
    </>
  );
}
