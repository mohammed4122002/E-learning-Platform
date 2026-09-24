import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SeatsManager } from "@/components/trainer-ops/SeatsManager";
import { requireTrainer } from "@/lib/auth";
import { getManagedCourse, runLabel } from "@/lib/data/trainer-course";
import { getSeatsView } from "@/lib/data/trainer-roster";

export async function generateMetadata(props: PageProps<"/trainer/courses/[id]/seats">): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `المقاعد وقائمة الانتظار · ${course.title}` };
}

/** TRR-CRS-03 · المقاعد وقائمة الانتظار (462:31676 … 462:33978). */
export default async function SeatsPage(props: PageProps<"/trainer/courses/[id]/seats">) {
  const { id } = await props.params;
  await requireTrainer(`/trainer/courses/${id}/seats`);
  const course = await getManagedCourse(id);
  // Recorded courses have no seats (always available for purchase).
  if (course.mode === "recorded") redirect(`/trainer/courses/${course.id}/trainees`);
  const view = await getSeatsView(course);
  const editable = course.status !== "cancelled" && course.status !== "completed";
  return <SeatsManager view={view} courseId={course.id} runLabel={runLabel(course)} editable={editable} />;
}
