import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/storage";
import { stateOf, type CourseHeader, type ListState, type SessionLite } from "@/lib/data/trainer-courses";

/* Read models for TRR-CRS-05 (صفحة الدورة): hero state, session progress, files and assignments. Everything
   runs as the signed-in course staff — RLS scopes rows to courses they manage. */

export type HeroState = ListState | "draft";

export function heroState(c: CourseHeader, now = new Date()): HeroState {
  if (c.status === "draft") return "draft";
  return stateOf({ status: c.status, mode: c.mode, startsAt: c.startsAt, endsAt: c.endsAt, capacity: c.capacity, seatsTaken: c.seatsTaken }, now);
}

export type SessionState = "ended" | "today" | "upcoming" | "cancelled";

const riyadhDay = (d: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(typeof d === "string" ? new Date(d) : d);

export function sessionState(s: SessionLite, now = new Date()): SessionState {
  if (s.status === "cancelled") return "cancelled";
  if (new Date(s.endsAt) < now) return riyadhDay(s.endsAt) === riyadhDay(now) ? "today" : "ended";
  return riyadhDay(s.startsAt) === riyadhDay(now) ? "today" : "upcoming";
}

/** «الجلسة ٩ من ١٢»: the session in progress/today, else the next one, else the last. */
export function sessionProgress(sessions: SessionLite[], now = new Date()) {
  const live = sessions.filter((s) => s.status !== "cancelled").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const ended = live.filter((s) => new Date(s.endsAt) < now).length;
  const current = live.find((s) => sessionState(s, now) === "today") ?? live.find((s) => new Date(s.endsAt) >= now) ?? live[live.length - 1] ?? null;
  const index = current ? live.indexOf(current) + 1 : 0;
  return { total: live.length, ended, index, current, last: live[live.length - 1] ?? null, next: live.find((s) => new Date(s.startsAt) > now) ?? null };
}

/* ── Files (TRR-CRS-05 ٣) ─────────────────────────────────────────────────────────────────────────── */

export type CourseFileRow = { id: string; title: string; path: string; size: number; mime: string; publishedAt: string | null; createdAt: string };
export type InheritedUnit = { index: number; title: string; files: { name: string; path: string; size: number }[]; size: number };

type SnapshotItem = { kind?: string; title?: string; media_path?: string | null; media_name?: string | null; media_size?: number | null };
type SnapshotUnit = { kind?: string; title?: string; items?: SnapshotItem[] };

export function inheritedMaterials(snapshot: Record<string, unknown>): InheritedUnit[] {
  const units = Array.isArray(snapshot.units) ? (snapshot.units as SnapshotUnit[]) : [];
  return units
    .map((u, i) => {
      const files = (u.items ?? [])
        .filter((it) => typeof it.media_path === "string" && it.media_path)
        .map((it) => ({ name: it.media_name || it.title || "ملف", path: it.media_path as string, size: Number(it.media_size ?? 0) }));
      return { index: i + 1, title: u.title ?? "", files, size: files.reduce((s, f) => s + f.size, 0) };
    })
    .filter((u) => u.files.length > 0);
}

export const getCourseFiles = cache(async (courseId: string): Promise<CourseFileRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_files")
    .select("id, title, file_path, file_size, mime_type, published_at, created_at")
    .eq("course_id", courseId)
    .order("created_at");
  if (error) throw new Error("course_files_unavailable");
  return (data ?? []).map((f) => ({
    id: f.id,
    title: f.title,
    path: f.file_path,
    size: Number(f.file_size),
    mime: f.mime_type ?? "",
    publishedAt: f.published_at,
    createdAt: f.created_at,
  }));
});

/* ── Assignments (TRR-CRS-05 ٤) ───────────────────────────────────────────────────────────────────── */

export type AssignmentRow = {
  id: string;
  title: string;
  instructions: string;
  requirements: string[];
  moduleId: string | null;
  dueAt: string | null;
  opensAt: string | null;
  maxScore: number;
  passScore: number | null;
  weightPercent: number | null;
  maxAttempts: number;
  acceptedFormats: string;
  maxFileMb: number;
  submitted: number;
  pending: number;
  afterSession: number | null;
};

export type PendingSubmission = { assignmentId: string; traineeName: string; avatar: string | null; submittedAt: string };

export type AssignmentsBoard = { items: AssignmentRow[]; pending: PendingSubmission[]; pendingTotal: number; quizzes: { count: number; passPercent: number | null } };

