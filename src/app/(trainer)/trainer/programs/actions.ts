"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { errorCode, toArabicError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { EDIT_STEPS, type EditStep } from "@/lib/trainer-programs";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import {
  DECLARATION_CLAUSES,
  basicsSchema,
  cloneSchema,
  goalsSchema,
  itemSchema,
  pricingSchema,
  unitSchema,
} from "@/lib/validation/trainer-programs";

/* TRR-PRG-01…09 · TRR-DEC-01 server actions. Business rules live in the database (RLS + RPCs). */

export type ActionResult = { ok: true; id?: string; message?: string } | { ok: false; message: string; code?: string | null; fieldErrors?: Record<string, string> };

const values = (fd: FormData) => Object.fromEntries(Array.from(fd.entries()).filter(([, v]) => typeof v === "string")) as Record<string, string>;
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

function touch(id?: string) {
  revalidatePath("/trainer/programs");
  if (id) revalidatePath(`/trainer/programs/${id}`, "layout");
}

function nextStepHref(id: string, step: EditStep, intent: string): string {
  if (intent === "later") return "/trainer/programs";
  if (intent === "stay") return `/trainer/programs/${id}/edit/${step}?saved=1`;
  const i = EDIT_STEPS.indexOf(step);
  return i < EDIT_STEPS.length - 1 ? `/trainer/programs/${id}/edit/${EDIT_STEPS[i + 1]}` : `/trainer/programs/${id}/preview`;
}

/** Step ١ (new or existing program). Creating a program needs only a valid name; everything else can follow. */
export async function saveBasics(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/programs");
  const parsed = basicsSchema.safeParse(values(fd));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: values(fd) };
  const d = parsed.data;
  const supabase = await createClient();
  let id = fd.get("id");

  if (!isUuid(id)) {
    const { data, error } = await supabase.rpc("create_program", { p_title: d.title });
    if (error || !data) return { status: "error", message: toArabicError(error), values: values(fd) };
    id = data;
  }

  const { data: updated, error } = await supabase
    .from("programs")
    .update({
      title: d.title,
      summary: d.summary,
      category_id: d.categoryId,
      skills: d.skills,
      level: d.level,
      total_hours: d.hours,
      language: d.language,
      prerequisites: d.prerequisites,
      cover_path: d.coverPath,
    })
    .eq("id", id)
    .select("id");
  if (error) return { status: "error", message: toArabicError(error), values: values(fd) };
  if (!updated?.length) return { status: "error", message: toArabicError({ message: "program_locked" }), values: values(fd) };
  touch(id);
  redirect(nextStepHref(id, "basics", d.intent));
}

export async function saveGoals(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/programs");
  const id = fd.get("id");
  if (!isUuid(id)) return { status: "error", message: toArabicError({ message: "not_found" }) };
  const parsed = goalsSchema.safeParse(values(fd));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: values(fd) };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("programs")
    .update({ objectives: d.objectives, audience: d.audience, prerequisites: d.prerequisites })
    .eq("id", id)
    .select("id");
  if (error) return { status: "error", message: toArabicError(error), values: values(fd) };
  if (!updated?.length) return { status: "error", message: toArabicError({ message: "program_locked" }), values: values(fd) };
  touch(id);
  redirect(nextStepHref(id, "goals", d.intent));
}

export async function savePricing(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/programs");
  const id = fd.get("id");
  if (!isUuid(id)) return { status: "error", message: toArabicError({ message: "not_found" }) };
  const parsed = pricingSchema.safeParse(values(fd));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: values(fd) };
  const supabase = await createClient();
  const { data: updated, error } = await supabase.from("programs").update({ reference_price: parsed.data.price }).eq("id", id).select("id");
  if (error) return { status: "error", message: toArabicError(error), values: values(fd) };
  if (!updated?.length) return { status: "error", message: toArabicError({ message: "program_locked" }), values: values(fd) };
  touch(id);
  redirect(nextStepHref(id, "pricing", parsed.data.intent));
}

