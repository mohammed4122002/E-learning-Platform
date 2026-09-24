"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import type { Json } from "@/types/database";

/*
 * Server actions of the trainer course screens (TRR-CRS-01…09). Business rules live in the database:
 * RPCs for course state (create/setup/publish/sessions/pause/new content) and RLS + guard triggers for content rows.
 */

export type ActionResult<T = undefined> = { ok: true; data?: T; savedAt?: string } | { ok: false; error: string };

const uuid = z.string().uuid();
const fail = (error: { code?: string | null; message?: string | null } | null | undefined): { ok: false; error: string } => ({ ok: false, error: toArabicError(error) });
const invalid = { ok: false as const, error: toArabicError({ message: "invalid_input" }) };

function touch(courseId?: string) {
  revalidatePath("/trainer/courses");
  if (courseId) revalidatePath(`/trainer/courses/${courseId}`, "layout");
}

/* ── Course ────────────────────────────────────────────────────────────────────────────────────── */

/** TRR-CRS-02 ٢: the first mode choice creates the draft (autosaved from then on). */
export async function createCourseDraft(programVersionId: string, mode: string): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ v: uuid, mode: z.enum(["in_person", "live_remote", "recorded"]) }).safeParse({ v: programVersionId, mode });
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_course", { p_program_version: parsed.data.v, p_mode: parsed.data.mode });
  if (error || !data) return fail(error);
  touch();
  return { ok: true, data: { id: data }, savedAt: new Date().toISOString() };
}

const patchSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    mode: z.enum(["in_person", "live_remote", "recorded"]),
    city: z.string().trim().max(120),
    venue: z.string().trim().max(200),
    duration_hours: z.number().min(0).max(1000),
    capacity: z.number().int().min(1).max(10000),
    min_capacity: z.number().int().min(0).max(10000).nullable(),
    price: z.number().min(0).max(1_000_000),
    pricing_set: z.boolean(),
    meeting_platform: z.enum(["zoom", "google_meet", "other"]),
    meeting_url: z.union([z.literal(""), z.string().trim().url().startsWith("https://").max(500)]),
    record_sessions: z.boolean(),
    live_questions: z.boolean(),
    auto_attendance: z.boolean(),
    waitlist_enabled: z.boolean(),
    lifetime_access: z.boolean(),
    allow_downloads: z.boolean(),
    certificate_on_completion: z.boolean(),
  })
  .partial()
  .strict();

export type SetupPatch = z.infer<typeof patchSchema>;

/** Autosave of the wizard steps and the editable course data. */
export async function saveCourseSetup(courseId: string, patch: SetupPatch): Promise<ActionResult> {
  const id = uuid.safeParse(courseId);
  const parsed = patchSchema.safeParse(patch);
  if (!id.success || !parsed.success) {
    const issue = parsed.success ? null : parsed.error.issues[0];
    if (issue?.path[0] === "meeting_url") return { ok: false, error: "أدخل رابطًا صحيحًا يبدأ بـ https://" };
    return invalid;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_course_setup", { p_course: id.data, p_patch: parsed.data as Json });
  if (error) return fail(error);
  touch(id.data);
  return { ok: true, savedAt: new Date().toISOString() };
}

const sessionSchema = z.array(
  z.object({ title: z.string().trim().max(200), startsAt: z.string().datetime(), endsAt: z.string().datetime(), moduleId: uuid.nullable() }),
).max(200);

/** Step ٣: replace the draft's generated schedule. */
export async function saveCourseSessions(courseId: string, sessions: z.infer<typeof sessionSchema>): Promise<ActionResult> {
  const id = uuid.safeParse(courseId);
  const parsed = sessionSchema.safeParse(sessions);
  if (!id.success || !parsed.success) return invalid;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_course_sessions", {
    p_course: id.data,
    p_sessions: parsed.data.map((s) => ({ title: s.title, starts_at: s.startsAt, ends_at: s.endsAt, module_id: s.moduleId })) as Json,
  });
  if (error) return fail(error);
  touch(id.data);
  return { ok: true, savedAt: new Date().toISOString() };
}

