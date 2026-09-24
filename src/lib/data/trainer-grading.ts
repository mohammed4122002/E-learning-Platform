import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ENROLLMENT, getCoursePeople, isUuid, type ManagedCourse } from "@/lib/data/trainer-course";
import { toRubric, toScores, type RubricItem } from "@/lib/data/assignments";

/*
 * TRR-CRS-11 تقييم الواجبات: the submissions list (444:22796) and the grading page (444:23127 / saved 444:23412).
 * One row per enrolled trainee: their latest submission, the trainer's flagged draft (submission_reviews) and the
 * published grade (assignment_submissions.reviewed_at).
 */

export type GradeState = "pending" | "flagged" | "graded" | "missing";

export type GradingRow = {
  traineeId: string;
  name: string;
  state: GradeState;
  submissionId: string | null;
  submittedAt: string | null;
  /** Days late (>0), early (<0) or on the due day (0); null without a due date or submission. */
  lateDays: number | null;
  score: number | null;
  draftScore: number | null;
};

export type GradingAssignment = {
  id: string;
  title: string;
  dueAt: string | null;
  maxScore: number;
  passScore: number | null;
  weightPercent: number | null;
  rubric: RubricItem[];
  position: number;
  total: number;
};

export type GradingList = {
  assignment: GradingAssignment;
  rows: GradingRow[];
  counts: Record<GradeState, number> & { submitted: number; enrolled: number };
  resultsApproved: boolean;
};

const DAY = 86_400_000;

function lateDays(submittedAt: string, dueAt: string | null): number | null {
  if (!dueAt) return null;
  const diff = new Date(submittedAt).getTime() - new Date(dueAt).getTime();
  if (Math.abs(diff) < DAY / 2) return 0;
  return diff > 0 ? Math.ceil(diff / DAY) : -Math.ceil(-diff / DAY);
}

const ORDER: Record<GradeState, number> = { pending: 0, flagged: 1, graded: 2, missing: 3 };

export const getGradingList = cache(async (course: ManagedCourse, assignmentId: string): Promise<GradingList> => {
  if (!isUuid(assignmentId)) notFound();
  const supabase = await createClient();
  const [asgRes, allRes, enrRes, subRes, people, apprRes] = await Promise.all([
    supabase.from("assignments").select("id, title, due_at, max_score, pass_score, weight_percent, rubric").eq("id", assignmentId).eq("course_id", course.id).maybeSingle(),
    supabase.from("assignments").select("id").eq("course_id", course.id).order("due_at", { nullsFirst: false }).order("opens_at"),
    supabase.from("enrollments").select("trainee_id").eq("course_id", course.id).in("status", ACTIVE_ENROLLMENT),
    supabase
      .from("assignment_submissions")
      .select("id, trainee_id, submitted_at, reviewed_at, score, submission_reviews(flagged, score)")
      .eq("assignment_id", assignmentId)
      .order("submitted_at", { ascending: false }),
    getCoursePeople(course.id),
    supabase.from("course_result_approvals").select("course_id").eq("course_id", course.id).maybeSingle(),
  ]);
  const a = asgRes.data;
  if (!a) notFound();
  const all = allRes.data ?? [];

  const latest = new Map<string, NonNullable<typeof subRes.data>[number]>();
  (subRes.data ?? []).forEach((s) => {
    if (!latest.has(s.trainee_id)) latest.set(s.trainee_id, s);
  });
  const trainees = new Set((enrRes.data ?? []).map((e) => e.trainee_id));
  latest.forEach((_, t) => trainees.add(t));

  const rows: GradingRow[] = [...trainees].map((t) => {
    const s = latest.get(t);
    const review = s ? (Array.isArray(s.submission_reviews) ? s.submission_reviews[0] : s.submission_reviews) : null;
    const state: GradeState = !s ? "missing" : s.reviewed_at ? "graded" : review?.flagged ? "flagged" : "pending";
    return {
      traineeId: t,
      name: people.get(t)?.name ?? "متدرب",
      state,
      submissionId: s?.id ?? null,
      submittedAt: s?.submitted_at ?? null,
      lateDays: s ? lateDays(s.submitted_at, a.due_at) : null,
      score: s?.score ?? null,
      draftScore: review?.score === null || review?.score === undefined ? null : Number(review.score),
    };
  });
  rows.sort((x, y) => ORDER[x.state] - ORDER[y.state] || (x.submittedAt ?? "").localeCompare(y.submittedAt ?? "") || x.name.localeCompare(y.name, "ar"));

  const count = (st: GradeState) => rows.filter((r) => r.state === st).length;
  return {
    assignment: {
      id: a.id,
      title: a.title,
      dueAt: a.due_at,
      maxScore: a.max_score,
      passScore: a.pass_score,
      weightPercent: a.weight_percent,
      rubric: toRubric(a.rubric),
      position: all.findIndex((x) => x.id === a.id) + 1,
      total: all.length,
    },
    rows,
    counts: {
      pending: count("pending"),
      flagged: count("flagged"),
      graded: count("graded"),
      missing: count("missing"),
      submitted: rows.length - count("missing"),
      enrolled: rows.length,
    },
    resultsApproved: Boolean(apprRes.data),
  };
});

