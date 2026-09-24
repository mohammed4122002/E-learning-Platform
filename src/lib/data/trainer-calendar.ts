import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSessionsBetween, getTrainerOverview, type TrainerOverview } from "@/lib/data/trainer";
import {
  addDays,
  dayStart,
  expandOccurrences,
  onDay,
  ymdOf,
  type CalEntry,
  type EventKind,
  type Recurrence,
} from "@/lib/trainer-calendar";

export type EventRow = { id: string; kind: EventKind; title: string; starts_at: string; ends_at: string; all_day: boolean; recurrence: Recurrence };

/** Sessions of the trainer's scheduled courses + every occurrence of their own appointments in [from, to). */
export async function getCalendarEntries(o: TrainerOverview, userId: string, from: Date, to: Date): Promise<CalEntry[]> {
  const supabase = await createClient();
  const [sessions, events] = await Promise.all([
    getSessionsBetween(o, from, to),
    supabase
      .from("trainer_calendar_events")
      .select("id, kind, title, starts_at, ends_at, all_day, recurrence")
      .eq("trainer_id", userId)
      .lt("starts_at", to.toISOString())
      .or(`recurrence.neq.none,ends_at.gt.${from.toISOString()}`)
      .order("starts_at"),
  ]);
  if (events.error) throw new Error(events.error.message);
  const live = new Map(o.courses.filter((c) => c.status !== "draft" && c.status !== "cancelled").map((c) => [c.id, c]));
  const out: CalEntry[] = sessions
    .filter((s) => live.has(s.courseId))
    .map((s) => ({
      key: `session:${s.id}`,
      source: "session",
      tone: s.mode === "in_person" ? "in_person" : "online",
      title: s.courseTitle || s.title,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      allDay: false,
      courseId: s.courseId,
    }));
  for (const ev of (events.data ?? []) as EventRow[]) out.push(...expandOccurrences(ev, from, to));
  return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function getTrainerEvent(userId: string, id: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trainer_calendar_events")
    .select("id, kind, title, starts_at, ends_at, all_day, recurrence")
    .eq("trainer_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as EventRow | null) ?? null;
}

/** «أقرب موعد متاح»: the first fully free days from today. */
export function freeDays(entries: CalEntry[], today: string, count = 3, horizon = 60): string[] {
  const out: string[] = [];
  for (let i = 0; i < horizon && out.length < count; i++) {
    const d = addDays(today, i);
    if (!entries.some((e) => onDay(e, d))) out.push(d);
  }
  return out;
}

/** Median session length in minutes — «تناسب مدة دورتك». */
export function typicalSessionMinutes(entries: CalEntry[]): number | null {
  const mins = entries
    .filter((e) => e.source === "session")
    .map((e) => Math.round((new Date(e.endsAt).getTime() - new Date(e.startsAt).getTime()) / 60_000))
    .filter((m) => m > 0)
    .sort((a, b) => a - b);
  return mins.length ? mins[Math.floor(mins.length / 2)] : null;
}

export type Suggestion = { ymd: string; from: number; to: number };

/** «اقتراح تلقائي»: the three nearest days (from tomorrow) with a free window of `minutes` between 09:00 and 17:00. */
export function suggestSlots(entries: CalEntry[], today: string, minutes: number, count = 3): Suggestion[] {
  const WORK_FROM = 9 * 60;
  const WORK_TO = 17 * 60;
  const out: Suggestion[] = [];
  for (let i = 1; i <= 45 && out.length < count; i++) {
    const d = addDays(today, i);
    const base = dayStart(d).getTime();
    const busy = entries
      .filter((e) => onDay(e, d))
      .map((e) => ({
        from: Math.max(0, Math.round((new Date(e.startsAt).getTime() - base) / 60_000)),
        to: Math.min(24 * 60, Math.round((new Date(e.endsAt).getTime() - base) / 60_000)),
      }))
      .sort((a, b) => a.from - b.from);
    let cursor = WORK_FROM;
    let best: Suggestion | null = null;
    for (const b of [...busy, { from: WORK_TO, to: WORK_TO }]) {
      const end = Math.min(b.from, WORK_TO);
      if (end - cursor >= minutes && (!best || end - cursor > best.to - best.from)) best = { ymd: d, from: cursor, to: end };
      cursor = Math.max(cursor, b.to);
      if (cursor >= WORK_TO) break;
    }
    if (best) out.push(best);
  }
  return out;
}

/** Overlapping pairs in which at least one side is a course session (the week-view «تعارض»). */
export function findConflicts(entries: CalEntry[]): { a: CalEntry; b: CalEntry }[] {
  const out: { a: CalEntry; b: CalEntry }[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.source !== "session" && b.source !== "session") continue;
      if (new Date(a.startsAt) < new Date(b.endsAt) && new Date(b.startsAt) < new Date(a.endsAt)) {
        out.push(a.source === "session" ? { a, b } : { a: b, b: a });
      }
    }
  }
  return out;
}

export async function loadCalendar(userId: string, from: Date, to: Date) {
  const o = await getTrainerOverview(userId);
  const today = ymdOf(new Date());
  // Wide enough for «أقرب موعد متاح» and «اقتراح تلقائي» whatever period is displayed.
  const wideFrom = new Date(Math.min(from.getTime(), dayStart(today).getTime()));
  const wideTo = new Date(Math.max(to.getTime(), dayStart(addDays(today, 61)).getTime()));
  const all = await getCalendarEntries(o, userId, wideFrom, wideTo);
  const visible = all.filter((e) => new Date(e.startsAt) < to && new Date(e.endsAt) > from);
  return { o, today, all, visible };
}

