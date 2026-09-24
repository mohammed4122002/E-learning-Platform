import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { coverUrl, avatarUrl } from "@/lib/storage";
import type { CourseLevel, CourseMode, EnrollmentStatus } from "@/types/views";

export type OutlineModule = {
  id: string;
  position: number;
  title: string;
  lessons: { id: string; title: string; kind: "video" | "text" | "file" | "quiz"; durationSeconds: number; isPreview: boolean }[];
};

export type CoursePageView = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  mode: CourseMode;
  level: CourseLevel;
  category: string | null;
  cover: string | null;
  price: number;
  currency: string;
  vatRate: number;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  city: string | null;
  venue: string | null;
  durationHours: number | null;
  capacity: number | null;
  seatsLeft: number | null;
  requiresProviderApproval: boolean;
  rating: number;
  ratingCount: number;
  learners: number;
  updatedAt: string;
  organization: { id: string; name: string } | null;
  trainer: { id: string; name: string; headline: string | null; avatarUrl: string | null; courses: number; learners: number; rating: number; ratings: number };
  objectives: string[];
  audience: string[];
  requirements: string[];
  faq: { q: string; a: string }[];
  outline: OutlineModule[];
  sessions: { id: string; title: string; startsAt: string; endsAt: string; location: string | null }[];
  breakdown: { stars: number; count: number }[];
  reviews: { id: string; name: string; score: number; comment: string; createdAt: string }[];
  previewLessonId: string | null;
  viewer: { signedIn: boolean; enrollmentId: string | null; enrollmentStatus: EnrollmentStatus | null; waitlisted: boolean; favorite: boolean };
};

type Snapshot = { objectives?: string[]; audience?: string[]; requirements?: string[]; faq?: { q: string; a: string }[] };

/**
 * Everything TRN-CRS-06 shows, read with the visitor's permissions (anon or signed-in). Cached per request.
 * `includeDraft` is for the trainer preview (TRR-CRS-06): RLS still limits drafts to the course staff.
 */
