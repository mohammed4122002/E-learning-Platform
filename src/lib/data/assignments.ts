import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tone } from "@/types/views";

/* Read models for TRN-LRN-07 (assignments list) and TRN-LRN-05 (assignment detail + submission). */

export type AssignmentState = "not_started" | "submitted" | "needs_revision" | "accepted" | "rejected" | "late";

export const ASSIGNMENT_STATE: Record<AssignmentState, { label: string; tone: Tone }> = {
  not_started: { label: "لم يبدأ", tone: "neutral" },
  submitted: { label: "قيد المراجعة", tone: "warning" },
  needs_revision: { label: "يحتاج تعديلًا", tone: "error" },
  accepted: { label: "تم التقييم", tone: "success" },
  rejected: { label: "مرفوض", tone: "error" },
  late: { label: "متأخر", tone: "error" },
};

export type RubricItem = { id: string; label: string; max: number };

export type SubmissionView = {
  id: string;
  status: "submitted" | "needs_revision" | "accepted" | "rejected";
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  note: string | null;
  feedback: string | null;
  score: number | null;
  rubricScores: Record<string, number>;
  submittedAt: string;
  reviewedAt: string | null;
};

export type AssignmentView = {
  id: string;
  title: string;
  instructions: string | null;
  requirements: string[];
  dueAt: string | null;
  opensAt: string;
  maxScore: number;
  maxAttempts: number;
  weightPercent: number | null;
  passScore: number | null;
  acceptedFormats: string;
  maxFileMb: number;
  rubric: RubricItem[];
  course: { id: string; title: string; trainerName: string };
  module: { position: number; title: string } | null;
  enrollmentId: string | null;
  submissions: SubmissionView[];
  latest: SubmissionView | null;
  state: AssignmentState;
  pastDue: boolean;
  attemptsUsed: number;
  /** A new file can be sent (or the unreviewed one replaced). */
  canSubmit: boolean;
};

type Row = {
  id: string;
  course_id: string;
  title: string;
  instructions: string | null;
  requirements: string[];
  due_at: string | null;
  opens_at: string;
  max_score: number;
  max_attempts: number;
  weight_percent: number | null;
  pass_score: number | null;
  accepted_formats: string;
  max_file_mb: number;
  rubric: unknown;
  courses: { id: string; title: string; trainer: { full_name: string } | null } | null;
  course_modules: { position: number; title: string } | null;
};

const SELECT =
  "id, course_id, title, instructions, requirements, due_at, opens_at, max_score, max_attempts, weight_percent, pass_score, accepted_formats, max_file_mb, rubric, courses(id, title, trainer:profiles!courses_trainer_id_fkey(full_name)), course_modules(position, title)";

function toRubric(v: unknown): RubricItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is { id: string; label: string; max: number } => !!x && typeof x === "object" && "id" in x && "label" in x)
    .map((x) => ({ id: String(x.id), label: String(x.label), max: Number(x.max) || 0 }));
}

function toScores(v: unknown): Record<string, number> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, n]) => [k, Number(n) || 0]));
}

function build(row: Row, subs: SubmissionView[], enrollmentId: string | null, now: Date): AssignmentView {
  const latest = subs[0] ?? null;
  const pastDue = row.due_at !== null && new Date(row.due_at) < now;
  let state: AssignmentState;
  if (!latest) state = pastDue ? "late" : "not_started";
  else state = latest.status;
  const attemptsUsed = subs.length;
  const canSubmit =
    !pastDue &&
    latest?.status !== "accepted" &&
    ((latest?.status === "submitted" && !latest.reviewedAt) || attemptsUsed < row.max_attempts);
  return {
    id: row.id,
    title: row.title,
    instructions: row.instructions,
    requirements: row.requirements ?? [],
    dueAt: row.due_at,
    opensAt: row.opens_at,
    maxScore: row.max_score,
    maxAttempts: row.max_attempts,
    weightPercent: row.weight_percent,
    passScore: row.pass_score,
    acceptedFormats: row.accepted_formats,
    maxFileMb: row.max_file_mb,
    rubric: toRubric(row.rubric),
    course: { id: row.courses?.id ?? row.course_id, title: row.courses?.title ?? "", trainerName: row.courses?.trainer?.full_name ?? "المدرب" },
    module: row.course_modules ? { position: row.course_modules.position, title: row.course_modules.title } : null,
    enrollmentId,
    submissions: subs,
    latest,
    state,
    pastDue,
    attemptsUsed,
    canSubmit,
  };
}

async function load(userId: string, filter?: { id?: string; courseId?: string }) {
  const supabase = await createClient();
  let q = supabase.from("assignments").select(SELECT);
  if (filter?.id) q = q.eq("id", filter.id);
  if (filter?.courseId) q = q.eq("course_id", filter.courseId);
  const { data: rows, error } = await q.order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error("assignments_unavailable");
  const list = (rows ?? []) as unknown as Row[];
  if (list.length === 0) return [];
  const [subsRes, enrRes] = await Promise.all([
    supabase
      .from("assignment_submissions")
      .select("id, assignment_id, status, file_path, file_name, file_size, note, feedback, score, rubric_scores, submitted_at, reviewed_at")
      .eq("trainee_id", userId)
      .in(
        "assignment_id",
        list.map((r) => r.id),
      )
      .order("submitted_at", { ascending: false }),
    supabase
      .from("enrollments")
      .select("id, course_id")
      .eq("trainee_id", userId)
      .in("status", ["confirmed", "in_progress", "completed"])
      .in("course_id", [...new Set(list.map((r) => r.course_id))]),
  ]);
  const subs = subsRes.data ?? [];
  const enrollmentBy = new Map((enrRes.data ?? []).map((e) => [e.course_id, e.id]));
  const now = new Date();
  return list.map((r) =>
    build(
      r,
      subs
        .filter((s) => s.assignment_id === r.id)
        .map((s) => ({
          id: s.id,
          status: s.status,
          filePath: s.file_path,
          fileName: s.file_name,
          fileSize: s.file_size,
          note: s.note,
          feedback: s.feedback,
          score: s.score,
          rubricScores: toScores(s.rubric_scores),
          submittedAt: s.submitted_at,
          reviewedAt: s.reviewed_at,
        })),
      enrollmentBy.get(r.course_id) ?? null,
      now,
    ),
  );
}

const ORDER: Record<AssignmentState, number> = { needs_revision: 0, late: 1, not_started: 2, submitted: 3, rejected: 4, accepted: 5 };

/** All assignments of the trainee's active/completed courses (RLS: enrolled only), most urgent first. */
export async function listAssignments(userId: string): Promise<AssignmentView[]> {
  const all = await load(userId);
  return all.sort((a, b) => ORDER[a.state] - ORDER[b.state] || (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"));
}

export async function getAssignment(userId: string, id: string): Promise<AssignmentView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [a] = await load(userId, { id });
  return a ?? null;
}

/** Assignments still waiting for a first submission in a course (quiz result "ما التالي؟"). */
export async function countPendingAssignments(userId: string, courseId: string): Promise<number> {
  const all = await load(userId, { courseId }).catch(() => []);
  return all.filter((a) => a.state === "not_started" || a.state === "needs_revision").length;
}

/** Short-lived link to the trainee's own uploaded file (private bucket "submissions"). */
export async function submissionFileUrl(path: string | null, name?: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("submissions").createSignedUrl(path, 60 * 10, name ? { download: name } : undefined);
  return data?.signedUrl ?? null;
}
