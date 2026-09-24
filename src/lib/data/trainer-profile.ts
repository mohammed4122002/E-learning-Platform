import "server-only";
import { createClient } from "@/lib/supabase/server";
import { COURSE_CARD_SELECT, toCatalogCard, type CourseCardRow } from "@/lib/data/courses";
import { getTrainerOverview, type TrainerOverview } from "@/lib/data/trainer";
import type { SentRating } from "@/lib/data/ratings";
import type { CourseCardView } from "@/types/views";

/* TRR-PRF-01/02/03 read models. */

export type VisibilityKey = "profile" | "credentials" | "experience" | "availability" | "trainees";
export type VisibilityLevel = "public" | "orgs" | "private";
export const VISIBILITY_DEFAULTS: Record<VisibilityKey, VisibilityLevel> = {
  profile: "public",
  credentials: "public",
  experience: "public",
  availability: "orgs",
  trainees: "orgs",
};

export function visibilityOf(o: TrainerOverview): Record<VisibilityKey, VisibilityLevel> {
  const v = (o.profile?.visibility ?? {}) as Partial<Record<VisibilityKey, VisibilityLevel>>;
  return { ...VISIBILITY_DEFAULTS, ...v };
}

export function isProfileEmpty(o: TrainerOverview) {
  return !o.account.bio?.trim() && !o.account.avatarPath && o.qualifications.length === 0 && o.experiences.length === 0;
}

export type PortfolioItem = {
  id: string;
  kind: "delivered" | "material" | "program";
  title: string;
  organization: string | null;
  happenedOn: string | null;
  durationDays: number | null;
  traineesCount: number | null;
  coursesCount: number | null;
  pageCount: number | null;
  fileFormat: string | null;
  imagePaths: string[];
  createdAt: string;
};

export async function getPortfolio(userId: string): Promise<PortfolioItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trainer_portfolio_items").select("*").eq("trainer_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    kind: r.kind as PortfolioItem["kind"],
    title: r.title,
    organization: r.organization,
    happenedOn: r.happened_on,
    durationDays: r.duration_days,
    traineesCount: r.trainees_count,
    coursesCount: r.courses_count,
    pageCount: r.page_count,
    fileFormat: r.file_format,
    imagePaths: r.image_paths,
    createdAt: r.created_at,
  }));
}

export type BusyDay = { day: string; busy: boolean };
export type Organization = { id: string; name: string; since: string };

export type PublicProfileData = {
  o: TrainerOverview;
  visibility: Record<VisibilityKey, VisibilityLevel>;
  courses: CourseCardView[];
  publishedPrograms: number;
  totalTrainees: number;
  reviews: { rating: SentRating; authorName: string }[];
  days: BusyDay[];
  portfolio: PortfolioItem[];
};

/** Everything TRR-PRF-01 (289:7405) shows, as organizations would see it. */
export async function getPublicProfile(userId: string): Promise<PublicProfileData> {
  const supabase = await createClient();
  const o = await getTrainerOverview(userId);
  const hidden = new Set(o.profile?.hidden_program_ids ?? []);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
  const courseIds = o.courses.map((c) => c.id);
  const none = ["00000000-0000-0000-0000-000000000000"];
  const [cards, ratings, days, portfolio] = await Promise.all([
    supabase.from("courses").select(`${COURSE_CARD_SELECT}, program_id`).eq("trainer_id", userId).neq("status", "draft").order("starts_at", { ascending: false, nullsFirst: false }).limit(12),
    supabase
      .from("course_ratings")
      .select("id, enrollment_id, content_score, trainer_score, organization_score, comment, created_at, courses(title), trainee:profiles!course_ratings_trainee_id_fkey(full_name)")
      .in("course_id", courseIds.length ? courseIds : none)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase.rpc("trainer_busy_days", { p_trainer: userId, p_from: today, p_days: 31 }),
    getPortfolio(userId),
  ]);
  if (cards.error) throw new Error(cards.error.message);
  if (days.error) throw new Error(days.error.message);

  const rows = (cards.data ?? []) as unknown as (CourseCardRow & { program_id: string })[];
  const reviews = (ratings.data ?? []).map((r) => {
    const avg = (r.content_score + r.trainer_score + (r.organization_score ?? r.trainer_score)) / 3;
    const trainee = r.trainee as { full_name: string } | null;
    return {
      authorName: trainee?.full_name || "متدرب",
      rating: {
        id: r.id,
        enrollmentId: r.enrollment_id,
        courseTitle: (r.courses as { title: string } | null)?.title ?? "",
        sourceName: "",
        content: r.content_score,
        trainer: r.trainer_score,
        organization: r.organization_score,
        average: Math.round(avg * 10) / 10,
        comment: r.comment,
        createdAt: r.created_at,
      } satisfies SentRating,
    };
  });

  return {
    o,
    visibility: visibilityOf(o),
    courses: rows.filter((r) => !hidden.has(r.program_id)).slice(0, 3).map((r) => toCatalogCard(r)),
    publishedPrograms: o.programs.filter((p) => p.status === "published" && !hidden.has(p.id)).length,
    totalTrainees: o.courses.reduce((s, c) => s + c.learners, 0),
    reviews,
    days: ((days.data ?? []) as { day: string; busy: boolean }[]).map((d) => ({ day: d.day, busy: d.busy })),
    portfolio,
  };
}

/** Organizations the trainer belongs to (الجهات المرتبطة). */
export async function getTrainerOrganizations(userId: string): Promise<Organization[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("organization_members").select("created_at, organizations(id, name)").eq("user_id", userId);
  if (error) return [];
  return (data ?? [])
    .map((m) => ({ org: m.organizations as { id: string; name: string } | null, since: m.created_at }))
    .filter((m): m is { org: { id: string; name: string }; since: string } => Boolean(m.org))
    .map((m) => ({ id: m.org.id, name: m.org.name, since: m.since }));
}
