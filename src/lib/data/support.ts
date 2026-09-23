import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InquiryTopic, ReportReason, ReportTarget } from "@/lib/validation/engagement";
import type { CourseMode } from "@/types/views";

/* TRN-INQ-01 (استفسار قبل التسجيل), TRN-RPT-01 (الإبلاغ عن مخالفة) and the «تذاكري» card of TRN-HLP-01. */

export type InquiryCourse = {
  id: string;
  slug: string;
  title: string;
  mode: CourseMode;
  sourceName: string;
  isProvider: boolean;
  durationHours: number | null;
  startsAt: string | null;
  city: string | null;
  faq: { q: string; a: string }[];
};

export type MyInquiry = {
  id: string;
  reference: string;
  courseTitle: string;
  courseSlug: string | null;
  topic: InquiryTopic;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
};

const ref = (prefix: string, id: string, at: string) => `${prefix}-${new Date(at).getUTCFullYear()}-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

const COURSE_SELECT =
  "id, slug, title, mode, duration_hours, starts_at, city, organization_id, organizations(name), trainer:profiles!courses_trainer_id_fkey(full_name), program_versions(snapshot)" as const;

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  mode: CourseMode;
  duration_hours: number | null;
  starts_at: string | null;
  city: string | null;
  organization_id: string | null;
  organizations: { name: string } | null;
  trainer: { full_name: string } | null;
  program_versions: { snapshot: unknown } | null;
};

function toInquiryCourse(c: CourseRow): InquiryCourse {
  const snap = (c.program_versions?.snapshot ?? {}) as { faq?: { q?: string; a?: string }[] };
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    mode: c.mode,
    sourceName: c.organizations?.name ?? c.trainer?.full_name ?? "",
    isProvider: !!c.organization_id,
    durationHours: c.duration_hours === null ? null : Number(c.duration_hours),
    startsAt: c.starts_at,
    city: c.city,
    faq: (Array.isArray(snap.faq) ? snap.faq : []).filter((f): f is { q: string; a: string } => !!f?.q && !!f?.a).slice(0, 3),
  };
}

export async function getInquiryCourse(slug: string): Promise<InquiryCourse | null> {
  if (!/^[a-z0-9-]{2,140}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select(COURSE_SELECT).eq("slug", slug).neq("status", "draft").maybeSingle();
  return data ? toInquiryCourse(data as unknown as CourseRow) : null;
}

/** Courses a trainee can ask about when no course was preselected (open catalogue). */
export async function getInquirableCourses(): Promise<{ slug: string; title: string; sourceName: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("slug, title, organizations(name), trainer:profiles!courses_trainer_id_fkey(full_name)")
    .in("status", ["open", "in_progress"])
    .order("title")
    .limit(100);
  return ((data ?? []) as unknown as { slug: string; title: string; organizations: { name: string } | null; trainer: { full_name: string } | null }[]).map((c) => ({
    slug: c.slug,
    title: c.title,
    sourceName: c.organizations?.name ?? c.trainer?.full_name ?? "",
  }));
}

export async function getMyInquiries(userId: string, courseId?: string): Promise<MyInquiry[]> {
  const supabase = await createClient();
  let q = supabase
    .from("inquiries")
    .select("id, topic, question, answer, answered_at, created_at, courses(title, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (courseId) q = q.eq("course_id", courseId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as unknown as { id: string; topic: InquiryTopic; question: string; answer: string | null; answered_at: string | null; created_at: string; courses: { title: string; slug: string } | null }[]).map((i) => ({
    id: i.id,
    reference: ref("INQ", i.id, i.created_at),
    courseTitle: i.courses?.title ?? "",
    courseSlug: i.courses?.slug ?? null,
    topic: i.topic,
    question: i.question,
    answer: i.answer,
    answeredAt: i.answered_at,
    createdAt: i.created_at,
  }));
}

/* ── Reports ─────────────────────────────────────────────────────────────── */

export type ReportTargetInfo = { type: ReportTarget; id: string; title: string; meta: string };

export async function getReportTarget(userId: string, type: ReportTarget, id: string): Promise<ReportTargetInfo | null> {
  const supabase = await createClient();
  if (type === "course") {
    const { data } = await supabase
      .from("courses")
      .select("id, title, organizations(name), trainer:profiles!courses_trainer_id_fkey(full_name)")
      .eq("id", id)
      .neq("status", "draft")
      .maybeSingle();
    if (!data) return null;
    const c = data as unknown as { id: string; title: string; organizations: { name: string } | null; trainer: { full_name: string } | null };
    const { data: enr } = await supabase.from("enrollments").select("id").eq("course_id", id).eq("trainee_id", userId).limit(1).maybeSingle();
    return { type, id, title: c.title, meta: `${c.organizations?.name ?? c.trainer?.full_name ?? ""}${enr ? " · أنت مسجَّل في هذا البرنامج" : ""}` };
  }
  if (type === "trainer") {
    const { data } = await supabase.from("profiles").select("id, full_name, headline, city").eq("id", id).maybeSingle();
    if (!data) return null;
    return { type, id, title: data.full_name || "مدرب", meta: [data.headline, data.city].filter(Boolean).join(" · ") || "مدرب على المنصة" };
  }
  if (type === "organization") {
    const { data } = await supabase.from("organizations").select("id, name, city").eq("id", id).maybeSingle();
    if (!data) return null;
    return { type, id, title: data.name, meta: data.city ? `جهة تدريبية · ${data.city}` : "جهة تدريبية" };
  }
  const { data } = await supabase.from("course_ratings").select("id, comment, courses(title)").eq("id", id).maybeSingle();
  if (!data) return null;
  const r = data as unknown as { id: string; comment: string | null; courses: { title: string } | null };
  return { type, id, title: r.comment ? `«${r.comment.slice(0, 80)}${r.comment.length > 80 ? "…" : ""}»` : "تقييم بلا تعليق", meta: `تقييم على ${r.courses?.title ?? "دورة"}` };
}

/**
 * Candidate targets when the trainee opens the report page without one: their own courses, and the trainers /
 * training organisations of those courses.
 */
export async function getReportCandidates(userId: string, type: Exclude<ReportTarget, "review">): Promise<{ id: string; label: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("courses(id, title, trainer_id, organization_id, organizations(name), trainer:profiles!courses_trainer_id_fkey(full_name))")
    .eq("trainee_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  const seen = new Set<string>();
  const out: { id: string; label: string }[] = [];
  for (const e of (data ?? []) as unknown as {
    courses: { id: string; title: string; trainer_id: string; organization_id: string | null; organizations: { name: string } | null; trainer: { full_name: string } | null } | null;
  }[]) {
    const c = e.courses;
    if (!c) continue;
    const item =
      type === "course"
        ? { id: c.id, label: c.title }
        : type === "trainer"
          ? { id: c.trainer_id, label: c.trainer?.full_name ?? "مدرب" }
          : c.organization_id
            ? { id: c.organization_id, label: c.organizations?.name ?? "جهة تدريبية" }
            : null;
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export type MyReport = {
  id: string;
  reference: string;
  type: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: "open" | "reviewing" | "actioned" | "dismissed" | "withdrawn";
  createdAt: string;
  withdrawnAt: string | null;
  hasEvidence: boolean;
};

export async function getMyReport(userId: string, id: string): Promise<MyReport | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("violation_reports")
    .select("id, target_type, target_id, reason, details, status, created_at, withdrawn_at, evidence_path")
    .eq("id", id)
    .eq("reporter_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    reference: ref("RPT", data.id, data.created_at),
    type: data.target_type as ReportTarget,
    targetId: data.target_id,
    reason: data.reason as ReportReason,
    details: data.details,
    status: data.status as MyReport["status"],
    createdAt: data.created_at,
    withdrawnAt: data.withdrawn_at,
    hasEvidence: !!data.evidence_path,
  };
}

/* ── «تذاكري» (help center) ─────────────────────────────────────────────── */

export type Ticket = { id: string; reference: string; title: string; href: string; state: "closed" | "open" };

export async function getMyTickets(userId: string): Promise<Ticket[]> {
  const supabase = await createClient();
  const [inq, rep] = await Promise.all([
    supabase.from("inquiries").select("id, question, answer, created_at, courses(slug, title)").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("violation_reports").select("id, reason, status, created_at").eq("reporter_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);
  const inquiries = ((inq.data ?? []) as unknown as { id: string; question: string; answer: string | null; created_at: string; courses: { slug: string; title: string } | null }[]).map((i) => ({
    id: i.id,
    at: i.created_at,
    reference: ref("INQ", i.id, i.created_at),
    title: `استفسار: ${i.courses?.title ?? "برنامج"}`,
    href: `/trainee/inquiry?course=${i.courses?.slug ?? ""}#my-inquiries`,
    state: (i.answer ? "closed" : "open") as Ticket["state"],
  }));
  const reports = (rep.data ?? []).map((r) => ({
    id: r.id,
    at: r.created_at,
    reference: ref("RPT", r.id, r.created_at),
    title: "بلاغ عن مخالفة",
    href: `/trainee/report?sent=${r.id}`,
    state: (["actioned", "dismissed", "withdrawn"].includes(r.status) ? "closed" : "open") as Ticket["state"],
  }));
  return [...inquiries, ...reports]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4)
    .map((t) => ({ id: t.id, reference: t.reference, title: t.title, href: t.href, state: t.state }));
}
