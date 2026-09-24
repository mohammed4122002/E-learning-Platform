import { CourseTabsFrame } from "@/components/trainer-ops/CourseTabsFrame";
import { courseLabel, getManagedCourse, runLabel } from "@/lib/data/trainer-course";

/** STAND-IN course layout (title + tab links) — replaced by the course-page layout on merge. */
export default async function TrainerCourseLayout({ children, params }: LayoutProps<"/trainer/courses/[id]">) {
  const { id } = await params;
  const course = await getManagedCourse(id);
  return (
    <CourseTabsFrame courseId={course.id} title={courseLabel(course)} runLabel={runLabel(course)}>
      {children}
    </CourseTabsFrame>
  );
}
