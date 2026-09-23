import "server-only";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/storage";
import { COURSE_CARD_SELECT, toCatalogCard, type CourseCardRow } from "@/lib/data/courses";
import { RATING_WINDOW_MS } from "@/lib/data/certificates";
import type { CourseMode, CourseCardView } from "@/types/views";

/* Read models for TRN-RTG-01 (تقييم الدورة) and TRN-RTG-02 (تقييماتي). BR-R3: content + trainer axes, organization axis for provider courses. */

export type AwaitingRating = {
  enrollmentId: string;
  courseTitle: string;
  courseMode: CourseMode;
  sourceName: string;
  endedAt: string;
  deadline: string;
  daysLeft: number;
};

export type SentRating = {
  id: string;
  enrollmentId: string;
  courseTitle: string;
  sourceName: string;
  content: number;
  trainer: number;
  organization: number | null;
  average: number;
  comment: string | null;
  createdAt: string;
};

export type RatingsOverview = { awaiting: AwaitingRating[]; sent: SentRating[]; averageGiven: number | null };

const MODE_LABELS: Record<CourseMode, string> = { in_person: "حضورية", live_remote: "عن بُعد مباشرة", recorded: "مسجَّلة" };
export const modeLabel = (m: CourseMode) => MODE_LABELS[m];

function averageOf(r: { content_score: number; trainer_score: number; organization_score: number | null }) {
  const parts = [r.content_score, r.trainer_score, ...(r.organization_score ? [r.organization_score] : [])];
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10;
}

type CourseLite = { title: string; mode: CourseMode; ends_at: string | null; organizations: { name: string } | null; trainer: { full_name: string } | null };
const COURSE_LITE = "title, mode, ends_at, organizations(name), trainer:profiles!courses_trainer_id_fkey(full_name)" as const;

