import { notFound } from "next/navigation";
import { CourseChrome } from "@/components/trainer-courses/course/CourseChrome";
import { CourseHero } from "@/components/trainer-courses/course/CourseHero";
import { LiveOverviewIntro } from "@/components/trainer-courses/course/LiveOverviewIntro";
import { heroState, sessionProgress } from "@/lib/data/trainer-course-page";
import { getCourseHeader } from "@/lib/data/trainer-courses";
import { courseEditHref } from "@/lib/trainer-courses";

/**
 * TRR-CRS-05 صفحة الدورة — one layout for the course's routes. The nine tabs (نظرة عامة · المحاور والمحتوى ·
 * الملفات · الواجبات · المتدربون · الحضور · النتائج · الشهادات · التقييمات) share the top bar, hero and tab bar;
 * every other route under the course (setup, dashboard, sales, publish, grading…) renders its own chrome.
 * RLS + getCourseHeader() hide courses the signed-in trainer does not manage (→ 404).
 */
export default async function CourseLayout({ children, params }: LayoutProps<"/trainer/courses/[id]">) {
  const { id } = await params;
  const course = await getCourseHeader(id);
  if (!course) notFound();
  const progress = sessionProgress(course.sessions);
  return (
    <CourseChrome
      courseId={id}
      courseTitle={course.title}
      intro={course.mode === "live_remote" && course.status !== "draft" ? <LiveOverviewIntro course={course} /> : null}
      hero={
        <CourseHero
          course={course}
          state={heroState(course)}
          session={course.mode === "recorded" ? null : { index: progress.index, total: progress.total }}
          editHref={courseEditHref(course)}
        />
      }
    >
      {children}
    </CourseChrome>
  );
}
