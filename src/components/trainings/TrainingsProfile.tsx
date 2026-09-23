import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Award, BadgeCheck, BookOpen, CalendarDays, ChevronLeft, CircleCheck, Clock, Compass, Info, MapPin, MonitorPlay, Play, Route, Star, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { AccentProgress } from "@/components/course/CourseCard";
import { formatPercent, formatRating, toArabicDigits } from "@/lib/format";
import type { TrainingsFileView, TrainingsTab } from "@/lib/data/trainings";
import { numberWord } from "./ui";

const monthYear = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { month: "long", year: "numeric", timeZone: "Asia/Riyadh" });

function Stat({ icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <li className="flex w-full flex-col items-center gap-1 rounded-16 bg-bg-surface px-[18px] py-4 text-center sm:w-[126px]">
      <span className="flex size-9 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
        <Glyph icon={icon} size={20} />
      </span>
      <span className="type-h2 text-text-primary">{value}</span>
      <span className="type-caption text-text-muted">{label}</span>
    </li>
  );
}

/** TRN-MYE-01 "LEARNING PROFILE HEADER" (187:9617). */
export function LearningProfileHeader({ view }: { view: TrainingsFileView }) {
  const { stats, plan } = view;
  return (
    <section aria-labelledby="profile-title" className="flex flex-col gap-[26px] rounded-22 bg-bg-brand-tint px-5 py-6 sm:px-[30px] sm:py-[26px] lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-start gap-3.5">
          <Avatar name={view.name || "متدرب"} src={view.avatarUrl} size="l" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id="profile-title" className="text-[28px] font-bold leading-[1.2] text-text-primary sm:text-[36px]">
              ملف تدريب {view.name}
            </h2>
            <ul className="flex flex-wrap items-center gap-2">
              {view.track && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-text-brand">
                  <Glyph icon={Route} size={16} />
                  مسار: {view.track}
                </li>
              )}
              {view.verified && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-success">
                  <Glyph icon={BadgeCheck} size={16} />
                  هوية موثَّقة
                </li>
              )}
              <li className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-text-secondary">
                <Glyph icon={CalendarDays} size={16} />
                عضو منذ {monthYear.format(new Date(view.memberSince))}
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 type-body text-text-secondary">
              {plan.total === 0
                ? "لم تسجّل في أي دورة بعد — ابدأ بأول دورة من «اكتشف دورة»."
                : `أنجزت ${numberWord(plan.completed, ["صفر دورات", "دورة واحدة", "دورتين", "دورات", "دورة"])} من ${toArabicDigits(plan.total)}${view.track ? ` في مسار ${view.track}` : ""}`}
            </p>
            <span className="shrink-0 type-subtitle text-text-brand">{formatPercent(plan.percent)} من مسارك</span>
          </div>
          <div className="w-full max-w-[400px]">
            <AccentProgress percent={plan.percent} label="نسبة إنجاز مسارك" />
          </div>
        </div>
      </div>
      <ul className="grid shrink-0 grid-cols-2 gap-3.5 sm:flex sm:items-start">
        <Stat icon={Star} value={stats.rating === null ? "—" : formatRating(stats.rating)} label="متوسط تقييمك" />
        <Stat icon={Award} value={toArabicDigits(stats.certificates)} label="شهادات" />
        <Stat icon={Clock} value={toArabicDigits(stats.hours)} label="ساعة تدريب" />
        <Stat icon={BookOpen} value={toArabicDigits(stats.total)} label="دورة إجمالًا" />
      </ul>
    </section>
  );
}

