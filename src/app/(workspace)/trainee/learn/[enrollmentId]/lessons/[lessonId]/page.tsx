import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, CircleCheck, Clock, Layers } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { LessonPlayer, type PlayerLesson } from "@/components/learning/LessonPlayer";
import { LessonSidebar } from "@/components/learning/LessonSidebar";
import { Panel } from "@/components/learning/CourseCards";
import { requireTrainee } from "@/lib/auth";
import { getCourseContent, getLessonPage } from "@/lib/data/learning";
import { formatDuration } from "@/lib/format";
import { lessonLabel, moduleLabel } from "@/lib/learning";
import type { LessonView } from "@/lib/data/learning";

export async function generateMetadata(props: PageProps<"/trainee/learn/[enrollmentId]/lessons/[lessonId]">): Promise<Metadata> {
  const { enrollmentId, lessonId } = await props.params;
  const user = await requireTrainee();
  const content = await getCourseContent(user.id, enrollmentId);
  const lesson = content?.lessons.find((l) => l.id === lessonId);
  return { title: lesson ? `${lesson.title} · ${content!.course.title}` : "الدرس" };
}

function NavCard({ lesson, dir, highlight }: { lesson: LessonView; dir: "next" | "prev"; highlight?: boolean }) {
  return (
    <Link
      href={lesson.href}
      rel={dir}
      className={`flex min-w-0 flex-1 items-center gap-3 rounded-16 px-5 py-4 focus-ring ${
        highlight ? "border-2 border-state-success bg-state-success-bg" : "border border-border-default bg-bg-card hover:bg-bg-page"
      }`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-caption text-text-muted">{dir === "next" ? "التالي" : "السابق"}</span>
        <span className="truncate type-title text-text-primary">{lesson.title}</span>
      </span>
      <Glyph icon={dir === "next" ? ChevronLeft : ChevronRight} size={20} className="text-text-brand" />
    </Link>
  );
}

/** TRN-LRN-06 · مشغّل الدرس — Figma 403:15566 (استئناف) · 403:15901 (مكتملة). */
export default async function LessonPage(props: PageProps<"/trainee/learn/[enrollmentId]/lessons/[lessonId]">) {
  const { enrollmentId, lessonId } = await props.params;
  const user = await requireTrainee(`/trainee/learn/${enrollmentId}/lessons/${lessonId}`);
  const page = await getLessonPage(user.id, enrollmentId, lessonId);
  if (!page) notFound();
  if (page.content.ended || page.content.pending) redirect(`/trainee/learn/${enrollmentId}`);
  if (!page.lesson) notFound();
  const { content, lesson, prev, next } = page;

  const player: PlayerLesson = {
    id: lesson.id,
    kind: lesson.kind,
    title: lesson.title,
    durationSeconds: lesson.durationSeconds,
    positionSeconds: lesson.status === "done" ? 0 : lesson.positionSeconds,
    done: lesson.status === "done",
    body: page.body,
    mediaUrl: lesson.kind === "video" ? page.mediaUrl : null,
    downloadHref: lesson.kind === "file" && lesson.hasMedia ? `/trainee/learn/${enrollmentId}/lessons/${lesson.id}/download` : null,
    quiz: lesson.quiz
      ? {
          id: lesson.quiz.id,
          questionCount: lesson.quiz.questionCount,
          passPercent: lesson.quiz.passPercent,
          passed: lesson.quiz.passed,
          attemptsUsed: lesson.quiz.attemptsUsed,
          maxAttempts: lesson.quiz.maxAttempts,
        }
      : null,
  };
  const done = lesson.status === "done";

  return (
    <>
      <TopBar title="الدرس" subtitle={content.course.title} />
      <PageBody className="gap-[26px]">
        <Breadcrumb items={[{ label: "ملف التدريب", href: "/trainee/trainings" }, { label: content.course.title, href: `/trainee/learn/${enrollmentId}` }, { label: lesson.title }]} />
        <div className="flex w-full flex-col gap-[26px] lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <LessonPlayer
              key={lesson.id}
              lesson={player}
              next={next ? { title: next.title, href: next.href, durationSeconds: next.durationSeconds, kind: next.kind } : null}
            />
            <header className="flex flex-col gap-3">
              <ul className="flex flex-wrap items-center gap-2" aria-label="معلومات الدرس">
                <li className="flex items-center gap-1.5 rounded-full bg-bg-brand-tint px-3 py-1.5 type-caption text-text-brand">
                  <Glyph icon={Layers} size={16} />
                  {moduleLabel(lesson.modulePosition)} · {lessonLabel(lesson.position)}
                </li>
                {done && (
                  <li className="flex items-center gap-1.5 rounded-full bg-state-success-bg px-3 py-1.5 type-caption text-state-success">
                    <Glyph icon={CircleCheck} size={16} />
                    أكملت هذا الدرس
                  </li>
                )}
                {lesson.kind === "video" && lesson.durationSeconds > 0 && (
                  <li className="flex items-center gap-1.5 rounded-full bg-bg-page px-3 py-1.5 type-caption text-text-secondary">
                    <Glyph icon={Clock} size={16} />
                    {formatDuration(lesson.durationSeconds)}
                  </li>
                )}
              </ul>
              <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{lesson.title}</h2>
              {lesson.kind === "video" && page.body && <p className="type-body text-text-secondary">{page.body}</p>}
            </header>
            {(prev || next) && (
              <nav aria-label="التنقل بين الدروس" className="flex flex-col gap-4 sm:flex-row">
                {next && <NavCard lesson={next} dir="next" highlight={done} />}
                {prev && <NavCard lesson={prev} dir="prev" />}
              </nav>
            )}
          </div>
          <aside aria-label="محتوى الدورة والأسئلة" className="flex w-full flex-col gap-6 lg:w-[380px] lg:shrink-0">
            <LessonSidebar content={content} currentLessonId={lesson.id} />
            <Panel title="سؤال عن الدرس؟" id="ask-title">
              <p className="type-small text-text-secondary">اكتب سؤالك ويردّ المدرب خلال يومين عمل.</p>
              <ButtonLink href={`/messages?course=${content.course.id}`} variant="outline" size="s" fullWidth>
                اسأل المدرب
              </ButtonLink>
            </Panel>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
