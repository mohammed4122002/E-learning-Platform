import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CourseMode, EnrollmentStatus } from "@/types/views";

/* TRN-LRN-01 (سجل التعلم) and TRN-LRN-02 (تقرير قابل للمشاركة) read models — all derived from real events:
 * lesson_progress, attendance, quiz_attempts, assignment_submissions, certificates and enrollments. */

export type RecordCourse = {
  enrollmentId: string;
  courseId: string;
  title: string;
  mode: CourseMode;
  source: string;
  status: EnrollmentStatus;
  completedAt: string | null;
  endedAt: string | null;
  hours: number;
  /** Average of best quiz scores / accepted assignment scores in the course, when any. */
  result: number | null;
  category: string | null;
};

export type RecordEvent = { id: string; kind: "lesson" | "quiz" | "session" | "certificate" | "assignment" | "enrollment"; at: string; title: string; detail: string };

export type LearningRecord = {
  memberSince: string;
  fullName: string;
  stats: { hours: number; completed: number; certificates: number; skills: number };
  skills: string[];
  track: { name: string; completed: number; total: number; remaining: number; percent: number } | null;
  completed: RecordCourse[];
  withdrawn: RecordCourse[];
  active: { enrollmentId: string; title: string; href: string }[];
  unrated: number;
  events: RecordEvent[];
  certificates: { id: string; code: string; title: string; issuedAt: string; issuer: string }[];
  showLearningRecord: boolean;
  period: { from: string | null; to: string | null };
};

type EnrollmentRow = {
  id: string;
  status: EnrollmentStatus;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  ended_at: string | null;
  course_id: string;
  courses: {
    id: string;
    title: string;
    mode: CourseMode;
    duration_hours: number | null;
    trainer: { full_name: string } | null;
    organizations: { name: string } | null;
    programs: { categories: { name: string } | null } | null;
    program_versions: { snapshot: unknown } | null;
  } | null;
};

function skillsOf(snapshot: unknown): string[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const s = (snapshot as Record<string, unknown>).skills;
  return Array.isArray(s) ? s.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}

