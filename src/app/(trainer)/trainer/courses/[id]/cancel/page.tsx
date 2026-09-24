import type { Metadata } from "next";
import { CircleX } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Breadcrumb } from "@/components/ui/Navigation";
import { CourseChangeForm } from "@/components/trainer-ops/CourseChangeForm";
import { requireTrainer } from "@/lib/auth";
import { getManagedCourse, runLabel } from "@/lib/data/trainer-course";
import { getOpsImpact } from "@/lib/data/trainer-roster";

export async function generateMetadata(props: PageProps<"/trainer/courses/[id]/cancel">): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `إلغاء الدورة · ${course.title}` };
}

/** TRR-CRS-04 · إلغاء دورة (277:5650). */
export default async function CancelPage(props: PageProps<"/trainer/courses/[id]/cancel">) {
  const { id } = await props.params;
  await requireTrainer(`/trainer/courses/${id}/cancel`);
  const course = await getManagedCourse(id);
  const impact = await getOpsImpact(course);
  const base = `/trainer/courses/${course.id}`;
  const blocked = course.status === "cancelled" || course.status === "completed";
  return (
    <>
      <TopBar title="إلغاء الدورة" subtitle={`${course.programTitle} · ${runLabel(course)}`} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel(course), href: `${base}/trainees` }, { label: "إلغاء" }]} />
        {blocked ? (
          <EmptyState
            icon={CircleX}
            title={course.status === "cancelled" ? "أُلغيت هذه الدورة مسبقًا" : "انتهت هذه الدورة"}
            description={course.status === "cancelled" ? "أُبلغ المسجّلون بالإلغاء واستُردت مبالغهم." : "لا يمكن إلغاء دورة مكتملة."}
            action={<ButtonLink href={`${base}/trainees`}>العودة إلى الدورة</ButtonLink>}
          />
        ) : (
          <CourseChangeForm mode="cancel" courseId={course.id} impact={impact} backHref={`${base}/trainees`} postponeHref={`${base}/postpone`} seatsHref={`${base}/seats`} />
        )}
      </PageBody>
    </>
  );
}
