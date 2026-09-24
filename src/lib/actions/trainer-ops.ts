"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTrainer } from "@/lib/auth";
import { toArabicError } from "@/lib/errors";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import {
  attendanceSchema,
  broadcastSchema,
  cancelSchema,
  capacitySchema,
  gradeSchema,
  postponeSchema,
  replySchema,
  reviewSchema,
  unlockSchema,
} from "@/lib/validation/trainer-ops";

/*
 * Server actions of the trainer course operations. Every write is a security-definer RPC that re-checks
 * manages_course() and the business rules (seats, attendance lock, results approval, certificates, refunds).
 */

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; message: string; code?: string };

const base = (courseId: string) => `/trainer/courses/${courseId}`;

function revalidateCourse(courseId: string) {
  revalidatePath(base(courseId), "layout");
  revalidatePath("/trainer/courses");
}

const kept = (formData: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));

// ── Messages (راسل الجميع · راسل المحددين · راسل قائمة الانتظار · نبّههما الآن) ─────────────────────────────
export async function broadcastToTrainees(input: { courseId: string; audience: "enrolled" | "waitlist" | "selected"; body: string; trainees?: string[] }): Promise<ActionResult<number>> {
  await requireTrainer();
  const parsed = broadcastSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "تحقّق من الرسالة" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("notify_course_trainees", {
    p_course: parsed.data.courseId,
    p_audience: parsed.data.audience,
    p_body: parsed.data.body,
    p_trainees: parsed.data.trainees ?? undefined,
  });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(parsed.data.courseId);
  return { ok: true, data: data ?? 0 };
}

// ── Seats (462:*) ────────────────────────────────────────────────────────────────────────────────
export async function updateCapacity(courseId: string, capacity: number): Promise<ActionResult<{ capacity: number; promoted: number }>> {
  await requireTrainer();
  const parsed = capacitySchema.safeParse({ courseId, capacity });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "تحقّق من العدد" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_course_capacity", { p_course: courseId, p_capacity: parsed.data.capacity });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(courseId);
  const row = data?.[0];
  return { ok: true, data: { capacity: row?.capacity ?? parsed.data.capacity, promoted: row?.promoted ?? 0 } };
}

export async function grantWaitlistSeat(courseId: string): Promise<ActionResult<number>> {
  await requireTrainer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("grant_waitlist_seat", { p_course: courseId });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(courseId);
  return { ok: true, data: data ?? 0 };
}

export async function releaseUnpaidHold(courseId: string, enrollmentId: string): Promise<ActionResult> {
  await requireTrainer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_unpaid_hold", { p_enrollment: enrollmentId });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(courseId);
  return { ok: true };
}

// ── Postpone / cancel (277:5339 / 277:5650) ──────────────────────────────────────────────────────
export async function postponeCourse(_: FormState, formData: FormData): Promise<FormState> {
  await requireTrainer();
  const values = kept(formData, ["startsOn", "endsOn", "reason", "message"]);
  const parsed = postponeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("postpone_course", {
    p_course: d.courseId,
    p_starts_on: d.startsOn,
    p_ends_on: d.endsOn,
    p_reason: d.reason,
    p_message: d.message,
  });
  if (error) return { status: "error", message: toArabicError(error), values };
  revalidateCourse(d.courseId);
  redirect(`${base(d.courseId)}/trainees?postponed=${data ?? 0}`);
}

export async function cancelCourse(_: FormState, formData: FormData): Promise<FormState> {
  await requireTrainer();
  const values = kept(formData, ["reason", "message"]);
  const parsed = cancelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_course", { p_course: d.courseId, p_reason: d.reason, p_message: d.message });
  if (error) return { status: "error", message: toArabicError(error), values };
  revalidateCourse(d.courseId);
  redirect(`${base(d.courseId)}/trainees?cancelled=1`);
}

// ── Attendance (TRR-ATT-01/02/03) ────────────────────────────────────────────────────────────────
export async function saveAttendance(input: {
  courseId: string;
  sessionId: string;
  marks: Record<string, "present" | "late" | "excused" | "absent">;
  approve: boolean;
  reason?: string;
}): Promise<ActionResult<number>> {
  await requireTrainer();
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "تحقّق من الرصد" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_attendance", {
    p_session: parsed.data.sessionId,
    p_marks: parsed.data.marks,
    p_approve: parsed.data.approve,
    p_reason: parsed.data.reason || undefined,
  });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(input.courseId);
  return { ok: true, data: data ?? 0 };
}

export async function createAttendanceCode(courseId: string, sessionId: string): Promise<ActionResult<{ code: string; expiresAt: string }>> {
  await requireTrainer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_attendance_code", { p_session: sessionId });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidatePath(`${base(courseId)}/attendance`, "layout");
  const row = data?.[0];
  if (!row) return { ok: false, message: toArabicError(null) };
  return { ok: true, data: { code: row.code, expiresAt: row.expires_at } };
}

