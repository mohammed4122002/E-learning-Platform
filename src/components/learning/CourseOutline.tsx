import Link from "next/link";
import { ChevronDown, CircleCheck, CircleDot, Eye, Layers, Lock, Play } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { formatClock, formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import type { LessonView, ModuleView } from "@/lib/data/learning";

export const LESSONS_PLURAL: [string, string, string, string] = ["درس واحد", "درسان", "دروس", "درسًا"];
export const MODULES_PLURAL: [string, string, string, string] = ["محور واحد", "محوران", "محاور", "محورًا"];

/** "٤ من ٤ دروس" · "٧ من ١٨ درسًا" */
export function ofLessons(done: number, total: number): string {
  const noun = total >= 3 && total <= 10 ? "دروس" : total > 10 ? "درسًا" : "درس";
  return `${toArabicDigits(done)} من ${toArabicDigits(total)} ${noun}`;
}

/** Left-hand meta of a lesson row: duration (video), "ملف", "نص" or "٨ أسئلة". */
export function lessonMeta(l: LessonView): string {
  if (l.kind === "quiz") return l.quiz ? pluralAr(l.quiz.questionCount, ["سؤال", "سؤالان", "أسئلة", "سؤالًا"]) : "اختبار";
  if (l.kind === "file") return "ملف";
  if (l.kind === "text") return "نص";
  return formatClock(l.durationSeconds);
}

function statusText(l: LessonView, current: boolean): { text: string; className: string } {
  if (l.status === "done") return { text: l.isPreview ? "معاينة مجانية · مكتمل" : "مكتمل", className: "text-state-success" };
  if (current || l.status === "in_progress") return { text: "جارٍ", className: "text-text-brand" };
  if (l.isNew) return { text: "جديد", className: "text-state-info" };
  return { text: "لم يبدأ", className: "text-text-muted" };
}

/** Lesson row (Figma 403:15349): white r12, px18 py15, gap14 — icon · title/status · watched pill · duration. */
export function LessonRow({ lesson, current }: { lesson: LessonView; current: boolean }) {
  const s = statusText(lesson, current);
  const done = lesson.status === "done";
  const active = current && !done;
  return (
    <li>
      <Link
        href={lesson.href}
        aria-current={current ? "step" : undefined}
        className={`flex w-full items-center gap-3.5 rounded-12 bg-bg-surface px-[18px] py-[15px] transition-shadow hover:shadow-card focus-ring ${
          active ? "inner-stroke istroke-w-[1.5px] istroke-c-action-primary" : ""
        }`}
      >
        <Glyph
          icon={done ? CircleCheck : active ? Play : CircleDot}
          size={20}
          className={done ? "text-state-success" : active ? "text-text-brand" : "text-text-muted"}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className={`type-body-lg ${done || active ? "text-text-primary" : "text-text-muted"}`}>{lesson.title}</span>
          <span className={`type-caption ${s.className}`}>{s.text}</span>
        </span>
        {active && lesson.kind === "video" && lesson.watchedPercent > 0 && (
          <span className="flex shrink-0 items-center gap-[7px] rounded-full bg-bg-brand-tint px-[11px] py-1.5 text-text-brand">
            <Glyph icon={Eye} size={16} />
            <span className="type-caption">
              <span className="sr-only">شاهدت </span>
              {formatPercent(lesson.watchedPercent)}
            </span>
          </span>
        )}
        <span className="shrink-0 whitespace-nowrap type-caption tabular-nums text-text-muted">{lessonMeta(lesson)}</span>
      </Link>
    </li>
  );
}

/**
 * Module card (Figma 403:15338 / 403:15381 / 403:15438): completed = page bg + success tile,
 * current = brand tint + 2px primary border + "أنت هنا", upcoming = collapsed page bg.
 * Native <details> keeps expand/collapse accessible without client JS.
 */
export function ModuleCard({ module, currentLessonId, open }: { module: ModuleView; currentLessonId: string | null; open: boolean }) {
  const done = module.total > 0 && module.completed === module.total;
  const current = !done && module.lessons.some((l) => l.id === currentLessonId);
  const box = current
    ? "border-2 border-action-primary bg-bg-brand-tint"
    : "border-2 border-transparent bg-bg-page";
  return (
    <details open={open} className={`group block w-full rounded-16 px-[22px] pt-5 pb-[22px] ${box}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3.5 rounded-12 focus-ring [&::-webkit-details-marker]:hidden">
        <span
          className={`flex size-[52px] shrink-0 items-center justify-center rounded-12 type-h3 ${
            done ? "bg-state-success-bg text-state-success" : current ? "bg-action-primary text-text-on-brand" : "bg-bg-surface text-text-muted"
          }`}
        >
          {done ? <Glyph icon={CircleCheck} size={20} label="محور مكتمل" /> : toArabicDigits(module.position)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="type-title text-text-primary">{module.title}</span>
          <span className={`type-body ${done ? "text-state-success" : current ? "text-text-brand" : "text-text-muted"}`}>
            {ofLessons(module.completed, module.total)}
          </span>
        </span>
        {current && (
          <span className="flex shrink-0 items-center gap-[7px] rounded-full bg-bg-surface px-3.5 py-[9px] text-text-brand">
            <Glyph icon={Play} size={20} />
            <span className="type-subtitle">أنت هنا</span>
          </span>
        )}
        <Glyph icon={ChevronDown} size={20} className="text-text-secondary transition-transform group-open:rotate-180" />
      </summary>
      {module.lessons.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-3">
          {module.lessons.map((l) => (
            <LessonRow key={l.id} lesson={l} current={l.id === currentLessonId} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 flex items-center gap-2 rounded-12 bg-bg-surface px-[18px] py-[15px] type-small text-text-muted">
          <Glyph icon={Lock} size={16} />
          لم يُنشر محتوى هذا المحور بعد.
        </p>
      )}
    </details>
  );
}

/** "محاور الدورة" card (Figma 403:15329). */
export function CourseOutlineCard({
  modules,
  currentLessonId,
  lessonCount,
  journeyHref,
}: {
  modules: ModuleView[];
  currentLessonId: string | null;
  lessonCount: number;
  journeyHref?: string;
}) {
  return (
    <section aria-labelledby="outline-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="outline-title" className="min-w-0 flex-1 type-h2 text-text-primary">
          محاور الدورة
        </h2>
        <span className="flex shrink-0 items-center gap-[7px] rounded-full bg-bg-brand-tint px-3.5 py-[9px] text-text-brand">
          <Glyph icon={Layers} size={20} />
          <span className="type-subtitle">
            {pluralAr(modules.length, MODULES_PLURAL)} · {pluralAr(lessonCount, LESSONS_PLURAL)}
          </span>
        </span>
      </div>
      {journeyHref && (
        <Link href={journeyHref} className="-mt-2 self-start rounded-8 type-small text-text-brand hover:underline focus-ring">
          اعرض رحلة المحور الحالي
        </Link>
      )}
      {modules.map((m) => {
        const done = m.total > 0 && m.completed === m.total;
        const current = m.lessons.some((l) => l.id === currentLessonId);
        return <ModuleCard key={m.id} module={m} currentLessonId={currentLessonId} open={current || (done && modules.indexOf(m) === 0)} />;
      })}
    </section>
  );
}
