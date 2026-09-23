"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorCode, toArabicError } from "@/lib/errors";

const uuid = z.string().uuid("معرّف غير صالح");

export type ProgressResult =
  | { ok: true; completed: boolean; coursePercent: number }
  | { ok: false; message: string; retryable: boolean };

const progressSchema = z.object({
  lessonId: uuid,
  position: z.number({ error: "موضع غير صالح" }).int().min(0).max(24 * 3600),
});

/**
 * BR-L11 — watching is progress. Called by the player (throttled) and when a text/file lesson is opened.
 * Returns a result instead of throwing so the client can keep unsaved progress and retry (BR-S1).
 */
export async function recordLessonProgress(input: { lessonId: string; position: number }): Promise<ProgressResult> {
  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? toArabicError({ code: "invalid_input" }), retryable: false };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("record_lesson_progress", { p_lesson: parsed.data.lessonId, p_position: Math.floor(parsed.data.position) });
    if (error) {
      const code = errorCode(error);
      return { ok: false, message: toArabicError(error), retryable: !code || code === "network" };
    }
    const row = data?.[0];
    return { ok: true, completed: Boolean(row?.completed), coursePercent: row?.course_percent ?? 0 };
  } catch {
    return { ok: false, message: toArabicError({ code: "network" }), retryable: true };
  }
}

const answersSchema = z.record(z.string().max(40), z.string().regex(/^\d{1,2}$/, "إجابة غير صالحة"));

export type QuizSubmitResult = { ok: true; attemptId: string } | { ok: false; message: string };

/** TRN-LRN-04 — server-graded submission. Passing a lesson-linked quiz completes that lesson (BR-L10 progress). */
export async function submitQuiz(input: { quizId: string; answers: Record<string, string> }): Promise<QuizSubmitResult> {
  const id = uuid.safeParse(input.quizId);
  const answers = answersSchema.safeParse(input.answers);
  if (!id.success || !answers.success) return { ok: false, message: "تعذّر قراءة إجاباتك. أعد تحميل الصفحة ثم حاول مجددًا." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quiz_attempt", { p_quiz: id.data, p_answers: answers.data });
  if (error || !data?.[0]) return { ok: false, message: toArabicError(error) };
  const result = data[0];
  if (result.passed) {
    const { data: meta } = await supabase.rpc("get_quiz", { p_quiz: id.data });
    const courseId = meta?.[0]?.course_id;
    if (courseId) {
      const { data: quizzes } = await supabase.rpc("course_quizzes", { p_course: courseId });
      const lessonId = quizzes?.find((q) => q.id === id.data)?.lesson_id;
      if (lessonId) await supabase.rpc("record_lesson_progress", { p_lesson: lessonId, p_position: 0 });
    }
  }
  revalidatePath("/trainee/learn", "layout");
  return { ok: true, attemptId: result.attempt_id };
}
