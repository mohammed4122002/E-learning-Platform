"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CircleCheck,
  CircleX,
  Link2,
  Lock,
  MapPin,
  MessageSquare,
  MonitorPlay,
  Pencil,
  Shield,
  TriangleAlert,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { formatDayMonth, formatTime, pluralAr, toArabicDigits } from "@/lib/format";
import { WEEKDAYS, overlaps, planSessions, riyadhParts, weekdaysLabel, type PlannedSession } from "@/lib/trainer-courses";
import type { CourseMode } from "@/types/views";
import { saveCourseSessions } from "@/app/(trainer)/trainer/courses/actions";
import { useWizard } from "./WizardShell";

/* TRR-CRS-02 · ٣ الجدولة (حضوري 271:4539) and ٣ البث والمواعيد (مباشر 395:15897). */

export type BusySlotView = { startsAt: string; endsAt: string; label: string };

type Props = {
  courseId: string;
  mode: Exclude<CourseMode, "recorded">;
  modules: { id: string; title: string }[];
  sessions: { title: string; startsAt: string; endsAt: string; moduleId: string | null }[];
  busy: BusySlotView[];
  venue: string;
  city: string;
  meetingPlatform: string | null;
  meetingUrl: string;
  flags: { recordSessions: boolean; liveQuestions: boolean; autoAttendance: boolean };
};

const dayName = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { weekday: "long", timeZone: "Asia/Riyadh" });

function sessionLabel(s: { startsAt: string; endsAt: string }) {
  return `${dayName.format(new Date(s.startsAt))} ${formatDayMonth(s.startsAt)} · ${formatTime(s.startsAt).replace(/\s?[صم]$/, "")} – ${formatTime(s.endsAt)}`;
}

function Card({ title, children, className = "", big = false }: { title?: React.ReactNode; children: React.ReactNode; className?: string; big?: boolean }) {
  return (
    <section className={`flex flex-col ${big ? "gap-[18px] rounded-22 p-[26px]" : "gap-4 rounded-16 p-6"} border border-border-default bg-bg-card shadow-card ${className}`}>
      {title && <h3 className={big ? "type-h2 text-text-primary" : "type-h3 text-text-primary"}>{title}</h3>}
      {children}
    </section>
  );
}

function initialParams(sessions: Props["sessions"]) {
  if (sessions.length === 0) return { from: "", to: "", start: "17:00", end: "21:00", days: [] as number[] };
  const first = riyadhParts(sessions[0].startsAt);
  const last = riyadhParts(sessions[sessions.length - 1].startsAt);
  return {
    from: first.date,
    to: last.date,
    start: first.time,
    end: riyadhParts(sessions[0].endsAt).time,
    days: [...new Set(sessions.map((s) => riyadhParts(s.startsAt).weekday))],
  };
}

