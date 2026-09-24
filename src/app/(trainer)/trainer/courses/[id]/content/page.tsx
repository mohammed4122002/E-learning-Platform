import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { ContentEditor } from "@/components/trainer-courses/content/ContentEditor";
import { ContentProgressCard, PublishConditionsCard } from "@/components/trainer-courses/content/ContentReadiness";
import { EditSessionsCard, SessionsBoard, type BoardSession } from "@/components/trainer-courses/course/SessionsBoard";
import { Glyph } from "@/components/ui/Icon";
import { requireTrainer } from "@/lib/auth";
import { sessionProgress, sessionState } from "@/lib/data/trainer-course-page";
import { getCourseHeader, getTrainerContent } from "@/lib/data/trainer-courses";
import { formatDayMonth, pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "المحاور والمحتوى", description: "محاور الدورة وجلساتها ودروسها" };

/**
 * TRR-CRS-05 · ٢ المحاور والمحتوى (334:12859): scheduled courses map the program's modules to sessions; the
 * lesson/quiz authoring (the recorded content editor, 395:16270) sits under it. Recorded courses get the editor
 * with the readiness cards; lessons added after publishing stay drafts until «انشر المحتوى الجديد» (BR-L10).
 */
export default async function CourseContentPage({ params }: PageProps<"/trainer/courses/[id]/content">) {
  const { id } = await params;
  await requireTrainer(`/trainer/courses/${id}/content`);
  const course = await getCourseHeader(id);
  if (!course) notFound();
  const content = await getTrainerContent(id);
  const published = course.status !== "draft";
  const modules = content.modules.map((m) => ({ id: m.id, title: m.title, position: m.position }));

  if (course.mode === "recorded") {
    return (
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <ContentEditor courseId={id} modules={content.modules} published={published} totals={content.totals} />
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
          <ContentProgressCard content={content} />
          <PublishConditionsCard content={content} />
        </aside>
      </div>
    );
  }

  const now = new Date();
  const ordered = course.sessions.filter((s) => s.status !== "cancelled").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const board: BoardSession[] = course.sessions
    .slice()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((s) => ({
      id: s.id,
      number: ordered.includes(s) ? ordered.indexOf(s) + 1 : s.position,
      title: s.title,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      location: s.location,
      moduleId: s.moduleId,
      state: sessionState(s, now),
    }));
  const p = sessionProgress(course.sessions, now);
  const remaining = p.total - p.ended;
  const pct = p.total ? (p.ended / p.total) * 100 : 0;
  const next = board.find((s) => s.state === "upcoming") ?? null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <p className="flex items-start gap-3 rounded-16 bg-state-warning-bg px-[18px] pt-4 pb-[18px] type-body-lg text-state-warning">
          <Glyph icon={Info} size={20} className="mt-1" />
          <span className="flex-1">
            المحاور موروثة من البرنامج ولا تُعدَّل هنا. ما تعدّله في الدورة هو ربط كل محور بجلسة وتاريخ — والمحتوى نفسه يبقى موحّدًا في كل دوراتك من هذا البرنامج.
          </span>
        </p>
        <SessionsBoard courseId={id} modules={modules} sessions={board} inPerson={course.mode === "in_person"} />
        <ContentEditor courseId={id} modules={content.modules} published={published} totals={content.totals} allowModuleEdits={false} />
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
        <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
          <h2 className="type-h2 text-text-primary">تقدّم الدورة</h2>
          <ProgressRing percent={pct} label="نسبة الجلسات المنتهية" size={88} className="m-[11px]" />
          <p className="type-body-lg text-text-secondary">
            {p.total === 0
              ? "لا جلسات مجدولة بعد."
              : remaining === 0
                ? `${pluralAr(p.ended, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])} من ${toArabicDigits(p.total)} · انتهت كل الجلسات.`
                : `${pluralAr(p.ended, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])} من ${toArabicDigits(p.total)} · تبقّت ${pluralAr(remaining, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])} تنتهي ${formatDayMonth(p.last!.endsAt)}.`}
          </p>
        </section>
        <EditSessionsCard courseId={id} next={next} trainees={course.buyers} modules={modules} inPerson={course.mode === "in_person"} />
      </aside>
    </div>
  );
}
