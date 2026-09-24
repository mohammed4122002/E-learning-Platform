import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl, coverUrl } from "@/lib/storage";
import {
  programModeOf,
  programPhase,
  programReference,
  readFindings,
  type CourseModeKey,
  type Finding,
  type ProgramModeKey,
  type ProgramPhase,
  type ReviewState,
} from "@/lib/trainer-programs";
import type { CourseLevel } from "@/types/views";

/*
 * TRR-PRG-* read models. Programs are read as their owner (RLS: owners see their drafts); courses of a program
 * are read-only here (the courses workspace owns them).
 */

const PROGRAM_SELECT =
  "id, slug, title, summary, level, status, review_state, revision, total_hours, cover_path, reference_price, objectives, audience, skills, prerequisites, language, category_id, current_version, derived_from, created_at, updated_at, submitted_at, decided_at, published_at, category:categories(id, name, slug)" as const;

type ProgramRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: CourseLevel;
  status: "draft" | "published" | "archived";
  review_state: ReviewState;
  revision: number;
  total_hours: number | null;
  cover_path: string | null;
  reference_price: number | null;
  objectives: string[];
  audience: string[];
  skills: string[];
  prerequisites: string | null;
  language: string;
  category_id: string | null;
  current_version: number;
  derived_from: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  decided_at: string | null;
  published_at: string | null;
  category: { id: string; name: string; slug: string } | null;
};

export type RequestView = {
  id: string;
  revision: number;
  status: "under_review" | "approved" | "needs_changes" | "rejected" | "withdrawn";
  submittedAt: string;
  decidedAt: string | null;
  reason: string | null;
  note: string | null;
  findings: Finding[];
  declarationId: string;
};

export type CourseSummary = {
  total: number;
  running: number;
  open: number;
  upcoming: number;
  published: number;
  learners: number;
  rating: number | null;
  ratings: number;
  mode: ProgramModeKey | null;
  modes: CourseModeKey[];
};

export type ProgramListItem = {
  id: string;
  title: string;
  summary: string | null;
  level: CourseLevel;
  phase: ProgramPhase;
  revision: number;
  hours: number | null;
  categoryName: string | null;
  updatedAt: string;
  createdAt: string;
  submittedAt: string | null;
  decidedAt: string | null;
  missing: string[];
  files: number;
  bytes: number;
  lessons: number;
  request: RequestView | null;
  courses: CourseSummary;
};

function missingOf(p: Pick<ProgramRow, "cover_path" | "summary" | "category_id" | "objectives" | "total_hours" | "reference_price">, units: number): string[] {
  const out: string[] = [];
  if (!p.cover_path) out.push("cover");
  if ((p.summary ?? "").trim().length < 20) out.push("summary");
  if (!p.category_id) out.push("category");
  if (p.total_hours === null) out.push("hours");
  if (p.objectives.length === 0) out.push("objectives");
  if (units === 0) out.push("units");
  if (p.reference_price === null) out.push("price");
  return out;
}

type RequestRow = {
  id: string;
  program_id: string;
  revision: number;
  status: RequestView["status"];
  submitted_at: string;
  decided_at: string | null;
  reason: string | null;
  note: string | null;
  findings: unknown;
  declaration_id: string;
};
const toRequest = (r: RequestRow): RequestView => ({
  id: r.id,
  revision: r.revision,
  status: r.status,
  submittedAt: r.submitted_at,
  decidedAt: r.decided_at,
  reason: r.reason,
  note: r.note,
  findings: readFindings(r.findings),
  declarationId: r.declaration_id,
});

type CourseRow = { id: string; program_id: string; status: string; mode: CourseModeKey; learners_count: number; rating_avg: number; rating_count: number; starts_at: string | null };

function summarizeCourses(rows: CourseRow[]): CourseSummary {
  const now = Date.now();
  const visible = rows.filter((c) => c.status !== "draft" && c.status !== "cancelled");
  const ratings = visible.reduce((a, c) => a + c.rating_count, 0);
  const weighted = visible.reduce((a, c) => a + Number(c.rating_avg) * c.rating_count, 0);
  const modes = visible.map((c) => c.mode);
  return {
    total: rows.length,
    published: visible.length,
    running: rows.filter((c) => c.status === "in_progress").length,
    open: rows.filter((c) => c.status === "open").length,
    upcoming: rows.filter((c) => c.status === "open" && c.starts_at && new Date(c.starts_at).getTime() > now).length,
    learners: visible.reduce((a, c) => a + c.learners_count, 0),
    rating: ratings > 0 ? weighted / ratings : null,
    ratings,
    mode: programModeOf(modes),
    modes: Array.from(new Set(modes)),
  };
}

