import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseSalePage } from "@/components/course-page/CourseSalePage";
import { MODES } from "@/components/course/CourseCover";
import { getCoursePage } from "@/lib/data/course-page";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(props: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const course = await getCoursePage(slug);
  if (!course) return { title: "الدورة غير موجودة" };
  const description = course.summary ?? `دورة ${MODES[course.mode].label} في ${course.category ?? "بوابة التدريب"}`;
  return {
    title: course.title,
    description,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: {
      title: course.title,
      description,
      type: "website",
      url: `/courses/${course.slug}`,
      images: course.cover ? [{ url: course.cover }] : undefined,
    },
  };
}

/** TRN-CRS-06 · صفحة بيع الدورة · كما يراها المتدرب (398:18441), free variant 4159:2. */
export default async function CoursePage(props: PageProps<"/courses/[slug]">) {
  const { slug } = await props.params;
  const course = await getCoursePage(slug);
  if (!course) notFound();
  // «مشاهدة الصفحة» (TRR-CRS-07/TRR-CRS-02 ٥): counted for visitors, never for the course staff.
  const supabase = await createClient();
  await supabase.rpc("record_course_view", { p_course: course.id });
  return <CourseSalePage course={course} />;
}