export async function getLearningRecord(userId: string): Promise<LearningRecord> {
  const supabase = await createClient();
  const [enrRes, lessonsRes, attendRes, quizRes, subsRes, certRes, ratingsRes, settingsRes, profileRes] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "id, status, created_at, confirmed_at, completed_at, ended_at, course_id, courses(id, title, mode, duration_hours, trainer:profiles!courses_trainer_id_fkey(full_name), organizations(name), programs(categories(name)), program_versions(snapshot))",
      )
      .eq("trainee_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lesson_progress")
      .select("lesson_id, course_id, completed_at, lessons(title, duration_seconds), courses(title)")
      .eq("trainee_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
    supabase.from("attendance").select("session_id, checked_in_at, course_sessions(title, starts_at, ends_at, course_id, courses(title))").eq("trainee_id", userId),
    supabase
      .from("quiz_attempts")
      .select("id, quiz_id, score_percent, passed, submitted_at, quizzes(title, course_id)")
      .eq("trainee_id", userId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("assignment_submissions")
      .select("id, status, score, reviewed_at, submitted_at, assignments(title, course_id, max_score)")
      .eq("trainee_id", userId)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("certificates")
      .select("id, code, course_title, course_id, issued_at, hours, status, organizations(name), trainer:profiles!certificates_trainer_id_fkey(full_name)")
      .eq("trainee_id", userId)
      .eq("status", "issued")
      .order("issued_at", { ascending: false }),
    supabase.from("course_ratings").select("enrollment_id").eq("trainee_id", userId),
    supabase.from("account_settings").select("show_learning_record").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("full_name, created_at").eq("id", userId).maybeSingle(),
  ]);
  if (enrRes.error) throw new Error("learning_record_unavailable");

  const enrollments = ((enrRes.data ?? []) as unknown as EnrollmentRow[]).filter((e) => e.courses);
  const lessons = lessonsRes.data ?? [];
  const attendance = attendRes.data ?? [];
  const quizzes = quizRes.data ?? [];
  const subs = subsRes.data ?? [];
  const certs = certRes.data ?? [];

  // Verified hours: watched lessons + attended sessions.
  const lessonSecondsBy = new Map<string, number>();
  lessons.forEach((l) => lessonSecondsBy.set(l.course_id, (lessonSecondsBy.get(l.course_id) ?? 0) + (l.lessons?.duration_seconds ?? 0)));
  const sessionSecondsBy = new Map<string, number>();
  attendance.forEach((a) => {
    const s = a.course_sessions;
    if (!s) return;
    sessionSecondsBy.set(s.course_id, (sessionSecondsBy.get(s.course_id) ?? 0) + Math.max(0, (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 1000));
  });
  const totalSeconds = [...lessonSecondsBy.values(), ...sessionSecondsBy.values()].reduce((a, b) => a + b, 0);

  const resultBy = (courseId: string): number | null => {
    const best = new Map<string, number>();
    quizzes.filter((q) => q.quizzes?.course_id === courseId).forEach((q) => best.set(q.quiz_id, Math.max(best.get(q.quiz_id) ?? 0, q.score_percent ?? 0)));
    const scores = [...best.values()];
    subs
      .filter((s) => s.assignments?.course_id === courseId && s.status === "accepted" && s.score !== null && s.assignments.max_score > 0)
      .forEach((s) => scores.push(Math.round(((s.score ?? 0) / (s.assignments?.max_score ?? 1)) * 100)));
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  };

  const toCourse = (e: EnrollmentRow): RecordCourse => {
    const c = e.courses!;
    const secs = (lessonSecondsBy.get(c.id) ?? 0) + (sessionSecondsBy.get(c.id) ?? 0);
    const cert = certs.find((x) => x.course_id === c.id);
    return {
      enrollmentId: e.id,
      courseId: c.id,
      title: c.title,
      mode: c.mode,
      source: c.organizations?.name ?? c.trainer?.full_name ?? "",
      status: e.status,
      completedAt: e.completed_at,
      endedAt: e.ended_at,
      hours: cert?.hours ? Number(cert.hours) : Math.round((secs / 3600) * 10) / 10,
      result: resultBy(c.id),
      category: c.programs?.categories?.name ?? null,
    };
  };

  const completed = enrollments.filter((e) => e.status === "completed").map(toCourse).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const withdrawn = enrollments.filter((e) => e.status === "withdrawn" || e.status === "access_revoked").map(toCourse);
  const activeRows = enrollments.filter((e) => ["confirmed", "in_progress"].includes(e.status));

  const skillSet = new Set<string>();
  enrollments
    .filter((e) => e.status === "completed")
    .forEach((e) => {
      skillsOf(e.courses?.program_versions?.snapshot).forEach((s) => skillSet.add(s));
      const cat = e.courses?.programs?.categories?.name;
      if (cat) skillSet.add(cat);
    });
  const skills = [...skillSet];

  // Track: the category the trainee invests in most.
  const counted = new Map<string, { total: number; done: number }>();
  enrollments
    .filter((e) => !["cancelled", "pending_payment"].includes(e.status))
    .forEach((e) => {
      const cat = e.courses?.programs?.categories?.name;
      if (!cat) return;
      const v = counted.get(cat) ?? { total: 0, done: 0 };
      v.total += 1;
      if (e.status === "completed") v.done += 1;
      counted.set(cat, v);
    });
  const top = [...counted.entries()].sort((a, b) => b[1].total - a[1].total || b[1].done - a[1].done)[0];
  const track = top
    ? { name: top[0], completed: top[1].done, total: top[1].total, remaining: top[1].total - top[1].done, percent: Math.round((top[1].done / top[1].total) * 100) }
    : null;

  const rated = new Set((ratingsRes.data ?? []).map((r) => r.enrollment_id));
  const unrated = enrollments.filter((e) => ["in_progress", "completed"].includes(e.status) && !rated.has(e.id)).length;

  const events: RecordEvent[] = [
    ...lessons.map((l) => ({ id: `l-${l.lesson_id}`, kind: "lesson" as const, at: l.completed_at!, title: `أنهيت درس «${l.lessons?.title ?? ""}»`, detail: l.courses?.title ?? "" })),
    ...quizzes.map((q) => ({
      id: `q-${q.id}`,
      kind: "quiz" as const,
      at: q.submitted_at!,
      title: q.passed ? `اجتزت ${q.quizzes?.title ?? "اختبارًا"}` : `أنهيت محاولة في ${q.quizzes?.title ?? "اختبار"}`,
      detail: `بنسبة ${q.score_percent ?? 0}٪`,
    })),
    ...attendance.map((a) => ({
      id: `a-${a.session_id}`,
      kind: "session" as const,
      at: a.checked_in_at,
      title: `حضرت ${a.course_sessions?.title ?? "جلسة"}`,
      detail: a.course_sessions?.courses?.title ?? "",
    })),
    ...subs
      .filter((s) => s.reviewed_at && s.status === "accepted")
      .map((s) => ({ id: `s-${s.id}`, kind: "assignment" as const, at: s.reviewed_at!, title: `اعتُمد واجب «${s.assignments?.title ?? ""}»`, detail: s.score !== null ? `الدرجة ${s.score} من ${s.assignments?.max_score ?? ""}` : "" })),
    ...certs.map((c) => ({ id: `c-${c.id}`, kind: "certificate" as const, at: c.issued_at, title: "صدرت شهادتك", detail: c.course_title })),
    ...enrollments.filter((e) => e.confirmed_at).map((e) => ({ id: `e-${e.id}`, kind: "enrollment" as const, at: e.confirmed_at!, title: "بدأت دورة جديدة", detail: e.courses?.title ?? "" })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const dates = enrollments.map((e) => e.confirmed_at ?? e.created_at).sort();
  const lastActivity = events[0]?.at ?? null;

  return {
    memberSince: profileRes.data?.created_at ?? dates[0] ?? new Date().toISOString(),
    fullName: profileRes.data?.full_name ?? "",
    stats: { hours: Math.round(totalSeconds / 3600), completed: completed.length, certificates: certs.length, skills: skills.length },
    skills,
    track,
    completed,
    withdrawn,
    active: activeRows.map((e) => ({
      enrollmentId: e.id,
      title: e.courses!.title,
      href: e.courses!.mode === "recorded" ? `/trainee/learn/${e.id}` : `/trainee/trainings/${e.id}`,
    })),
    unrated,
    events,
    certificates: certs.map((c) => ({ id: c.id, code: c.code, title: c.course_title, issuedAt: c.issued_at, issuer: c.organizations?.name ?? c.trainer?.full_name ?? "" })),
    showLearningRecord: settingsRes.data?.show_learning_record ?? true,
    period: { from: dates[0] ?? null, to: lastActivity },
  };
}
