import type { Metadata } from "next";
import { MonitorPlay } from "lucide-react";
import { EmptyState } from "@/components/ui/Feedback";
import { DismissibleAlert } from "@/components/trainings/DismissibleAlert";
import { AverageCard, PendingSessionCard, RulesCard, SessionLogCard, hoursLeft, hoursWord } from "@/components/trainer-ops/Attendance";
import { requireTrainer } from "@/lib/auth";
import { getManagedCourse } from "@/lib/data/trainer-course";
import { getAttendanceOverview } from "@/lib/data/trainer-attendance";
import { formatRelative, toArabicDigits } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/trainer/courses/[id]/attendance">): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `الحضور · ${course.title}` };
}

/** TRR-CRS-05 · ٦ الحضور (436:20264). */
export default async function AttendanceTab(props: PageProps<"/trainer/courses/[id]/attendance">) {
  const { id } = await props.params;
  await requireTrainer(`/trainer/courses/${id}/attendance`);
  const course = await getManagedCourse(id);
  if (course.mode === "recorded") {
    return (
      <EmptyState
        icon={MonitorPlay}
        title="لا رصد حضور في الكورس المسجَّل"
        description="المشتري يتعلّم بإيقاعه بلا جلسات مباشرة — تابع تقدّمه من تبويب المتدربين."
      />
    );
  }
  const o = await getAttendanceOverview(course);
  const pending = o.pending;
  const base = `/trainer/courses/${course.id}/attendance`;
  return (
    <div className="flex flex-col gap-[26px]">
      {pending && (
        <DismissibleAlert tone="error" title={pending.ended ? "جلسة بانتظار رصد الحضور" : "جلسة اليوم بانتظار رصد الحضور"}>
          {pending.ended
            ? `الجلسة ${toArabicDigits(pending.position)} انتهت ${formatRelative(pending.endsAt)}. يُقفل الرصد بعد ٤٨ ساعة من انتهاء الجلسة — يتبقى ${hoursWord(hoursLeft(pending.lockAt))}.`
            : `الجلسة ${toArabicDigits(pending.position)} جارية الآن. يُقفل الرصد بعد ٤٨ ساعة من انتهاء الجلسة.`}
        </DismissibleAlert>
      )}
      <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[26px]">
          {pending && <PendingSessionCard s={pending} href={`${base}/${pending.id}`} />}
          <SessionLogCard o={o} courseId={course.id} />
        </div>
        <div className="flex w-full shrink-0 flex-col gap-[22px] lg:w-[380px]">
          <AverageCard o={o} />
          <RulesCard />
        </div>
      </div>
    </div>
  );
}