export const getAssignmentsBoard = cache(async (courseId: string, sessions: SessionLite[]): Promise<AssignmentsBoard> => {
  const supabase = await createClient();
  const [{ data: rows, error }, { data: quizRows }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, instructions, requirements, module_id, due_at, opens_at, max_score, pass_score, weight_percent, max_attempts, accepted_formats, max_file_mb")
      .eq("course_id", courseId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("title"),
    supabase.from("quizzes").select("pass_percent").eq("course_id", courseId),
  ]);
  if (error) throw new Error("assignments_unavailable");
  const list = rows ?? [];
  const ids = list.map((a) => a.id);
  const { data: subs } = ids.length
    ? await supabase.from("assignment_submissions").select("assignment_id, trainee_id, status, submitted_at").in("assignment_id", ids).order("submitted_at", { ascending: false })
    : { data: [] as { assignment_id: string; trainee_id: string; status: string; submitted_at: string }[] };

  // Latest submission per trainee and assignment decides the state.
  const latest = new Map<string, { assignment_id: string; trainee_id: string; status: string; submitted_at: string }>();
  for (const s of subs ?? []) {
    const k = `${s.assignment_id}:${s.trainee_id}`;
    if (!latest.has(k)) latest.set(k, s);
  }
  const pendingRows = [...latest.values()].filter((s) => s.status === "submitted").sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  const traineeIds = [...new Set(pendingRows.slice(0, 3).map((s) => s.trainee_id))];
  const { data: people } = traineeIds.length ? await supabase.from("profiles").select("id, full_name, avatar_path").in("id", traineeIds) : { data: [] as { id: string; full_name: string; avatar_path: string | null }[] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  const lastSessionOfModule = new Map<string, number>();
  for (const s of sessions) if (s.moduleId && s.status !== "cancelled") lastSessionOfModule.set(s.moduleId, Math.max(lastSessionOfModule.get(s.moduleId) ?? 0, s.position));

  const quizzes = quizRows ?? [];
  return {
    items: list.map((a) => {
      const mine = [...latest.values()].filter((s) => s.assignment_id === a.id);
      return {
        id: a.id,
        title: a.title,
        instructions: a.instructions ?? "",
        requirements: Array.isArray(a.requirements) ? (a.requirements as unknown[]).map(String) : [],
        moduleId: a.module_id,
        dueAt: a.due_at,
        opensAt: a.opens_at,
        maxScore: a.max_score,
        passScore: a.pass_score,
        weightPercent: a.weight_percent,
        maxAttempts: a.max_attempts,
        acceptedFormats: a.accepted_formats,
        maxFileMb: a.max_file_mb,
        submitted: mine.length,
        pending: mine.filter((s) => s.status === "submitted").length,
        afterSession: a.module_id ? (lastSessionOfModule.get(a.module_id) ?? null) : null,
      };
    }),
    pending: pendingRows.slice(0, 3).map((s) => ({
      assignmentId: s.assignment_id,
      traineeName: byId.get(s.trainee_id)?.full_name ?? "متدرب",
      avatar: avatarUrl(byId.get(s.trainee_id)?.avatar_path ?? null),
      submittedAt: s.submitted_at,
    })),
    pendingTotal: pendingRows.length,
    quizzes: { count: quizzes.length, passPercent: quizzes.length ? Math.round(quizzes.reduce((s, q) => s + Number(q.pass_percent ?? 0), 0) / quizzes.length) : null },
  };
});

/* ── Recorded dashboard (TRR-CRS-07) and sales (TRR-CRS-09) ───────────────────────────────────────── */

export type SaleRow = {
  enrollmentId: string;
  traineeId: string;
  name: string;
  avatar: string | null;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  listPrice: number;
  paid: number;
  vat: number;
  currency: string;
  discountCode: string | null;
  discountAmount: number;
  paymentId: string | null;
  paymentStatus: string | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  receipt: string | null;
  refundAmount: number | null;
  refundStatus: string | null;
  refundReason: string | null;
  refundDecidedAt: string | null;
  commissionPercent: number;
};

/** course_sales(): the course's transactions (no card data), newest first. Throws when the RPC fails. */
export const getCourseSales = cache(async (courseId: string): Promise<SaleRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("course_sales", { p_course: courseId });
  if (error) throw new Error("course_sales_unavailable");
  return (data ?? []).map((r) => ({
    enrollmentId: r.enrollment_id,
    traineeId: r.trainee_id,
    name: r.trainee_name,
    avatar: avatarUrl(r.avatar_path),
    status: r.enrollment_status,
    createdAt: r.created_at,
    confirmedAt: r.confirmed_at,
    listPrice: Number(r.list_price),
    paid: Number(r.price_paid),
    vat: Number(r.vat_amount),
    currency: r.currency,
    discountCode: r.discount_code,
    discountAmount: Number(r.discount_amount ?? 0),
    paymentId: r.payment_id,
    paymentStatus: r.payment_status,
    paymentMethod: r.payment_method,
    paymentRef: r.payment_ref,
    paidAt: r.paid_at,
    receipt: r.receipt_number,
    refundAmount: r.refund_amount === null ? null : Number(r.refund_amount),
    refundStatus: r.refund_status,
    refundReason: r.refund_reason,
    refundDecidedAt: r.refund_decided_at,
    commissionPercent: Number(r.commission_percent),
  }));
});