export function ScheduleStep(props: Props) {
  const { courseId, mode, modules, busy } = props;
  const { save, run, flush } = useWizard();
  const router = useRouter();
  const init = useMemo(() => initialParams(props.sessions), [props.sessions]);
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [start, setStart] = useState(init.start);
  const [end, setEnd] = useState(init.end);
  const [days, setDays] = useState<number[]>(init.days);
  // Per-session edits keyed by start instant (survive regeneration when dates move).
  const [titles, setTitles] = useState<Record<string, string>>(() => Object.fromEntries(props.sessions.map((s) => [s.startsAt, s.title])));
  const [removed, setRemoved] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [venue, setVenue] = useState(props.venue);
  const [city, setCity] = useState(props.city);
  const [platform, setPlatform] = useState(props.meetingPlatform ?? "zoom");
  const [url, setUrl] = useState(props.meetingUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [flags, setFlags] = useState(props.flags);
  const [ignored, setIgnored] = useState(false);
  const [suggest, setSuggest] = useState(false);
  const [leaving, setLeaving] = useState<"next" | "later" | null>(null);

  const planned: PlannedSession[] = useMemo(
    () =>
      planSessions({ from, to, startTime: start, endTime: end, days, modules })
        .filter((s) => !removed.includes(s.startsAt))
        .map((s) => ({ ...s, title: titles[s.startsAt] ?? s.title })),
    [from, to, start, end, days, modules, removed, titles],
  );
  const conflicts = planned
    .map((s) => ({ s, hit: busy.find((b) => overlaps(s, b)) }))
    .filter((c): c is { s: PlannedSession; hit: BusySlotView } => Boolean(c.hit));
  const hours = planned.reduce((sum, s) => sum + (Date.parse(s.endsAt) - Date.parse(s.startsAt)) / 3_600_000, 0);
  const sessionHours = planned[0] ? (Date.parse(planned[0].endsAt) - Date.parse(planned[0].startsAt)) / 3_600_000 : 0;

  // Autosave the generated schedule.
  const firstRun = useRef(true);
  const key = JSON.stringify(planned);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      void run(() => saveCourseSessions(courseId, planned));
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const suggestions = useMemo(() => {
    if (!suggest || planned.length === 0 || !from || !to) return [];
    const out: { from: string; to: string; days: number[] }[] = [];
    const shift = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
    const daySets: number[][] = [days, [2, 4], [0, 1], [1, 3], [0, 2], [3, 4]].filter((s) => s.length === days.length || s === days);
    for (let week = 1; week <= 12 && out.length < 3; week++) {
      for (const set of daySets) {
        const f = shift(from, week * 7);
        const t = shift(to, week * 7);
        const plan = planSessions({ from: f, to: t, startTime: start, endTime: end, days: set, modules });
        if (plan.length > 0 && !plan.some((s) => busy.some((b) => overlaps(s, b))) && !out.some((o) => o.from === f && o.days.join() === set.join())) {
          out.push({ from: f, to: t, days: set });
          break;
        }
      }
    }
    return out;
  }, [suggest, planned.length, from, to, days, start, end, modules, busy]);

  async function leave(target: "next" | "later") {
    setLeaving(target);
    const ok = await flush();
    const res = await run(() => saveCourseSessions(courseId, planned));
    setLeaving(null);
    if (ok && res?.ok) router.push(target === "next" ? `/trainer/courses/${courseId}/setup/pricing` : "/trainer/courses");
  }

  const toggleDay = (d: number) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]));

  const datesFields = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="date" label="تاريخ البداية" value={from} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" label="تاريخ النهاية" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="time" label="من الساعة" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input type="time" label="إلى الساعة" value={end} onChange={(e) => setEnd(e.target.value)} error={end && start && end <= start ? "وقت النهاية بعد وقت البداية." : undefined} />
      </div>
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 type-subtitle text-text-primary">أيام الجلسات</legend>
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7">
          {WEEKDAYS.map((d) => {
            const on = days.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(d.value)}
                className={`cursor-pointer rounded-12 border-[1.5px] py-3.5 text-center type-subtitle focus-ring ${
                  on ? "border-action-primary bg-action-primary text-text-on-brand" : "border-border-default bg-bg-page text-text-secondary hover:border-action-primary"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </>
  );

  const conflictBox =
    conflicts.length > 0 && !ignored ? (
      <div role="alert" className="flex flex-col gap-3.5 rounded-12 border-2 border-state-error bg-state-error-bg px-[18px] pt-4 pb-[18px]">
        <p className="flex items-center gap-2.5 type-subtitle text-state-error">
          <Glyph icon={TriangleAlert} size={20} />
          <span className="flex-1">تعارض في جدولك — {pluralAr(conflicts.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])}</span>
        </p>
        {conflicts.slice(0, 4).map(({ s, hit }) => (
          <div key={s.startsAt} className="flex flex-col gap-0.5 rounded-8 bg-bg-surface px-3 py-2.5">
            <p className="type-small text-state-error">
              {dayName.format(new Date(s.startsAt))} {formatDayMonth(s.startsAt)} · {formatTime(s.startsAt)}
            </p>
            <p className="type-caption text-text-muted">{hit.label.startsWith("«") ? `تتعارض مع ${hit.label}` : `تتعارض مع ${hit.label}`}</p>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setSuggest(true)}>اقترح تواريخ خالية</Button>
          <Button variant="outline" className="w-[120px]" onClick={() => setIgnored(true)}>
            تجاهل وأكمل
          </Button>
        </div>
        <p className="type-caption text-text-secondary">التجاهل مسموح لكنه يعني جلستين متزامنتين — تأكد أنك تستطيع الالتزام.</p>
      </div>
    ) : null;

  const continueCard = (note: string, noteTone: string, prevLabel: string, laterLabel: string, big: boolean) => (
    <Card title="متابعة" big={big}>
      <p className={big ? `type-body ${noteTone}` : `type-caption ${noteTone}`}>{note}</p>
      <Button size="l" fullWidth loading={leaving === "next"} disabled={planned.length === 0} onClick={() => void leave("next")}>
        التالي
      </Button>
      <Button size="l" variant="outline" fullWidth loading={leaving === "later"} onClick={() => void leave("later")}>
        {laterLabel}
      </Button>
      <Link href={`/trainer/courses/${courseId}/setup/mode`} className="flex h-14 items-center justify-center rounded-12 type-body-lg text-text-brand hover:bg-bg-brand-tint focus-ring">
        {prevLabel}
      </Link>
    </Card>
  );

  if (mode === "live_remote") {
    const platforms: { key: string; title: string; hint: string; icon: LucideIcon }[] = [
      { key: "zoom", title: "Zoom", hint: "حضور آلي من تقرير الجلسة", icon: Video },
      { key: "google_meet", title: "Google Meet", hint: "حضور آلي من التقرير", icon: MonitorPlay },
      { key: "other", title: "منصة أخرى", hint: "ترصد الحضور يدويًا", icon: Link2 },
    ];
    const toggles: { key: keyof Props["flags"]; field: "record_sessions" | "live_questions" | "auto_attendance"; title: string; hint: string; icon: LucideIcon }[] = [
      { key: "recordSessions", field: "record_sessions", title: "سجّل الجلسات وأتحها للمسجّلين", hint: "من فاتته الجلسة يشاهدها لاحقًا · ترفع رضا المتدربين", icon: Video },
      { key: "liveQuestions", field: "live_questions", title: "افتح الأسئلة أثناء البث", hint: "يكتبون أسئلتهم وتردّ عليها في نهاية الجلسة", icon: MessageSquare },
      {
        key: "autoAttendance",
        field: "auto_attendance",
        title: "رصد الحضور آليًا",
        hint: `من تقرير ${platform === "google_meet" ? "Google Meet" : "Zoom"} · حضور ٣٠ دقيقة فأكثر يُحتسب`,
        icon: CircleCheck,
      },
    ];
    return (
      <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[26px]">
          <Card title="منصة البث" big>
            <p className="type-body text-text-muted">تختار المنصة وتضع الرابط. المنصة لا تبثّ — تنظّم المواعيد وترصد الحضور من تقرير الجلسة.</p>
            <div role="radiogroup" aria-label="منصة البث" className="grid gap-4 sm:grid-cols-3">
              {platforms.map((p) => {
                const on = platform === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setPlatform(p.key);
                      save({ meeting_platform: p.key as "zoom" | "google_meet" | "other", ...(p.key === "other" ? { auto_attendance: false } : {}) });
                      if (p.key === "other") setFlags((f) => ({ ...f, autoAttendance: false }));
                    }}
                    className={`flex cursor-pointer flex-col items-center gap-2.5 rounded-16 px-[18px] pt-5 pb-[22px] text-center focus-ring ${
                      on ? "border-2 border-action-primary bg-bg-brand-tint" : "border-[1.5px] border-border-default bg-bg-page hover:border-action-primary"
                    }`}
                  >
                    <span className={`flex size-12 items-center justify-center rounded-12 ${on ? "bg-action-primary text-text-on-brand" : "bg-bg-surface text-text-brand"}`}>
                      <Glyph icon={p.icon} size={20} />
                    </span>
                    <span className={`type-title ${on ? "text-text-brand" : "text-text-primary"}`}>{p.title}</span>
                    <span className="type-caption text-text-muted">{p.hint}</span>
                  </button>
                );
              })}
            </div>
            <Input
              label="رابط الجلسات"
              type="url"
              dir="ltr"
              inputMode="url"
              placeholder="https://zoom.us/j/…"
              value={url}
              error={urlError ?? undefined}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError(null);
              }}
              onBlur={() => {
                const v = url.trim();
                if (v && !/^https:\/\/\S+\.\S+/.test(v)) return setUrlError("أدخل رابطًا صحيحًا يبدأ بـ https://");
                save({ meeting_url: v });
              }}
            />
            <p className="flex items-start gap-2.5 rounded-12 bg-state-success-bg px-4 pt-[13px] pb-3.5 type-body text-state-success">
              <Glyph icon={Shield} size={20} className="mt-1" />
              <span className="flex-1">الرابط لا يظهر في صفحة البيع ولا لغير المسجّلين — يُكشف قبل الجلسة بساعة فقط.</span>
            </p>
          </Card>
          <Card title="مواعيد الجلسات" big>
            {datesFields}
            {conflictBox ??
              (planned.length > 0 && (
                <p className="flex items-center gap-3 rounded-16 bg-state-success-bg px-[18px] py-4 type-body-lg text-state-success">
                  <Glyph icon={CircleCheck} size={20} />
                  <span className="flex-1">
                    {pluralAr(planned.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])} · {pluralAr(Math.round(hours), ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"])}
                    {conflicts.length === 0 ? " · لا تعارض مع تقويمك." : " · تجاهلت التعارض."}
                  </span>
                </p>
              ))}
          </Card>
          <Card title="التسجيل والتفاعل" big>
            {toggles.map((t) => {
              const on = flags[t.key];
              const disabled = t.key === "autoAttendance" && platform === "other";
              return (
                <label key={t.key} className={`flex items-center gap-3.5 rounded-16 bg-state-success-bg px-[18px] pt-4 pb-[18px] ${disabled ? "opacity-60" : "cursor-pointer"}`}>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-success">
                    <Glyph icon={t.icon} size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="type-title text-text-primary">{t.title}</span>
                    <span className="type-body text-text-muted">{t.hint}</span>
                  </span>
                  <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={on}
                      disabled={disabled}
                      onChange={(e) => {
                        setFlags((f) => ({ ...f, [t.key]: e.target.checked }));
                        save({ [t.field]: e.target.checked });
                      }}
                      className="peer absolute inset-0 cursor-pointer appearance-none rounded-full bg-border-default transition-colors checked:bg-action-primary focus-ring"
                    />
                    <span aria-hidden className="pointer-events-none absolute start-[3px] size-[22px] rounded-full bg-white shadow-knob transition-transform peer-checked:-translate-x-5" />
                  </span>
                </label>
              );
            })}
          </Card>
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-[22px] lg:w-[400px]">
          <Card title="ما يميّز المباشر" big>
            {[
              { icon: CircleCheck, text: "حضور آلي من تقرير البث" },
              { icon: Users, text: "مقاعد محدودة كالحضوري" },
              { icon: Video, text: "تسجيل الجلسات اختياري" },
              { icon: CircleX, text: "لا قاعة ولا مكان" },
            ].map((r) => (
              <p key={r.text} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px] type-body text-text-primary">
                <Glyph icon={r.icon} size={20} className="text-text-brand" />
                <span className="flex-1">{r.text}</span>
              </p>
            ))}
          </Card>
          {suggest && <SuggestionsCard suggestions={suggestions} count={planned.length} hours={sessionHours} start={start} end={end} onPick={(s) => { setFrom(s.from); setTo(s.to); setDays(s.days); setSuggest(false); setIgnored(false); }} />}
          {continueCard("الخطوة التالية: المقاعد والسعر.", "text-text-muted", "السابق · النمط", "احفظ وأكمل لاحقًا", true)}
        </aside>
      </div>
    );
  }

  // In person
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Card
          title={
            <span className="flex items-center gap-3">
              <span className="flex-1">نمط التقديم</span>
              <Link href={`/trainer/courses/${courseId}/setup/mode`} className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
                تغيير
              </Link>
            </span>
          }
        >
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: MapPin, title: "حضوري", text: "قاعة ومقاعد وجدول جلسات", on: true },
              { icon: Video, title: "عن بُعد مباشر", text: "رابط جلسات ومواعيد ثابتة", on: false },
              { icon: MonitorPlay, title: "كورس مسجَّل", text: "بيع فوري بلا جدول — يُنتَج خارج المنصة", on: false },
            ].map((m) => (
              <div
                key={m.title}
                className={`flex flex-col items-center gap-2 rounded-12 px-2 py-[18px] text-center sm:px-4 ${
                  m.on ? "border-2 border-action-primary bg-bg-brand-tint shadow-hero" : "border-[1.5px] border-border-default bg-bg-page"
                }`}
              >
                <span className={`flex size-11 items-center justify-center rounded-8 ${m.on ? "bg-action-primary text-text-on-brand" : "bg-bg-surface text-text-brand"}`}>
                  <Glyph icon={m.icon} size={20} />
                </span>
                <span className={`type-subtitle ${m.on ? "text-text-brand" : "text-text-primary"}`}>{m.title}</span>
                <span className="hidden type-caption text-text-muted sm:block">{m.text}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="المكان">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="المعهد والقاعة" placeholder="معهد المسار · قاعة ب-٣" value={venue} onChange={(e) => setVenue(e.target.value)} onBlur={() => save({ venue })} maxLength={200} />
            <Input label="المدينة" placeholder="مسقط" value={city} onChange={(e) => setCity(e.target.value)} onBlur={() => save({ city })} maxLength={120} />
          </div>
        </Card>
        <Card title="التواريخ والتوقيت">
          {datesFields}
          {conflictBox}
        </Card>
        <Card
          title={
            <span className="flex flex-wrap items-center gap-3">
              <span className="flex-1">جدول الجلسات المولَّد</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-brand-tint px-2.5 py-[5px] type-caption text-text-brand">
                {pluralAr(planned.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])} · {pluralAr(Math.round(hours), ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"])}
                <Glyph icon={CalendarDays} size={16} />
              </span>
            </span>
          }
        >
          <p className="type-caption text-text-muted">يُولَّد تلقائيًا من التواريخ والأيام. يمكنك تعديل موضوع كل جلسة أو حذفها.</p>
          {planned.length === 0 && <p className="rounded-12 bg-bg-page px-4 py-6 text-center type-small text-text-muted">حدّد التواريخ والأيام والتوقيت لتُولَّد الجلسات.</p>}
          <ol className="flex flex-col gap-4">
            {planned.map((s, i) => {
              const clash = conflicts.some((c) => c.s.startsAt === s.startsAt);
              const isEditing = editing === s.startsAt;
              return (
                <li key={s.startsAt} className={`flex items-center gap-3 rounded-12 px-3.5 py-[13px] ${clash ? "border-[1.5px] border-state-error bg-state-error-bg" : "bg-bg-page"}`}>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 type-subtitle ${clash ? "bg-state-error-bg text-state-error" : "bg-bg-surface text-text-secondary"}`}>
                    {toArabicDigits(i + 1)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <Input
                          aria-label="موضوع الجلسة"
                          autoFocus
                          value={titles[s.startsAt] ?? s.title}
                          onChange={(e) => setTitles((t) => ({ ...t, [s.startsAt]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                          maxLength={200}
                        />
                        <div className="flex gap-3">
                          <Button size="s" onClick={() => setEditing(null)}>
                            تم
                          </Button>
                          <Button size="s" variant="ghost" onClick={() => { setRemoved((r) => [...r, s.startsAt]); setEditing(null); }}>
                            احذف الجلسة
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 type-subtitle text-text-primary">{s.title}</span>
                        {clash && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-error">
                            تعارض
                            <Glyph icon={TriangleAlert} size={16} />
                          </span>
                        )}
                      </p>
                    )}
                    <p className="type-caption text-text-muted">{sessionLabel(s)}</p>
                  </div>
                  {!isEditing && (
                    <button type="button" onClick={() => setEditing(s.startsAt)} aria-label={`عدّل موضوع الجلسة ${toArabicDigits(i + 1)}`} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-surface text-text-secondary focus-ring">
                      <Glyph icon={Pencil} size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
        {(suggest || (conflicts.length > 0 && !ignored)) && (
          <SuggestionsCard
            suggestions={suggest ? suggestions : []}
            pending={!suggest}
            onAsk={() => setSuggest(true)}
            count={planned.length}
            hours={sessionHours}
            start={start}
            end={end}
            onPick={(s) => {
              setFrom(s.from);
              setTo(s.to);
              setDays(s.days);
              setSuggest(false);
              setIgnored(false);
            }}
          />
        )}
        <Card title="موروث من البرنامج">
          <p className="type-caption text-state-success">لا تُعاد كتابته في كل دورة — يُحدَّث من البرنامج فقط.</p>
          {["الوصف والأهداف", "الفصول والمحتوى", "المواد المرفقة", "سياسة الاسترداد", "التصنيف والمهارات"].map((t) => (
            <p key={t} className="flex items-center gap-2.5 rounded-8 bg-bg-page px-3 py-2.5 type-caption text-text-primary">
              <Glyph icon={Lock} size={16} className="text-text-muted" />
              <span className="flex-1">{t}</span>
            </p>
          ))}
        </Card>
        {continueCard(
          conflicts.length > 0 ? "التعارض لا يمنع المتابعة — لكنه يُسجَّل ويظهر في تقويمك." : "الخطوة التالية: المقاعد والسعر.",
          conflicts.length > 0 ? "text-state-warning" : "text-text-muted",
          "السابق · النمط",
          "احفظ كمسودة",
          false,
        )}
      </aside>
    </div>
  );
}

function SuggestionsCard({
  suggestions,
  count,
  hours,
  start,
  end,
  onPick,
  pending = false,
  onAsk,
}: {
  suggestions: { from: string; to: string; days: number[] }[];
  count: number;
  hours: number;
  start: string;
  end: string;
  onPick: (s: { from: string; to: string; days: number[] }) => void;
  pending?: boolean;
  onAsk?: () => void;
}) {
  const hm = (t: string) => toArabicDigits(Number(t.slice(0, 2)) % 12 || 12);
  return (
    <Card title="تواريخ خالية مقترحة">
      <p className="type-caption text-text-muted">
        تناسب المدة نفسها ({pluralAr(count, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])} · {pluralAr(Math.round(hours), ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"])}) وخالية من التعارض:
      </p>
      {pending ? (
        <Button variant="outline" onClick={onAsk}>
          اقترح تواريخ خالية
        </Button>
      ) : suggestions.length === 0 ? (
        <p className="rounded-12 bg-bg-page px-3 py-3 type-caption text-text-muted">لم نجد فترة خالية بنفس النمط خلال الأسابيع القادمة — جرّب أيامًا أو توقيتًا مختلفًا.</p>
      ) : (
        suggestions.map((s) => (
          <div key={`${s.from}-${s.days.join()}`} className="flex items-center gap-3 rounded-12 bg-state-success-bg px-3 py-[11px]">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="type-small text-text-primary">
                {formatDayMonth(`${s.from}T12:00:00+03:00`)} – {formatDayMonth(`${s.to}T12:00:00+03:00`)}
              </p>
              <p className="type-caption text-state-success">
                {weekdaysLabel(s.days).replace(/ال/g, "")} · {hm(start)}–{hm(end)} {Number(end.slice(0, 2)) >= 12 ? "م" : "ص"} · خالٍ تمامًا
              </p>
            </div>
            <Button size="s" variant="outline" className="w-[120px]" onClick={() => onPick(s)}>
              اختر
            </Button>
          </div>
        ))
      )}
    </Card>
  );
}
