/*
 * Arabic formatting used across the UI, matching the Figma copy:
 * Arabic-Indic digits (١٢٣), "ر.س" currency (TG · Configuration Currency/Symbol), Gregorian months
 * ("١٥ مارس") in the Asia/Riyadh time zone. `ar-SA` defaults to the Hijri calendar, so it is overridden.
 */
const LOCALE = "ar-SA-u-ca-gregory-nu-arab";
const TIME_ZONE = "Asia/Riyadh";

const digitsFmt = new Intl.NumberFormat(LOCALE, { useGrouping: false });
const numberFmt = new Intl.NumberFormat(LOCALE);

export function toArabicDigits(value: number | string): string {
  if (typeof value === "number") return digitsFmt.format(value);
  return value.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

/** "٢٤٠ ر.س" · "١٢٠٫٥٠ ر.س" — whole amounts without decimals like the design. */
export function formatPrice(amount: number, currency = "SAR"): string {
  const whole = Number.isInteger(amount);
  const n = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(amount);
  return currency === "SAR" ? `${n} ر.س` : `${n} ${currency}`;
}

export function formatPercent(value: number): string {
  return `${toArabicDigits(Math.round(value))}٪`;
}

export function formatRating(value: number): string {
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", timeZone: TIME_ZONE });
const dayMonthYear = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE });
const weekdayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: "long", timeZone: TIME_ZONE });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TIME_ZONE });
const numericDate = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIME_ZONE });

const asDate = (d: string | Date) => (typeof d === "string" ? new Date(d) : d);

/** "١٥ مارس" */
export function formatDayMonth(d: string | Date): string {
  return dayMonth.format(asDate(d));
}
/** "١٥ مارس ٢٠٢٦" */
export function formatDate(d: string | Date): string {
  return dayMonthYear.format(asDate(d));
}
/** "١٢ / ٠٣ / ٢٠٢٦" (certificate meta style) */
export function formatNumericDate(d: string | Date): string {
  return numericDate.format(asDate(d)).replace(/\//g, " / ");
}
/** "٥:٠٠ م" */
export function formatTime(d: string | Date): string {
  return timeFmt.format(asDate(d));
}
/** "الأحد ١٥ مارس · ٥:٠٠ م" */
export function formatSessionTime(d: string | Date): string {
  const date = asDate(d);
  return `${weekdayFmt.format(date)} ${dayMonth.format(date)} · ${formatTime(date)}`;
}

/** "٦ س ٢٠ د" / "٨:١٥" style durations. */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${toArabicDigits(m)} د`;
  return m === 0 ? `${toArabicDigits(h)} س` : `${toArabicDigits(h)} س ${toArabicDigits(m)} د`;
}
export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return toArabicDigits(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
}
export function formatHours(hours: number): string {
  return `${formatNumber(hours)} ساعة`;
}

/** "منذ ٣ ساعات" / "بعد يومين" */
export function formatRelative(d: string | Date, now: Date = new Date()): string {
  const diff = asDate(d).getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  const abs = Math.abs(diff);
  const minute = 60_000, hour = 60 * minute, day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), "day");
  return formatDate(d);
}

/** Pluralised Arabic count: ("درس", "درسان", "دروس", "درسًا") */
export function pluralAr(n: number, [one, two, few, many]: [string, string, string, string]): string {
  if (n === 1) return one;
  if (n === 2) return two;
  const d = toArabicDigits(n);
  if (n >= 3 && n <= 10) return `${d} ${few}`;
  return `${d} ${many}`;
}

/** "مارس ٢٠٢٦" */
export function formatMonthYear(d: string | Date): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { month: "long", year: "numeric", timeZone: "Asia/Riyadh" }).format(asDate(d));
}

/** "الأحد ١٥ مارس – الخميس ١٩ مارس ٢٠٢٦" (TRN-DSC-03 session cards). */
export function formatDateRange(start: string | Date, end?: string | Date | null): string {
  const s = asDate(start);
  const head = `${weekdayFmt.format(s)} ${dayMonth.format(s)}`;
  if (!end) return `${weekdayFmt.format(s)} ${dayMonthYear.format(s)}`;
  const e = asDate(end);
  return `${head} – ${weekdayFmt.format(e)} ${dayMonthYear.format(e)}`;
}

/** "٥:٠٠ م – ٩:٠٠ م" */
export function formatTimeRange(start: string | Date, end: string | Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "مارس ٢٠٢٦" with its sortable key "2026-03" (Asia/Riyadh). */
export function monthGroup(d: string | Date): { key: string; label: string } {
  const date = asDate(d);
  const key = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: TIME_ZONE }).format(date).slice(0, 7);
  return { key, label: new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: TIME_ZONE }).format(date) };
}