/** TRR-CRS-05 ٢ «عدّل جلسة قادمة». */
export async function updateSession(input: { sessionId: string; courseId: string; title: string; startsAt: string; endsAt: string; location: string; moduleId: string | null }): Promise<ActionResult> {
  const parsed = z
    .object({
      sessionId: uuid,
      courseId: uuid,
      title: z.string().trim().min(2).max(200),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
      location: z.string().trim().max(200),
      moduleId: uuid.nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return invalid;
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_course_session", {
    p_session: d.sessionId,
    p_title: d.title,
    p_starts_at: d.startsAt,
    p_ends_at: d.endsAt,
    p_location: d.location,
    p_module: d.moduleId as string,
  });
  if (error) return fail(error);
  touch(d.courseId);
  return { ok: true };
}

/** TRR-CRS-02 ٥ «انشر الدورة». */
export async function publishCourse(courseId: string, ack: boolean): Promise<ActionResult> {
  const id = uuid.safeParse(courseId);
  if (!id.success) return invalid;
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_course", { p_course: id.data, p_ack: ack === true });
  if (error) return fail(error);
  touch(id.data);
  revalidatePath("/courses/[slug]", "page");
  return { ok: true };
}

/** «أوقف البيع مؤقتًا» / «استأنف البيع». */
export async function setSalesPaused(courseId: string, paused: boolean): Promise<ActionResult> {
  const id = uuid.safeParse(courseId);
  if (!id.success) return invalid;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_course_sales_paused", { p_course: id.data, p_paused: paused });
  if (error) return fail(error);
  touch(id.data);
  return { ok: true };
}

/** «أرسل تنبيهًا للمسجّلين» / «راسل المسجّلين» (one or many courses). */
export async function notifyTrainees(courseIds: string[], title: string, body: string): Promise<ActionResult<{ count: number }>> {
  const parsed = z
    .object({ ids: z.array(uuid).min(1).max(50), title: z.string().trim().min(3).max(120), body: z.string().trim().max(1000) })
    .safeParse({ ids: courseIds, title, body });
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  let count = 0;
  for (const id of parsed.data.ids) {
    const { data, error } = await supabase.rpc("notify_course_trainees", { p_course: id, p_title: parsed.data.title, p_body: parsed.data.body });
    if (error) return fail(error);
    count += data ?? 0;
  }
  return { ok: true, data: { count } };
}

/** TRR-CRS-08: release the chosen draft lessons to current purchasers (BR-L10). */
export async function publishNewContent(courseId: string, lessonIds: string[], ack: boolean): Promise<ActionResult<{ count: number }>> {
  const parsed = z.object({ id: uuid, lessons: z.array(uuid).min(1).max(200) }).safeParse({ id: courseId, lessons: lessonIds });
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publish_new_content", { p_course: parsed.data.id, p_lessons: parsed.data.lessons, p_ack: ack === true });
  if (error) return fail(error);
  touch(parsed.data.id);
  return { ok: true, data: { count: data ?? 0 } };
}

/* ── Modules & lessons (RLS: manages_course; guard triggers keep them consistent) ───────────────── */

export async function addModule(courseId: string, title: string): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ id: uuid, title: z.string().trim().min(2).max(200) }).safeParse({ id: courseId, title });
  if (!parsed.success) return { ok: false, error: "اكتب عنوانًا للوحدة (حرفان على الأقل)." };
  const supabase = await createClient();
  const { data: last } = await supabase.from("course_modules").select("position").eq("course_id", parsed.data.id).order("position", { ascending: false }).limit(1);
  const { data, error } = await supabase
    .from("course_modules")
    .insert({ course_id: parsed.data.id, title: parsed.data.title, position: (last?.[0]?.position ?? 0) + 1 })
    .select("id")
    .single();
  if (error || !data) return fail(error);
  touch(parsed.data.id);
  return { ok: true, data: { id: data.id } };
}

