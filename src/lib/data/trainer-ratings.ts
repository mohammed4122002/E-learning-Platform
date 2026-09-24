import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoursePeople, isUuid, type ManagedCourse } from "@/lib/data/trainer-course";

/*
 * TRR-RTG-01 التقييمات (280:6049 · empty 313:10890), the course tab ٩ التقييمات (438:20952),
 * TRR-RTG-02 الرد (291:8261) and TRR-RTG-03 طلب مراجعة (291:8562).
 * A rating has three axes; «التنظيم» only exists for provider courses (organization_score) and goes to the provider.
 */

export type ReplyState = { status: "draft" | "published" | "skipped"; body: string | null; publishedAt: string | null };

export type RatingItem = {
  id: string;
  courseId: string;
  courseTitle: string;
  courseStartsAt: string | null;
  traineeId: string;
  name: string;
  content: number;
  trainer: number;
  organization: number | null;
  score: number;
  comment: string | null;
  createdAt: string;
  reply: ReplyState | null;
  review: { id: string; status: string; reason: string; createdAt: string } | null;
};

export const ratingScore = (r: { content_score: number; trainer_score: number; organization_score: number | null }) =>
  r.organization_score === null ? (r.content_score + r.trainer_score) / 2 : (r.content_score + r.trainer_score + r.organization_score) / 3;

export const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, x) => a + x, 0) / xs.length) * 10) / 10 : 0);

const SELECT = "id, course_id, trainee_id, content_score, trainer_score, organization_score, comment, created_at, courses!inner(id, title, starts_at, trainer_id)" as const;

async function hydrate(rows: { id: string; course_id: string; trainee_id: string; content_score: number; trainer_score: number; organization_score: number | null; comment: string | null; created_at: string; courses: { id: string; title: string; starts_at: string | null } }[]): Promise<RatingItem[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const ids = rows.map((r) => r.id);
  const courseIds = [...new Set(rows.map((r) => r.course_id))];
  const [replies, reviews, ...people] = await Promise.all([
    supabase.from("rating_replies").select("rating_id, status, body, published_at").in("rating_id", ids),
    supabase.from("rating_review_requests").select("id, rating_id, status, reason, created_at").in("rating_id", ids).order("created_at", { ascending: false }),
    ...courseIds.map((c) => getCoursePeople(c)),
  ]);
  const names = new Map<string, string>();
  people.forEach((m) => m.forEach((p) => names.set(p.id, p.name)));
  const rep = new Map((replies.data ?? []).map((r) => [r.rating_id, { status: r.status as ReplyState["status"], body: r.body, publishedAt: r.published_at }]));
  const rev = new Map<string, RatingItem["review"]>();
  (reviews.data ?? []).forEach((r) => {
    if (!rev.has(r.rating_id)) rev.set(r.rating_id, { id: r.id, status: r.status, reason: r.reason, createdAt: r.created_at });
  });
  return rows.map((r) => ({
    id: r.id,
    courseId: r.course_id,
    courseTitle: r.courses.title,
    courseStartsAt: r.courses.starts_at,
    traineeId: r.trainee_id,
    name: names.get(r.trainee_id) ?? "متدرب",
    content: r.content_score,
    trainer: r.trainer_score,
    organization: r.organization_score,
    score: ratingScore(r),
    comment: r.comment,
    createdAt: r.created_at,
    reply: rep.get(r.id) ?? null,
    review: rev.get(r.id) ?? null,
  }));
}

/** Every rating on the courses this trainer teaches, newest first. */
export const getTrainerRatings = cache(async (trainerId: string): Promise<RatingItem[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("course_ratings").select(SELECT).eq("courses.trainer_id", trainerId).order("created_at", { ascending: false });
  return hydrate((data ?? []) as never);
});

export async function getCourseRatings(course: ManagedCourse) {
  const supabase = await createClient();
  const [ratingsRes, enrRes, lastReq] = await Promise.all([
    supabase.from("course_ratings").select(SELECT).eq("course_id", course.id).order("created_at", { ascending: false }),
    supabase.from("enrollments").select("id, status").eq("course_id", course.id).in("status", ["in_progress", "completed"]),
    supabase.from("course_operations").select("created_at").eq("course_id", course.id).eq("kind", "rating_request").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const items = await hydrate((ratingsRes.data ?? []) as never);
  const eligible = enrRes.data?.length ?? 0;
  const all = course.trainerId ? await getTrainerRatings(course.trainerId) : items;
  const others = all.filter((r) => r.courseId !== course.id);
  return {
    items,
    eligible,
    remaining: Math.max(0, eligible - items.length),
    lastRequestAt: lastReq.data?.created_at ?? null,
    overall: avg(all.map((r) => r.score)),
    before: others.length ? Math.round(avg2(others.map((r) => r.score)) * 100) / 100 : null,
  };
}

const avg2 = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : 0);

/** One rating the caller manages (reply / review pages); 404 otherwise. */
export async function getManagedRating(ratingId: string): Promise<RatingItem & { courseMode: string; courseOrganizationName: string | null }> {
  if (!isUuid(ratingId)) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_ratings")
    .select("id, course_id, trainee_id, content_score, trainer_score, organization_score, comment, created_at, courses!inner(id, title, starts_at, trainer_id, mode, organizations(name))")
    .eq("id", ratingId)
    .maybeSingle();
  if (!data) notFound();
  const { data: manages } = await supabase.rpc("manages_course", { c: data.course_id });
  if (!manages) notFound();
  const [item] = await hydrate([data] as never);
  const c = data.courses as unknown as { mode: string; organizations: { name: string } | null };
  return { ...item, courseMode: c.mode, courseOrganizationName: c.organizations?.name ?? null };
}
