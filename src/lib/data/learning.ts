import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { COMPLETE_AT } from "@/lib/learning";
import type { CourseMode, EnrollmentStatus } from "@/types/views";

/*
 * Read models for the recorded-course learning screens:
 * TRN-MYE-04 (course content), TRN-LRN-06 (lesson player), TRN-LRN-03 (module journey), TRN-LRN-04 (quiz).
 * Everything runs as the signed-in trainee — RLS hides lessons once access is revoked.
 */

export type LessonKind = "video" | "text" | "file" | "quiz";
export type LessonStatus = "done" | "in_progress" | "todo";

export type LessonView = {
  id: string;
  moduleId: string;
  modulePosition: number;
  position: number;
  /** 1-based position across the whole course. */
  index: number;
  title: string;
  kind: LessonKind;
  durationSeconds: number;
  isPreview: boolean;
  hasMedia: boolean;
  /** BR-L10: published after the trainee's purchase. */
  isNew: boolean;
  publishedAt: string | null;
  status: LessonStatus;
  positionSeconds: number;
  /** 0–100, video lessons only. */
  watchedPercent: number;
  updatedAt: string | null;
  completedAt: string | null;
  href: string;
  quiz: QuizSummary | null;
};

export type QuizSummary = {
  id: string;
  title: string;
  passPercent: number;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  questionCount: number;
  attemptsUsed: number;
  passed: boolean;
  bestScore: number | null;
};

export type ModuleView = {
  id: string;
  position: number;
  title: string;
  lessons: LessonView[];
  completed: number;
  total: number;
};

export type AccessEnded = {
  status: EnrollmentStatus;
  endedAt: string | null;
  refund: { id: string; amount: number; decidedAt: string | null; createdAt: string } | null;
  payment: { ref: string | null; method: string; amount: number; currency: string } | null;
};

export type CourseContent = {
  enrollment: { id: string; status: EnrollmentStatus; confirmedAt: string | null; createdAt: string };
  course: {
    id: string;
    slug: string;
    title: string;
    mode: CourseMode;
    trainerName: string;
    trainerHeadline: string | null;
    organizationName: string | null;
    durationHours: number | null;
  };
  /** Set when the trainee can no longer open the content (withdrawn / refunded / revoked / cancelled). */
  ended: AccessEnded | null;
  /** Enrollment not confirmed yet (payment or provider approval pending). */
  pending: boolean;
  modules: ModuleView[];
  lessons: LessonView[];
  progress: { completed: number; total: number; percent: number };
  /** BR-L10: progress as it was before the new lessons were published. */
  before: { completed: number; total: number; percent: number } | null;
  newLessons: LessonView[];
  resume: LessonView | null;
  quizzes: { total: number; passed: number };
  files: LessonView[];
};

const ENDED: EnrollmentStatus[] = ["withdrawn", "cancelled", "access_revoked"];
const PENDING: EnrollmentStatus[] = ["pending_payment", "pending_provider"];

type EnrollmentRow = {
  id: string;
  status: EnrollmentStatus;
  confirmed_at: string | null;
  created_at: string;
  ended_at: string | null;
  course_id: string;
  courses: {
    id: string;
    slug: string;
    title: string;
    mode: CourseMode;
    duration_hours: number | null;
    trainer: { full_name: string; headline: string | null } | null;
    organizations: { name: string } | null;
  } | null;
};

