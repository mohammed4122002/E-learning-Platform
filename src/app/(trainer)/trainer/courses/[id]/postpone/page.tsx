import type { Metadata } from "next";
import { CalendarX } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Breadcrumb } from "@/components/ui/Navigation";
import { CourseChangeForm } from "@/components/trainer-ops/CourseChangeForm";
import { requireTrainer } from "@/lib/auth";
import { getManagedCourse, runLabel } from "@/lib/data/trainer-course";
import { getOpsImpact } from "@/lib/data/trainer-roster";

export async function generateMetadata(props: PageProps<"/trainer/courses/[id]/postpone">): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `تأجيل الدورة · ${course.title}` };
}

/** TRR-CRS-04 · تأجيل دورة (277:5339). */
export default async function PostponePage(props: PageProps<"/trainer/courses/[id]/postpone">) {
  const { id } = await props.params;
  await requireTrainer(`/trainer/courses/${id}/postpone`);
  const course = await getManagedCourse(id);
  const impact = await getOpsImpact(course);
  const base = `/trainer/courses/${course.id}`;
  const started = impact.firstStart ? new Date(impact.firstStart).getTime() <= new Date().getTime() : false;
  const blocked = course.mode === "recorded" || !["draft", "open"].includes(course.status) || started;
  return (
    <>
      <TopBar title="تأجيل الدورة" subtitle={`${course.programTitle} · ${runLabel(course)}`} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel(course), href: `${base}/trainees` }, { label: "تأجيل" }]} />
        {blocked ? (
          <EmptyState
            icon={CalendarX}
            title="لا يمكن تأجيل هذه الدورة"
            description={
              course.status === "cancelled"
                ? "أُلغيت الدورة نهائيًا."
                : course.mode === "recorded"
                  ? "الكورس المسجَّل متاح دائمًا بلا مواعيد."
                  : "بدأت الدورة بالفعل — التأجيل متاح قبل أول جلسة فقط."
            }
            action={<ButtonLink href={`${base}/trainees`}>العودة إلى الدورة</ButtonLink>}
          />
        ) : (
          <CourseChangeForm mode="postpone" courseId={course.id} impact={impact} backHref={`${base}/trainees`} postponeHref={`${base}/postpone`} seatsHref={`${base}/seats`} />
        )}
      </PageBody>
    </>
  );
}