export const getCoursePage = cache(async (slug: string, includeDraft = false): Promise<CoursePageView | null> => {
  const supabase = await createClient();
  const query = supabase
    .from("courses")
    .select(
      "id, slug, title, summary, mode, level, cover_path, price, currency, status, starts_at, ends_at, city, venue, duration_hours, capacity, requires_provider_approval, rating_avg, rating_count, learners_count, updated_at, trainer_id, programs(categories(name)), program_versions(snapshot), organizations(id, name), trainer:profiles!courses_trainer_id_fkey(id, full_name, headline, avatar_path)",
    )
    .eq("slug", slug);
  const { data: c } = await (includeDraft ? query : query.neq("status", "draft")).maybeSingle();
  if (!c) return null;

  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub ?? null;

  const [outlineRes, sessionsRes, seatsRes, breakdownRes, reviewsRes, statsRes, vatRes, lessonsUpdatedRes, enrollmentRes, waitlistRes, favRes] = await Promise.all([
    supabase.rpc("course_outline", { p_course: c.id }),
    supabase.from("course_sessions").select("id, title, starts_at, ends_at, location, status").eq("course_id", c.id).neq("status", "cancelled").order("starts_at"),
    supabase.rpc("course_seats_left", { p_course: c.id }),
    supabase.rpc("course_rating_breakdown", { p_course: c.id }),
    supabase
      .from("course_ratings")
      .select("id, content_score, trainer_score, organization_score, comment, created_at, profiles!course_ratings_trainee_id_fkey(full_name)")
      .eq("course_id", c.id)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase.rpc("trainer_public_stats", { p_trainer: c.trainer_id }),
    supabase.from("app_settings").select("value").eq("key", "vat_rate_percent").maybeSingle(),
    supabase.from("lessons").select("created_at").eq("course_id", c.id).order("created_at", { ascending: false }).limit(1),
    uid
      ? supabase.from("enrollments").select("id, status").eq("course_id", c.id).eq("trainee_id", uid).not("status", "in", "(withdrawn,cancelled,access_revoked)").maybeSingle()
      : Promise.resolve({ data: null }),
    uid
      ? supabase.from("waitlist_entries").select("id").eq("course_id", c.id).eq("trainee_id", uid).in("status", ["waiting", "invited"]).maybeSingle()
      : Promise.resolve({ data: null }),
    uid ? supabase.from("favorites").select("course_id").eq("course_id", c.id).eq("user_id", uid).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const modules = new Map<string, OutlineModule>();
  let previewLessonId: string | null = null;
  for (const row of outlineRes.data ?? []) {
    if (!modules.has(row.module_id)) modules.set(row.module_id, { id: row.module_id, position: row.module_position, title: row.module_title, lessons: [] });
    if (row.lesson_id) {
      modules.get(row.module_id)!.lessons.push({
        id: row.lesson_id,
        title: row.lesson_title,
        kind: row.kind,
        durationSeconds: row.duration_seconds,
        isPreview: row.is_preview,
      });
      if (row.is_preview && !previewLessonId) previewLessonId = row.lesson_id;
    }
  }

  const snapshot = ((c.program_versions as { snapshot: Snapshot } | null)?.snapshot ?? {}) as Snapshot;
  const stats = statsRes.data?.[0];
  const lessonUpdated = lessonsUpdatedRes.data?.[0]?.created_at;
  const trainer = c.trainer as { id: string; full_name: string; headline: string | null; avatar_path: string | null } | null;

  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    mode: c.mode,
    level: c.level,
    category: (c.programs as { categories: { name: string } | null } | null)?.categories?.name ?? null,
    cover: coverUrl(c.cover_path),
    price: Number(c.price),
    currency: c.currency,
    vatRate: Number((vatRes.data?.value as number | undefined) ?? 15),
    status: c.status,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    city: c.city,
    venue: c.venue,
    durationHours: c.duration_hours === null ? null : Number(c.duration_hours),
    capacity: c.capacity,
    seatsLeft: typeof seatsRes.data === "number" ? seatsRes.data : null,
    requiresProviderApproval: c.requires_provider_approval,
    rating: Number(c.rating_avg),
    ratingCount: c.rating_count,
    learners: c.learners_count,
    updatedAt: lessonUpdated && lessonUpdated > c.updated_at ? lessonUpdated : c.updated_at,
    organization: (c.organizations as { id: string; name: string } | null) ?? null,
    trainer: {
      id: trainer?.id ?? c.trainer_id,
      name: trainer?.full_name ?? "مدرب",
      headline: trainer?.headline ?? null,
      avatarUrl: avatarUrl(trainer?.avatar_path),
      courses: stats?.courses ?? 0,
      learners: stats?.learners ?? 0,
      rating: Number(stats?.rating ?? 0),
      ratings: stats?.ratings ?? 0,
    },
    objectives: snapshot.objectives ?? [],
    audience: snapshot.audience ?? [],
    requirements: snapshot.requirements ?? [],
    faq: snapshot.faq ?? [],
    outline: [...modules.values()].sort((a, b) => a.position - b.position),
    sessions: (sessionsRes.data ?? []).map((s) => ({ id: s.id, title: s.title, startsAt: s.starts_at, endsAt: s.ends_at, location: s.location })),
    breakdown: (breakdownRes.data ?? []).map((b) => ({ stars: b.stars, count: b.count })),
    reviews: (reviewsRes.data ?? []).map((r) => ({
      id: r.id,
      name: (r.profiles as { full_name: string } | null)?.full_name || "متدرب",
      score: (r.content_score + r.trainer_score + (r.organization_score ?? r.trainer_score)) / 3,
      comment: r.comment ?? "",
      createdAt: r.created_at,
    })),
    previewLessonId,
    viewer: {
      signedIn: Boolean(uid),
      enrollmentId: enrollmentRes.data?.id ?? null,
      enrollmentStatus: (enrollmentRes.data?.status as EnrollmentStatus | undefined) ?? null,
      waitlisted: Boolean(waitlistRes.data),
      favorite: Boolean(favRes.data),
    },
  };
});