export async function getRatingsOverview(userId: string): Promise<RatingsOverview> {
  const supabase = await createClient();
  const [enrollRes, ratingsRes] = await Promise.all([
    supabase.from("enrollments").select(`id, status, completed_at, courses(${COURSE_LITE})`).eq("trainee_id", userId).eq("status", "completed").order("completed_at", { ascending: false }),
    supabase
      .from("course_ratings")
      .select(`id, enrollment_id, content_score, trainer_score, organization_score, comment, created_at, courses(${COURSE_LITE})`)
      .eq("trainee_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  if (enrollRes.error) throw new Error(enrollRes.error.message);
  if (ratingsRes.error) throw new Error(ratingsRes.error.message);

  const ratings = ratingsRes.data as unknown as {
    id: string;
    enrollment_id: string;
    content_score: number;
    trainer_score: number;
    organization_score: number | null;
    comment: string | null;
    created_at: string;
    courses: CourseLite | null;
  }[];
  const rated = new Set(ratings.map((r) => r.enrollment_id));
  const now = Date.now();

  const awaiting = (enrollRes.data as unknown as { id: string; completed_at: string | null; courses: CourseLite | null }[])
    .filter((e) => e.courses && !rated.has(e.id))
    .map((e) => {
      const endedAt = e.completed_at ?? e.courses!.ends_at ?? new Date().toISOString();
      const deadline = new Date(new Date(endedAt).getTime() + RATING_WINDOW_MS);
      return {
        enrollmentId: e.id,
        courseTitle: e.courses!.title,
        courseMode: e.courses!.mode,
        sourceName: e.courses!.organizations?.name ?? e.courses!.trainer?.full_name ?? "",
        endedAt,
        deadline: deadline.toISOString(),
        daysLeft: Math.ceil((deadline.getTime() - now) / 86_400_000),
      };
    })
    .filter((a) => a.daysLeft > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const sent: SentRating[] = ratings.map((r) => ({
    id: r.id,
    enrollmentId: r.enrollment_id,
    courseTitle: r.courses?.title ?? "",
    sourceName: r.courses?.organizations?.name ?? r.courses?.trainer?.full_name ?? "",
    content: r.content_score,
    trainer: r.trainer_score,
    organization: r.organization_score,
    average: averageOf(r),
    comment: r.comment,
    createdAt: r.created_at,
  }));
  const averageGiven = sent.length ? Math.round((sent.reduce((a, s) => a + s.average, 0) / sent.length) * 10) / 10 : null;
  return { awaiting, sent, averageGiven };
}

export type RatingContext = {
  enrollmentId: string;
  status: string;
  courseId: string;
  courseTitle: string;
  categoryId: string | null;
  isProvider: boolean;
  organizationName: string | null;
  trainerName: string;
  trainerHeadline: string | null;
  trainerAvatar: string | null;
  certificateId: string | null;
  completed: boolean;
  eligible: boolean;
  windowClosed: boolean;
  existing: SentRating | null;
};

/** TRN-RTG-01 context. Returns null when the enrollment is not the trainee's. */
export async function getRatingContext(userId: string, enrollmentId: string): Promise<RatingContext | null> {
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("enrollments")
    .select(
      "id, status, completed_at, course_id, courses(title, organization_id, ends_at, programs(category_id), organizations(name), trainer:profiles!courses_trainer_id_fkey(full_name, headline, avatar_path))",
    )
    .eq("id", enrollmentId)
    .eq("trainee_id", userId)
    .maybeSingle();
  if (!e || !e.courses) return null;
  const course = e.courses as unknown as {
    title: string;
    organization_id: string | null;
    ends_at: string | null;
    programs: { category_id: string | null } | null;
    organizations: { name: string } | null;
    trainer: { full_name: string; headline: string | null; avatar_path: string | null } | null;
  };
  const [ratingRes, certRes] = await Promise.all([
    supabase.from("course_ratings").select("id, enrollment_id, content_score, trainer_score, organization_score, comment, created_at").eq("enrollment_id", e.id).maybeSingle(),
    supabase.from("certificates").select("id, status").eq("enrollment_id", e.id).maybeSingle(),
  ]);
  const r = ratingRes.data;
  const endedAt = e.completed_at ?? null;
  const windowClosed = !!endedAt && Date.now() - new Date(endedAt).getTime() > RATING_WINDOW_MS;
  return {
    enrollmentId: e.id,
    status: e.status,
    courseId: e.course_id,
    courseTitle: course.title,
    categoryId: course.programs?.category_id ?? null,
    isProvider: !!course.organization_id,
    organizationName: course.organizations?.name ?? null,
    trainerName: course.trainer?.full_name ?? "",
    trainerHeadline: course.trainer?.headline ?? null,
    trainerAvatar: avatarUrl(course.trainer?.avatar_path),
    certificateId: certRes.data?.status === "issued" ? certRes.data.id : null,
    completed: e.status === "completed",
    eligible: ["in_progress", "completed"].includes(e.status) && !windowClosed,
    windowClosed,
    existing: r
      ? {
          id: r.id,
          enrollmentId: r.enrollment_id,
          courseTitle: course.title,
          sourceName: course.organizations?.name ?? course.trainer?.full_name ?? "",
          content: r.content_score,
          trainer: r.trainer_score,
          organization: r.organization_score,
          average: averageOf(r),
          comment: r.comment,
          createdAt: r.created_at,
        }
      : null,
  };
}

/** «أكمل مسارك» — open courses in the same category the trainee is not enrolled in. */
export async function getNextCourses(userId: string, categoryId: string | null, excludeCourseId: string): Promise<CourseCardView[]> {
  const supabase = await createClient();
  const [{ data: mine }, { data: catalog }] = await Promise.all([
    supabase.from("enrollments").select("course_id").eq("trainee_id", userId),
    supabase
      .from("courses")
      .select(COURSE_CARD_SELECT.replace("programs(categories(name))", "programs(category_id, categories(name))"))
      .eq("status", "open")
      .neq("id", excludeCourseId)
      .limit(24),
  ]);
  const enrolled = new Set((mine ?? []).map((m) => m.course_id));
  const rows = ((catalog ?? []) as unknown as (CourseCardRow & { programs: { category_id: string | null; categories: { name: string } | null } | null })[]).filter(
    (c) => !enrolled.has(c.id),
  );
  rows.sort((a, b) => Number((b.programs?.category_id ?? null) === categoryId) - Number((a.programs?.category_id ?? null) === categoryId));
  return rows.slice(0, 3).map((c) => toCatalogCard(c, { status: c.programs?.category_id === categoryId ? { label: "مقترح لك", tone: "info" } : null }));
}