/** TRR-PRG-01 · برامجي */
export async function listTrainerPrograms(userId: string): Promise<ProgramListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("programs").select(PROGRAM_SELECT).eq("owner_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  const programs = (data ?? []) as unknown as ProgramRow[];
  if (programs.length === 0) return [];
  const ids = programs.map((p) => p.id);

  const [units, items, requests, courses] = await Promise.all([
    supabase.from("program_units").select("program_id").in("program_id", ids),
    supabase.from("program_items").select("program_id, kind, media_path, media_size").in("program_id", ids),
    supabase
      .from("program_review_requests")
      .select("id, program_id, revision, status, submitted_at, decided_at, reason, note, findings, declaration_id")
      .in("program_id", ids)
      .order("submitted_at", { ascending: false }),
    supabase.from("courses").select("id, program_id, status, mode, learners_count, rating_avg, rating_count, starts_at").in("program_id", ids),
  ]);
  for (const r of [units, items, requests, courses]) if (r.error) throw r.error;

  return programs.map((p) => {
    const unitCount = (units.data ?? []).filter((u) => u.program_id === p.id).length;
    const own = (items.data ?? []).filter((i) => i.program_id === p.id);
    const files = own.filter((i) => i.media_path);
    const latest = ((requests.data ?? []) as RequestRow[]).find((r) => r.program_id === p.id);
    const req = latest && latest.status !== "withdrawn" ? latest : null;
    return {
      id: p.id,
      title: p.title,
      summary: p.summary,
      level: p.level,
      phase: programPhase(p.status, p.review_state),
      revision: p.revision,
      hours: p.total_hours === null ? null : Number(p.total_hours),
      categoryName: p.category?.name ?? null,
      updatedAt: p.updated_at,
      createdAt: p.created_at,
      submittedAt: p.submitted_at,
      decidedAt: p.decided_at,
      missing: missingOf(p, unitCount),
      files: files.length,
      bytes: files.reduce((a, f) => a + Number(f.media_size ?? 0), 0),
      lessons: own.filter((i) => i.kind !== "assignment").length,
      request: req ? toRequest(req) : null,
      courses: summarizeCourses(((courses.data ?? []) as CourseRow[]).filter((c) => c.program_id === p.id)),
    };
  });
}

export type ItemView = {
  id: string;
  unitId: string;
  kind: "video" | "file" | "text" | "quiz" | "assignment";
  position: number;
  title: string;
  summary: string | null;
  minutes: number | null;
  maxScore: number | null;
  weight: number | null;
  dueNote: string | null;
  mediaPath: string | null;
  mediaName: string | null;
  mediaSize: number | null;
};
export type UnitView = {
  id: string;
  kind: "module" | "chapter";
  position: number;
  title: string;
  summary: string | null;
  items: ItemView[];
  lessons: number;
  assignments: number;
  minutes: number;
  files: number;
  bytes: number;
};

export type DeclarationView = {
  id: string;
  reference: string;
  revision: number;
  contentHash: string;
  createdAt: string;
};

export type TrainerCard = {
  id: string;
  name: string;
  headline: string | null;
  avatar: string | null;
  verified: boolean;
  rating: number | null;
  ratings: number;
  learners: number;
};

export type ProgramDetail = {
  id: string;
  slug: string;
  reference: string;
  title: string;
  summary: string | null;
  level: CourseLevel;
  status: ProgramRow["status"];
  reviewState: ReviewState;
  phase: ProgramPhase;
  revision: number;
  hours: number | null;
  cover: string | null;
  coverPath: string | null;
  price: number | null;
  objectives: string[];
  audience: string[];
  skills: string[];
  prerequisites: string | null;
  language: string;
  category: { id: string; name: string; slug: string } | null;
  derivedFrom: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  decidedAt: string | null;
  publishedAt: string | null;
  units: UnitView[];
  totals: { units: number; lessons: number; assignments: number; minutes: number; files: number; bytes: number };
  missing: string[];
  requests: RequestView[];
  /** Latest request unless it was withdrawn (the one the status pages talk about). */
  request: RequestView | null;
  declarations: DeclarationView[];
  courses: CourseSummary;
  trainer: TrainerCard;
};