/** Debounced autosave of an existing draft (steps ١ and ٢). Invalid input is simply not saved yet. */
export async function autosaveProgram(fd: FormData): Promise<{ ok: boolean; savedAt?: string }> {
  await requireTrainer("/trainer/programs");
  const id = fd.get("id");
  if (!isUuid(id)) return { ok: false };
  const step = fd.get("step");
  const v = values(fd);
  let patch: Database["public"]["Tables"]["programs"]["Update"] | null = null;
  if (step === "basics") {
    const parsed = basicsSchema.safeParse(v);
    if (parsed.success) {
      const d = parsed.data;
      patch = { title: d.title, summary: d.summary, category_id: d.categoryId, skills: d.skills, level: d.level, total_hours: d.hours, language: d.language, prerequisites: d.prerequisites, cover_path: d.coverPath };
    }
  } else if (step === "goals") {
    const parsed = goalsSchema.safeParse(v);
    if (parsed.success) patch = { objectives: parsed.data.objectives, audience: parsed.data.audience, prerequisites: parsed.data.prerequisites };
  } else if (step === "pricing") {
    const parsed = pricingSchema.safeParse(v);
    if (parsed.success) patch = { reference_price: parsed.data.price };
  }
  if (!patch) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.from("programs").update(patch).eq("id", id).select("updated_at");
  if (error || !data?.length) return { ok: false };
  revalidatePath("/trainer/programs");
  return { ok: true, savedAt: data[0].updated_at };
}

/** Materials step: move on (materials are optional; uploads are saved as they finish). */
export async function continueFromMaterials(id: string, intent: "next" | "back"): Promise<void> {
  await requireTrainer("/trainer/programs");
  if (!isUuid(id)) redirect("/trainer/programs");
  redirect(intent === "next" ? `/trainer/programs/${id}/edit/pricing` : `/trainer/programs/${id}/edit/goals`);
}

// ── Curriculum (TRR-PRG-07) ────────────────────────────────────────────────
async function lockedResult(programId: string): Promise<ActionResult | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_edit_program", { p: programId });
  return data ? null : { ok: false, code: "program_locked", message: toArabicError({ message: "program_locked" }) };
}

export async function saveUnit(fd: FormData): Promise<ActionResult> {
  await requireTrainer("/trainer/programs");
  const parsed = unitSchema.safeParse({ summary: "", ...values(fd) });
  if (!parsed.success) return { ok: false, message: "تحقّق من الحقول المظلّلة.", fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;
  const locked = await lockedResult(d.programId);
  if (locked) return locked;
  const supabase = await createClient();

  let unitId = d.unitId;
  if (unitId) {
    const { error } = await supabase.from("program_units").update({ title: d.title, summary: d.summary }).eq("id", unitId).eq("program_id", d.programId);
    if (error) return { ok: false, message: toArabicError(error), code: errorCode(error) };
  } else {
    const { data, error } = await supabase
      .from("program_units")
      .insert({ program_id: d.programId, kind: d.kind, title: d.title, summary: d.summary, position: 100000 })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: toArabicError(error), code: errorCode(error) };
    unitId = data.id;
  }

  // Place the unit: rebuild the order and persist it in one RPC.
  const { data: units } = await supabase.from("program_units").select("id").eq("program_id", d.programId).order("position").order("created_at");
  const order = (units ?? []).map((u) => u.id).filter((x) => x !== unitId);
  if (d.place === "start") order.unshift(unitId);
  else if (d.place.startsWith("after:") && order.includes(d.place.slice(6))) order.splice(order.indexOf(d.place.slice(6)) + 1, 0, unitId);
  else if (d.place === "keep" && d.unitId) {
    const original = (units ?? []).map((u) => u.id);
    order.splice(original.indexOf(unitId), 0, unitId);
  } else order.push(unitId);
  const { error: reorderError } = await supabase.rpc("reorder_program_units", { p_program: d.programId, p_ids: order });
  if (reorderError) return { ok: false, message: toArabicError(reorderError), code: errorCode(reorderError) };
  touch(d.programId);
  return { ok: true, id: unitId };
}

export async function deleteUnit(programId: string, unitId: string): Promise<ActionResult> {
  await requireTrainer("/trainer/programs");
  if (!isUuid(programId) || !isUuid(unitId)) return { ok: false, message: toArabicError({ message: "not_found" }) };
  const locked = await lockedResult(programId);
  if (locked) return locked;
  const supabase = await createClient();
  const { data, error } = await supabase.from("program_units").delete().eq("id", unitId).eq("program_id", programId).select("id");
  if (error) return { ok: false, message: toArabicError(error), code: errorCode(error) };
  if (!data?.length) return { ok: false, message: toArabicError({ message: "not_found" }) };
  touch(programId);
  return { ok: true };
}