export async function renameModule(courseId: string, moduleId: string, title: string): Promise<ActionResult> {
  const parsed = z.object({ c: uuid, m: uuid, title: z.string().trim().min(2).max(200) }).safeParse({ c: courseId, m: moduleId, title });
  if (!parsed.success) return { ok: false, error: "اكتب عنوانًا للوحدة (حرفان على الأقل)." };
  const supabase = await createClient();
  const { error } = await supabase.from("course_modules").update({ title: parsed.data.title }).eq("id", parsed.data.m).eq("course_id", parsed.data.c);
  if (error) return fail(error);
  touch(parsed.data.c);
  return { ok: true };
}

export async function deleteModule(courseId: string, moduleId: string): Promise<ActionResult> {
  const parsed = z.object({ c: uuid, m: uuid }).safeParse({ c: courseId, m: moduleId });
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { error, count } = await supabase.from("course_modules").delete({ count: "exact" }).eq("id", parsed.data.m).eq("course_id", parsed.data.c);
  if (error) return fail(error);
  if (!count) return { ok: false, error: "لا يمكن حذف محور موروث من البرنامج." };
  touch(parsed.data.c);
  return { ok: true };
}

/** Swap positions with the neighbour (unique (course_id, position) → through a temporary slot). */
async function swapPositions(table: "course_modules" | "lessons", a: { id: string; position: number }, b: { id: string; position: number }) {
  const supabase = await createClient();
  const temp = -Math.floor(Math.random() * 1_000_000) - 1;
  const r1 = await supabase.from(table).update({ position: temp }).eq("id", a.id);
  if (r1.error) return r1.error;
  const r2 = await supabase.from(table).update({ position: a.position }).eq("id", b.id);
  if (r2.error) return r2.error;
  const r3 = await supabase.from(table).update({ position: b.position }).eq("id", a.id);
  return r3.error;
}

export async function moveModule(courseId: string, moduleId: string, dir: "up" | "down"): Promise<ActionResult> {
  const parsed = z.object({ c: uuid, m: uuid }).safeParse({ c: courseId, m: moduleId });
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data: mods } = await supabase.from("course_modules").select("id, position").eq("course_id", parsed.data.c).order("position");
  const list = mods ?? [];
  const i = list.findIndex((m) => m.id === parsed.data.m);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  const error = await swapPositions("course_modules", list[i], list[j]);
  if (error) return fail(error);
  touch(parsed.data.c);
  return { ok: true };
}

const lessonKinds = z.enum(["video", "text", "file", "quiz"]);

export async function createLesson(courseId: string, moduleId: string, kind: string, title: string): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ c: uuid, m: uuid, kind: lessonKinds, title: z.string().trim().min(2).max(200) }).safeParse({ c: courseId, m: moduleId, kind, title });
  if (!parsed.success) return { ok: false, error: "اكتب عنوانًا للدرس (حرفان على الأقل) واختر نوعه." };
  const supabase = await createClient();
  const { data: last } = await supabase.from("lessons").select("position").eq("module_id", parsed.data.m).order("position", { ascending: false }).limit(1);
  const { data, error } = await supabase
    .from("lessons")
    .insert({ course_id: parsed.data.c, module_id: parsed.data.m, kind: parsed.data.kind, title: parsed.data.title, position: (last?.[0]?.position ?? 0) + 1 })
    .select("id")
    .single();
  if (error || !data) return fail(error);
  if (parsed.data.kind === "quiz") {
    const { error: qe } = await supabase.from("quizzes").insert({ course_id: parsed.data.c, lesson_id: data.id, title: parsed.data.title, questions: [] });
    if (qe) return fail(qe);
  }
  touch(parsed.data.c);
  return { ok: true, data: { id: data.id } };
}

