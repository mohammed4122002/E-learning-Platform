import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleCheckBig, EyeOff, Info } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { SideCard } from "@/components/trainer/JourneyParts";
import { CalendarBoard, ConflictBanner, type MonthCell, type WeekDay } from "@/components/trainer/CalendarBoard";
import { requireTrainer } from "@/lib/auth";
import { findConflicts, freeDays, loadCalendar, suggestSlots, typicalSessionMinutes } from "@/lib/data/trainer-calendar";
import { formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import {
  LEGEND,
  TONE_DOT,
  WEEKDAYS,
  addDays,
  addMonths,
  clockLabel,
  dayLabel,
  dayMonthLabel,
  dayStart,
  daysInMonth,
  isYmd,
  monthLabel,
  monthStart,
  onDay,
  riyadhMinutes,
  weekStart,
  weekdayOf,
  ymdOf,
  type CalView,
} from "@/lib/trainer-calendar";

export const metadata: Metadata = { title: "تقويمي", description: "كل ارتباطاتك في مكان واحد" };

/** Tabs in the Figma visual order (right → left). */
const VIEWS: { value: CalView; label: string }[] = [
  { value: "month", label: "شهري" },
  { value: "week", label: "أسبوعي" },
  { value: "day", label: "يومي" },
];
const SUBTITLE: Record<CalView, string> = { month: "كل ارتباطاتك في مكان واحد", week: "عرض أسبوعي", day: "عرض يومي" };
const STEP: Record<CalView, string> = { month: "الشهر", week: "الأسبوع", day: "اليوم" };

const hrefOf = (view: CalView, date: string) => `/trainer/calendar?view=${view}&date=${date}`;

/** TRR-CAL-01 · تقويمي — monthly (254:388) and weekly with a conflict (254:814); daily reuses the weekly grid. */
export default async function TrainerCalendarPage(props: PageProps<"/trainer/calendar">) {
  const user = await requireTrainer("/trainer/calendar");
  const sp = await props.searchParams;
  const view: CalView = sp.view === "week" || sp.view === "day" ? sp.view : "month";
  const today = ymdOf(new Date());
  const anchor = isYmd(sp.date) ? sp.date : today;
  const saved = sp.saved === "added" || sp.saved === "updated" ? sp.saved : null;

  const first = view === "month" ? monthStart(anchor) : view === "week" ? weekStart(anchor) : anchor;
  const next = view === "month" ? addMonths(first, 1) : addDays(first, view === "week" ? 7 : 1);
  const prevAnchor = view === "month" ? addMonths(first, -1) : addDays(first, view === "week" ? -7 : -1);
  const { o, all, visible } = await loadCalendar(user.id, dayStart(first), dayStart(next));

  // Month cells: blanks before the 1st and after the last day, like the Figma grid.
  const monthCells: MonthCell[] = [];
  if (view === "month") {
    const lead = weekdayOf(first);
    const n = daysInMonth(first);
    for (let i = 0; i < lead; i++) monthCells.push({ ymd: null, day: 0, isToday: false });
    for (let d = 1; d <= n; d++) {
      const ymd = addDays(first, d - 1);
      monthCells.push({ ymd, day: d, isToday: ymd === today });
    }
    while (monthCells.length % 7) monthCells.push({ ymd: null, day: 0, isToday: false });
  }
  const weekDays: WeekDay[] =
    view === "month"
      ? []
      : Array.from({ length: view === "week" ? 7 : 1 }, (_, i) => {
          const ymd = addDays(first, i);
          return { ymd, weekday: WEEKDAYS[weekdayOf(ymd)], day: Number(ymd.slice(8)), isToday: ymd === today };
        });

  const conflicts = view === "month" ? [] : findConflicts(visible);
  const c0 = conflicts[0];
  const conflictText = c0
    ? `موعد «${c0.b.title}» يوم ${dayLabel(ymdOf(c0.a.startsAt))} ${clockLabel(riyadhMinutes(c0.a.startsAt))} يتعارض مع «${c0.a.title}». اختر وقتًا آخر أو انقل الموعد الحالي.`
    : null;

  // «عرض الدورة المباشرة / الحضورية»: the trainer's nearest scheduled course of each mode.
  const now = new Date().getTime();
  const nearest = (live: boolean) =>
    o.courses
      .filter((c) => (live ? c.mode !== "in_person" : c.mode === "in_person") && (c.status === "open" || c.status === "in_progress"))
      .sort((a, b) => {
        const ta = a.startsAt ? Math.abs(new Date(a.startsAt).getTime() - now) : Infinity;
        const tb = b.startsAt ? Math.abs(new Date(b.startsAt).getTime() - now) : Infinity;
        return ta - tb;
      })[0];
  const liveCourse = nearest(true);
  const inPersonCourse = nearest(false);

  const title = view === "day" ? dayLabel(anchor) : monthLabel(first);

  return (
    <>
      <TopBar title="تقويمي" subtitle={SUBTITLE[view]} />
      <PageBody className="gap-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4 rounded-16 border border-border-default bg-bg-surface px-5 py-4 shadow-card">
          <nav aria-label="طريقة العرض" className="flex rounded-12 bg-bg-page p-1">
            {VIEWS.map((v) => (
              <Link
                key={v.value}
                href={hrefOf(v.value, anchor)}
                aria-current={v.value === view ? "page" : undefined}
                className={`flex h-11 items-center rounded-12 px-5 focus-ring ${v.value === view ? "bg-bg-surface type-subtitle text-text-brand shadow-card" : "type-body text-text-secondary hover:text-text-primary"}`}
              >
                {v.label}
              </Link>
            ))}
          </nav>
          <ButtonLink href={hrefOf(view, today)} variant="outline" className="w-[118px]">
            اليوم
          </ButtonLink>
          <div className="flex items-center gap-3">
            <Link href={hrefOf(view, prevAnchor)} aria-label={`${STEP[view]} السابق`} className="flex size-11 items-center justify-center rounded-12 bg-bg-page text-text-secondary hover:text-text-primary focus-ring">
              <Glyph icon={ChevronLeft} size={20} />
            </Link>
            <h2 className="min-w-[120px] text-center type-h3 text-text-primary" aria-live="polite">
              {title}
            </h2>
            <Link href={hrefOf(view, next)} aria-label={`${STEP[view]} التالي`} className="flex size-11 items-center justify-center rounded-12 bg-bg-page text-text-secondary hover:text-text-primary focus-ring">
              <Glyph icon={ChevronRight} size={20} />
            </Link>
          </div>
          <ButtonLink href={`/trainer/calendar/new${anchor !== today ? `?date=${anchor}` : ""}`} className="w-full sm:ms-auto sm:w-auto">
            أضف موعدًا
          </ButtonLink>
        </div>

        {(liveCourse || inPersonCourse) && (
          <div className="flex flex-wrap gap-3">
            {liveCourse && (
              <ButtonLink href={`/trainer/courses/${liveCourse.id}`} className="flex-1 sm:flex-none">
                عرض الدورة المباشرة
              </ButtonLink>
            )}
            {inPersonCourse && (
              <ButtonLink href={`/trainer/courses/${inPersonCourse.id}`} className="flex-1 sm:flex-none">
                عرض الدورة الحضورية
              </ButtonLink>
            )}
          </div>
        )}

        {conflictText && <ConflictBanner text={conflictText} />}

        <ul aria-label="دليل الألوان" className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-12 bg-bg-page px-5 py-4 type-small text-text-secondary">
          <li className="text-text-muted">دليل الألوان:</li>
          {LEGEND.map((l) => (
            <li key={l.tone} className="flex items-center gap-2">
              <span aria-hidden className={`size-2.5 rounded-full ${TONE_DOT[l.tone]}`} />
              <span>{l.label}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <CalendarBoard view={view} monthCells={monthCells} weekDays={weekDays} entries={visible} conflictKeys={conflicts.map((c) => c.a.key)} saved={saved} />
          </div>
          <aside className="flex w-full flex-col gap-5 lg:w-[336px] lg:shrink-0">
            {view === "month" ? <MonthSide all={all} visible={visible} today={today} first={first} /> : <WeekSide all={all} today={today} />}
          </aside>
        </div>
      </PageBody>
    </>
  );
}

type Entries = Awaited<ReturnType<typeof loadCalendar>>["all"];

function MonthSide({ all, visible, today, first }: { all: Entries; visible: Entries; today: string; first: string }) {
  const free = freeDays(all, today);
  const n = daysInMonth(first);
  const days = Array.from({ length: n }, (_, i) => addDays(first, i));
  const busy = days.filter((d) => visible.some((e) => onDay(e, d))).length;
  const courses = new Set(visible.filter((e) => e.source === "session").map((e) => e.courseId)).size;
  const orgs = new Set(visible.filter((e) => e.tone === "external").map((e) => e.key)).size;
  const leave = days.filter((d) => visible.some((e) => e.tone === "leave" && onDay(e, d))).length;
  const pct = n ? (busy / n) * 100 : 0;

  return (
    <>
      <SideCard title="أقرب موعد متاح" id="nearest-free">
        {free.length ? (
          <div className="flex items-center gap-3 rounded-12 bg-state-success-bg px-4 py-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-success">
              <Glyph icon={CircleCheckBig} size={20} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="type-subtitle text-state-success">{dayLabel(free[0])}</p>
              <p className="type-caption text-text-secondary">
                يوم كامل متاح
                {free.length > 1 && ` · ثم ${free.slice(1).map((d) => toArabicDigits(Number(d.slice(8)))).join(" و")} ${dayMonthLabel(free[free.length - 1]).split(" ").slice(1).join(" ")}`}
              </p>
            </div>
          </div>
        ) : (
          <p className="rounded-12 bg-bg-page px-4 py-3.5 type-small text-text-secondary">لا يوجد يوم متاح بالكامل خلال الستين يومًا القادمة.</p>
        )}
        <p className="type-small text-text-secondary">هذا ما تراه الجهات التدريبية عند فتح ملفك — وهو ما تبني عليه قرار إرسال عرض.</p>
      </SideCard>

      <SideCard title="إشغالك هذا الشهر" id="occupancy">
        <div className="flex items-center justify-between gap-3 type-caption text-text-secondary">
          <span>
            {pluralAr(busy, ["يوم واحد مشغول", "يومان مشغولان", "أيام مشغولة", "يومًا مشغولًا"])} من {toArabicDigits(n)}
          </span>
          <span>{formatPercent(pct)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border-default" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="نسبة الإشغال">
          <div className="h-full rounded-full bg-state-rating" style={{ width: `${pct}%` }} />
        </div>
        <dl className="grid grid-cols-3 gap-2.5">
          {[
            { label: "إجازة", value: leave },
            { label: "جهات", value: orgs },
            { label: "دورات", value: courses },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 rounded-12 bg-bg-page px-2 py-3.5">
              <dt className="order-last type-caption text-text-secondary">{s.label}</dt>
              <dd className="type-h3 text-text-primary">{toArabicDigits(s.value)}</dd>
            </div>
          ))}
        </dl>
      </SideCard>

      <SideCard title="ما تراه الجهات" id="orgs-see">
        <ul className="flex flex-col gap-4">
          {["الأيام المتاحة وأوقاتها", "أقرب موعد متاح", "نسبة إشغالك"].map((t) => (
            <li key={t} className="flex items-center gap-2 rounded-12 bg-state-success-bg px-3.5 py-3 type-small text-state-success">
              <Glyph icon={CircleCheckBig} size={16} />
              {t}
            </li>
          ))}
          {["لا ترى سبب انشغالك", "لا ترى مواعيدك الشخصية", "لا ترى أسماء جهات أخرى"].map((t) => (
            <li key={t} className="flex items-center gap-2 rounded-12 bg-bg-page px-3.5 py-3 type-small text-text-secondary">
              <Glyph icon={EyeOff} size={16} className="text-state-error" />
              {t}
            </li>
          ))}
        </ul>
        <p className="type-small text-text-secondary">المواعيد الشخصية والإجازات تظهر لهم بكلمة «غير متاح» فقط — بلا سبب ولا تفصيل.</p>
        <ButtonLink href="/trainer/profile#availability" variant="outline" fullWidth>
          عاين توفّري كما تراه الجهات
        </ButtonLink>
      </SideCard>
    </>
  );
}

function WeekSide({ all, today }: { all: Entries; today: string }) {
  const typical = typicalSessionMinutes(all);
  const minutes = typical ?? 120;
  const slots = suggestSlots(all, today, minutes);
  const hours = Math.round((minutes / 60) * 2) / 2;
  const hoursText = Number.isInteger(hours) ? pluralAr(hours, ["ساعة", "ساعتان", "ساعات", "ساعة"]) : `${toArabicDigits(hours)} ساعة`;
  return (
    <>
      <SideCard title="اقتراح تلقائي" id="suggest">
        <p className="type-body text-text-secondary">
          {typical ? `أقرب ثلاثة أوقات متاحة تناسب مدة دورتك (${hoursText}):` : "أقرب ثلاثة أوقات متاحة في تقويمك:"}
        </p>
        {slots.length ? (
          <ul className="flex flex-col gap-4">
            {slots.map((s) => (
              <li key={s.ymd} className="flex items-center gap-3 rounded-12 bg-state-success-bg px-3 py-3.5">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="type-small text-text-primary">{dayLabel(s.ymd)}</p>
                  <p className="type-caption text-state-success">
                    {clockLabel(s.from)} - {clockLabel(s.to)} · متاح كليًا
                  </p>
                </div>
                <ButtonLink
                  href={`/trainer/calendar/new?date=${s.ymd}&from=${hm(s.from)}&to=${hm(Math.min(s.from + minutes, s.to))}`}
                  variant="outline"
                  size="s"
                  className="w-[118px] bg-bg-surface/60"
                  aria-label={`اختر ${dayLabel(s.ymd)}`}
                >
                  اختر
                </ButtonLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-12 bg-bg-page px-4 py-3.5 type-small text-text-secondary">لا توجد أوقات متاحة خلال الأسابيع القادمة.</p>
        )}
      </SideCard>
      <SideCard title="تعديل سريع" id="quick-edit">
        <p className="type-body text-text-secondary">اسحب أي موعد وأفلته في خانة أخرى لنقله. سنتحقق من التعارض تلقائيًا قبل التثبيت ونطلب تأكيدك.</p>
        <p className="flex items-start gap-2 rounded-12 bg-state-warning-bg px-3.5 py-3 type-small text-state-warning">
          <Glyph icon={Info} size={16} className="mt-1" />
          نقل دورة فيها مسجّلون يرسل إشعارًا لكل متدرب.
        </p>
      </SideCard>
    </>
  );
}

function hm(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}
