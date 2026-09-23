import type { Course } from "@/types/dashboard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CourseCard } from "./CourseCard";

type CourseSectionProps = {
  id: string;
  title: string;
  subtitle: string;
  link: string;
  courses: Course[];
};

export function CourseSection({ id, title, subtitle, link, courses }: CourseSectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-[18px]">
      <SectionHeader id={id} title={title} subtitle={subtitle} linkLabel={link} />
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </section>
  );
}