const lessonPatch = z
  .object({
    title: z.string().trim().min(2).max(200),
    body: z.string().max(50_000).nullable(),
    is_preview: z.boolean(),
    duration_seconds: z.number().int().min(0).max(24 * 3600),
    media_path: z.string().max(500).nullable(),
    media_size: z.number().int().min(0).nullable(),
    media_type: z.string().max(200).nullable(),
  })
  .partial()
  .strict();

export async function updateLesson(courseId: string, lessonId: string, patch: z.infer<typeof lessonPatch>): Promise<ActionResult> {
  const ids = z.object({ c: uuid, l: uuid }).safeParse({ c: courseId, l: lessonId });
  const parsed = lessonPatch.safeParse(patch);
  if (!ids.success || !parsed.success) return invalid;
  if (parsed.data.media_path && !parsed.data.media_path.startsWith(`${ids.data.c}/`)) return invalid;
  const supabase = await createClient();
  const { data: before } = await supabase.from("lessons").select("media_path").eq("id", ids.data.l).eq("course_id", ids.data.c).maybeSingle();
  if (!before) return fail({ message: "not_found" });
  const { error } = await supabase.from("lessons").update(parsed.data).eq("id", ids.data.l).eq("course_id", ids.data.c);
  if (error) return fail(error);
  // Replaced media: remove the old object (lesson-media delete policy: course staff).
  if ("media_path" in parsed.data && before.media_path && before.media_path !== parsed.data.media_path) {
    await supabase.storage.from("lesson-media").remove([before.media_path]);
  }
  if (typeof parsed.data.title === "string") {
    await supabase.from("quizzes").update({ title: parsed.data.title }).eq("lesson_id", ids.data.l);
  }
  touch(ids.data.c);
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<ActionResult> {
  const ids = z.object({ c: uuid, l: uuid }).safeParse({ c: courseId, l: lessonId });
  if (!ids.success) return invalid;
  const supabase = await createClient();
  const { data: before } = await supabase.from("lessons").select("media_path").eq("id", ids.data.l).eq("course_id", ids.data.c).maybeSingle();
  await supabase.from("quizzes").delete().eq("lesson_id", ids.data.l);
  const { error } = await supabase.from("lessons").delete().eq("id", ids.data.l).eq("course_id", ids.data.c);
  if (error) return fail(error);
  if (before?.media_path) await supabase.storage.from("lesson-media").remove([before.media_path]);
  touch(ids.data.c);
  return { ok: true };
}

export async function moveLesson(courseId: string, lessonId: string, dir: "up" | "down"): Promise<ActionResult> {
  const ids = z.object({ c: uuid, l: uuid }).safeParse({ c: courseId, l: lessonId });
  if (!ids.success) return invalid;
  const supabase = await createClient();
  const { data: l } = await supabase.from("lessons").select("module_id").eq("id", ids.data.l).maybeSingle();
  if (!l) return fail({ message: "not_found" });
  const { data: siblings } = await supabase.from("lessons").select("id, position").eq("module_id", l.module_id).order("position");
  const list = siblings ?? [];
  const i = list.findIndex((x) => x.id === ids.data.l);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  const error = await swapPositions("lessons", list[i], list[j]);
  if (error) return fail(error);
  touch(ids.data.c);
  return { ok: true };
}

const questionSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().trim().min(2).max(1000),
  options: z.array(z.string().trim().min(1).max(300)).min(2).max(6),
  answer: z.number().int().min(0),
});

