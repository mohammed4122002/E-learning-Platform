/*
 * Calendar model shared by the TRR-CAL-01 page (server) and its board (client): Riyadh day arithmetic
 * (UTC+3, no DST), entry tones matching the Figma colour legend, and the week-view time slots.
 */
import { toArabicDigits } from "@/lib/format";

export type CalTone = "in_person" | "online" | "external" | "personal" | "leave";
export type EventKind = "personal" | "leave" | "external";
export type Recurrence = "none" | "weekly" | "biweekly" | "monthly";
export type CalView = "month" | "week" | "day";

export type CalEntry = {
  key: string;
  source: "session" | "event";
  tone: CalTone;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  courseId?: string;
  eventId?: string;
  kind?: EventKind;
  recurrence?: Recurrence;
};

/** Legend in the Figma visual order (right → left). */
export const LEGEND: { tone: CalTone; label: string }[] = [
  { tone: "leave", label: "إجازة" },
  { tone: "personal", label: "ارتباط شخصي" },
  { tone: "external", label: "ارتباط جهة" },
  { tone: "online", label: "دورة أونلاين" },
  { tone: "in_person", label: "دورة حضورية" },
];

export const TONE_CHIP: Record<CalTone, string> = {
  in_person: "bg-state-success-bg text-state-success",
  online: "bg-state-info-bg text-state-info",
  external: "bg-bg-brand-tint text-text-brand",
  personal: "bg-state-warning-bg text-state-warning",
  leave: "bg-bg-page text-text-secondary",
};
export const TONE_DOT: Record<CalTone, string> = {
  in_person: "bg-state-success",
  online: "bg-state-info",
  external: "bg-action-primary",
  personal: "bg-state-warning",
  leave: "bg-text-muted",
};

export const KIND_LABEL: Record<EventKind, string> = { personal: "ارتباط شخصي", leave: "إجازة", external: "تدريب خارج المنصة" };
export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "none", label: "لا يتكرر" },
  { value: "weekly", label: "كل أسبوع" },
  { value: "biweekly", label: "كل أسبوعين" },
  { value: "monthly", label: "شهريًا" },
];

/** Sunday-first weekday names (Figma headers). */
export const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** Week-view rows (Figma 254:814): ٠٩:٠٠ · ١١:٠٠ · ٠١:٠٠ · ٠٣:٠٠ · ٠٥:٠٠ · ٠٨:٠٠ — [start, end) hours. */
export const SLOTS: { start: number; end: number }[] = [
  { start: 9, end: 11 },
  { start: 11, end: 13 },
  { start: 13, end: 15 },
  { start: 15, end: 17 },
  { start: 17, end: 20 },
  { start: 20, end: 24 },
];
export function slotLabel(h: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return toArabicDigits(`${String(h12).padStart(2, "0")}:00`);
}
/** Row index of an entry by its Riyadh start hour (earlier than 09:00 → first row). */
export function slotOf(iso: string): number {
  const h = riyadhHour(iso);
  const i = SLOTS.findIndex((s) => h >= s.start && h < s.end);
  return i < 0 ? 0 : i;
}

const OFFSET_MS = 3 * 3600_000;
const DAY_MS = 86_400_000;

export function isYmd(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}
export function ymdOf(d: Date | string): string {
  return new Date(new Date(d).getTime() + OFFSET_MS).toISOString().slice(0, 10);
}
export function dayStart(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+03:00`);
}
export function addDays(ymd: string, n: number): string {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}
export function addMonths(ymd: string, n: number): string {
  const [y, m] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}
export function weekdayOf(ymd: string): number {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}
export function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}
export function weekStart(ymd: string): string {
  return addDays(ymd, -weekdayOf(ymd));
}
export function daysInMonth(ymd: string): number {
  const [y, m] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
export function riyadhHour(iso: string): number {
  return new Date(new Date(iso).getTime() + OFFSET_MS).getUTCHours();
}
export function riyadhMinutes(iso: string): number {
  const d = new Date(new Date(iso).getTime() + OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
export function hhmm(iso: string): string {
  return new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(11, 16);
}

/** "الخميس ٢٠ مارس" */
export function dayLabel(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${WEEKDAYS[weekdayOf(ymd)]} ${toArabicDigits(d)} ${MONTHS[m - 1]}`;
}
/** "٢٠ مارس" */
export function dayMonthLabel(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${toArabicDigits(d)} ${MONTHS[m - 1]}`;
}
/** "مارس ٢٠٢٦" */
export function monthLabel(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  return `${MONTHS[m - 1]} ${toArabicDigits(y)}`;
}
/** Short chip time: "٥م" / "٩:٣٠ص". */
export function shortTime(iso: string): string {
  const mins = riyadhMinutes(iso);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${toArabicDigits(h12)}${m ? `:${toArabicDigits(String(m).padStart(2, "0"))}` : ""}${h < 12 ? "ص" : "م"}`;
}
/** "٩:٠٠ ص" */
export function clockLabel(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${toArabicDigits(h12)}:${toArabicDigits(String(m).padStart(2, "0"))} ${h < 12 ? "ص" : "م"}`;
}

/** Does the entry cover any part of the Riyadh day? */
export function onDay(e: CalEntry, ymd: string): boolean {
  const from = dayStart(ymd).getTime();
  return new Date(e.startsAt).getTime() < from + DAY_MS && new Date(e.endsAt).getTime() > from;
}

/** Expand a stored appointment into its occurrences inside [from, to). */
export function expandOccurrences(
  ev: { id: string; kind: EventKind; title: string; starts_at: string; ends_at: string; all_day: boolean; recurrence: Recurrence },
  from: Date,
  to: Date,
): CalEntry[] {
  const out: CalEntry[] = [];
  const s0 = new Date(ev.starts_at);
  const e0 = new Date(ev.ends_at);
  for (let k = 0; k < 400; k++) {
    let s: Date;
    let e: Date;
    if (ev.recurrence === "none") {
      if (k > 0) break;
      s = s0;
      e = e0;
    } else if (ev.recurrence === "monthly") {
      s = shiftMonths(s0, k);
      e = new Date(s.getTime() + (e0.getTime() - s0.getTime()));
    } else {
      const step = (ev.recurrence === "biweekly" ? 14 : 7) * DAY_MS * k;
      s = new Date(s0.getTime() + step);
      e = new Date(e0.getTime() + step);
    }
    if (s >= to) break;
    if (e > from) {
      out.push({
        key: `event:${ev.id}:${k}`,
        source: "event",
        tone: ev.kind,
        title: ev.title,
        startsAt: s.toISOString(),
        endsAt: e.toISOString(),
        allDay: ev.all_day,
        eventId: ev.id,
        kind: ev.kind,
        recurrence: ev.recurrence,
      });
    }
  }
  return out;
}

function shiftMonths(d: Date, k: number): Date {
  const local = new Date(d.getTime() + OFFSET_MS);
  const shifted = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + k, local.getUTCDate(), local.getUTCHours(), local.getUTCMinutes());
  return new Date(shifted - OFFSET_MS);
}