export async function reorderUnits(programId: string, ids: string[]): Promise<ActionResult> {
  await requireTrainer("/trainer/programs");
  if (!isUuid(programId) || !ids.every(isUuid)) return { ok: false, message: toArabicError({ message: "invalid_input" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_program_units", { p_program: programId, p_ids: ids });
  if (error) return { ok: false, message: toArabicError(error), code: errorCode(error) };
  touch(programId);
  return { ok: true };
}

export async function saveItem(fd: FormData): Promise<ActionResult> {
  await requireTrainer("/trainer/programs");
  const parsed = itemSchema.safeParse({ summary: "", minutes: "", maxScore: "", weight: "", dueNote: "", ...values(fd) });
  if (!parsed.success) return { ok: false, message: "تحقّق من الحقول المظلّلة.", fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;
  const locked = await lockedResult(d.programId);
  if (locked) return locked;
  const supabase = await createClient();
  const row = {
    title: d.title,
    summary: d.summary,
    kind: d.kind,
    duration_minutes: d.kind === "assignment" ? null : d.minutes,
    max_score: d.kind === "assignment" ? d.maxScore : null,
    weight_percent: d.kind === "assignment" ? d.weight : null,
    due_note: d.kind === "assignment" ? d.dueNote : null,
  };
  if (d.itemId) {
    const { error } = await supabase.from("program_items").update(row).eq("id", d.itemId).eq("program_id", d.programId);
    if (error) return { ok: false, message: toArabicError(error), code: errorCode(error) };
    touch(d.programId);
    return { ok: true, id: d.itemId };
  }
  const { count } = await supabase.from("program_items").select("id", { count: "exact", head: true }).eq("unit_id", d.unitId);
  const { data, error } = await supabase
    .from("program_items")
    .insert({ ...row, program_id: d.programId, unit_id: d.unitId, position: (count ?? 0) + 1 })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: toArabicError(error), code: errorCode(error) };
  touch(d.programId);
  return { ok: true, id: data.id };
}

export async function deleteItem(programId: string, itemId: string): Promise<ActionResult> {
  await requireTrainer("/trainer/programs");
  if (!isUuid(programId) || !isUuid(itemId)) return { ok: false, message: toArabicError({ message: "not_found" }) };
  const locked = await lockedResult(programId);
  if (locked) return locked;
  const supabase = await createClient();
  const { data, error } = await supabase.from("program_items").delete().eq("id", itemId).eq("program_id", programId).select("id");
  if (error) return { ok: false, message: toArabicError(error), code: errorCode(error) };
  if (!data?.length) return { ok: false, message: toArabicError({ message: "not_found" }) };
  touch(programId);
  return { ok: true };
}

/** A file uploaded from the browser to program-materials becomes a lesson of the chosen unit. */
export async function addMaterial(input: { programId: string; unitId: string; path: string; name: string; size: number; type: string }): Promise<ActionResult> {
  const user = await requireTrainer("/trainer/programs");
  const { programId, unitId, path, name, size, type } = input;
  if (!isUuid(programId) || !isUuid(unitId) || !path.startsWith(`${user.id}/${programId}/`) || !Number.isFinite(size) || size <= 0) {
    return { ok: false, message: toArabicError({ message: "invalid_input" }) };
  }
  const locked = await lockedResult(programId);
  if (locked) return locked;
  const supabase = await createClient();
  const { count } = await supabase.from("program_items").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  const title = name.replace(/\.[a-z0-9]+$/i, "").slice(0, 160).padEnd(2, "…");
  const { data, error } = await supabase
    .from("program_items")
    .insert({
      program_id: programId,
      unit_id: unitId,
      kind: type === "video/mp4" ? "video" : "file",
      title,
      position: (count ?? 0) + 1,
      media_path: path,
      media_name: name.slice(0, 200),
      media_type: type,
      media_size: Math.round(size),
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: toArabicError(error), code: errorCode(error) };
  touch(programId);
  return { ok: true, id: data.id };
}

// ── Declaration, review, withdrawal, new version ───────────────────────────
export async function submitForReview(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/programs");
  const id = fd.get("id");
  if (!isUuid(id)) return { status: "error", message: toArabicError({ message: "not_found" }) };
  const clauses = DECLARATION_CLAUSES.filter((c) => fd.get(c) === "on");
  if (clauses.length !== DECLARATION_CLAUSES.length) return { status: "error", message: toArabicError({ message: "declaration_required" }), fieldErrors: { clauses: "أشّر على البنود الأربعة" } };
  if (fd.get("final") !== "on") return { status: "error", fieldErrors: { final: "أكّد صحة ما ورد أعلاه قبل الإرسال" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_program_for_review", { p_program: id, p_clauses: [...clauses, "final"] });
  if (error) return { status: "error", message: toArabicError(error) };
  touch(id);
  redirect(`/trainer/programs/${id}/review?submitted=1`);
}

export async function withdrawReview(programId: string): Promise<ActionResult> {
  await requireTrainer("/trainer/programs");
  if (!isUuid(programId)) return { ok: false, message: toArabicError({ message: "not_found" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_program_review", { p_program: programId });
  touch(programId);
  if (error) return { ok: false, message: toArabicError(error), code: errorCode(error) };
  return { ok: true };
}

export async function cloneProgram(input: { sourceId: string; title: string; objectives: boolean; units: boolean; assignments: boolean; materials: boolean }): Promise<ActionResult> {
  await requireTrainer("/trainer/programs");
  const parsed = cloneSchema.safeParse({
    sourceId: input.sourceId,
    title: input.title,
    objectives: input.objectives ? "on" : "",
    units: input.units ? "on" : "",
    assignments: input.assignments ? "on" : "",
    materials: input.materials ? "on" : "",
  });
  if (!parsed.success) return { ok: false, message: "تحقّق من اسم النسخة.", fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clone_program", {
    p_source: d.sourceId,
    p_title: d.title,
    p_objectives: d.objectives,
    p_units: d.units,
    // Assignments and materials are their own steps (cloneAssignments / cloneMaterialsBatch) so the
    // «جارٍ إنشاء النسخة» screen (454:28838) reports real progress.
    p_assignments: false,
    p_materials: false,
  });
  if (error || !data) return { ok: false, message: toArabicError(error), code: errorCode(error) };
  touch(d.sourceId);
  touch(data);
  return { ok: true, id: data };
}

/** TRR-PRG-09 step «نسخ الواجبات» into a fresh copy. */
export async function cloneAssignments(targetId: string): Promise<ActionResult> {
  await requireTrainer("/trainer/programs");
  if (!isUuid(targetId)) return { ok: false, message: toArabicError({ message: "not_found" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("clone_program_assignments", { p_target: targetId });
  if (error) return { ok: false, message: toArabicError(error), code: errorCode(error) };
  return { ok: true };
}

/** TRR-PRG-09 step «نسخ المواد المرفوعة» — one batch; the client loops until nothing remains. */
export async function cloneMaterialsBatch(targetId: string): Promise<{ ok: true; copied: number; remaining: number } | { ok: false; message: string }> {
  await requireTrainer("/trainer/programs");
  if (!isUuid(targetId)) return { ok: false, message: toArabicError({ message: "not_found" }) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clone_program_materials", { p_target: targetId, p_limit: 4 });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return { ok: false, message: toArabicError(error) };
  return { ok: true, copied: row.copied, remaining: row.remaining };
}

/** Rolls back a copy whose later step failed, so «لم تُنشأ النسخة ولم يتأثر الأصل» stays true. */
export async function discardClone(targetId: string, sourceId: string): Promise<ActionResult> {
  await requireTrainer("/trainer/programs");
  if (!isUuid(targetId)) return { ok: false, message: toArabicError({ message: "not_found" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("discard_program_clone", { p_program: targetId });
  touch(isUuid(sourceId) ? sourceId : undefined);
  if (error) return { ok: false, message: toArabicError(error), code: errorCode(error) };
  return { ok: true };
}

/** TRR-PRG-08 step «إشعار فريق المراجعة» after a withdrawal. */
export async function notifyReviewersOfWithdrawal(programId: string): Promise<ActionResult> {
  await requireTrainer("/trainer/programs");
  if (!isUuid(programId)) return { ok: false, message: toArabicError({ message: "not_found" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("notify_program_reviewers", { p_program: programId, p_event: "withdrawn" });
  if (error) return { ok: false, message: toArabicError(error), code: errorCode(error) };
  return { ok: true };
}