export type GradingSubmission = {
  id: string;
  traineeId: string;
  name: string;
  submittedAt: string;
  lateDays: number | null;
  fileName: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  note: string | null;
  reviewedAt: string | null;
  score: number | null;
  scores: Record<string, number>;
  feedback: string | null;
  flagged: boolean;
  state: GradeState;
};

export type TraineeRecord = {
  assignments: { id: string; title: string; position: number; score: number | null; maxScore: number; state: "graded" | "pending" | "missing" | "current" }[];
  attendance: number | null;
};

/** One submission of the list above, with the file link, the draft review and the trainee's record in the course. */
export async function getGradingSubmission(course: ManagedCourse, list: GradingList, submissionId: string) {
  if (!isUuid(submissionId)) notFound();
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("assignment_submissions")
    .select("id, trainee_id, assignment_id, submitted_at, reviewed_at, score, rubric_scores, feedback, note, file_name, file_size, file_path, submission_reviews(flagged, score, rubric_scores, feedback)")
    .eq("id", submissionId)
    .eq("assignment_id", list.assignment.id)
    .maybeSingle();
  if (!s) notFound();
  const review = Array.isArray(s.submission_reviews) ? s.submission_reviews[0] : s.submission_reviews;

  const [signed, asgRes, subsRes, rowsRes] = await Promise.all([
    s.file_path ? supabase.storage.from("submissions").createSignedUrl(s.file_path, 60 * 10, s.file_name ? { download: s.file_name } : undefined) : Promise.resolve(null),
    supabase.from("assignments").select("id, title, max_score").eq("course_id", course.id).order("due_at", { nullsFirst: false }).order("opens_at"),
    supabase
      .from("assignment_submissions")
      .select("assignment_id, score, reviewed_at, submitted_at, assignments!inner(course_id)")
      .eq("trainee_id", s.trainee_id)
      .eq("assignments.course_id", course.id)
      .order("submitted_at", { ascending: false }),
    supabase.rpc("course_result_rows", { p_course: course.id }),
  ]);

  const latestBy = new Map<string, { score: number | null; reviewed_at: string | null }>();
  (subsRes.data ?? []).forEach((x) => {
    if (!latestBy.has(x.assignment_id)) latestBy.set(x.assignment_id, x);
  });
  const record: TraineeRecord = {
    assignments: (asgRes.data ?? []).map((a, i) => {
      const x = latestBy.get(a.id);
      return {
        id: a.id,
        title: a.title,
        position: i + 1,
        maxScore: a.max_score,
        score: x?.score ?? null,
        state: a.id === list.assignment.id ? "current" : !x ? "missing" : x.reviewed_at ? "graded" : "pending",
      };
    }),
    attendance: (rowsRes.data ?? []).find((r) => r.trainee_id === s.trainee_id)?.attendance_percent ?? null,
  };

  const row = list.rows.find((r) => r.submissionId === s.id);
  const submission: GradingSubmission = {
    id: s.id,
    traineeId: s.trainee_id,
    name: row?.name ?? "متدرب",
    submittedAt: s.submitted_at,
    lateDays: row?.lateDays ?? lateDays(s.submitted_at, list.assignment.dueAt),
    fileName: s.file_name,
    fileSize: s.file_size,
    fileUrl: signed && "data" in signed ? (signed.data?.signedUrl ?? null) : null,
    note: s.note,
    reviewedAt: s.reviewed_at,
    score: s.reviewed_at ? s.score : review?.score === null || review?.score === undefined ? null : Number(review.score),
    scores: s.reviewed_at ? toScores(s.rubric_scores) : toScores(review?.rubric_scores),
    feedback: s.reviewed_at ? s.feedback : (review?.feedback ?? null),
    flagged: !s.reviewed_at && Boolean(review?.flagged),
    state: row?.state ?? (s.reviewed_at ? "graded" : review?.flagged ? "flagged" : "pending"),
  };

  // Navigation in the order of the submissions list (submitted rows only).
  const queue = list.rows.filter((r) => r.submissionId);
  const index = queue.findIndex((r) => r.submissionId === s.id);
  const afterThis = queue.slice(index + 1).find((r) => r.state !== "graded") ?? queue.find((r, i) => i !== index && r.state !== "graded") ?? null;
  return {
    submission,
    record,
    nav: {
      index: index + 1,
      total: queue.length,
      prev: index > 0 ? queue[index - 1].submissionId : null,
      next: index >= 0 && index < queue.length - 1 ? queue[index + 1].submissionId : null,
      nextUngraded: afterThis ? { id: afterThis.submissionId as string, name: afterThis.name } : null,
      remaining: queue.filter((r, i) => i !== index && r.state !== "graded").length,
    },
  };
}
