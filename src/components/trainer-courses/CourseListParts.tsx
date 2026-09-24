import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarDays, ChevronLeft, CircleAlert, CircleCheckBig, Info, Lightbulb, MapPin, SquareActivity, TrendingUp, Users } from "lucide-react";
import { ModeBadge } from "@/components/course/CourseCover";
import { InfoPanel, type InfoRow } from "@/components/trainer-courses/course/InfoPanel";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import type { TrainerCourseItem, TrainerCoursesList } from "@/lib/data/trainer-courses";
import { formatDayMonth, formatNumber, formatPercent, formatTime, pluralAr, toArabicDigits } from "@/lib/format";
import { BLOCKER_WAITING, daysUntil, riyadhParts, scheduleLabel } from "@/lib/trainer-courses";

/* TRR-CRS-01 · دوراتي (271:3915): stat tiles, course cards, side panels, live-ready card (4236:2) and the
   empty state (313:10290). */

export function StatTile({ icon, value, label, tone = "text-text-brand" }: { icon: LucideIcon; value: string; label: string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-16 border border-border-default bg-bg-card pt-5 pb-[22px] shadow-card">
      <span className={`flex size-11 items-center justify-center rounded-12 bg-bg-brand-tint ${tone}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <p className="type-h2 text-center text-text-primary">{value}</p>
      <p className="px-2 text-center type-caption text-text-muted">{label}</p>
    </div>
  );
}

export function StatsRow({ stats }: { stats: TrainerCoursesList["stats"] }) {
  return (
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      <StatTile icon={SquareActivity} value={toArabicDigits(stats.running)} label="جارية الآن" tone="text-state-success" />
      <StatTile icon={CalendarDays} value={toArabicDigits(stats.upcoming)} label="قادمة" />
      <StatTile icon={Users} value={formatNumber(stats.activeTrainees)} label="متدربًا نشطًا" tone="text-state-info" />
      <StatTile icon={TrendingUp} value={formatPercent(stats.occupancy)} label="متوسط الإشغال" tone="text-state-warning" />
    </div>
  );
}

const STATE_STYLE = {
  running: { label: "جارية", icon: SquareActivity, pill: "bg-state-success-bg text-state-success", tile: "bg-state-success-bg text-state-success" },
  full: { label: "اكتملت المقاعد", icon: Users, pill: "bg-state-warning-bg text-state-warning", tile: "bg-state-warning-bg text-state-warning" },
  upcoming: { label: "قادمة", icon: CalendarDays, pill: "bg-bg-brand-tint text-text-brand", tile: "bg-bg-brand-tint text-text-brand" },
  ended: { label: "منتهية", icon: CircleCheckBig, pill: "bg-bg-disabled text-text-secondary", tile: "bg-bg-page text-text-secondary" },
  cancelled: { label: "ملغاة", icon: CircleAlert, pill: "bg-state-error-bg text-state-error", tile: "bg-state-error-bg text-state-error" },
} as const;

export function courseHref(c: Pick<TrainerCourseItem, "id" | "mode" | "isDraft">): string {
  if (c.isDraft) return `/trainer/courses/${c.id}/setup/mode`;
  return c.mode === "recorded" ? `/trainer/courses/${c.id}/dashboard` : `/trainer/courses/${c.id}`;
}

export function setupHref(c: Pick<TrainerCourseItem, "id" | "blockers">): string {
  const b = c.blockers;
  if (b.some((x) => ["meeting_missing", "schedule_missing", "venue_missing", "no_content", "lessons_without_material", "empty_modules", "no_preview"].includes(x))) {
    return `/trainer/courses/${c.id}/setup/schedule`;
  }
  if (b.some((x) => ["price_missing", "hours_missing", "seats_missing"].includes(x))) return `/trainer/courses/${c.id}/setup/pricing`;
  return `/trainer/courses/${c.id}/setup/review`;
}

function relDay(iso: string): string {
  const d = daysUntil(iso);
  if (d === 0) return "اليوم";
  if (d === -1) return "أمس";
  if (d === 1) return "غدًا";
  return formatDayMonth(iso);
}

export function cardNote(c: TrainerCourseItem): { text: string; alert: boolean } {
  if (c.isDraft) {
    const first = c.blockers[0];
    return { text: first ? (BLOCKER_WAITING[first] ?? "بانتظار إكمال الإعداد") : "جاهزة للنشر — راجعها وانشرها", alert: Boolean(first) };
  }
  if (c.state === "cancelled") return { text: "أُلغيت الدورة", alert: false };
  if (c.state === "ended") return { text: "انتهت الدورة", alert: false };
  const total = c.sessions.filter((s) => s.status !== "cancelled").length;
  if (c.missedAttendance) {
    return { text: `الجلسة ${toArabicDigits(c.missedAttendance.position)} انتهت ${relDay(c.missedAttendance.endsAt)} ولم يُرصد الحضور`, alert: true };
  }
  if (c.mode === "recorded") return { text: pluralAr(c.publishedLessons, ["ملف واحد منشور", "ملفان منشوران", "ملفات منشورة", "ملفًا منشورًا"]), alert: false };
  if (c.state === "full" && c.waitlist > 0) return { text: `${toArabicDigits(c.waitlist)} في قائمة الانتظار`, alert: false };
  if (c.todaySession) {
    return { text: `الجلسة ${toArabicDigits(c.todaySession.position)} من ${toArabicDigits(total)} اليوم ${formatTime(c.todaySession.startsAt)}`, alert: false };
  }
  if (c.startsAt && daysUntil(c.startsAt) > 0) return { text: `تبدأ بعد ${pluralAr(daysUntil(c.startsAt), ["يوم واحد", "يومين", "أيام", "يومًا"])}`, alert: false };
  if (c.nextSession) {
    return { text: `الجلسة ${toArabicDigits(c.nextSession.position)} من ${toArabicDigits(total)} · ${relDay(c.nextSession.startsAt)} ${formatTime(c.nextSession.startsAt)}`, alert: false };
  }
  return { text: "لا جلسات قادمة", alert: false };
}

function cardAction(c: TrainerCourseItem): { label: string; href: string; primary: boolean } {
  if (c.isDraft) return { label: "أكمل الإعداد", href: setupHref(c), primary: true };
  if (c.state === "running" && (c.todaySession || c.missedAttendance) && c.mode !== "recorded") {
    return { label: "ارصد الحضور", href: `/trainer/courses/${c.id}/attendance`, primary: Boolean(c.missedAttendance) };
  }
  if (c.state === "full") return { label: "اعرض قائمة الانتظار", href: `/trainer/courses/${c.id}/trainees?tab=waitlist`, primary: false };
  if (c.mode === "recorded") return { label: "اعرض المشترين", href: `/trainer/courses/${c.id}/sales`, primary: false };
  if (c.state === "ended") return { label: "اعرض النتائج", href: `/trainer/courses/${c.id}/results`, primary: false };
  if (c.state === "running") return { label: "ارصد الحضور", href: `/trainer/courses/${c.id}/attendance`, primary: false };
  return { label: "عدّل الدورة", href: `/trainer/courses/${c.id}`, primary: false };
}

function MetaItem({ icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap type-caption text-text-secondary">
      {children}
      <Glyph icon={icon} size={16} />
    </span>
  );
}

export function placeLabel(c: Pick<TrainerCourseItem, "mode" | "venue" | "city">): string {
  if (c.mode === "recorded") return "كورس مسجَّل · وصول دائم";
  if (c.mode === "live_remote") return "جلسات مباشرة عبر الإنترنت";
  return [c.venue, c.city].filter(Boolean).join(" · ") || "المكان لم يُحدَّد بعد";
}

/** Course card (271:4119 default · 271:4172 needs-action · 271:4225 full · 271:4284 recorded · 271:4428 draft). */
export function CourseCard({ c }: { c: TrainerCourseItem }) {
  const note = cardNote(c);
  const action = cardAction(c);
  const alert = note.alert;
  const style = STATE_STYLE[c.state];
  const first = c.sessions.find((s) => s.status !== "cancelled") ?? null;
  return (
    <article
      className={`flex flex-col gap-4 rounded-16 px-5 py-[18px] shadow-card sm:flex-row sm:items-start sm:gap-[18px] ${
        alert ? "border-2 border-state-error bg-state-error-bg" : "border border-border-default bg-bg-card"
      }`}
    >
      <span className={`hidden size-14 shrink-0 items-center justify-center rounded-12 sm:flex ${c.isDraft ? STATE_STYLE.upcoming.tile : style.tile}`}>
        <Glyph icon={c.isDraft ? CalendarDays : style.icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <h3 className="min-w-0 flex-1 type-title text-text-primary">
            <Link href={courseHref(c)} className="rounded-8 hover:underline focus-ring">
              {c.title}
            </Link>
          </h3>
          <ModeBadge mode={c.mode} />
          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[5px] type-caption ${alert ? `bg-bg-surface ${style.pill.split(" ")[1]}` : style.pill}`}>
            {style.label}
            <Glyph icon={style.icon} size={16} />
          </span>
        </div>
        <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-8 px-3 py-2.5 ${alert ? "bg-bg-surface" : "bg-bg-page"}`}>
          <MetaItem icon={CalendarDays}>{c.mode === "recorded" ? "متاح فور الشراء · بلا جدول" : scheduleLabel(c.startsAt, c.endsAt, first)}</MetaItem>
          <MetaItem icon={MapPin}>{placeLabel(c)}</MetaItem>
          <MetaItem icon={Users}>
            {c.mode === "recorded" ? pluralAr(c.buyers, ["مشترٍ واحد", "مشتريان", "مشترين", "مشتريًا"]) : `${toArabicDigits(c.seatsTaken)} من ${toArabicDigits(c.capacity ?? 0)}`}
          </MetaItem>
        </div>
        <p className={`flex items-center gap-2 type-caption ${alert ? "text-state-error" : "text-text-muted"}`}>
          <Glyph icon={alert ? CircleAlert : Info} size={16} />
          <span className="flex-1">{note.text}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:gap-2.5">
        <ButtonLink href={action.href} variant={action.primary ? "primary" : "outline"} className="min-w-[120px]">
          {action.label}
        </ButtonLink>
        <Link href={courseHref(c)} className="rounded-8 type-caption text-text-brand hover:underline focus-ring">
          تفاصيل الدورة
        </Link>
      </div>
    </article>
  );
}

/** «البرنامج مقابل الدورة» + «توفّرك هذا الشهر» (271:4117). */
export function SidePanels({ availability }: { availability: TrainerCoursesList["availability"] }) {
  const pct = availability.daysInMonth ? Math.round((availability.busyDays / availability.daysInMonth) * 100) : 0;
  const free = availability.nextFreeDay;
  const freeLabel = free
    ? `${new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { weekday: "long", timeZone: "UTC" }).format(new Date(`${free}T12:00:00Z`))} ${formatDayMonth(`${free}T12:00:00+03:00`)}`
    : null;
  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[360px]">
      <section className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
        <h2 className="type-h3 text-text-primary">البرنامج مقابل الدورة</h2>
        {[
          { icon: BookOpen, title: "البرنامج", tone: "text-text-brand", text: "المحتوى المعتمد: الوصف والأهداف والمواد والسعر المرجعي. يُكتب مرة ويُراجع مرة." },
          { icon: CalendarDays, title: "الدورة", tone: "text-state-success", text: "تنفيذ مجدول للبرنامج: تاريخ ومكان ومقاعد وسعر فعلي. تنشئ منه ما شئت." },
        ].map((b) => (
          <div key={b.title} className="flex items-start gap-2.5 rounded-12 bg-bg-page px-3 py-[11px]">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${b.tone}`}>
              <Glyph icon={b.icon} size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className={`type-small ${b.tone}`}>{b.title}</p>
              <p className="type-caption text-text-muted">{b.text}</p>
            </div>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
        <h2 className="type-h3 text-text-primary">توفّرك هذا الشهر</h2>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between type-caption text-text-secondary">
            <span>
              {pluralAr(availability.busyDays, ["يوم واحد مشغول", "يومان مشغولان", "أيام مشغولة", "يومًا مشغولًا"])} من {toArabicDigits(availability.daysInMonth)}
            </span>
            <span>{formatPercent(pct)}</span>
          </div>
          <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="الأيام المشغولة هذا الشهر" className="h-2.5 overflow-hidden rounded-full bg-border-default">
            <div className="h-full rounded-full bg-action-accent" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="type-caption text-text-secondary">
          {freeLabel ? `أقرب يوم متاح لدورة جديدة: ${freeLabel}. ` : ""}الجدولة تفحص التعارض تلقائيًا.
        </p>
        <ButtonLink href="/trainer/calendar" variant="outline" fullWidth>
          افتح تقويمي
        </ButtonLink>
      </section>
    </aside>
  );
}

