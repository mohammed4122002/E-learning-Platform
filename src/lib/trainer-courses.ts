/*
 * Pure helpers shared by the trainer course screens (TRR-CRS-01…09): wizard steps, blocker copy,
 * list states and small formatters. No server-only imports — used by client components too.
 */
import type { CourseMode } from "@/types/views";
import { formatDayMonth, formatTime, toArabicDigits } from "@/lib/format";

export type CourseStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled";

/** TRR-CRS-02 wizard: step 1 is the program (chosen before), 2–5 live under /setup/[step]. */
export const SETUP_STEPS = ["mode", "schedule", "pricing", "review"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export const STEP_LABELS = ["البرنامج", "نمط التقديم", "الإعداد والجدولة", "المقاعد والسعر", "المعاينة والنشر"] as const;

export function stepNumber(step: SetupStep): number {
  return SETUP_STEPS.indexOf(step) + 2;
}

export function isSetupStep(value: string): value is SetupStep {
  return (SETUP_STEPS as readonly string[]).includes(value);
}

export const MODE_TITLES: Record<CourseMode, string> = {
  in_person: "دورة حضورية",
  live_remote: "دورة مباشرة أونلاين",
  recorded: "دورة مسجَّلة",
};

/** Step ٣ name per mode (Figma: ٣ الجدولة / ٣ البث والمواعيد / ٣ المحتوى والوحدات). */
export const STEP3_NEXT: Record<CourseMode, { next: string; hint: string; button: string }> = {
  in_person: {
    next: "الخطوة التالية: المكان وجدول الجلسات",
    hint: "باختيارك «دورة حضورية» ستكون الخطوة التالية: المكان والقاعة وجدول الجلسات.",
    button: "التالي · الجدولة",
  },
  live_remote: {
    next: "الخطوة التالية: منصة البث والمواعيد",
    hint: "باختيارك «دورة مباشرة أونلاين» ستكون الخطوة التالية: منصة البث والرابط ومواعيد الجلسات.",
    button: "التالي · البث والمواعيد",
  },
  recorded: {
    next: "الخطوة التالية: رفع المحتوى والوحدات",
    hint: "باختيارك «دورة مسجَّلة» ستكون الخطوة التالية: رفع المحتوى والوحدات والدروس — بلا جدول ولا حضور.",
    button: "التالي · المحتوى",
  },
};

/** Machine codes of course_publish_blockers() → Figma «شروط تمنع النشر» rows. */
export const BLOCKERS: Record<string, { title: string; description: string; action: string; step: SetupStep | "content" }> = {
  no_preview: { title: "لا يوجد درس معاينة مجاني", description: "الزائر يحتاج أن يجرّب قبل الشراء", action: "أضف درس معاينة", step: "schedule" },
  lessons_without_material: { title: "دروس بلا مادة", description: "", action: "راجع المحتوى", step: "schedule" },
  no_content: { title: "لا يوجد محتوى بعد", description: "أضف وحدة ودرسًا واحدًا على الأقل", action: "راجع المحتوى", step: "schedule" },
  empty_modules: { title: "وحدات بلا دروس", description: "", action: "راجع المحتوى", step: "schedule" },
  price_missing: { title: "السعر غير مكتمل", description: "لم تحدّد سعرًا ولا اخترت «مجانية»", action: "عدّل التسعير", step: "pricing" },
  hours_missing: { title: "الساعات التدريبية غير محدّدة", description: "حدّد الساعات التدريبية المعتمدة", action: "عدّل التسعير", step: "pricing" },
  seats_missing: { title: "المقاعد غير محدّدة", description: "حدّد العدد الأقصى للمقاعد", action: "عدّل المقاعد", step: "pricing" },
  schedule_missing: { title: "لا توجد جلسات مجدولة", description: "حدّد التواريخ وأيام الجلسات", action: "عدّل الجدولة", step: "schedule" },
  venue_missing: { title: "المكان غير محدّد", description: "أدخل المعهد والقاعة والمدينة", action: "عدّل الجدولة", step: "schedule" },
  meeting_missing: { title: "رابط الجلسات غير مرفوع", description: "اختر منصة البث وأضف رابط الجلسات", action: "عدّل البث", step: "schedule" },
};

/** Card footer copy for a draft that still needs setup (TRR-CRS-01 «بانتظار رفع رابط الجلسات»). */
export const BLOCKER_WAITING: Record<string, string> = {
  meeting_missing: "بانتظار رفع رابط الجلسات",
  schedule_missing: "بانتظار تحديد مواعيد الجلسات",
  venue_missing: "بانتظار تحديد المكان",
  price_missing: "بانتظار تحديد السعر",
  hours_missing: "بانتظار تحديد الساعات التدريبية",
  seats_missing: "بانتظار تحديد المقاعد",
  no_content: "بانتظار رفع المحتوى",
  lessons_without_material: "بانتظار رفع مواد الدروس",
  empty_modules: "بانتظار رفع المحتوى",
  no_preview: "بانتظار تحديد درس معاينة",
};

export const WEEKDAYS = [
  { value: 6, label: "سبت" },
  { value: 5, label: "جمعة" },
  { value: 4, label: "خميس" },
  { value: 3, label: "أربعاء" },
  { value: 2, label: "ثلاثاء" },
  { value: 1, label: "اثنين" },
  { value: 0, label: "أحد" },
] as const;

const WEEKDAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** "الأحد والاثنين" from a set of weekday numbers (0 = Sunday), in week order starting Saturday. */
export function weekdaysLabel(days: number[]): string {
  const order = [6, 0, 1, 2, 3, 4, 5];
  const names = order.filter((d) => days.includes(d)).map((d) => WEEKDAY_NAMES[d]);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join("، ")} و${names[names.length - 1]}`;
}

/** Riyadh is UTC+3 all year. Local wall time (date "YYYY-MM-DD" + "HH:MM") → ISO instant. */
export function riyadhIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+03:00`).toISOString();
}

