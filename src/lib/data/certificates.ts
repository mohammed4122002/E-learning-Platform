import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { Database, Json } from "@/types/database";
import type { CourseMode } from "@/types/views";

/*
 * Read models for TRN-CRT-01 (شهاداتي), TRN-CRT-02 (معاينة الشهادة) and TRN-CRT-03 (شهادة خارجية).
 * All queries run as the signed-in trainee (RLS); every lookup is additionally scoped to `trainee_id`.
 */

export type ReviewStatus = Database["public"]["Enums"]["review_status"];

export type PlatformCertificate = {
  id: string;
  code: string;
  status: "issued" | "revoked";
  enrollmentId: string;
  courseId: string;
  courseSlug: string | null;
  courseTitle: string;
  courseMode: CourseMode;
  /** "شهادة إتمام" for recorded courses, "شهادة مشارك" for sessions-based ones. */
  kindLabel: string;
  /** BR-R2: provider courses are issued in the provider's name; the trainer still shows. */
  issuerName: string;
  organizationName: string | null;
  trainerName: string;
  traineeName: string;
  hours: number | null;
  issuedAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  verifyPath: string;
  verifyUrl: string;
};

export type ExternalCertificate = {
  id: string;
  reference: string;
  title: string;
  issuer: string;
  issuedOn: string;
  expiresOn: string | null;
  serialNumber: string | null;
  field: string | null;
  credentialUrl: string | null;
  filePath: string | null;
  fileName: string | null;
  status: ReviewStatus;
  reviewerNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConditionKey = "lessons" | "quizzes" | "assignments" | "attendance";
export type CertificateCondition = {
  key: ConditionKey;
  done: number;
  total: number;
  met: boolean;
  info: Record<string, unknown>;
};

export type PendingCertificate = {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  courseMode: CourseMode;
  kindLabel: string;
  issuerName: string;
  organizationName: string | null;
  trainerName: string;
  hours: number | null;
  enrollmentStatus: Database["public"]["Enums"]["enrollment_status"];
  conditions: CertificateCondition[];
  metCount: number;
  percent: number;
};

export type CertificatesOverview = {
  platform: PlatformCertificate[];
  external: ExternalCertificate[];
  pending: PendingCertificate[];
  stats: { issued: number; external: number; pending: number; hours: number };
};

const CERT_SELECT =
  "id, code, status, enrollment_id, course_id, trainee_name, course_title, hours, issued_at, revoked_at, revoke_reason, organizations(name), trainer:profiles!certificates_trainer_id_fkey(full_name), courses(slug, mode)" as const;

type CertRow = {
  id: string;
  code: string;
  status: "issued" | "revoked";
  enrollment_id: string;
  course_id: string;
  trainee_name: string;
  course_title: string;
  hours: number | null;
  issued_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
  organizations: { name: string } | null;
  trainer: { full_name: string } | null;
  courses: { slug: string; mode: CourseMode } | null;
};

export function kindLabelFor(mode: CourseMode): string {
  return mode === "recorded" ? "شهادة إتمام" : "شهادة مشارك";
}

export function verifyUrlFor(code: string): string {
  return `${env.siteUrl.replace(/\/$/, "")}/verify/${code}`;
}

function toPlatform(row: CertRow): PlatformCertificate {
  const mode = row.courses?.mode ?? "in_person";
  const trainerName = row.trainer?.full_name ?? "";
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    enrollmentId: row.enrollment_id,
    courseId: row.course_id,
    courseSlug: row.courses?.slug ?? null,
    courseTitle: row.course_title,
    courseMode: mode,
    kindLabel: kindLabelFor(mode),
    issuerName: row.organizations?.name ?? trainerName,
    organizationName: row.organizations?.name ?? null,
    trainerName,
    traineeName: row.trainee_name,
    hours: row.hours === null ? null : Number(row.hours),
    issuedAt: row.issued_at,
    revokedAt: row.revoked_at,
    revokeReason: row.revoke_reason,
    verifyPath: `/verify/${row.code}`,
    verifyUrl: verifyUrlFor(row.code),
  };
}

const EXTERNAL_SELECT =
  "id, title, issuer, issued_on, expires_on, serial_number, field, credential_url, file_path, status, reviewer_note, created_at, updated_at" as const;

type ExternalRow = {
  id: string;
  title: string;
  issuer: string;
  issued_on: string;
  expires_on: string | null;
  serial_number: string | null;
  field: string | null;
  credential_url: string | null;
  file_path: string | null;
  status: ReviewStatus;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
};