/** «دورة مباشرة جاهزة للإدارة» (4236:716) + «أدر الدورة» (4236:738). */
export function LiveReadyCard({ c }: { c: TrainerCourseItem }) {
  const s = c.nextSession!;
  const rows: InfoRow[] = [
    { label: "الدورة", value: c.title },
    { label: "النمط", value: "مباشر", tone: "brand" },
    { label: "الموعد القادم", value: `الجلسة ${toArabicDigits(s.position)} · ${formatDayMonth(s.startsAt)} · ${formatTime(s.startsAt)}` },
    { label: "رابط الجلسة", value: "مرفوع وجاهز", tone: "success" },
    { label: "المقاعد", value: `${toArabicDigits(c.seatsTaken)} من ${toArabicDigits(c.capacity ?? 0)}` },
  ];
  return (
    <>
      <InfoPanel title="دورة مباشرة جاهزة للإدارة" rows={rows} highlight />
      <div className="flex justify-end">
        <Link href={`/trainer/courses/${c.id}`} className="rounded-[10px] bg-action-primary px-7 py-[15px] text-[16px] font-bold text-text-on-brand focus-ring hover:bg-action-primary-hover">
          أدر الدورة
        </Link>
      </div>
    </>
  );
}

/** TRR-CRS-01 · فارغة (313:10290). */
export function EmptyCourses({ program }: { program: { id: string; title: string } | null }) {
  return (
    <>
      <section className="flex flex-col items-center gap-5 rounded-22 bg-bg-brand-tint px-5 py-10 text-center sm:px-12 sm:py-[52px]">
        {program && (
          <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-surface px-3.5 py-[9px] type-subtitle text-text-brand">
            برنامجك الأول منشور ✓
            <Glyph icon={Info} size={20} />
          </span>
        )}
        <span className="flex size-24 items-center justify-center rounded-22 bg-bg-surface text-text-brand">
          <Glyph icon={CalendarDays} size={32} />
        </span>
        <h2 className="text-[30px] leading-[1.15] font-bold text-text-primary sm:text-[44px]">أنشئ أول دورة من برنامجك</h2>
        <p className="max-w-[900px] type-body-lg text-text-secondary">
          {program
            ? `برنامج «${program.title}» معتمد وجاهز. حدّد التاريخ والمكان والمقاعد ليبدأ المتدربون بالتسجيل — المحتوى موروث ولا تعيد كتابته.`
            : "الدورة هي التنفيذ المجدول لبرنامج منشور — بتاريخ ومكان ومقاعد. انشر برنامجك أولًا ثم أنشئ منه دوراتك."}
        </p>
        <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
          {program && (
            <ButtonLink href={`/trainer/courses/new?program=${program.id}`} size="l" className="w-full sm:w-[320px]">
              أنشئ دورة من هذا البرنامج
            </ButtonLink>
          )}
          <ButtonLink href="/trainer/programs" variant="outline" size="l" className="w-full sm:w-[240px]">
            اعرض برامجي
          </ButtonLink>
        </div>
      </section>
      <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-[26px] shadow-card">
        <h2 className="type-h2 text-text-primary">كيف تسير الخطوات؟</h2>
        <ol className="flex flex-col items-stretch sm:grid sm:grid-cols-3 sm:gap-12">
          {[
            { icon: CalendarDays, title: "حدّد التواريخ", text: "ونفحص التعارض تلقائيًا", tone: "text-text-brand" },
            { icon: Users, title: "حدّد المقاعد والسعر", text: "وسياسة الحضور", tone: "text-state-info" },
            { icon: CircleCheckBig, title: "انشر", text: "ويبدأ التسجيل فورًا", tone: "text-state-success" },
          ].map((s, i) => (
            <li key={s.title} className="relative flex flex-col items-stretch">
              {i > 0 && (
                <span aria-hidden className="flex h-8 items-center justify-center text-text-muted sm:absolute sm:-start-12 sm:top-[42px] sm:h-5 sm:w-12">
                  <Glyph icon={ChevronLeft} size={20} className="rotate-[-90deg] sm:rotate-0" />
                </span>
              )}
              <div className="flex flex-1 flex-col items-center gap-3 rounded-16 bg-bg-page px-[18px] pt-6 pb-[26px] text-center">
                <span className={`flex size-14 items-center justify-center rounded-16 bg-bg-surface ${s.tone}`}>
                  <Glyph icon={s.icon} size={20} />
                </span>
                <p className="type-title text-text-primary">{s.title}</p>
                <p className="type-body text-text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="flex items-start gap-4 rounded-16 bg-state-warning-bg px-6 pt-[22px] pb-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-warning">
          <Glyph icon={Lightbulb} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="type-h3 text-state-warning">المحتوى لا يُعاد كتابته</h2>
          <p className="type-body-lg text-text-secondary">تنشئ من البرنامج الواحد دورات متعددة بتواريخ وأماكن مختلفة — الوصف والأهداف والمواد تُورَّث تلقائيًا.</p>
        </div>
      </section>
    </>
  );
}

export { riyadhParts };
