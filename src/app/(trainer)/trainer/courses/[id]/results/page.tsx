import type { Metadata } from "next";
import { DismissibleAlert } from "@/components/trainings/DismissibleAlert";
import { ApprovalCard, ConditionsCard, DistributionCard, PreliminaryCard } from "@/components/trainer-ops/Results";
import { requireTrainer } from "@/lib/auth";
import { getManagedCourse } from "@/lib/data/trainer-course";
import { getResults } from "@/lib/data/trainer-results";
import { toArabicDigits } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/trainer/courses/[id]/results">): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `النتائج · ${course.title}` };
}

/** TRR-CRS-05 · ٧ النتائج (438:20310). */
export default async function ResultsTab(props: PageProps<"/trainer/courses/[id]/results">) {
  const { id } = await props.params;
  await requireTrainer(`/trainer/courses/${id}/results`);
  const course = await getManagedCourse(id);
  const v = await getResults(course);
  const blocking = v.blockers.filter((b) => b.key !== "results_missing");
  const parts = blocking.map((b) =>
    b.key === "sessions_pending"
      ? `${toArabicDigits(b.count)} ${b.count === 1 ? "جلسة لم تنتهِ" : "جلسات لم تنتهِ"} بعد`
      : b.key === "attendance_unrecorded"
        ? `${toArabicDigits(b.count)} ${b.count === 1 ? "جلسة بلا رصد" : "جلسات بلا رصد"}`
        : `${toArabicDigits(b.count)} ${b.count === 1 ? "تسليم بلا تقييم" : "تسليمات بلا تقييم"}`,
  );
  return (
    <div className="flex flex-col gap-6">
      {v.approval ? (
        <DismissibleAlert tone="success" title="اعتُمدت نتائج الدورة">
          {`${toArabicDigits(v.approval.passed)} ناجحًا · ${toArabicDigits(v.approval.failed)} لم يجتز. يمكنك الآن إصدار الشهادات.`}
        </DismissibleAlert>
      ) : (
        blocking.length > 0 && (
          <DismissibleAlert tone="warning" title="لا يمكن اعتماد النتائج بعد">
            {`يتبقّى ${blocking.length === 1 ? "شرط" : blocking.length === 2 ? "شرطان" : `${toArabicDigits(blocking.length)} شروط`}: ${parts.join(" · ")}. النتائج تُعتمد مرة واحدة ولا تُعدَّل بعدها.`}
          </DismissibleAlert>
        )
      )}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {!v.approval && <ConditionsCard v={v} courseId={course.id} />}
          <PreliminaryCard v={v} />
        </div>
        <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
          <DistributionCard rows={v.rows} />
          <ApprovalCard v={v} courseId={course.id} />
        </div>
      </div>
    </div>
  );
}