/** "EXT-2026-1A2B" — a readable request number derived from the row (no extra column needed). */
export function externalReference(id: string, createdAt: string): string {
  return `EXT-${new Date(createdAt).getUTCFullYear()}-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

function toExternal(row: ExternalRow): ExternalCertificate {
  const fileName = row.file_path ? row.file_path.split("/").pop()!.replace(/^[0-9a-f-]{36}-/, "") : null;
  return {
    id: row.id,
    reference: externalReference(row.id, row.created_at),
    title: row.title,
    issuer: row.issuer,
    issuedOn: row.issued_on,
    expiresOn: row.expires_on,
    serialNumber: row.serial_number,
    field: row.field,
    credentialUrl: row.credential_url,
    filePath: row.file_path,
    fileName,
    status: row.status,
    reviewerNote: row.reviewer_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toConditions(rows: { key: string; done: number; total: number; met: boolean; info: Json }[] | null): CertificateCondition[] {
  return (rows ?? []).map((r) => ({
    key: r.key as ConditionKey,
    done: r.done,
    total: r.total,
    met: r.met,
    info: r.info && typeof r.info === "object" && !Array.isArray(r.info) ? (r.info as Record<string, unknown>) : {},
  }));
}

function summarize(conditions: CertificateCondition[]) {
  const metCount = conditions.filter((c) => c.met).length;
  const percent = conditions.length
    ? Math.round((conditions.reduce((sum, c) => sum + (c.met ? 1 : c.total ? Math.min(1, c.done / c.total) : 0), 0) / conditions.length) * 100)
    : 0;
  return { metCount, percent };
}

async function conditionsFor(enrollmentId: string): Promise<CertificateCondition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("certificate_conditions", { p_enrollment: enrollmentId });
  if (error) throw new Error(error.message);
  return toConditions(data);
}

const PENDING_STATUSES = ["in_progress", "completed"] as const;

type PendingRow = {
  id: string;
  status: Database["public"]["Enums"]["enrollment_status"];
  course_id: string;
  courses: {
    title: string;
    mode: CourseMode;
    duration_hours: number | null;
    organizations: { name: string } | null;
    trainer: { full_name: string } | null;
  } | null;
};

const PENDING_SELECT =
  "id, status, course_id, courses(title, mode, duration_hours, organizations(name), trainer:profiles!courses_trainer_id_fkey(full_name))" as const;

async function toPending(row: PendingRow): Promise<PendingCertificate> {
  const conditions = await conditionsFor(row.id);
  const c = row.courses!;
  const trainerName = c.trainer?.full_name ?? "";
  return {
    enrollmentId: row.id,
    courseId: row.course_id,
    courseTitle: c.title,
    courseMode: c.mode,
    kindLabel: kindLabelFor(c.mode),
    issuerName: c.organizations?.name ?? trainerName,
    organizationName: c.organizations?.name ?? null,
    trainerName,
    hours: c.duration_hours === null ? null : Number(c.duration_hours),
    enrollmentStatus: row.status,
    conditions,
    ...summarize(conditions),
  };
}

export const getCertificatesOverview = cache(async (userId: string): Promise<CertificatesOverview> => {
  const supabase = await createClient();
  const [certsRes, extRes, enrollRes] = await Promise.all([
    supabase.from("certificates").select(CERT_SELECT).eq("trainee_id", userId).order("issued_at", { ascending: false }),
    supabase.from("external_certificates").select(EXTERNAL_SELECT).eq("trainee_id", userId).order("created_at", { ascending: false }),
    supabase.from("enrollments").select(PENDING_SELECT).eq("trainee_id", userId).in("status", [...PENDING_STATUSES]).order("created_at", { ascending: false }),
  ]);
  if (certsRes.error) throw new Error(certsRes.error.message);
  if (extRes.error) throw new Error(extRes.error.message);
  if (enrollRes.error) throw new Error(enrollRes.error.message);

  const platform = (certsRes.data as unknown as CertRow[]).map(toPlatform);
  const certified = new Set(platform.map((c) => c.enrollmentId));
  const pendingRows = (enrollRes.data as unknown as PendingRow[]).filter((e) => e.courses && !certified.has(e.id));
  const pending = await Promise.all(pendingRows.map(toPending));
  const external = (extRes.data as unknown as ExternalRow[]).map(toExternal);

  const issued = platform.filter((c) => c.status === "issued");
  return {
    platform,
    external,
    pending,
    stats: {
      issued: issued.length,
      external: external.length,
      pending: pending.length,
      hours: Math.round(issued.reduce((sum, c) => sum + (c.hours ?? 0), 0)),
    },
  };
});

export type RemainingLesson = { id: string; title: string; durationSeconds: number };

export type CertificateDetail =
  | { kind: "issued" | "revoked"; certificate: PlatformCertificate; conditions: CertificateCondition[]; rated: boolean; courseRatingOpen: boolean }
  | { kind: "pending"; pending: PendingCertificate; traineeName: string; remainingLessons: RemainingLesson[] };

/** TRN-CRT-02: `id` is a certificate id, or — for a certificate not issued yet — the trainee's enrollment id. */
export async function getCertificateDetail(userId: string, id: string, traineeName: string): Promise<CertificateDetail | null> {
  const supabase = await createClient();
  const { data: cert } = await supabase.from("certificates").select(CERT_SELECT).eq("id", id).eq("trainee_id", userId).maybeSingle();
  if (cert) {
    const certificate = toPlatform(cert as unknown as CertRow);
    const [conditions, ratingRes, enrollRes] = await Promise.all([
      conditionsFor(certificate.enrollmentId),
      supabase.from("course_ratings").select("id").eq("enrollment_id", certificate.enrollmentId).maybeSingle(),
      supabase.from("enrollments").select("completed_at, status").eq("id", certificate.enrollmentId).maybeSingle(),
    ]);
    const completedAt = enrollRes.data?.completed_at;
    const courseRatingOpen =
      !!enrollRes.data && ["in_progress", "completed"].includes(enrollRes.data.status) && (!completedAt || Date.now() - new Date(completedAt).getTime() <= RATING_WINDOW_MS);
    return { kind: certificate.status, certificate, conditions, rated: !!ratingRes.data, courseRatingOpen };
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select(PENDING_SELECT)
    .eq("id", id)
    .eq("trainee_id", userId)
    .in("status", [...PENDING_STATUSES, "confirmed"])
    .maybeSingle();
  if (!enrollment || !enrollment.courses) return null;
  // An issued certificate for this enrollment → the canonical page is the certificate's.
  const { data: issued } = await supabase.from("certificates").select("id").eq("enrollment_id", enrollment.id).maybeSingle();
  if (issued) return getCertificateDetail(userId, issued.id, traineeName);

  const pending = await toPending(enrollment as unknown as PendingRow);
  let remainingLessons: RemainingLesson[] = [];
  if (pending.courseMode === "recorded") {
    const [lessonsRes, doneRes] = await Promise.all([
      supabase
        .from("lessons")
        .select("id, title, duration_seconds, position, course_modules(position)")
        .eq("course_id", pending.courseId)
        .not("published_at", "is", null),
      supabase.from("lesson_progress").select("lesson_id").eq("trainee_id", userId).eq("course_id", pending.courseId).not("completed_at", "is", null),
    ]);
    const done = new Set((doneRes.data ?? []).map((p) => p.lesson_id));
    remainingLessons = ((lessonsRes.data ?? []) as unknown as { id: string; title: string; duration_seconds: number; position: number; course_modules: { position: number } | null }[])
      .filter((l) => !done.has(l.id))
      .sort((a, b) => (a.course_modules?.position ?? 0) - (b.course_modules?.position ?? 0) || a.position - b.position)
      .map((l) => ({ id: l.id, title: l.title, durationSeconds: l.duration_seconds }));
  }
  return { kind: "pending", pending, traineeName, remainingLessons };
}

/** Certificate for the print page (issued or revoked; revoked renders a void notice instead). */
export async function getPrintableCertificate(userId: string, id: string): Promise<PlatformCertificate | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("certificates").select(CERT_SELECT).eq("id", id).eq("trainee_id", userId).maybeSingle();
  return data ? toPlatform(data as unknown as CertRow) : null;
}

/** Issued certificates of one course for the trainer's «نزّل الشهادات PDF» (RLS: manages_course). */
export async function getCourseCertificatesForPrint(courseId: string, enrollmentIds?: string[]): Promise<PlatformCertificate[]> {
  const supabase = await createClient();
  let q = supabase.from("certificates").select(CERT_SELECT).eq("course_id", courseId).eq("status", "issued").order("trainee_name");
  if (enrollmentIds?.length) q = q.in("enrollment_id", enrollmentIds);
  const { data } = await q;
  return ((data ?? []) as unknown as CertRow[]).map(toPlatform);
}

export async function getExternalCertificate(userId: string, id: string): Promise<ExternalCertificate | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("external_certificates").select(EXTERNAL_SELECT).eq("id", id).eq("trainee_id", userId).maybeSingle();
  return data ? toExternal(data as unknown as ExternalRow) : null;
}

/** Short-lived signed URL of the uploaded external certificate file (private bucket). */
export async function externalFileUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("external-certificates").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

/** TRN-RTG-02: rating is open for 30 days after the course ends, and is sent once. */
export const RATING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