function JourneyStep({ icon, title, caption, active, muted }: { icon: LucideIcon; title: string; caption: string; active?: boolean; muted?: boolean }) {
  return (
    <li
      aria-current={active ? "step" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center gap-2 rounded-12 px-3 py-3.5 text-center ${active ? "border-[1.5px] border-action-primary bg-bg-brand-tint" : "bg-bg-page"}`}
    >
      <span className={`flex size-10 items-center justify-center rounded-8 ${active ? "bg-action-primary text-text-on-brand" : "bg-bg-surface text-text-brand"}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className={`type-subtitle ${muted ? "text-text-muted" : "text-text-primary"}`}>{title}</span>
      <span className="type-caption text-text-muted">{caption}</span>
    </li>
  );
}

/** "رحلتك في المنصة" (196:10619). */
export function JourneyStrip({ view }: { view: TrainingsFileView }) {
  const j = view.journey;
  const courses = (n: number) => numberWord(n, ["لا دورات", "دورة واحدة", "دورتان", "دورات", "دورة"]);
  const arrow = (
    <li aria-hidden className="hidden w-9 shrink-0 justify-center pt-[26px] text-text-muted md:flex">
      <Glyph icon={ChevronLeft} size={16} />
    </li>
  );
  return (
    <section aria-labelledby="journey-title" className="flex flex-col gap-3 rounded-16 border border-border-default bg-bg-card px-4 pt-5 pb-[22px] shadow-card sm:px-6">
      <h2 id="journey-title" className="type-title text-text-primary">
        رحلتك في المنصة
      </h2>
      <ol className="grid grid-cols-2 gap-3 md:flex md:gap-0">
        <JourneyStep icon={Award} title="شهاداتك" caption={numberWord(j.certificates, ["لا شهادات بعد", "شهادة واحدة", "شهادتان", "شهادات", "شهادة"])} muted />
        {arrow}
        <JourneyStep icon={Trophy} title="أكملت" caption={courses(j.completed)} muted />
        {arrow}
        <JourneyStep icon={Play} title="تتعلّم الآن" caption={j.active ? `${courses(j.active)} جارية` : "لا دورات جارية"} active />
        {arrow}
        <JourneyStep icon={CircleCheck} title="اشتريت" caption={courses(j.purchased)} />
        {arrow}
        <JourneyStep icon={Compass} title="اكتشفت" caption={j.following ? numberWord(j.following, ["", "متابعة واحدة", "متابعتان", "متابعات", "متابعة"]) : "ابدأ بمتابعة مجال"} />
      </ol>
      <p className="flex items-center gap-2.5 type-caption text-text-brand">
        <Glyph icon={Info} size={16} />
        <span className="flex-1">
          هذا الملف مركز المتابعة بعد الشراء. لاكتشاف دورات جديدة استخدم{" "}
          <Link href="/trainee/discover" className="underline-offset-4 hover:underline">
            «اكتشف دورة»
          </Link>{" "}
          من القائمة الجانبية.
        </span>
      </p>
    </section>
  );
}

/** "MODE EXPLAINER" (196:10678). */
export function ModeExplainer() {
  return (
    <div className="flex flex-col gap-3 rounded-12 bg-bg-page px-4 py-3 sm:flex-row sm:gap-4">
      <p className="flex flex-1 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
          <Glyph icon={MonitorPlay} size={16} />
        </span>
        <span className="flex flex-col type-caption">
          <span className="text-text-brand">الدورات المسجَّلة</span>
          <span className="text-text-muted">تُتابَع بالفصول ونسبة التقدّم والاختبارات والواجبات.</span>
        </span>
      </p>
      <p className="flex flex-1 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-success">
          <Glyph icon={MapPin} size={16} />
        </span>
        <span className="flex flex-col type-caption">
          <span className="text-state-success">الدورات الحضورية</span>
          <span className="text-text-muted">تُتابَع بالجدول الزمني وسجل الحضور وإعلانات الجهة.</span>
        </span>
      </p>
    </div>
  );
}

export const TAB_LABELS: Record<TrainingsTab, string> = {
  active: "الدورات النشطة",
  waitlist: "قائمة الانتظار",
  completed: "مكتملة",
  withdrawn: "منسحبة",
  cancelled: "ملغاة",
};

/** Figma "Nav / Tab Item" underline tabs with "· n" counts and the red invite badge (177:7712). */
export function TrainingsTabs({ view, tab, hrefFor }: { view: TrainingsFileView; tab: TrainingsTab; hrefFor: (t: TrainingsTab) => string }) {
  // Visual order of the Figma frame (right → left): منسحبة · مكتملة · قائمة الانتظار · الدورات النشطة.
  const tabs: TrainingsTab[] = ["withdrawn", "completed", "waitlist", "active"];
  if (view.tabCounts.cancelled > 0 || tab === "cancelled") tabs.unshift("cancelled");
  return (
    <nav aria-label="تبويبات ملف التدريب" className="flex max-w-full gap-1.5 overflow-x-auto border-b border-border-divider">
      {tabs.map((t) => {
        const active = t === tab;
        return (
          <Link
            key={t}
            href={hrefFor(t)}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={`relative flex shrink-0 flex-col items-center gap-2 px-3.5 pt-3 pb-3 focus-ring ${active ? "type-subtitle text-text-brand" : "type-body text-text-secondary hover:text-text-primary"}`}
          >
            <span className="whitespace-nowrap">
              {TAB_LABELS[t]} · {toArabicDigits(view.tabCounts[t])}
            </span>
            {t === "waitlist" && view.inviteCount > 0 && (
              <span className="absolute top-0.5 end-0 flex size-6 items-center justify-center rounded-full bg-state-error type-caption text-text-on-brand" aria-label={`${toArabicDigits(view.inviteCount)} دعوة بانتظار قبولك`}>
                {toArabicDigits(view.inviteCount)}
              </span>
            )}
            {active && <span aria-hidden className="absolute inset-x-3.5 bottom-0 h-[3px] rounded-full bg-action-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}

