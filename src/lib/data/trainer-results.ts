import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCoursePeople, type ManagedCourse } from "@/lib/data/trainer-course";

/*
 * TRR-CRS-05 · ٧ النتائج (438:20310), TRR-RES-01 رصد النتائج (276:5002) and «اعتماد النتائج · شرطان ناقصان» (463:34304).
 * Rows come from course_results (saved sheet) or, before the first save, from course_result_rows() (live computation).
 */

export type Outcome = "passed" | "failed" | "below_attendance";

export type ResultRow = {
  enrollmentId: string;
  traineeId: string;
  name: string;
  attendance: number | null;
  points: number | null;
  maxPoints: number | null;
  quiz: number | null;
  final: number;
  outcome: Outcome;
  overridden: boolean;
  saved: boolean;
};

export type Blocker =
  | { key: "sessions_pending"; count: number; lastEndsAt: string | null; firstPending: number | null }
  | { key: "attendance_unrecorded"; count: number; sessions: { id: string; position: number; title: string; ends_at: string }[] }
  | { key: "submissions_ungraded"; count: number; items: { id: string; assignment_id: string; trainee_id: string }[] }
  | { key: "results_missing"; count: number; trainees: string[] };

export type ResultsView = {
  rows: ResultRow[];
  blockers: Blocker[];
  approval: { approvedAt: string; passed: number; failed: number } | null;
  saved: boolean;
  sessions: { total: number; ended: number; recorded: number };
  assignments: { total: number; graded: number; submissions: number; passScore: number | null; maxScore: number | null; firstId: string | null };
  hasQuizzes: boolean;
  names: Map<string, string>;
};

export async function getResults(course: ManagedCourse): Promise<ResultsView> {
  const supabase = await createClient();
  const [people, savedRes, liveRes, blockRes, apprRes, sessRes, sheetRes, asgRes, subRes, quizRes] = await Promise.all([
    getCoursePeople(course.id),
    supabase.from("course_results").select("*").eq("course_id", course.id),
    supabase.rpc("course_result_rows", { p_course: course.id }),
    supabase.rpc("course_result_blockers", { p_course: course.id }),
    supabase.from("course_result_approvals").select("approved_at, passed, failed").eq("course_id", course.id).maybeSingle(),
    supabase.from("course_sessions").select("id, ends_at, status").eq("course_id", course.id).neq("status", "cancelled"),
    supabase.from("attendance_sheets").select("session_id, status, course_sessions!inner(course_id)").eq("course_sessions.course_id", course.id),
    supabase.from("assignments").select("id, max_score, pass_score").eq("course_id", course.id).order("due_at"),
    supabase.from("assignment_submissions").select("id, assignment_id, trainee_id, reviewed_at, submitted_at, assignments!inner(course_id)").eq("assignments.course_id", course.id),
    supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("course_id", course.id),
  ]);
  const saved = savedRes.data ?? [];
  const byEnrollment = new Map(saved.map((r) => [r.enrollment_id, r]));
  const rows: ResultRow[] = (liveRes.data ?? []).map((l) => {
    const s = byEnrollment.get(l.enrollment_id);
    return {
      enrollmentId: l.enrollment_id,
      traineeId: l.trainee_id,
      name: people.get(l.trainee_id)?.name ?? "متدرب",
      attendance: s ? s.attendance_percent : l.attendance_percent,
      points: s ? (s.assignment_points === null ? null : Number(s.assignment_points)) : l.assignment_points === null ? null : Number(l.assignment_points),
      maxPoints: l.assignment_max === null ? null : Number(l.assignment_max),
      quiz: s ? s.quiz_percent : l.quiz_percent,
      final: s ? s.final_percent : l.final_percent,
      outcome: (s ? s.outcome : l.outcome) as Outcome,
      overridden: s?.overridden ?? false,
      saved: Boolean(s),
    };
  });
  // After approval the live function still works but the saved sheet is authoritative.
  if (apprRes.data) {
    for (const s of saved) {
      if (!rows.some((r) => r.enrollmentId === s.enrollment_id))
        rows.push({
          enrollmentId: s.enrollment_id,
          traineeId: s.trainee_id,
          name: people.get(s.trainee_id)?.name ?? "متدرب",
          attendance: s.attendance_percent,
          points: s.assignment_points === null ? null : Number(s.assignment_points),
          maxPoints: s.assignment_max === null ? null : Number(s.assignment_max),
          quiz: s.quiz_percent,
          final: s.final_percent,
          outcome: s.outcome as Outcome,
          overridden: s.overridden,
          saved: true,
        });
    }
  }
  rows.sort((a, b) => b.final - a.final);

  const blockers: Blocker[] = (blockRes.data ?? []).map((b) => {
    const info = (b.info ?? {}) as Record<string, unknown>;
    if (b.key === "sessions_pending")
      return { key: "sessions_pending", count: b.count, lastEndsAt: (info.last_ends_at as string) ?? null, firstPending: (info.first_pending_position as number) ?? null };
    if (b.key === "attendance_unrecorded") return { key: "attendance_unrecorded", count: b.count, sessions: b.info as never };
    if (b.key === "submissions_ungraded") return { key: "submissions_ungraded", count: b.count, items: b.info as never };
    return { key: "results_missing", count: b.count, trainees: b.info as never };
  });

  const now = Date.now();
  const sessions = sessRes.data ?? [];
  const approvedSheets = new Set((sheetRes.data ?? []).filter((s) => s.status === "approved").map((s) => s.session_id));
  const subs = subRes.data ?? [];
  const latest = new Map<string, (typeof subs)[number]>();
  subs.forEach((s) => {
    const k = `${s.assignment_id}:${s.trainee_id}`;
    const cur = latest.get(k);
    if (!cur || cur.submitted_at < s.submitted_at) latest.set(k, s);
  });
  const asg = asgRes.data ?? [];
  return {
    rows,
    blockers,
    approval: apprRes.data ? { approvedAt: apprRes.data.approved_at, passed: apprRes.data.passed, failed: apprRes.data.failed } : null,
    saved: saved.length > 0,
    sessions: {
      total: sessions.length,
      ended: sessions.filter((s) => new Date(s.ends_at).getTime() <= now).length,
      recorded: sessions.filter((s) => approvedSheets.has(s.id)).length,
    },
    assignments: {
      total: asg.length,
      submissions: latest.size,
      graded: [...latest.values()].filter((s) => s.reviewed_at).length,
      passScore: asg.length ? asg.reduce((a, x) => a + (x.pass_score ?? 0), 0) || null : null,
      maxScore: asg.length ? asg.reduce((a, x) => a + x.max_score, 0) : null,
      firstId: asg[0]?.id ?? null,
    },
    hasQuizzes: (quizRes.count ?? 0) > 0,
    names: new Map([...people.values()].map((p) => [p.id, p.name])),
  };
}