/** One program with its curriculum, review history and course summary, as its owner sees it. */
export const getTrainerProgram = cache(async (id: string, userId: string): Promise<ProgramDetail | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("programs").select(PROGRAM_SELECT).eq("id", id).eq("owner_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p = data as unknown as ProgramRow;

  const [units, items, requests, declarations, courses, profile, stats] = await Promise.all([
    supabase.from("program_units").select("id, kind, position, title, summary, created_at").eq("program_id", id).order("position").order("created_at"),
    supabase
      .from("program_items")
      .select("id, unit_id, kind, position, title, summary, duration_minutes, max_score, weight_percent, due_note, media_path, media_name, media_size, created_at")
      .eq("program_id", id)
      .order("position")
      .order("created_at"),
    supabase
      .from("program_review_requests")
      .select("id, program_id, revision, status, submitted_at, decided_at, reason, note, findings, declaration_id")
      .eq("program_id", id)
      .order("submitted_at", { ascending: false }),
    supabase.from("program_declarations").select("id, reference, revision, content_hash, created_at").eq("program_id", id).order("created_at", { ascending: false }),
    supabase.from("courses").select("id, program_id, status, mode, learners_count, rating_avg, rating_count, starts_at").eq("program_id", id),
    supabase.from("profiles").select("id, full_name, headline, avatar_path, identity_status").eq("id", userId).maybeSingle(),
    supabase.rpc("trainer_public_stats", { p_trainer: userId }),
  ]);
  for (const r of [units, items, requests, declarations, courses, profile]) if (r.error) throw r.error;

  const itemViews: ItemView[] = (items.data ?? []).map((i) => ({
    id: i.id,
    unitId: i.unit_id,
    kind: i.kind as ItemView["kind"],
    position: i.position,
    title: i.title,
    summary: i.summary,
    minutes: i.duration_minutes,
    maxScore: i.max_score,
    weight: i.weight_percent,
    dueNote: i.due_note,
    mediaPath: i.media_path,
    mediaName: i.media_name,
    mediaSize: i.media_size === null ? null : Number(i.media_size),
  }));
  const unitViews: UnitView[] = (units.data ?? []).map((u) => {
    const its = itemViews.filter((i) => i.unitId === u.id);
    const withMedia = its.filter((i) => i.mediaPath);
    return {
      id: u.id,
      kind: u.kind as UnitView["kind"],
      position: u.position,
      title: u.title,
      summary: u.summary,
      items: its,
      lessons: its.filter((i) => i.kind !== "assignment").length,
      assignments: its.filter((i) => i.kind === "assignment").length,
      minutes: its.reduce((a, i) => a + (i.minutes ?? 0), 0),
      files: withMedia.length,
      bytes: withMedia.reduce((a, i) => a + (i.mediaSize ?? 0), 0),
    };
  });
  const reqs = ((requests.data ?? []) as RequestRow[]).map(toRequest);
  const stat = Array.isArray(stats.data) ? stats.data[0] : null;
  const prof = profile.data;

  return {
    id: p.id,
    slug: p.slug,
    reference: programReference(p.id, p.created_at),
    title: p.title,
    summary: p.summary,
    level: p.level,
    status: p.status,
    reviewState: p.review_state,
    phase: programPhase(p.status, p.review_state),
    revision: p.revision,
    hours: p.total_hours === null ? null : Number(p.total_hours),
    cover: coverUrl(p.cover_path),
    coverPath: p.cover_path,
    price: p.reference_price === null ? null : Number(p.reference_price),
    objectives: p.objectives,
    audience: p.audience,
    skills: p.skills,
    prerequisites: p.prerequisites,
    language: p.language,
    category: p.category,
    derivedFrom: p.derived_from,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    submittedAt: p.submitted_at,
    decidedAt: p.decided_at,
    publishedAt: p.published_at,
    units: unitViews,
    totals: {
      units: unitViews.length,
      lessons: unitViews.reduce((a, u) => a + u.lessons, 0),
      assignments: unitViews.reduce((a, u) => a + u.assignments, 0),
      minutes: unitViews.reduce((a, u) => a + u.minutes, 0),
      files: unitViews.reduce((a, u) => a + u.files, 0),
      bytes: unitViews.reduce((a, u) => a + u.bytes, 0),
    },
    missing: missingOf(p, unitViews.length),
    requests: reqs,
    request: reqs[0] && reqs[0].status !== "withdrawn" ? reqs[0] : null,
    declarations: (declarations.data ?? []).map((d) => ({ id: d.id, reference: d.reference, revision: d.revision, contentHash: d.content_hash, createdAt: d.created_at })),
    courses: summarizeCourses((courses.data ?? []) as CourseRow[]),
    trainer: {
      id: userId,
      name: prof?.full_name || "المدرب",
      headline: prof?.headline ?? null,
      avatar: avatarUrl(prof?.avatar_path),
      verified: prof?.identity_status === "verified",
      rating: stat && stat.ratings > 0 ? Number(stat.rating) : null,
      ratings: stat ? Number(stat.ratings) : 0,
      learners: stat ? Number(stat.learners) : 0,
    },
  };
});