/** Everything the course content page, the player and the journey need. `null` = not the trainee's enrollment. */
export const getCourseContent = cache(async (userId: string, enrollmentId: string): Promise<CourseContent | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(enrollmentId)) return null;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("enrollments")
    .select(
      "id, status, confirmed_at, created_at, ended_at, course_id, courses(id, slug, title, mode, duration_hours, trainer:profiles!courses_trainer_id_fkey(full_name, headline), organizations(name))",
    )
    .eq("id", enrollmentId)
    .eq("trainee_id", userId)
    .maybeSingle();
  const e = row as unknown as EnrollmentRow | null;
  if (!e?.courses) return null;
  const c = e.courses;

  const base = {
    enrollment: { id: e.id, status: e.status, confirmedAt: e.confirmed_at, createdAt: e.created_at },
    course: {
      id: c.id,
      slug: c.slug,
      title: c.title,
      mode: c.mode,
      trainerName: c.trainer?.full_name ?? "",
      trainerHeadline: c.trainer?.headline ?? null,
      organizationName: c.organizations?.name ?? null,
      durationHours: c.duration_hours === null ? null : Number(c.duration_hours),
    },
  };
  const empty = {
    modules: [],
    lessons: [],
    progress: { completed: 0, total: 0, percent: 0 },
    before: null,
    newLessons: [],
    resume: null,
    quizzes: { total: 0, passed: 0 },
    files: [],
  };

  if (ENDED.includes(e.status)) {
    const [refundRes, paymentRes] = await Promise.all([
      supabase
        .from("refund_requests")
        .select("id, amount, decided_at, created_at")
        .eq("enrollment_id", e.id)
        .eq("status", "approved")
        .order("decided_at", { ascending: false })
        .limit(1),
      supabase
        .from("payments")
        .select("provider_ref, method, amount, currency")
        .eq("enrollment_id", e.id)
        .in("status", ["succeeded", "refunded"])
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    const r = refundRes.data?.[0];
    const p = paymentRes.data?.[0];
    return {
      ...base,
      ...empty,
      pending: false,
      ended: {
        status: e.status,
        endedAt: e.ended_at,
        refund: r ? { id: r.id, amount: Number(r.amount), decidedAt: r.decided_at, createdAt: r.created_at } : null,
        payment: p ? { ref: p.provider_ref, method: p.method, amount: Number(p.amount), currency: p.currency } : null,
      },
    };
  }
  if (PENDING.includes(e.status)) return { ...base, ...empty, pending: true, ended: null };

  const [modulesRes, lessonsRes, progressRes, courseProgressRes, quizzesRes, attemptsRes] = await Promise.all([
    supabase.from("course_modules").select("id, position, title").eq("course_id", c.id).order("position"),
    supabase
      .from("lessons")
      .select("id, module_id, position, title, kind, duration_seconds, media_path, is_preview, published_at")
      .eq("course_id", c.id)
      .not("published_at", "is", null),
    supabase.from("lesson_progress").select("lesson_id, position_seconds, completed_at, updated_at").eq("trainee_id", userId).eq("course_id", c.id),
    supabase.rpc("course_progress", { p_course: c.id }),
    supabase.rpc("course_quizzes", { p_course: c.id }),
    supabase.from("quiz_attempts").select("quiz_id, score_percent, passed, submitted_at").eq("trainee_id", userId).not("submitted_at", "is", null),
  ]);
  if (modulesRes.error || lessonsRes.error) throw new Error("learning_content_unavailable");

  const progressBy = new Map((progressRes.data ?? []).map((p) => [p.lesson_id, p]));
  const attempts = attemptsRes.data ?? [];
  const quizByLesson = new Map(
    (quizzesRes.data ?? []).map((q) => {
      const own = attempts.filter((a) => a.quiz_id === q.id);
      const scores = own.map((a) => a.score_percent ?? 0);
      const summary: QuizSummary = {
        id: q.id,
        title: q.title,
        passPercent: q.pass_percent,
        timeLimitMinutes: q.time_limit_minutes,
        maxAttempts: q.max_attempts,
        questionCount: q.question_count,
        attemptsUsed: own.length,
        passed: own.some((a) => a.passed),
        bestScore: scores.length ? Math.max(...scores) : null,
      };
      return [q.lesson_id, summary] as const;
    }),
  );
  const confirmedAt = e.confirmed_at ? new Date(e.confirmed_at).getTime() : null;
  const modulePos = new Map((modulesRes.data ?? []).map((m) => [m.id, m.position]));

  const sorted = [...(lessonsRes.data ?? [])].sort(
    (a, b) => (modulePos.get(a.module_id) ?? 0) - (modulePos.get(b.module_id) ?? 0) || a.position - b.position,
  );
  const lessons: LessonView[] = sorted.map((l, i) => {
    const p = progressBy.get(l.id);
    const done = Boolean(p?.completed_at);
    const pos = p?.position_seconds ?? 0;
    const watched = l.kind === "video" && l.duration_seconds > 0 ? Math.min(100, Math.round((pos / l.duration_seconds) * 100)) : done ? 100 : 0;
    return {
      id: l.id,
      moduleId: l.module_id,
      modulePosition: modulePos.get(l.module_id) ?? 0,
      position: l.position,
      index: i + 1,
      title: l.title,
      kind: l.kind,
      durationSeconds: l.duration_seconds,
      isPreview: l.is_preview,
      hasMedia: Boolean(l.media_path),
      isNew: confirmedAt !== null && l.published_at !== null && new Date(l.published_at).getTime() > confirmedAt,
      publishedAt: l.published_at,
      status: done ? "done" : p && (pos > 0 || l.kind !== "video") ? "in_progress" : "todo",
      positionSeconds: pos,
      watchedPercent: done ? 100 : watched,
      updatedAt: p?.updated_at ?? null,
      completedAt: p?.completed_at ?? null,
      href: `/trainee/learn/${e.id}/lessons/${l.id}`,
      quiz: quizByLesson.get(l.id) ?? null,
    };
  });

  const modules: ModuleView[] = (modulesRes.data ?? []).map((m) => {
    const own = lessons.filter((l) => l.moduleId === m.id);
    return { id: m.id, position: m.position, title: m.title, lessons: own, completed: own.filter((l) => l.status === "done").length, total: own.length };
  });

  const cp = courseProgressRes.data?.[0];
  const completed = cp?.completed ?? lessons.filter((l) => l.status === "done").length;
  const total = cp?.total ?? lessons.length;
  const percent = cp?.percent ?? (total ? Math.floor((completed * 100) / total) : 0);

  // Content that existed before the purchase defines the baseline; if nothing did, nothing is "added".
  if (lessons.every((l) => l.isNew)) lessons.forEach((l) => (l.isNew = false));
  const newLessons = lessons.filter((l) => l.isNew);
  const pendingNew = newLessons.filter((l) => l.status !== "done");
  let before: CourseContent["before"] = null;
  if (pendingNew.length > 0) {
    const oldTotal = total - newLessons.length;
    const oldDone = lessons.filter((l) => !l.isNew && l.status === "done").length;
    before = { completed: oldDone, total: oldTotal, percent: oldTotal ? Math.floor((oldDone * 100) / oldTotal) : 0 };
  }

  // "Continue where you left off": the most recently touched unfinished lesson, else the first unfinished one.
  const touched = lessons
    .filter((l) => l.status === "in_progress" && l.updatedAt)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  const resume = touched[0] ?? lessons.find((l) => l.status !== "done") ?? null;

  const quizLessons = lessons.filter((l) => l.quiz);
  return {
    ...base,
    ended: null,
    pending: false,
    modules,
    lessons,
    progress: { completed, total, percent },
    before,
    newLessons: pendingNew.length > 0 ? newLessons : [],
    resume,
    quizzes: { total: quizLessons.length, passed: quizLessons.filter((l) => l.quiz?.passed).length },
    files: lessons.filter((l) => l.kind === "file"),
  };
});

