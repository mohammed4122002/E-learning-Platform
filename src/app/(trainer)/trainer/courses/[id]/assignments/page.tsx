import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssignmentsList, PendingReviewCard } from "@/components/trainer-courses/course/AssignmentsBoard";
import { requireTrainer } from "@/lib/auth";
import { getAssignmentsBoard } from "@/lib/data/trainer-course-page";
import { getCourseHeader, getTrainerContent } from "@/lib/data/trainer-courses";
import { toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "واجبات الدورة", description: "الواجبات وطريقة التقييم والتسليمات بانتظار التقييم" };

/** TRR-CRS-05 · صفحة الدورة · ٤ الواجبات (335:13353). */
export default async function CourseAssignmentsPage({ params }: PageProps<"/trainer/courses/[id]/assignments">) {
  const { id } = await params;
  await requireTrainer(`/trainer/courses/${id}/assignments`);
  const course = await getCourseHeader(id);
  if (!course) notFound();
  const [board, content] = await Promise.all([getAssignmentsBoard(id, course.sessions), getTrainerContent(id)]);
  const weight = board.items.reduce((s, a) => s + (a.weightPercent ?? 0), 0);

  // What the certificate rules (certificate_conditions) actually weigh: attendance share, assignments' weights, quizzes' pass mark.
  const method = [
    ...(course.mode !== "recorded" ? [{ label: "الحضور", value: "٨٠٪", tone: "text-state-success" }] : []),
    { label: board.items.length ? `الواجبات (${toArabicDigits(board.items.length)})` : "الواجبات", value: `${toArabicDigits(weight)}٪`, tone: "text-text-brand" },
    ...(board.quizzes.count && board.quizzes.passPercent !== null
      ? [{ label: `الاختبارات (${toArabicDigits(board.quizzes.count)})`, value: `${toArabicDigits(board.quizzes.passPercent)}٪`, tone: "text-state-info" }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <AssignmentsList
          courseId={id}
          items={board.items}
          trainees={course.buyers}
          modules={content.modules.map((m) => ({ id: m.id, title: m.title, position: m.position }))}
        />
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
        <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
          <h2 className="type-h2 text-text-primary">طريقة التقييم</h2>
          <p className="type-caption text-state-warning">موروثة من البرنامج — تُعدَّل من البرنامج لا من الدورة.</p>
          {method.map((m) => (
            <p key={m.label} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
              {/* 335:13353 — the weight leads the row, its label follows. */}
              <span className={`type-h3 ${m.tone}`}>{m.value}</span>
              <span className="min-w-0 flex-1 type-body-lg text-text-secondary">{m.label}</span>
            </p>
          ))}
        </section>
        <PendingReviewCard courseId={id} pending={board.pending} total={board.pendingTotal} />
      </aside>
    </div>
  );
}