export async function listCategories(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, name").order("position");
  if (error) throw error;
  return data ?? [];
}

/** Price band of published courses in the same category (TRR-PRG-02 · ٤ التسعير hint). */
export async function categoryPriceBand(categoryId: string | null): Promise<{ min: number; max: number; count: number } | null> {
  if (!categoryId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("price, programs!inner(category_id)")
    .eq("programs.category_id", categoryId)
    .neq("status", "draft")
    .gt("price", 0);
  if (error || !data || data.length < 2) return null;
  const prices = data.map((c) => Number(c.price));
  return { min: Math.min(...prices), max: Math.max(...prices), count: prices.length };
}

export async function commissionPercent(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("platform_commission_percent");
  return typeof data === "number" ? data : 10;
}

export type ProgramCourse = { id: string; slug: string; mode: CourseModeKey; city: string | null; startsAt: string | null; endsAt: string | null; status: string; seatsLeft: number | null };
export type ProgramRatings = { count: number; average: number; content: number; trainer: number; organization: number | null; distribution: number[]; courses: number; latest: { name: string; stars: number; comment: string } | null };

/** Open courses of a program and its aggregated ratings (read-only; for TRR-PRG-06 / معاينة الظهور). */
export async function programCoursesAndRatings(programId: string): Promise<{ courses: ProgramCourse[]; ratings: ProgramRatings | null }> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("courses")
    .select("id, slug, mode, city, starts_at, ends_at, status, capacity")
    .eq("program_id", programId)
    .in("status", ["open", "in_progress", "completed"])
    .order("starts_at", { ascending: true, nullsFirst: false });
  const all = rows ?? [];
  const open = all.filter((c) => c.status === "open");
  const seats = await Promise.all(open.map((c) => (c.capacity ? supabase.rpc("course_seats_left", { p_course: c.id }) : Promise.resolve({ data: null }))));
  const courses: ProgramCourse[] = open.map((c, i) => ({
    id: c.id,
    slug: c.slug,
    mode: c.mode,
    city: c.city,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    status: c.status,
    seatsLeft: typeof seats[i].data === "number" ? (seats[i].data as number) : null,
  }));
  if (all.length === 0) return { courses, ratings: null };
  const { data: rs } = await supabase
    .from("course_ratings")
    .select("content_score, trainer_score, organization_score, comment, created_at, course_id")
    .in("course_id", all.map((c) => c.id))
    .order("created_at", { ascending: false });
  const list = rs ?? [];
  if (list.length === 0) return { courses, ratings: null };
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const per = list.map((r) => (r.organization_score === null ? (r.content_score + r.trainer_score) / 2 : (r.content_score + r.trainer_score + r.organization_score) / 3));
  const distribution = [5, 4, 3, 2, 1].map((star) => Math.round((per.filter((v) => Math.round(v) === star).length / per.length) * 100));
  const orgs = list.map((r) => r.organization_score).filter((x): x is number => x !== null);
  const withComment = list.find((r) => r.comment);
  return {
    courses,
    ratings: {
      count: list.length,
      average: avg(per),
      content: avg(list.map((r) => r.content_score)),
      trainer: avg(list.map((r) => r.trainer_score)),
      organization: orgs.length ? avg(orgs) : null,
      distribution,
      courses: new Set(list.map((r) => r.course_id)).size,
      latest: withComment ? { name: "متدرب في البرنامج", stars: Math.round(per[list.indexOf(withComment)]), comment: withComment.comment! } : null,
    },
  };
}
