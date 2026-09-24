import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoursePeople, getCourseSessions, isUuid, type ManagedCourse, type SessionRow } from "@/lib/data/trainer-course";

/*
 * TRR-CRS-05 · ٦ الحضور (436:20264), TRR-ATT-01 رصد الحضور (272:4961 / locked 463:34053),
 * TRR-ATT-02 حضور بالرمز (4253:2), TRR-ATT-03 حضور مستورد (4253:585 / 4253:1077).
 */

export const LOCK_HOURS = 48;
export type Mark = "present" | "late" | "excused" | "absent";

export type SheetInfo = {
  status: "draft" | "approved";
  source: "manual" | "qr" | "import";
  importStatus: "completed" | "failed" | null;
  importProvider: string | null;
  importedAt: string | null;
  approvedAt: string | null;
  unlockRequestedAt: string | null;
};

export type SessionSummary = SessionRow & {
  started: boolean;
  ended: boolean;
  locked: boolean;
  lockAt: string;
  approved: boolean;
  attended: number;
  roster: number;
};

export type AttendanceOverview = {
  sessions: SessionSummary[];
  enrolled: number;
  recorded: number;
  averagePercent: number | null;
  aboveThreshold: number;
  pending: SessionSummary | null;
};

async function activeEnrollments(courseId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("id, trainee_id, created_at")
    .eq("course_id", courseId)
    .in("status", ["confirmed", "in_progress", "completed"])
    .order("created_at");
  return data ?? [];
}

export async function getAttendanceOverview(course: ManagedCourse): Promise<AttendanceOverview> {
  const supabase = await createClient();
  const [sessions, enrollments] = await Promise.all([getCourseSessions(course.id), activeEnrollments(course.id)]);
  const live = sessions.filter((s) => s.status !== "cancelled");
  const ids = live.map((s) => s.id);
  const [sheetRes, attRes] = await Promise.all([
    ids.length ? supabase.from("attendance_sheets").select("session_id, status").in("session_id", ids) : Promise.resolve({ data: [] as { session_id: string; status: string }[] }),
    ids.length ? supabase.from("attendance").select("session_id, trainee_id").in("session_id", ids) : Promise.resolve({ data: [] as { session_id: string; trainee_id: string }[] }),
  ]);
  const now = Date.now();
  const enrolledIds = new Set(enrollments.map((e) => e.trainee_id));
  const approved = new Set((sheetRes.data ?? []).filter((s) => s.status === "approved").map((s) => s.session_id));
  const attendance = (attRes.data ?? []).filter((a) => enrolledIds.has(a.trainee_id));
  const summaries: SessionSummary[] = live.map((s) => {
    const lockAt = new Date(new Date(s.endsAt).getTime() + LOCK_HOURS * 3_600_000).toISOString();
    return {
      ...s,
      started: new Date(s.startsAt).getTime() <= now,
      ended: new Date(s.endsAt).getTime() <= now,
      locked: new Date(lockAt).getTime() <= now,
      lockAt,
      approved: approved.has(s.id),
      attended: attendance.filter((a) => a.session_id === s.id).length,
      roster: enrollments.length,
    };
  });
  const ended = summaries.filter((s) => s.ended);
  const perTrainee = enrollments.map((e) => (ended.length ? attendance.filter((a) => a.trainee_id === e.trainee_id && ended.some((s) => s.id === a.session_id)).length / ended.length : 0));
  const pending =
    [...summaries].reverse().find((s) => s.started && !s.approved && !s.locked) ?? null;
  return {
    sessions: summaries,
    enrolled: enrollments.length,
    recorded: summaries.filter((s) => s.approved).length,
    averagePercent: ended.length && enrollments.length ? Math.round((perTrainee.reduce((a, b) => a + b, 0) / enrollments.length) * 100) : null,
    aboveThreshold: perTrainee.filter((p) => p >= 0.75).length,
    pending,
  };
}

export type RegisterRow = { traineeId: string; name: string; enrolledAt: string; mark: Mark | null; checkedIn: "qr" | "online" | "manual" | null };

export type RegisterView = {
  session: SessionSummary;
  total: number;
  sheet: SheetInfo | null;
  rows: RegisterRow[];
  overview: AttendanceOverview;
  code: { code: string; expiresAt: string } | null;
};

export async function getRegister(course: ManagedCourse, sessionId: string): Promise<RegisterView> {
  if (!isUuid(sessionId)) notFound();
  const supabase = await createClient();
  const [overview, people, enrollments] = await Promise.all([getAttendanceOverview(course), getCoursePeople(course.id), activeEnrollments(course.id)]);
  const session = overview.sessions.find((s) => s.id === sessionId);
  if (!session) notFound();
  const [sheetRes, marksRes, attRes, codeRes] = await Promise.all([
    supabase
      .from("attendance_sheets")
      .select("status, source, import_status, import_provider, imported_at, approved_at, unlock_requested_at")
      .eq("session_id", sessionId)
      .maybeSingle(),
    supabase.from("attendance_marks").select("trainee_id, status").eq("session_id", sessionId),
    supabase.from("attendance").select("trainee_id, method").eq("session_id", sessionId),
    supabase.from("attendance_codes").select("code, expires_at").eq("session_id", sessionId).gt("expires_at", new Date().toISOString()).order("expires_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const marks = new Map((marksRes.data ?? []).map((m) => [m.trainee_id, m.status as Mark]));
  const checked = new Map((attRes.data ?? []).map((a) => [a.trainee_id, a.method as RegisterRow["checkedIn"]]));
  const s = sheetRes.data;
  return {
    session,
    total: overview.sessions.length,
    sheet: s
      ? {
          status: s.status as SheetInfo["status"],
          source: s.source as SheetInfo["source"],
          importStatus: (s.import_status as SheetInfo["importStatus"]) ?? null,
          importProvider: s.import_provider,
          importedAt: s.imported_at,
          approvedAt: s.approved_at,
          unlockRequestedAt: s.unlock_requested_at,
        }
      : null,
    rows: enrollments.map((e) => ({
      traineeId: e.trainee_id,
      name: people.get(e.trainee_id)?.name ?? "متدرب",
      enrolledAt: e.created_at,
      mark: marks.get(e.trainee_id) ?? null,
      checkedIn: checked.get(e.trainee_id) ?? null,
    })),
    overview,
    code: codeRes.data ? { code: codeRes.data.code, expiresAt: codeRes.data.expires_at } : null,
  };
}

/** Rows for the CSV export «صدّر كشف الحضور». */
export async function getAttendanceSheetExport(course: ManagedCourse) {
  const supabase = await createClient();
  const [sessions, people, enrollments] = await Promise.all([getCourseSessions(course.id), getCoursePeople(course.id), activeEnrollments(course.id)]);
  const live = sessions.filter((s) => s.status !== "cancelled" && new Date(s.startsAt).getTime() <= Date.now());
  const ids = live.map((s) => s.id);
  const [marksRes, attRes] = await Promise.all([
    ids.length ? supabase.from("attendance_marks").select("session_id, trainee_id, status").in("session_id", ids) : Promise.resolve({ data: [] as { session_id: string; trainee_id: string; status: string }[] }),
    ids.length ? supabase.from("attendance").select("session_id, trainee_id").in("session_id", ids) : Promise.resolve({ data: [] as { session_id: string; trainee_id: string }[] }),
  ]);
  return { sessions: live, people, enrollments, marks: marksRes.data ?? [], attendance: attRes.data ?? [] };
}
