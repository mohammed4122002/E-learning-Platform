import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { EmptyState } from "@/components/ui/Feedback";
import { ButtonLink } from "@/components/ui/Button";
import { CourseOutlineCard } from "@/components/learning/CourseOutline";
import {
  AboutCourseCard,
  AccessEndedView,
  ContinueHero,
  CourseFilesCard,
  CourseProgressCard,
  NewContentBanner,
  NewLessonsCard,
} from "@/components/learning/CourseCards";
import { requireTrainee } from "@/lib/auth";
import { getCourseContent } from "@/lib/data/learning";

export async function generateMetadata(props: PageProps<"/trainee/learn/[enrollmentId]">): Promise<Metadata> {
  const { enrollmentId } = await props.params;
  const user = await requireTrainee();
  const content = await getCourseContent(user.id, enrollmentId);
  return { title: content ? `محتوى الدورة · ${content.course.title}` : "محتوى الدورة" };
}

/** TRN-MYE-04 · محتوى الدورة المسجَّلة — Figma 403:15211 (جارية) · 409:16093 (محتوى جديد) · 408:16019 (سُحب الوصول). */
export default async function CourseContentPage(props: PageProps<"/trainee/learn/[enrollmentId]">) {
  const { enrollmentId } = await props.params;
  const user = await requireTrainee(`/trainee/learn/${enrollmentId}`);
  const content = await getCourseContent(user.id, enrollmentId);
  if (!content) notFound();
  // Live and in-person courses are followed from the training file (sessions + attendance).
  if (content.course.mode !== "recorded" && !content.ended) redirect(`/trainee/trainings/${content.enrollment.id}`);

  const crumbs = [{ label: "ملف التدريب", href: "/trainee/trainings" }, { label: content.course.title }];
  const current = content.resume?.id ?? null;

  return (
    <>
      <TopBar title="محتوى الدورة" subtitle={content.course.title} />
      <PageBody className="gap-[26px]">
        <Breadcrumb items={crumbs} />
        {content.ended ? (
          <AccessEndedView content={content} />
        ) : content.pending ? (
          <EmptyState
            icon={Hourglass}
            title="لم يتأكد تسجيلك بعد"
            description={
              content.enrollment.status === "pending_payment"
                ? "أكمل الدفع لتفتح محتوى الدورة فورًا."
                : "الجهة المقدِّمة تراجع طلبك. سيصلك إشعار فور اعتماده ويُفتح المحتوى."
            }
            action={<ButtonLink href="/trainee/queue">اذهب إلى «بانتظار إجرائي»</ButtonLink>}
          />
        ) : content.lessons.length === 0 ? (
          <EmptyState icon={Hourglass} title="لم يُنشر محتوى هذه الدورة بعد" description="سيضيف المدرب الدروس قريبًا، وسيصلك إشعار فور نشرها." />
        ) : (
          <>
            {content.before ? <NewContentBanner content={content} /> : <ContinueHero content={content} />}
            <div className="flex w-full flex-col gap-[26px] lg:flex-row lg:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-[26px]">
                <NewLessonsCard content={content} />
                <CourseOutlineCard modules={content.modules} currentLessonId={current} lessonCount={content.progress.total} journeyHref={`/trainee/learn/${content.enrollment.id}/journey`} />
              </div>
              <aside aria-label="تقدّمك وملفات الدورة" className="flex w-full flex-col gap-[22px] lg:w-[380px] lg:shrink-0">
                <CourseProgressCard content={content} continueHref={content.resume?.href ?? null} />
                <CourseFilesCard content={content} />
                <AboutCourseCard content={content} />
              </aside>
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}
