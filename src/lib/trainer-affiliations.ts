import { formatPercent, pluralAr, toArabicDigits } from "@/lib/format";

/* Copy helpers of TRR-AFL-01/02/03 (Figma wording, values from the database). */

export const END_REASONS = {
  direct_sales: "أريد التفرّغ للبيع المباشر",
  high_commission: "العمولة مرتفعة",
  few_courses: "قلة الدورات المسندة",
  execution_dispute: "خلاف على التنفيذ",
  moved_org: "انتقلت لجهة أخرى",
  other: "سبب آخر",
} as const;
export type EndReason = keyof typeof END_REASONS;

const DAY = 86_400_000;

/** «١٥٪ من قيمة كل تسجيل» */
export const commissionLabel = (pct: number) => `${formatPercent(pct)} من قيمة كل تسجيل`;

/** «سنة قابلة للتجديد · إنهاء بإشعار ٣٠ يومًا» */
export function durationLabel(termMonths: number, renewable: boolean, noticeDays: number): string {
  const term =
    termMonths % 12 === 0
      ? pluralAr(termMonths / 12, ["سنة", "سنتان", "سنوات", "سنة"])
      : pluralAr(termMonths, ["شهر واحد", "شهران", "أشهر", "شهرًا"]);
  const renew = renewable ? (termMonths % 12 === 0 && termMonths / 12 === 2 ? " قابلتان للتجديد" : termMonths % 12 === 0 ? " قابلة للتجديد" : " قابلة للتجديد") : "";
  return `${term}${renew} · إنهاء بإشعار ${noticeLabel(noticeDays)}`;
}

/** «٣٠ يومًا» */
export const noticeLabel = (days: number) => pluralAr(days, ["يوم واحد", "يومين", "أيام", "يومًا"]);

/** Days left until `iso` (ceil), never negative. */
export const daysUntil = (iso: string, now = Date.now()) => Math.max(0, Math.ceil((new Date(iso).getTime() - now) / DAY));

/** «تنتهي بعد ٤ أيام» (AFL-01) */
export function expiresInLabel(iso: string, prefix = "تنتهي"): string {
  const d = daysUntil(iso);
  if (d <= 0) return `${prefix} اليوم`;
  return `${prefix} بعد ${pluralAr(d, ["يوم واحد", "يومين", "أيام", "يومًا"])}`;
}

/** «ارتباطان نشطان ودعوة تنتظر قرارك.» */
export function affiliationsLead(active: number, invitations: number): string {
  const a = active === 0 ? "لا ارتباطات نشطة" : pluralAr(active, ["ارتباط نشط واحد", "ارتباطان نشطان", "ارتباطات نشطة", "ارتباطًا نشطًا"]);
  const i =
    invitations === 0 ? "" : invitations === 1 ? " ودعوة تنتظر قرارك" : invitations === 2 ? " ودعوتان تنتظران قرارك" : ` و${pluralAr(invitations, ["", "", "دعوات", "دعوة"])} تنتظر قرارك`;
  return `${a}${i}. الارتباط يعني أن الجهة تنفّذ برامجك باسمها مقابل عمولة متفق عليها.`;
}

/** «٣ ارتباطات» / «ارتباط واحد» (result banners). */
export const affiliationsCount = (n: number) => (n === 0 ? "لا ارتباطات" : pluralAr(n, ["ارتباط واحد", "ارتباطان", "ارتباطات", "ارتباطًا"]));

/** «٢ جهات» pill — Figma writes the digit before the noun for every count. */
export const orgsCount = (n: number) => `${toArabicDigits(n)} ${n === 1 ? "جهة" : "جهات"}`;

/** «٣ دورات جارية · ٥٨ متدربًا · ٢٨٬٤٠٠ ر.س» */
export function affiliationStatsLine(courses: number, trainees: number, revenue: string): string {
  const c = courses === 0 ? "لا دورات جارية" : pluralAr(courses, ["دورة جارية واحدة", "دورتان", "دورات جارية", "دورة جارية"]);
  const t = trainees === 0 ? "لا متدربين بعد" : pluralAr(trainees, ["متدرب واحد", "متدربان", "متدربين", "متدربًا"]);
  return `${c} · ${t} · ${revenue}`;
}

const ORDINAL_FEM = ["", "", "", "الثلاث", "الأربع", "الخمس", "الست", "السبع", "الثماني", "التسع", "العشر"];

/** AFL-03 «الدورات الجارية الثلاث» */
export function runningCoursesTitle(n: number): string {
  if (n === 1) return "الدورة الجارية";
  if (n === 2) return "الدورتان الجاريتان";
  if (n >= 3 && n <= 10) return `الدورات الجارية ${ORDINAL_FEM[n]}`;
  return "الدورات الجارية";
}