export async function saveQuiz(
  courseId: string,
  lessonId: string,
  input: { passPercent: number; timeLimitMinutes: number | null; maxAttempts: number; questions: z.infer<typeof questionSchema>[] },
): Promise<ActionResult> {
  const parsed = z
    .object({
      c: uuid,
      l: uuid,
      passPercent: z.number().int().min(0).max(100),
      timeLimitMinutes: z.number().int().min(1).max(600).nullable(),
      maxAttempts: z.number().int().min(1).max(10),
      questions: z.array(questionSchema).max(100),
    })
    .safeParse({ c: courseId, l: lessonId, ...input });
  if (!parsed.success) return { ok: false, error: "أكمل كل سؤال: نص السؤال وخياران على الأقل وحدّد الإجابة الصحيحة." };
  const d = parsed.data;
  if (d.questions.some((q) => q.answer >= q.options.length)) return { ok: false, error: "حدّد الإجابة الصحيحة لكل سؤال." };
  const supabase = await createClient();
  const { data: quiz } = await supabase.from("quizzes").select("id").eq("lesson_id", d.l).eq("course_id", d.c).maybeSingle();
  const row = { pass_percent: d.passPercent, time_limit_minutes: d.timeLimitMinutes, max_attempts: d.maxAttempts, questions: d.questions as Json };
  const { error } = quiz
    ? await supabase.from("quizzes").update(row).eq("id", quiz.id)
    : await supabase.from("quizzes").insert({ ...row, course_id: d.c, lesson_id: d.l, title: "اختبار" });
  if (error) return fail(error);
  // A quiz lesson's length is its time limit (shown in the outline).
  await supabase.from("lessons").update({ duration_seconds: (d.timeLimitMinutes ?? 0) * 60 }).eq("id", d.l);
  touch(d.c);
  return { ok: true, savedAt: new Date().toISOString() };
}

/* ── Assignments ─────────────────────────────────────────────────────────────────────────────────── */

