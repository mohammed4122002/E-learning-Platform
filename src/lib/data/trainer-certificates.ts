import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCoursePeople, type ManagedCourse } from "@/lib/data/trainer-course";
import { getResults, type Outcome } from "@/lib/data/trainer-results";
import { verifyUrlFor } from "@/lib/data/certificates";

/*
 * TRR-CRS-05 · ٨ الشهادات (438:20662), TRR-CRT-01 إصدار الشهادات (276:5358 · 463:34780 · 463:34994 · 4254:*)
 * and TRR-CRT-02 شهادات إتمام البرنامج (4256:*).
 * Eligibility = approved result «ناجح» on an enrollment that is still active (trainer_issue_certificates re-checks it).
 */

export type CertTrainee = {
  enrollmentId: string;
  traineeId: string;
  name: string;
  attendance: number | null;
  final: number;
  points: number | null;
  maxPoints: number | null;
  outcome: Outcome | null;
  certificate: { id: string; code: string; issuedAt: string; status: "issued" | "revoked"; verifyUrl: string } | null;
};

export type CertificatesView = {
  approved: boolean;
  /** Results approved and at least one trainee passed. */
  eligible: CertTrainee[];
  ineligible: (CertTrainee & { reason: string })[];
  issued: CertTrainee[];
  pendingIssue: CertTrainee[];
  names: Map<string, string>;
};

const n = (v: number) => new Intl.NumberFormat("ar-SA-u-nu-arab").format(v);

export function ineligibleReason(t: Pick<CertTrainee, "attendance" | "final" | "points" | "outcome">, missingAssignment: boolean): string {
  if (t.outcome === null) return "لم تُرصد نتيجته النهائية";
  if (t.outcome === "below_attendance") return `حضور ${n(t.attendance ?? 0)}٪ – دون حد ٧٥٪`;
  if (missingAssignment) return `حضور ${n(t.attendance ?? 0)}٪ · لم يسلّم الواجب`;
  return `حضور ${n(t.attendance ?? 0)}٪ ودرجة ${n(t.final)}٪ – راسب`;
}

export async function getCertificatesView(course: ManagedCourse): Promise<CertificatesView> {
  const supabase = await createClient();
  const [results, certRes, subRes] = await Promise.all([
    getResults(course),
    supabase.from("certificates").select("id, code, issued_at, status, enrollment_id").eq("course_id", course.id),
    supabase.from("assignment_submissions").select("trainee_id, assignments!inner(course_id)").eq("assignments.course_id", course.id),
  ]);
  const certs = new Map((certRes.data ?? []).map((c) => [c.enrollment_id, c]));
  const submitted = new Set((subRes.data ?? []).map((s) => s.trainee_id));
  const approved = Boolean(results.approval);
  const all: CertTrainee[] = results.rows.map((r) => {
    const c = certs.get(r.enrollmentId);
    return {
      enrollmentId: r.enrollmentId,
      traineeId: r.traineeId,
      name: r.name,
      attendance: r.attendance,
      final: r.final,
      points: r.points,
      maxPoints: r.maxPoints,
      // Before approval the outcome is the live preliminary one; after approval only saved rows count.
      outcome: approved && !r.saved ? null : r.outcome,
      certificate: c ? { id: c.id, code: c.code, issuedAt: c.issued_at, status: c.status, verifyUrl: verifyUrlFor(c.code) } : null,
    };
  });
  const eligible = all.filter((t) => t.outcome === "passed");
  const ineligible = all
    .filter((t) => t.outcome !== "passed")
    .map((t) => ({ ...t, reason: ineligibleReason(t, results.assignments.total > 0 && !submitted.has(t.traineeId)) }));
  return {
    approved,
    eligible,
    ineligible,
    issued: eligible.filter((t) => t.certificate?.status === "issued"),
    pendingIssue: eligible.filter((t) => !t.certificate),
    names: results.names,
  };
}

export type ProgramTrainee = {
  traineeId: string;
  name: string;
  courses: { id: string; title: string; status: "completed" | "in_progress" | "not_started" }[];
  eligible: boolean;
  issued: boolean;
};

export type ProgramView = {
  programTitle: string | null;
  version: number | null;
  courseCount: number;
  trainees: ProgramTrainee[];
  certificates: { id: string; code: string; traineeId: string }[];
};

export async function getProgramView(course: ManagedCourse): Promise<ProgramView> {
  const supabase = await createClient();
  const [statusRes, people] = await Promise.all([supabase.rpc("program_certificate_status", { p_course: course.id }), getCoursePeople(course.id)]);
  const byTrainee = new Map<string, ProgramTrainee>();
  const courseIds = new Set<string>();
  (statusRes.data ?? []).forEach((r) => {
    courseIds.add(r.course_id);
    const t = byTrainee.get(r.trainee_id) ?? { traineeId: r.trainee_id, name: people.get(r.trainee_id)?.name ?? r.trainee_name, courses: [], eligible: true, issued: false };
    t.courses.push({ id: r.course_id, title: r.course_title, status: r.course_status as ProgramTrainee["courses"][number]["status"] });
    if (r.course_status !== "completed") t.eligible = false;
    if (r.issued) t.issued = true;
    byTrainee.set(r.trainee_id, t);
  });
  let certificates: ProgramView["certificates"] = [];
  if (byTrainee.size) {
    const { data: versionRow } = await supabase.from("courses").select("program_version_id").eq("id", course.id).maybeSingle();
    if (versionRow?.program_version_id) {
      const { data } = await supabase
        .from("program_certificates")
        .select("id, code, trainee_id")
        .eq("program_version_id", versionRow.program_version_id)
        .in("trainee_id", [...byTrainee.keys()]);
      certificates = (data ?? []).map((c) => ({ id: c.id, code: c.code, traineeId: c.trainee_id }));
    }
  }
  const trainees = [...byTrainee.values()].sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.name.localeCompare(b.name, "ar"));
  return { programTitle: course.programTitle, version: course.programVersion, courseCount: courseIds.size, trainees, certificates };
}