/** ISO → { date: "YYYY-MM-DD", time: "HH:MM" } in Asia/Riyadh. */
export function riyadhParts(iso: string): { date: string; time: string; weekday: number } {
  const d = new Date(new Date(iso).getTime() + 3 * 3600_000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16), weekday: d.getUTCDay() };
}

export type PlannedSession = { title: string; startsAt: string; endsAt: string; moduleId: string | null };

/**
 * Sessions generated from a date range, weekdays and a daily time window (Figma «جدول الجلسات المولّد»).
 * Axis titles are spread over the sessions in order so every session covers one axis.
 */
export function planSessions(input: {
  from: string;
  to: string;
  startTime: string;
  endTime: string;
  days: number[];
  modules: { id: string; title: string }[];
}): PlannedSession[] {
  const { from, to, startTime, endTime, days, modules } = input;
  if (!from || !to || !startTime || !endTime || days.length === 0 || to < from || endTime <= startTime) return [];
  const out: PlannedSession[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${to}T00:00:00Z`);
  while (cursor <= last && out.length < 120) {
    if (days.includes(cursor.getUTCDay())) {
      const date = cursor.toISOString().slice(0, 10);
      out.push({ title: "", startsAt: riyadhIso(date, startTime), endsAt: riyadhIso(date, endTime), moduleId: null });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (modules.length > 0) {
    const per = out.length / modules.length;
    out.forEach((s, i) => {
      const m = modules[Math.min(modules.length - 1, Math.floor(i / Math.max(per, 1)))];
      s.moduleId = m.id;
      const firstOfModule = i === 0 || out[i - 1].moduleId !== m.id;
      s.title = firstOfModule ? m.title : `${m.title} · تتمة`;
    });
  } else {
    out.forEach((s, i) => (s.title = `الجلسة ${toArabicDigits(i + 1)}`));
  }
  return out;
}

export function overlaps(a: { startsAt: string; endsAt: string }, b: { startsAt: string; endsAt: string }): boolean {
  return new Date(a.startsAt) < new Date(b.endsAt) && new Date(b.startsAt) < new Date(a.endsAt);
}

/** "١٥ – ٢٩ مارس · ٥:٠٠ – ٩:٠٠ م" (course card meta). */
export function scheduleLabel(startsAt: string | null, endsAt: string | null, firstSession?: { startsAt: string; endsAt: string } | null): string {
  if (!startsAt) return "لم تُحدَّد المواعيد بعد";
  const s = formatDayMonth(startsAt);
  const e = endsAt ? formatDayMonth(endsAt) : null;
  const sameMonth = endsAt && riyadhParts(startsAt).date.slice(0, 7) === riyadhParts(endsAt).date.slice(0, 7);
  const range = !e || e === s ? s : sameMonth ? `${s.split(" ")[0]} – ${e}` : `${s} – ${e}`;
  const time = firstSession ? ` · ${formatTime(firstSession.startsAt).replace(/\s?[صم]$/, "")} – ${formatTime(firstSession.endsAt)}` : "";
  return `${range}${time}`;
}

/** File size "٢٫٤ م.ب" / "٨٠٠ ك.ب". */
export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 1 }).format(bytes / 1024 ** 3)} ج.ب`;
  if (bytes >= 1024 * 1024) return `${new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 1 }).format(bytes / 1024 ** 2)} م.ب`;
  return `${new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 0 }).format(Math.max(1, bytes / 1024))} ك.ب`;
}

/** Whole days from now until `iso` (negative when past), Riyadh calendar days. */
export function daysUntil(iso: string, now = new Date()): number {
  const a = riyadhParts(now.toISOString()).date;
  const b = riyadhParts(iso).date;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Trainer-facing money: commission is a platform setting (Figma «عمولة المنصة ١٠٪»). */
export function netOf(amount: number, commissionPercent: number): number {
  return Math.round(amount * (1 - commissionPercent / 100) * 100) / 100;
}

/** Where «حرّر الدورة» leads: the setup wizard for drafts, the content tab once published. */
export function courseEditHref(c: { id: string; status: string }): string {
  return c.status === "draft" ? `/trainer/courses/${c.id}/setup/schedule` : `/trainer/courses/${c.id}/content`;
}

/** The course's home for its staff: the review step for drafts, the dashboard for recorded, the course page otherwise. */
export function courseHomeHref(c: { id: string; status: string; mode: string }): string {
  if (c.status === "draft") return `/trainer/courses/${c.id}/setup/review`;
  return c.mode === "recorded" ? `/trainer/courses/${c.id}/dashboard` : `/trainer/courses/${c.id}`;
}
