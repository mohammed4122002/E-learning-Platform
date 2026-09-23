import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CircleCheck, CircleDot, Clock, FileText, Hourglass, Layers, ListChecks, Lock, Play, Route } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { AccentProgress } from "@/components/course/CourseCard";
import { Panel } from "@/components/learning/CourseCards";
import { lessonMeta, ofLessons } from "@/components/learning/CourseOutline";
import { requireTrainee } from "@/lib/auth";
import { getCourseContent, type LessonView } from "@/lib/data/learning";
import { formatClock, formatDuration, formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import { lessonLabel, moduleLabel } from "@/lib/learning";

export const metadata: Metadata = { title: "رحلة المحور" };

function LessonItem({ lesson, current }: { lesson: LessonView; current: boolean }) {
  const done = lesson.status === "done";
  return (
    <li>
      <Link
        href={current ? "#current-lesson" : lesson.href}
        aria-current={current ? "step" : undefined}
        className={`flex items-center gap-3 rounded-12 px-3.5 py-3 focus-ring ${
          current ? "border-[1.5px] border-action-primary bg-bg-brand-tint" : "border-[1.5px] border-transparent bg-bg-page hover:bg-bg-brand-tint"
        }`}
      >
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
            done ? "bg-state-success-bg text-state-success" : current ? "bg-action-primary text-text-on-brand" : "bg-bg-disabled text-text-muted"
          }`}
        >
          <Glyph icon={done ? CircleCheck : current ? Play : lesson.kind === "quiz" ? ListChecks : Hourglass} size={16} />
        </span>
        <span className={`min-w-0 flex-1 type-small ${done || current ? "text-text-primary" : "text-text-secondary"}`}>{lesson.title}</span>
        <span className="shrink-0 type-caption tabular-nums text-text-muted">{lessonMeta(lesson)}</span>
      </Link>
    </li>
  );
}

/** TRN-LRN-03 · رحلة المحور — Figma 190:9897 (جارية). */
export default async function JourneyPage(props: PageProps<"/trainee/learn/[enrollmentId]/journey">) {
  const { enrollmentId } = await props.params;
  const search = await props.searchParams;
  const user = await requireTrainee(`/trainee/learn/${enrollmentId}/journey`);
  const content = await getCourseContent(user.id, enrollmentId);
  if (!content) notFound();
  if (content.ended || content.pending || content.course.mode !== "recorded") redirect(`/trainee/learn/${enrollmentId}`);
  if (content.modules.length === 0) {
    return (
      <>
        <TopBar title="رحلة المحور" subtitle={content.course.title} />
        <PageBody>
          <EmptyState icon={Layers} title="لم يُنشر محتوى هذه الدورة بعد" description="سيضيف المدرب المحاور قريبًا، وسيصلك إشعار فور نشرها." />
        </PageBody>
      </>
    );
  }

  const requested = typeof search.module === "string" ? search.module : null;
  const idx = Math.max(
    0,
    requested ? content.modules.findIndex((m) => m.id === requested) : content.modules.findIndex((m) => m.lessons.some((l) => l.id === content.resume?.id)),
  );
  const mod = content.modules[idx];
  if (requested && mod.id !== requested) notFound();
  const prevModule = content.modules[idx - 1] ?? null;
  const nextModule = content.modules[idx + 1] ?? null;
  const learnLessons = mod.lessons.filter((l) => l.kind !== "quiz");
  const quizLesson = mod.lessons.find((l) => l.kind === "quiz") ?? null;
  const current = mod.lessons.find((l) => l.id === content.resume?.id) ?? learnLessons.find((l) => l.status !== "done") ?? learnLessons[0] ?? mod.lessons[0] ?? null;
  const modulePercent = mod.total ? Math.round((mod.completed / mod.total) * 100) : 0;
  const learnDone = learnLessons.filter((l) => l.status === "done").length;
  const quizOpen = learnDone === learnLessons.length;
  const quizLeft = learnLessons.length - learnDone;
  const nextAfterCurrent = current ? content.lessons[content.lessons.findIndex((l) => l.id === current.id) + 1] ?? null : null;

  return (
    <>
      <TopBar title={moduleLabel(mod.position)} subtitle={mod.title} />
      <PageBody className="gap-[26px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Breadcrumb items={[{ label: "ملف التدريب", href: "/trainee/trainings" }, { label: content.course.title, href: `/trainee/learn/${enrollmentId}` }, { label: moduleLabel(mod.position) }]} />
          <ButtonLink href="/trainee/assignments">الواجبات</ButtonLink>
        </div>

        <section aria-labelledby="module-title" className="flex w-full flex-col gap-5 rounded-22 bg-bg-brand-tint px-5 py-6 sm:px-7 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <ul className="flex flex-wrap items-center gap-2" aria-label="موقعك في الدورة">
              {current && (
                <li className="flex items-center gap-1.5 rounded-full bg-state-warning-bg px-3 py-1 type-caption text-state-warning">
                  <Glyph icon={Play} size={16} />
                  {lessonLabel(current.position)} من {toArabicDigits(mod.total)}
                </li>
              )}
              <li className="flex items-center gap-1.5 rounded-full bg-bg-surface px-3 py-1 type-caption text-text-secondary">
                <Glyph icon={Route} size={16} />
                المحور {toArabicDigits(mod.position)} من {toArabicDigits(content.modules.length)}
              </li>
            </ul>
            <h2 id="module-title" className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">
              {mod.title}
            </h2>
            <div className="flex items-center justify-between gap-3 type-caption text-text-secondary">
              <span>تقدّم المحور · {ofLessons(mod.completed, mod.total)}</span>
              <span>{formatPercent(modulePercent)}</span>
            </div>
            <AccentProgress percent={modulePercent} label="تقدّم المحور" />
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            {nextModule ? (
              <ButtonLink href={`/trainee/learn/${enrollmentId}/journey?module=${nextModule.id}`} variant="outline" size="s">
                المحور التالي
              </ButtonLink>
            ) : (
              <Button variant="outline" size="s" disabled>
                المحور التالي
              </Button>
            )}
            {prevModule ? (
              <ButtonLink href={`/trainee/learn/${enrollmentId}/journey?module=${prevModule.id}`} variant="outline" size="s">
                المحور السابق
              </ButtonLink>
            ) : (
              <Button variant="outline" size="s" disabled>
                المحور السابق
              </Button>
            )}
          </div>
        </section>

        <div className="flex w-full flex-col gap-[26px] lg:flex-row lg:items-start">
          <aside aria-label="دروس المحور وخريطة الدورة" className="flex w-full flex-col gap-6 lg:w-[380px] lg:shrink-0">
            <Panel
              title="دروس المحور"
              id="module-lessons-title"
              action={
                <span className="rounded-full bg-bg-brand-tint px-3 py-1 type-caption text-text-brand">
                  {toArabicDigits(mod.completed)} من {toArabicDigits(mod.total)}
                </span>
              }
            >
              <ul className="flex flex-col gap-3">
                {mod.lessons.map((l) => (
                  <LessonItem key={l.id} lesson={l} current={l.id === current?.id} />
                ))}
              </ul>
            </Panel>
            <Panel title="خريطة الدورة" id="map-title">
              <ol className="flex flex-col gap-3">
                {content.modules.map((m) => {
                  const done = m.total > 0 && m.completed === m.total;
                  const here = m.id === mod.id;
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/trainee/learn/${enrollmentId}/journey?module=${m.id}`}
                        aria-current={here ? "page" : undefined}
                        className="flex items-center gap-3 rounded-8 py-1 focus-ring"
                      >
                        <span
                          className={`flex size-7 shrink-0 items-center justify-center rounded-full type-caption ${
                            done ? "bg-state-success-bg text-state-success" : here ? "bg-bg-brand-tint text-text-brand" : "bg-bg-disabled text-text-muted"
                          }`}
                        >
                          {toArabicDigits(m.position)}
                        </span>
                        <span className={`min-w-0 flex-1 type-small ${here ? "font-medium text-text-primary" : done ? "text-text-primary" : "text-text-muted"}`}>{m.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
              <p className="type-caption text-text-muted">تنقّل بين المحاور بحرّية — نسبة إكمالك تُحسب من الدروس المكتملة في الدورة كلها.</p>
            </Panel>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {current && (
              <section id="current-lesson" aria-labelledby="current-lesson-title" className="flex w-full flex-col overflow-hidden rounded-22 border border-border-default bg-bg-card shadow-card">
                <Link href={current.href} className="relative flex aspect-video w-full items-center justify-center bg-linear-to-br from-action-primary to-state-info focus-ring" aria-label={`افتح الدرس: ${current.title}`}>
                  <span className="flex size-[68px] items-center justify-center rounded-full bg-action-primary text-text-on-brand shadow-float ring-4 ring-white/30">
                    <Glyph icon={current.status === "done" ? CircleCheck : Play} size={32} />
                  </span>
                  {current.kind === "video" && current.durationSeconds > 0 && (
                    <span className="absolute inset-x-4 bottom-3 flex flex-col gap-2">
                      <span className="h-1.5 w-full overflow-hidden rounded-full bg-white/30">
                        <span className="block h-full rounded-full bg-action-accent" style={{ width: `${current.watchedPercent}%` }} />
                      </span>
                      <span className="self-end type-caption text-text-on-brand tabular-nums" dir="ltr">
                        {formatClock(current.durationSeconds)} / {formatClock(current.positionSeconds)}
                      </span>
                    </span>
                  )}
                </Link>
                <div className="flex flex-col gap-4 px-5 pt-5 pb-6 sm:px-6">
                  <h3 id="current-lesson-title" className="type-h2 text-text-primary">
                    {lessonLabel(current.position)} — {current.title}
                  </h3>
                  <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 type-caption text-text-secondary">
                    <li className="flex items-center gap-1.5">
                      <Glyph icon={current.kind === "file" ? FileText : current.kind === "quiz" ? ListChecks : Play} size={16} />
                      {current.kind === "video" ? "فيديو" : current.kind === "file" ? "ملف مرفق" : current.kind === "text" ? "نص" : "اختبار"}
                    </li>
                    {current.kind === "video" && current.durationSeconds > 0 && (
                      <li className="flex items-center gap-1.5">
                        <Glyph icon={Clock} size={16} />
                        {formatDuration(current.durationSeconds)}
                      </li>
                    )}
                    <li className="flex items-center gap-1.5">
                      <Glyph icon={current.status === "done" ? CircleCheck : CircleDot} size={16} />
                      {current.status === "done" ? "مكتمل" : current.status === "in_progress" ? `شاهدت ${formatPercent(current.watchedPercent)}` : "لم يبدأ"}
                    </li>
                  </ul>
                  <div className="flex flex-wrap gap-3">
                    {current.status === "done" && nextAfterCurrent ? (
                      <ButtonLink href={nextAfterCurrent.href}>انتقل للدرس التالي</ButtonLink>
                    ) : (
                      <ButtonLink href={current.href}>{current.status === "in_progress" ? "تابع الدرس" : "ابدأ الدرس"}</ButtonLink>
                    )}
                    <ButtonLink href={`/trainee/learn/${enrollmentId}`} variant="outline">
                      كل محاور الدورة
                    </ButtonLink>
                  </div>
                </div>
              </section>
            )}

            {quizLesson && (
              <Panel
                title={quizLesson.title}
                id="module-quiz-title"
                action={
                  quizLesson.quiz?.passed ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-state-success-bg px-3 py-1 type-caption text-state-success">
                      <Glyph icon={CircleCheck} size={16} />
                      اجتزته
                    </span>
                  ) : !quizOpen ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-state-warning-bg px-3 py-1 type-caption text-state-warning">
                      <Glyph icon={Lock} size={16} />
                      يُفتح بعد إنهاء دروس المحور
                    </span>
                  ) : null
                }
              >
                <p className="type-body text-text-secondary">
                  {quizLesson.quiz
                    ? `${pluralAr(quizLesson.quiz.questionCount, ["سؤال واحد", "سؤالان", "أسئلة", "سؤالًا"])} اختيار من متعدد${quizLesson.quiz.timeLimitMinutes ? ` · ${toArabicDigits(quizLesson.quiz.timeLimitMinutes)} دقائق` : ""} · درجة النجاح ${formatPercent(quizLesson.quiz.passPercent)} · ${pluralAr(quizLesson.quiz.maxAttempts, ["محاولة واحدة", "محاولتان", "محاولات", "محاولة"])}.`
                    : "لم يُنشر هذا الاختبار بعد."}
                </p>
                {!quizLesson.quiz?.passed && learnLessons.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 type-caption text-text-secondary">
                      <span>{quizOpen ? "أنهيت دروس المحور — الاختبار مفتوح" : `أنهِ ${pluralAr(quizLeft, ["درسًا واحدًا", "درسين", "دروس", "درسًا"])} لفتح الاختبار`}</span>
                      <span>{formatPercent((learnDone / learnLessons.length) * 100)}</span>
                    </div>
                    <AccentProgress percent={(learnDone / learnLessons.length) * 100} label="التقدّم نحو فتح الاختبار" />
                  </div>
                )}
                {quizLesson.quiz ? (
                  quizOpen || quizLesson.quiz.passed ? (
                    <ButtonLink href={`/trainee/learn/quiz/${quizLesson.quiz.id}`} fullWidth size="l">
                      {quizLesson.quiz.passed ? "اعرض نتيجتك" : "ابدأ الاختبار"}
                    </ButtonLink>
                  ) : (
                    <Button fullWidth size="l" disabled>
                      ابدأ الاختبار — بعد إنهاء الدروس
                    </Button>
                  )
                ) : null}
              </Panel>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