const assignmentSchema = z.object({
  title: z.string().trim().min(2).max(200),
  instructions: z.string().trim().max(4000),
  requirements: z.array(z.string().trim().min(1).max(300)).max(20),
  moduleId: uuid.nullable(),
  dueAt: z.string().datetime().nullable(),
  maxScore: z.number().int().min(1).max(1000),
  passScore: z.number().int().min(0).max(1000).nullable(),
  weightPercent: z.number().int().min(0).max(100).nullable(),
  maxAttempts: z.number().int().min(1).max(10),
  acceptedFormats: z.string().trim().min(2).max(60),
  maxFileMb: z.number().int().min(1).max(25),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

export async function saveAssignment(courseId: string, assignmentId: string | null, input: AssignmentInput): Promise<ActionResult<{ id: string }>> {
  const ids = z.object({ c: uuid, a: uuid.nullable() }).safeParse({ c: courseId, a: assignmentId });
  const parsed = assignmentSchema.safeParse(input);
  if (!ids.success) return invalid;
  if (!parsed.success) {
    const f = parsed.error.issues[0]?.path[0];
    return { ok: false, error: f === "title" ? "اكتب عنوانًا للواجب (حرفان على الأقل)." : "تحقّق من بيانات الواجب ثم أعد المحاولة." };
  }
  const d = parsed.data;
  if (d.passScore !== null && d.passScore > d.maxScore) return { ok: false, error: "درجة النجاح أكبر من الدرجة الكاملة." };
  const row = {
    title: d.title,
    instructions: d.instructions || null,
    requirements: d.requirements,
    module_id: d.moduleId,
    due_at: d.dueAt,
    max_score: d.maxScore,
    pass_score: d.passScore,
    weight_percent: d.weightPercent,
    max_attempts: d.maxAttempts,
    accepted_formats: d.acceptedFormats,
    max_file_mb: d.maxFileMb,
  };
  const supabase = await createClient();
  if (ids.data.a) {
    const { error } = await supabase.from("assignments").update(row).eq("id", ids.data.a).eq("course_id", ids.data.c);
    if (error) return fail(error);
    touch(ids.data.c);
    return { ok: true, data: { id: ids.data.a } };
  }
  const { data, error } = await supabase.from("assignments").insert({ ...row, course_id: ids.data.c }).select("id").single();
  if (error || !data) return fail(error);
  touch(ids.data.c);
  return { ok: true, data: { id: data.id } };
}

export async function deleteAssignment(courseId: string, assignmentId: string): Promise<ActionResult> {
  const ids = z.object({ c: uuid, a: uuid }).safeParse({ c: courseId, a: assignmentId });
  if (!ids.success) return invalid;
  const supabase = await createClient();
  const { error, count } = await supabase.from("assignments").delete({ count: "exact" }).eq("id", ids.data.a).eq("course_id", ids.data.c);
  if (error) return fail(error);
  if (!count) return { ok: false, error: "لا يمكن حذف واجب سلّمه متدربون." };
  touch(ids.data.c);
  return { ok: true };
}

/* ── Course files (TRR-CRS-05 ٣) ─────────────────────────────────────────────────────────────────── */

export async function addCourseFile(courseId: string, input: { title: string; path: string; size: number; mime: string; publish: boolean }): Promise<ActionResult<{ id: string }>> {
  const parsed = z
    .object({ c: uuid, title: z.string().trim().min(1).max(200), path: z.string().max(500), size: z.number().int().min(0), mime: z.string().max(200), publish: z.boolean() })
    .safeParse({ c: courseId, ...input });
  if (!parsed.success || !parsed.data.path.startsWith(`${parsed.data.c}/files/`)) return invalid;
  const d = parsed.data;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return fail({ message: "not_authenticated" });
  const { data, error } = await supabase
    .from("course_files")
    .insert({ course_id: d.c, title: d.title, file_path: d.path, file_size: d.size, mime_type: d.mime, published_at: d.publish ? new Date().toISOString() : null, created_by: uid })
    .select("id")
    .single();
  if (error || !data) return fail(error);
  touch(d.c);
  return { ok: true, data: { id: data.id } };
}

export async function updateCourseFile(courseId: string, fileId: string, patch: { title?: string; publish?: boolean }): Promise<ActionResult> {
  const parsed = z.object({ c: uuid, f: uuid, title: z.string().trim().min(1).max(200).optional(), publish: z.boolean().optional() }).safeParse({ c: courseId, f: fileId, ...patch });
  if (!parsed.success) return invalid;
  const row: { title?: string; published_at?: string | null } = {};
  if (parsed.data.title !== undefined) row.title = parsed.data.title;
  if (parsed.data.publish !== undefined) row.published_at = parsed.data.publish ? new Date().toISOString() : null;
  const supabase = await createClient();
  const { error } = await supabase.from("course_files").update(row).eq("id", parsed.data.f).eq("course_id", parsed.data.c);
  if (error) return fail(error);
  touch(parsed.data.c);
  return { ok: true };
}

export async function deleteCourseFile(courseId: string, fileId: string): Promise<ActionResult> {
  const parsed = z.object({ c: uuid, f: uuid }).safeParse({ c: courseId, f: fileId });
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data: f } = await supabase.from("course_files").select("file_path").eq("id", parsed.data.f).eq("course_id", parsed.data.c).maybeSingle();
  const { error } = await supabase.from("course_files").delete().eq("id", parsed.data.f).eq("course_id", parsed.data.c);
  if (error) return fail(error);
  if (f?.file_path) await supabase.storage.from("lesson-media").remove([f.file_path]);
  touch(parsed.data.c);
  return { ok: true };
}

/** Short-lived link to a file of the course (staff preview of lesson media, course files and inherited materials). */
export async function courseFileUrl(courseId: string, path: string, bucket: "lesson-media" | "program-materials" = "lesson-media"): Promise<ActionResult<{ url: string }>> {
  const parsed = z.object({ c: uuid, path: z.string().min(3).max(500) }).safeParse({ c: courseId, path });
  if (!parsed.success) return invalid;
  if (bucket === "lesson-media" && !parsed.data.path.startsWith(`${parsed.data.c}/`)) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(parsed.data.path, 600);
  if (error || !data) return { ok: false, error: toArabicError({ message: "not_found" }) };
  return { ok: true, data: { url: data.signedUrl } };
}