/** Money summary shared by the dashboard revenue card and the sales screen (net of VAT). */
export function salesTotals(rows: SaleRow[]) {
  const sold = rows.filter((r) => r.paymentStatus === "succeeded" || r.paymentStatus === "refunded" || r.paid === 0);
  const gross = sold.reduce((s, r) => s + r.paid - r.vat, 0);
  const refundedRows = sold.filter((r) => r.refundStatus === "approved" || r.paymentStatus === "refunded");
  const refunds = refundedRows.reduce((s, r) => s + (r.refundAmount ?? r.paid - r.vat), 0);
  const pct = rows[0]?.commissionPercent ?? 10;
  const commission = Math.round((gross - refunds) * pct) / 100;
  return { count: sold.length, gross, refunds, refundCount: refundedRows.length, commission, pct, net: Math.round((gross - refunds - commission) * 100) / 100 };
}

export type DashboardLearner = {
  enrollmentId: string;
  traineeId: string;
  name: string;
  avatar: string | null;
  status: string;
  boughtAt: string;
  completedAt: string | null;
  done: number;
  lastActivity: string | null;
  openQuestions: number;
  refundStatus: string | null;
  certified: boolean;
};

export type RecordedDashboard = {
  lessons: number;
  learners: DashboardLearner[];
  modules: { id: string; position: number; title: string; lessons: number; seconds: number; completed: number }[];
  questions: { count: number; oldestName: string | null; oldestAt: string | null };
  ratings: { count: number; unreplied: number; lowestUnreplied: number | null };
  refundPending: { count: number; name: string; amount: number; createdAt: string; inWindow: boolean } | null;
  monthBuyers: number;
};

type Raw = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => (typeof v === "string" ? v : null);

/** course_dashboard(): learners + progress, module completion, questions/ratings/refunds needing action. */
export const getRecordedDashboard = cache(async (courseId: string): Promise<RecordedDashboard> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("course_dashboard", { p_course: courseId });
  if (error || !data || typeof data !== "object") throw new Error("course_dashboard_unavailable");
  const d = data as Raw;
  const q = (d.questions ?? {}) as Raw;
  const r = (d.ratings ?? {}) as Raw;
  const rp = d.refund_pending as Raw | null;
  return {
    lessons: num(d.lessons),
    learners: ((d.learners ?? []) as Raw[]).map((x) => ({
      enrollmentId: String(x.enrollment_id),
      traineeId: String(x.trainee_id),
      name: String(x.name ?? "متدرب"),
      avatar: avatarUrl(str(x.avatar_path)),
      status: String(x.status),
      boughtAt: String(x.bought_at),
      completedAt: str(x.completed_at),
      done: num(x.done),
      lastActivity: str(x.last_activity),
      openQuestions: num(x.open_questions),
      refundStatus: str(x.refund_status),
      certified: Boolean(x.certified),
    })),
    modules: ((d.modules ?? []) as Raw[]).map((m) => ({
      id: String(m.id),
      position: num(m.position),
      title: String(m.title ?? ""),
      lessons: num(m.lessons),
      seconds: num(m.seconds),
      completed: num(m.completed),
    })),
    questions: { count: num(q.count), oldestName: str(q.oldest_name), oldestAt: str(q.oldest_at) },
    ratings: { count: num(r.count), unreplied: num(r.unreplied), lowestUnreplied: r.lowest_unreplied === null || r.lowest_unreplied === undefined ? null : num(r.lowest_unreplied) },
    refundPending: rp ? { count: num(rp.count), name: String(rp.name ?? "متدرب"), amount: num(rp.amount), createdAt: String(rp.created_at), inWindow: Boolean(rp.in_window) } : null,
    monthBuyers: num(d.month_buyers),
  };
});

/** The program version this course is frozen on vs. the program's current one (BR-L1 «قديمة»). */
export const getProgramDrift = cache(async (programId: string, frozen: number, current: number) => {
  if (!programId || current <= frozen) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("program_versions").select("version, snapshot, created_at").eq("program_id", programId).eq("version", current).maybeSingle();
  if (!data) return null;
  const s = (data.snapshot && typeof data.snapshot === "object" ? data.snapshot : {}) as Raw;
  const units = Array.isArray(s.units) ? (s.units as { kind?: string; items?: unknown[] }[]) : [];
  const modules = units.filter((u) => u.kind === "module");
  const list = modules.length ? modules : units;
  return {
    version: data.version,
    createdAt: data.created_at,
    modules: list.length,
    items: list.reduce((n, u) => n + (Array.isArray(u.items) ? u.items.length : 0), 0),
    objectives: Array.isArray(s.objectives) ? s.objectives.length : 0,
  };
});

/** Average price of the other on-sale recorded courses in the same category («راجع سعرك»). */
export const getCategoryAveragePrice = cache(async (courseId: string, programId: string): Promise<number | null> => {
  const supabase = await createClient();
  const { data: prog } = await supabase.from("programs").select("category_id").eq("id", programId).maybeSingle();
  if (!prog?.category_id) return null;
  const { data } = await supabase
    .from("courses")
    .select("price, programs!inner(category_id)")
    .eq("mode", "recorded")
    .in("status", ["open", "in_progress"])
    .eq("programs.category_id", prog.category_id)
    .neq("id", courseId)
    .gt("price", 0)
    .limit(200);
  const prices = (data ?? []).map((c) => Number(c.price)).filter((p) => p > 0);
  return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
});
