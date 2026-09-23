import Link from "next/link";
import type { ReactNode } from "react";
import { Award, BookOpen, CalendarDays, CircleCheck, Clock, ListChecks, MapPin, MonitorPlay, Route, Share2, Star, Video, Zap } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Navigation";
import { AccentProgress } from "@/components/course/CourseCard";
import { formatDate, formatNumber, formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import type { LearningRecord, RecordCourse, RecordEvent } from "@/lib/data/learning-record";
import type { CourseMode } from "@/types/views";

const MODE_LABEL: Record<CourseMode, { label: string; icon: typeof MapPin }> = {
  in_person: { label: "حضورية", icon: MapPin },
  live_remote: { label: "عن بُعد", icon: Video },
  recorded: { label: "مسجَّلة", icon: MonitorPlay },
};

export function RecordTabs({ active }: { active: "overview" | "skills" | "timeline" | "report" }) {
  const href = { overview: "/trainee/learning-record", skills: "/trainee/learning-record?tab=skills", timeline: "/trainee/learning-record?tab=timeline", report: "/trainee/learning-record/report" };
  return (
    <Tabs
      label="أقسام سجل التعلم"
      active={href[active]}
      tabs={[
        { href: href.overview, label: "نظرة عامة" },
        { href: href.skills, label: "المهارات" },
        { href: href.timeline, label: "السجل الزمني" },
        { href: href.report, label: "التقرير" },
      ]}
    />
  );
}

export function StatTiles({ stats }: { stats: LearningRecord["stats"] }) {
  const items = [
    { icon: Zap, value: stats.skills, label: "مهارة مكتسبة" },
    { icon: Award, value: stats.certificates, label: "شهادات صادرة" },
    { icon: CircleCheck, value: stats.completed, label: "دورات مكتملة" },
    { icon: Clock, value: stats.hours, label: "ساعة تعلّم موثّقة" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="ملخّص سجلك">
      {items.map((s) => (
        <li key={s.label} className="flex flex-col items-center gap-2 rounded-16 border border-border-default bg-bg-card px-4 py-5 text-center shadow-card">
          <span className="flex size-9 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
            <Glyph icon={s.icon} size={20} />
          </span>
          <span className="type-h2 text-text-primary">{formatNumber(s.value)}</span>
          <span className="type-caption text-text-muted">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function RecordCard({ title, id, action, children, className }: { title: string; id: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={`flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={id} className="min-w-0 flex-1 type-h3 text-text-primary">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TrackCard({ track }: { track: NonNullable<LearningRecord["track"]> }) {
  return (
    <RecordCard
      title={`مسار ${track.name}`}
      id="track-title"
      action={
        <span className="flex items-center gap-1.5 rounded-full bg-bg-brand-tint px-3 py-1 type-caption text-text-brand">
          <Glyph icon={Route} size={16} />
          {toArabicDigits(track.completed)} من {pluralAr(track.total, ["دورة واحدة", "دورتين", "دورات", "دورة"])}
        </span>
      }
    >
      <div className="flex items-center justify-between gap-3 type-caption text-text-secondary">
        <span>
          أنجزت {toArabicDigits(track.completed)} من {toArabicDigits(track.total)}
          {track.remaining > 0 ? ` · تبقّت ${toArabicDigits(track.remaining)}` : " · أكملت المسار"}
        </span>
        <span>{formatPercent(track.percent)}</span>
      </div>
      <AccentProgress percent={track.percent} label={`تقدّمك في مسار ${track.name}`} />
      <p className="type-caption text-text-muted">كل دورة تُكملها في المسار تُضاف إلى سجلك بشهادتها وساعاتها تلقائيًا.</p>
    </RecordCard>
  );
}

export function CompletedRow({ course, showResult = true }: { course: RecordCourse; showResult?: boolean }) {
  const m = MODE_LABEL[course.mode];
  return (
    <li className="flex items-center gap-4 rounded-12 bg-bg-page px-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-success">
        <Glyph icon={CircleCheck} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="type-subtitle text-text-primary">{course.title}</span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 type-caption text-text-muted">
          {course.completedAt && (
            <span className="flex items-center gap-1">
              <Glyph icon={CalendarDays} size={16} />
              {formatDate(course.completedAt)}
            </span>
          )}
          {course.hours > 0 && (
            <span className="flex items-center gap-1">
              <Glyph icon={Clock} size={16} />
              {formatNumber(course.hours)} ساعة
            </span>
          )}
          <span className="flex items-center gap-1">
            <Glyph icon={m.icon} size={16} />
            {course.source ? `${course.source} · ` : ""}
            {m.label}
          </span>
        </span>
      </span>
      {showResult && course.result !== null && (
        <span className="flex shrink-0 flex-col items-center rounded-8 bg-state-success-bg px-3 py-1.5 text-state-success">
          <span className="type-subtitle">{formatPercent(course.result)}</span>
          <span className="type-caption">النتيجة</span>
        </span>
      )}
    </li>
  );
}

export function SkillsCard({ skills, large }: { skills: string[]; large?: boolean }) {
  return (
    <RecordCard title="مهاراتك المكتسبة" id="skills-title">
      <p className="type-caption text-text-muted">تُستخرج آليًا من الدورات المكتملة — لا تُدخل يدويًا.</p>
      {skills.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <li key={s} className={`rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-text-primary ${large ? "type-small" : "type-caption"}`}>
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-12 bg-bg-page px-4 py-3 type-small text-text-secondary">ستظهر مهاراتك هنا بعد إكمال أول دورة.</p>
      )}
    </RecordCard>
  );
}

export function NextSteps({ record }: { record: LearningRecord }) {
  const first = record.active[0];
  return (
    <RecordCard title="الخطوة القادمة" id="next-title">
      <ul className="flex flex-col gap-3">
        {first && (
          <li className="flex flex-col gap-3 rounded-12 bg-bg-page p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
                <Glyph icon={Route} size={16} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="type-subtitle text-text-primary">أكمل مسارك</p>
                <p className="type-caption text-text-muted">
                  {record.track && record.track.remaining > 0
                    ? `تبقّت ${pluralAr(record.track.remaining, ["دورة واحدة", "دورتان", "دورات", "دورة"])} في مسار ${record.track.name}`
                    : `تابع «${first.title}»`}
                </p>
              </div>
            </div>
            <ButtonLink href={first.href} size="s" fullWidth>
              أكمل مسارك
            </ButtonLink>
          </li>
        )}
        {record.unrated > 0 && (
          <li className="flex flex-col gap-3 rounded-12 bg-bg-page p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
                <Glyph icon={Star} size={16} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="type-subtitle text-text-primary">قيّم {pluralAr(record.unrated, ["دورة", "دورتين", "دورات", "دورة"])}</p>
                <p className="type-caption text-text-muted">تقييمك يساعد غيرك على الاختيار.</p>
              </div>
            </div>
            <ButtonLink href="/trainee/ratings" variant="outline" size="s" fullWidth>
              قيّم الآن
            </ButtonLink>
          </li>
        )}
        <li className="flex flex-col gap-3 rounded-12 bg-bg-page p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
              <Glyph icon={Share2} size={16} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="type-subtitle text-text-primary">شارك سجلك</p>
              <p className="type-caption text-text-muted">تقرير مهني يعرض إنجازك للجهات.</p>
            </div>
          </div>
          <Link href="/trainee/learning-record/report" className="self-center rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
            شارك سجلك
          </Link>
        </li>
      </ul>
    </RecordCard>
  );
}

const EVENT_ICON: Record<RecordEvent["kind"], typeof Award> = {
  lesson: BookOpen,
  quiz: ListChecks,
  session: CalendarDays,
  certificate: Award,
  assignment: CircleCheck,
  enrollment: Route,
};

export function Timeline({ events }: { events: RecordEvent[] }) {
  if (events.length === 0) return <p className="rounded-12 bg-bg-page px-4 py-6 text-center type-small text-text-secondary">لا نشاط مسجّل بعد — ابدأ أول درس ليظهر هنا.</p>;
  const groups = new Map<string, RecordEvent[]>();
  const month = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { month: "long", year: "numeric", timeZone: "Asia/Riyadh" });
  events.forEach((e) => {
    const k = month.format(new Date(e.at));
    groups.set(k, [...(groups.get(k) ?? []), e]);
  });
  return (
    <div className="flex flex-col gap-6">
      {[...groups.entries()].map(([m, list]) => (
        <section key={m} aria-label={m} className="flex flex-col gap-3">
          <h3 className="type-subtitle text-text-secondary">{m}</h3>
          <ol className="flex flex-col gap-2.5 border-s-2 border-border-divider ps-4">
            {list.map((e) => (
              <li key={e.id} className="relative flex items-start gap-3 rounded-12 bg-bg-page px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
                  <Glyph icon={EVENT_ICON[e.kind]} size={16} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="type-small text-text-primary">{e.title}</span>
                  {e.detail && <span className="type-caption text-text-muted">{toArabicDigits(e.detail)}</span>}
                </span>
                <time dateTime={e.at} className="shrink-0 type-caption text-text-muted">
                  {formatDate(e.at)}
                </time>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