/** Short-lived signed URL for a lesson's private media (bucket lesson-media, "<course_id>/…"). */
export async function lessonMediaUrl(lessonId: string, opts?: { download?: string }): Promise<string | null> {
  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("media_path").eq("id", lessonId).maybeSingle();
  if (!lesson?.media_path) return null;
  const { data } = await supabase.storage.from("lesson-media").createSignedUrl(lesson.media_path, 60 * 60, opts?.download ? { download: opts.download } : undefined);
  return data?.signedUrl ?? null;
}

export type LessonPage = {
  content: CourseContent;
  lesson: LessonView;
  body: string | null;
  mediaUrl: string | null;
  prev: LessonView | null;
  next: LessonView | null;
  completeAt: number;
};

/** TRN-LRN-06: one lesson of an accessible enrollment, or null when it does not belong to it. */
export async function getLessonPage(userId: string, enrollmentId: string, lessonId: string): Promise<LessonPage | { content: CourseContent; lesson: null } | null> {
  const content = await getCourseContent(userId, enrollmentId);
  if (!content) return null;
  const idx = content.lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) return { content, lesson: null };
  const lesson = content.lessons[idx];
  const supabase = await createClient();
  const { data } = await supabase.from("lessons").select("body").eq("id", lesson.id).maybeSingle();
  const mediaUrl = lesson.hasMedia && lesson.kind !== "quiz" ? await lessonMediaUrl(lesson.id) : null;
  return {
    content,
    lesson,
    body: data?.body ?? null,
    mediaUrl,
    prev: content.lessons[idx - 1] ?? null,
    next: content.lessons[idx + 1] ?? null,
    completeAt: COMPLETE_AT,
  };
}

