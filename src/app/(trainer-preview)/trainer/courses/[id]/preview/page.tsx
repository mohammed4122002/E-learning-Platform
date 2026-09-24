import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseSalePage } from "@/components/course-page/CourseSalePage";
import { requireTrainer } from "@/lib/auth";
import { getCoursePage } from "@/lib/data/course-page";
import { getCourseHeader } from "@/lib/data/trainer-courses";
import { courseEditHref, courseHomeHref } from "@/lib/trainer-courses";

export const metadata: Metadata = { title: "معاينة الدورة", description: "صفحة بيع الدورة كما يراها المتدرب قبل الشراء", robots: { index: false } };

/**
 * TRR-CRS-06 · صفحة بيع الدورة · معاينة المدرب (398:18013). Outside the workspace shell on purpose: it is the
 * public sale page itself (drafts included for the course staff), with the preview bar and buying disabled.
 */
export default async function CoursePreviewPage({ params }: PageProps<"/trainer/courses/[id]/preview">) {
  const { id } = await params;
  await requireTrainer(`/trainer/courses/${id}/preview`);
  const header = await getCourseHeader(id);
  if (!header) notFound();
  const course = await getCoursePage(header.slug, true);
  if (!course) notFound();
  return <CourseSalePage course={course} preview={{ exitHref: courseHomeHref(header), editHref: courseEditHref(header) }} />;
}