export async function importLiveAttendance(courseId: string, sessionId: string): Promise<ActionResult<string>> {
  await requireTrainer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_live_attendance", { p_session: sessionId });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidatePath(`${base(courseId)}/attendance`, "layout");
  return { ok: true, data: data ?? "failed" };
}

export async function requestAttendanceUnlock(courseId: string, sessionId: string, reason: string): Promise<ActionResult> {
  await requireTrainer();
  const parsed = unlockSchema.safeParse({ sessionId, reason });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "اكتب السبب" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_attendance_unlock", { p_session: sessionId, p_reason: parsed.data.reason });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidatePath(`${base(courseId)}/attendance`, "layout");
  return { ok: true };
}

// ── Grading (TRR-CRS-11) ─────────────────────────────────────────────────────────────────────────
export async function gradeSubmission(input: {
  courseId: string;
  submissionId: string;
  scores: Record<string, number>;
  feedback: string;
  flag: boolean;
}): Promise<ActionResult<string>> {
  await requireTrainer();
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "تحقّق من الدرجات" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("grade_submission", {
    p_submission: parsed.data.submissionId,
    p_scores: parsed.data.scores,
    p_feedback: parsed.data.feedback,
    p_flag: parsed.data.flag,
  });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(input.courseId);
  return { ok: true, data: data ?? "" };
}

export async function remindAssignment(courseId: string, assignmentId: string, traineeId: string): Promise<ActionResult> {
  await requireTrainer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("remind_assignment", { p_assignment: assignmentId, p_trainee: traineeId });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(courseId);
  return { ok: true };
}

// ── Results (TRR-RES-01) ─────────────────────────────────────────────────────────────────────────
export async function saveResults(courseId: string, outcomes: Record<string, "passed" | "failed">, reset: boolean): Promise<ActionResult<number>> {
  await requireTrainer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_course_results", { p_course: courseId, p_outcomes: outcomes, p_reset: reset });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(courseId);
  return { ok: true, data: data ?? 0 };
}

export async function approveResults(courseId: string, outcomes: Record<string, "passed" | "failed">): Promise<ActionResult<number>> {
  await requireTrainer();
  const supabase = await createClient();
  const saved = await supabase.rpc("save_course_results", { p_course: courseId, p_outcomes: outcomes, p_reset: false });
  if (saved.error) return { ok: false, message: toArabicError(saved.error), code: saved.error.message };
  const { data, error } = await supabase.rpc("approve_course_results", { p_course: courseId });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(courseId);
  return { ok: true, data: data ?? 0 };
}

// ── Certificates (TRR-CRT-01/02) ─────────────────────────────────────────────────────────────────
export async function issueCertificates(courseId: string, enrollmentIds?: string[]): Promise<ActionResult<{ issued: number; skipped: number }>> {
  await requireTrainer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trainer_issue_certificates", { p_course: courseId, p_enrollments: enrollmentIds ?? undefined });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(courseId);
  revalidatePath("/trainee/certificates");
  const row = data?.[0];
  return { ok: true, data: { issued: row?.issued ?? 0, skipped: row?.skipped ?? 0 } };
}

export async function issueProgramCertificates(courseId: string): Promise<ActionResult<number>> {
  await requireTrainer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_program_certificates", { p_course: courseId });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(courseId);
  return { ok: true, data: data ?? 0 };
}

// ── Ratings (TRR-RTG-01) ─────────────────────────────────────────────────────────────────────────
export async function requestCourseRatings(courseId: string): Promise<ActionResult<number>> {
  await requireTrainer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_course_ratings", { p_course: courseId });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidateCourse(courseId);
  return { ok: true, data: data ?? 0 };
}

// ── Rating reply (TRR-RTG-02) and review request (TRR-RTG-03) ─────────────────────────────────────
export async function saveRatingReply(input: { ratingId: string; body: string; action: "draft" | "publish" | "skip" }): Promise<ActionResult<string>> {
  await requireTrainer();
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "تحقّق من الرد" };
  if (parsed.data.action === "publish" && parsed.data.body.length < 10) return { ok: false, message: "اكتب ردًّا من ١٠ أحرف على الأقل" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_rating_reply", { p_rating: parsed.data.ratingId, p_body: parsed.data.body, p_action: parsed.data.action });
  if (error) return { ok: false, message: toArabicError(error), code: error.message };
  revalidatePath("/trainer/ratings", "layout");
  revalidatePath("/trainer/courses", "layout");
  revalidatePath("/trainee/ratings");
  return { ok: true, data: data ?? "" };
}

export async function requestRatingReview(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireTrainer();
  const raw = kept(formData, ["ratingId", "reason", "details", "evidencePath", "acknowledge"]);
  const parsed = reviewSchema.safeParse({ ...raw, evidencePath: raw.evidencePath || undefined });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: raw };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_rating_review", {
    p_rating: parsed.data.ratingId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details,
    p_evidence_path: parsed.data.evidencePath,
  });
  if (error) return { status: "error", message: toArabicError(error), values: raw };
  revalidatePath("/trainer/ratings", "layout");
  redirect(`/trainer/ratings/${parsed.data.ratingId}/review?sent=1`);
}