/* ── Quiz (TRN-LRN-04) ──────────────────────────────────────────────────── */

export type QuizQuestion = { id: string; text: string; options: string[] };
export type AttemptView = { id: string; scorePercent: number; passed: boolean; submittedAt: string; startedAt: string };
export type QuizReviewItem = { id: string; text: string; options: string[]; chosen: string | null; isCorrect: boolean; correct: string | null };

export type QuizPage = {
  quiz: { id: string; courseId: string; title: string; passPercent: number; timeLimitMinutes: number | null; maxAttempts: number; questions: QuizQuestion[] };
  enrollmentId: string;
  courseTitle: string;
  lesson: LessonView | null;
  module: ModuleView | null;
  nextModule: ModuleView | null;
  attempts: AttemptView[];
  passed: boolean;
  attemptsLeft: number;
  /** Other lessons of the module still to finish before the quiz opens. */
  lockedBy: LessonView[];
};

export async function getQuizPage(userId: string, quizId: string): Promise<QuizPage | null> {
  if (!/^[0-9a-f-]{36}$/i.test(quizId)) return null;
  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc("get_quiz", { p_quiz: quizId });
  const q = rows?.[0];
  if (error || !q) return null;

  const [{ data: enrollment }, { data: attemptsRows }, { data: meta }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id")
      .eq("trainee_id", userId)
      .eq("course_id", q.course_id)
      .in("status", ["confirmed", "in_progress", "completed"])
      .maybeSingle(),
    supabase
      .from("quiz_attempts")
      .select("id, score_percent, passed, submitted_at, started_at")
      .eq("trainee_id", userId)
      .eq("quiz_id", q.id)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false }),
    supabase.rpc("course_quizzes", { p_course: q.course_id }),
  ]);
  if (!enrollment) return null;
  const content = await getCourseContent(userId, enrollment.id);
  if (!content) return null;
  const summary = meta?.find((m) => m.id === q.id);
  const lesson = content.lessons.find((l) => l.quiz?.id === q.id) ?? null;
  const moduleIdx = lesson ? content.modules.findIndex((m) => m.id === lesson.moduleId) : -1;
  const attempts: AttemptView[] = (attemptsRows ?? []).map((a) => ({
    id: a.id,
    scorePercent: a.score_percent ?? 0,
    passed: Boolean(a.passed),
    submittedAt: a.submitted_at!,
    startedAt: a.started_at,
  }));
  const maxAttempts = summary?.max_attempts ?? 2;
  const questions = Array.isArray(q.questions)
    ? (q.questions as { id: string; text: string; options: string[] }[]).map((x) => ({ id: String(x.id), text: String(x.text), options: (x.options ?? []).map(String) }))
    : [];
  const passed = attempts.some((a) => a.passed);
  return {
    quiz: { id: q.id, courseId: q.course_id, title: q.title, passPercent: q.pass_percent, timeLimitMinutes: q.time_limit_minutes, maxAttempts, questions },
    enrollmentId: enrollment.id,
    courseTitle: content.course.title,
    lesson,
    module: moduleIdx >= 0 ? content.modules[moduleIdx] : null,
    nextModule: moduleIdx >= 0 ? (content.modules[moduleIdx + 1] ?? null) : null,
    attempts,
    passed,
    attemptsLeft: Math.max(0, maxAttempts - attempts.length),
    lockedBy: lesson && !passed ? content.lessons.filter((l) => l.moduleId === lesson.moduleId && l.id !== lesson.id && l.kind !== "quiz" && l.status !== "done") : [],
  };
}

export async function getAttemptReview(attemptId: string): Promise<QuizReviewItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("quiz_attempt_review", { p_attempt: attemptId });
  return (data ?? []).map((r) => ({
    id: r.question_id,
    text: r.question,
    options: Array.isArray(r.options) ? (r.options as unknown[]).map(String) : [],
    chosen: r.chosen,
    isCorrect: r.is_correct,
    correct: r.correct_answer,
  }));
}
