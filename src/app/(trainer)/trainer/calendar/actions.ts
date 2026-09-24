"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { KIND_LABEL } from "@/lib/trainer-calendar";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";

/* TRR-CAL-01 / TRR-CAL-02 writes. Inserts and edits go through add_trainer_event() / update_trainer_event()
 * (time-range + conflict rules); deletes are owner-scoped by RLS. */

export type ConflictCheck = { sessions: string[]; events: string[]; error?: string };

/** Live «لا تعارض» check for a range, excluding the appointment being edited. */
export async function checkCalendarConflicts(startsAt: string, endsAt: string, excludeId?: string | null): Promise<ConflictCheck> {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return { sessions: [], events: [], error: toArabicError({ message: "invalid_time_range" }) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trainer_calendar_conflicts", {
    p_starts: s.toISOString(),
    p_ends: e.toISOString(),
    ...(excludeId ? { p_exclude: excludeId } : {}),
  });
  if (error) return { sessions: [], events: [], error: toArabicError(error) };
  const rows = data ?? [];
  return {
    sessions: [...new Set(rows.filter((r) => r.source === "session").map((r) => r.title))],
    events: [...new Set(rows.filter((r) => r.source === "event").map((r) => r.title))],
  };
}

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "اختر تاريخًا صحيحًا");
const hm = z.string().regex(/^\d{2}:\d{2}$/, "اختر وقتًا صحيحًا");

const schema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("")),
    kind: z.enum(["personal", "leave", "external"], { message: "اختر نوع الموعد" }),
    title: z.string().trim().max(120, "العنوان طويل جدًا").refine((t) => t.length === 0 || t.length >= 2, "اكتب عنوانًا من حرفين على الأقل"),
    all_day: z.string().optional(),
    from_date: ymd,
    to_date: ymd,
    from_time: z.string().optional(),
    to_time: z.string().optional(),
    recurrence: z.enum(["none", "weekly", "biweekly", "monthly"]),
  })
  .superRefine((v, ctx) => {
    if (v.all_day) return;
    if (!hm.safeParse(v.from_time).success) ctx.addIssue({ code: "custom", path: ["from_time"], message: "اختر وقتًا صحيحًا" });
    if (!hm.safeParse(v.to_time).success) ctx.addIssue({ code: "custom", path: ["to_time"], message: "اختر وقتًا صحيحًا" });
  });

/** Riyadh wall-clock → instant range. All-day covers from 00:00 of the first day to 00:00 after the last. */
function rangeOf(v: z.infer<typeof schema>): { starts: Date; ends: Date } {
  if (v.all_day) {
    const end = new Date(Date.parse(`${v.to_date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    return { starts: new Date(`${v.from_date}T00:00:00+03:00`), ends: new Date(`${end}T00:00:00+03:00`) };
  }
  return { starts: new Date(`${v.from_date}T${v.from_time}:00+03:00`), ends: new Date(`${v.to_date}T${v.to_time}:00+03:00`) };
}

/** TRR-CAL-02 «أضف الموعد» (and edit of an existing appointment). */
export async function saveTrainerEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { status: "error", message: "راجع الحقول المظلّلة.", fieldErrors: fieldErrorsOf(parsed.error), values: raw };
  const v = parsed.data;
  const { starts, ends } = rangeOf(v);
  if (!(ends > starts)) return { status: "error", message: toArabicError({ message: "invalid_time_range" }), fieldErrors: { to_time: "وقت الانتهاء يجب أن يكون بعد البداية" }, values: raw };

  const supabase = await createClient();
  const args = {
    p_kind: v.kind,
    // The title is private; without one the appointment is named after its type.
    p_title: v.title || KIND_LABEL[v.kind],
    p_starts: starts.toISOString(),
    p_ends: ends.toISOString(),
    p_all_day: Boolean(v.all_day),
    p_recurrence: v.recurrence,
  };
  const { error } = v.id ? await supabase.rpc("update_trainer_event", { p_id: v.id, ...args }) : await supabase.rpc("add_trainer_event", args);
  if (error) return { status: "error", message: toArabicError(error), values: raw };
  revalidatePath("/trainer", "layout");
  const day = v.from_date;
  redirect(`/trainer/calendar?view=week&date=${day}&saved=${v.id ? "updated" : "added"}`);
}

/** «تعديل سريع»: move an appointment (all occurrences of a series) by a whole number of minutes. */
export async function moveTrainerEvent(id: string, deltaMinutes: number): Promise<{ ok: boolean; message?: string }> {
  if (!z.string().uuid().safeParse(id).success || !Number.isInteger(deltaMinutes) || Math.abs(deltaMinutes) > 60 * 24 * 366) {
    return { ok: false, message: toArabicError({ message: "invalid_input" }) };
  }
  const supabase = await createClient();
  const { data: ev, error } = await supabase
    .from("trainer_calendar_events")
    .select("id, kind, title, starts_at, ends_at, all_day, recurrence")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, message: toArabicError(error) };
  if (!ev) return { ok: false, message: toArabicError({ message: "not_found" }) };
  const shift = deltaMinutes * 60_000;
  const { error: upd } = await supabase.rpc("update_trainer_event", {
    p_id: ev.id,
    p_kind: ev.kind,
    p_title: ev.title,
    p_starts: new Date(new Date(ev.starts_at).getTime() + shift).toISOString(),
    p_ends: new Date(new Date(ev.ends_at).getTime() + shift).toISOString(),
    p_all_day: ev.all_day,
    p_recurrence: ev.recurrence,
  });
  if (upd) return { ok: false, message: toArabicError(upd) };
  revalidatePath("/trainer", "layout");
  return { ok: true };
}

export async function deleteTrainerEvent(id: string): Promise<{ ok: boolean; message?: string }> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: toArabicError({ message: "invalid_input" }) };
  const supabase = await createClient();
  const { data, error } = await supabase.from("trainer_calendar_events").delete().eq("id", id).select("id");
  if (error) return { ok: false, message: toArabicError(error) };
  if (!data?.length) return { ok: false, message: toArabicError({ message: "not_found" }) };
  revalidatePath("/trainer", "layout");
  return { ok: true };
}
