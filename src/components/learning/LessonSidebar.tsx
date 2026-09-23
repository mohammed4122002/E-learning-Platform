import Link from "next/link";
import { ChevronDown, CircleCheck, CircleDot, Eye, Play } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { formatPercent, toArabicDigits } from "@/lib/format";
import type { CourseContent, LessonView } from "@/lib/data/learning";
import { lessonMeta } from "./CourseOutline";

function Row({ lesson, current }: { lesson: LessonView; current: boolean }) {
  const done = lesson.status === "done";
  const icon = done ? CircleCheck : current ? Play : lesson.isPreview ? Eye : CircleDot;
  const status = done
    ? lesson.isPreview
      ? "معاينة مجانية · مكتمل"
      : "مكتمل"
    : current
      ? "تشاهده الآن"
      : lesson.status === "in_progress"
        ? `شاهدت ${formatPercent(lesson.watchedPercent)}`
        : lesson.isNew
          ? "جديد"
          : "لم يبدأ";
  return (
    <li>
      <Link
        href={lesson.href}
        aria-current={current ? "page" : undefined}
        className={`flex items-center gap-3 border-t border-border-divider px-4 py-3 focus-ring ${current ? "bg-bg-brand-tint" : "bg-bg-surface hover:bg-bg-page"}`}
      >
        <Glyph icon={icon} size={20} className={done ? "text-state-success" : current ? "text-text-brand" : "text-text-muted"} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`type-small ${done || current ? "text-text-primary" : "text-text-secondary"}`}>{lesson.title}</span>
          <span className={`type-caption ${done ? "text-state-success" : current ? "text-text-brand" : "text-text-muted"}`}>{status}</span>
        </span>
        <span className="shrink-0 whitespace-nowrap type-caption tabular-nums text-text-muted">{lessonMeta(lesson)}</span>
      </Link>
    </li>
  );
}

/** Figma "Trainee / Recorded · Lesson Sidebar" (401:4330): progress header + collapsible محاور with lessons. */
export function LessonSidebar({ content, currentLessonId }: { content: CourseContent; currentLessonId: string }) {
  const { completed, total, percent } = content.progress;
  return (
    <nav aria-label="محتوى الدورة" className="flex w-full flex-col overflow-hidden rounded-22 border border-border-default bg-bg-card shadow-card">
      <div className="flex flex-col gap-3 bg-bg-brand-tint px-4 pt-4 pb-5">
        <h2 className="type-h3 text-text-primary">محتوى الدورة</h2>
        <div className="flex items-center gap-3">
          <span className="shrink-0 type-caption text-text-brand">
            {toArabicDigits(completed)} من {toArabicDigits(total)} · {formatPercent(percent)}
          </span>
          <div role="progressbar" aria-label="تقدّمك في الدورة" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2 flex-1 overflow-hidden rounded-full bg-bg-surface">
            <div className="h-full rounded-full bg-action-primary" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-y-auto lg:max-h-[560px]">
        {content.modules.map((m) => {
          const hasCurrent = m.lessons.some((l) => l.id === currentLessonId);
          return (
            <details key={m.id} open={hasCurrent} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 border-t border-border-divider bg-bg-page px-4 py-3 focus-ring [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 type-subtitle text-text-primary">{m.title}</span>
                <Glyph icon={ChevronDown} size={16} className="text-text-secondary transition-transform group-open:rotate-180" />
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-8 type-caption ${
                    m.total > 0 && m.completed === m.total ? "bg-state-success-bg text-state-success" : "bg-bg-surface text-text-muted"
                  }`}
                >
                  {toArabicDigits(m.position)}
                </span>
              </summary>
              <ul>
                {m.lessons.map((l) => (
                  <Row key={l.id} lesson={l} current={l.id === currentLessonId} />
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </nav>
  );
}
