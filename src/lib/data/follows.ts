import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FollowTarget } from "@/lib/actions/follows";

/* TRN-FLW-01 · المتابعات read model: followed categories, training organisations and trainers with catalogue stats. */

export type FollowItem = {
  followId: string;
  target: FollowTarget;
  targetId: string;
  name: string;
  programs: number;
  newThisMonth: number;
  rating: number | null;
};

export type FollowsOverview = { categories: FollowItem[]; organizations: FollowItem[]; trainers: FollowItem[]; unfollowedCategories: number };

type CourseStat = { id: string; trainer_id: string; organization_id: string | null; created_at: string; rating_avg: number; rating_count: number; programs: { category_id: string | null } | null };

const MONTH = 30 * 24 * 60 * 60 * 1000;

function stats(courses: CourseStat[]) {
  const now = Date.now();
  const rated = courses.filter((c) => c.rating_count > 0);
  const totalRatings = rated.reduce((s, c) => s + c.rating_count, 0);
  return {
    programs: courses.length,
    newThisMonth: courses.filter((c) => now - new Date(c.created_at).getTime() <= MONTH).length,
    rating: totalRatings ? Math.round((rated.reduce((s, c) => s + Number(c.rating_avg) * c.rating_count, 0) / totalRatings) * 10) / 10 : null,
  };
}

export async function getFollows(userId: string): Promise<FollowsOverview> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follows")
    .select("id, trainer_id, organization_id, category_id, created_at, trainer:profiles!follows_trainer_id_fkey(full_name), organizations(name), categories(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = data as unknown as {
    id: string;
    trainer_id: string | null;
    organization_id: string | null;
    category_id: string | null;
    trainer: { full_name: string } | null;
    organizations: { name: string } | null;
    categories: { name: string } | null;
  }[];

  const trainerIds = rows.flatMap((r) => (r.trainer_id ? [r.trainer_id] : []));
  const orgIds = rows.flatMap((r) => (r.organization_id ? [r.organization_id] : []));
  const catIds = rows.flatMap((r) => (r.category_id ? [r.category_id] : []));

  const COURSE_STAT = "id, trainer_id, organization_id, created_at, rating_avg, rating_count, programs(category_id)" as const;
  const [byTrainer, byOrg, byCat, catCount] = await Promise.all([
    trainerIds.length ? supabase.from("courses").select(COURSE_STAT).neq("status", "draft").in("trainer_id", trainerIds) : Promise.resolve({ data: [] }),
    orgIds.length ? supabase.from("courses").select(COURSE_STAT).neq("status", "draft").in("organization_id", orgIds) : Promise.resolve({ data: [] }),
    catIds.length ? supabase.from("courses").select(`${COURSE_STAT.replace("programs(category_id)", "programs!inner(category_id)")}`).neq("status", "draft").in("programs.category_id", catIds) : Promise.resolve({ data: [] }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
  ]);
  const tc = (byTrainer.data ?? []) as unknown as CourseStat[];
  const oc = (byOrg.data ?? []) as unknown as CourseStat[];
  const cc = (byCat.data ?? []) as unknown as CourseStat[];

  const categories: FollowItem[] = [];
  const organizations: FollowItem[] = [];
  const trainers: FollowItem[] = [];
  for (const r of rows) {
    if (r.category_id) {
      categories.push({ followId: r.id, target: "category", targetId: r.category_id, name: r.categories?.name ?? "", ...stats(cc.filter((c) => c.programs?.category_id === r.category_id)) });
    } else if (r.organization_id) {
      organizations.push({ followId: r.id, target: "organization", targetId: r.organization_id, name: r.organizations?.name ?? "", ...stats(oc.filter((c) => c.organization_id === r.organization_id)) });
    } else if (r.trainer_id) {
      trainers.push({ followId: r.id, target: "trainer", targetId: r.trainer_id, name: r.trainer?.full_name ?? "", ...stats(tc.filter((c) => c.trainer_id === r.trainer_id)) });
    }
  }
  return { categories, organizations, trainers, unfollowedCategories: Math.max(0, (catCount.count ?? 0) - categories.length) };
}

/** Is the user following this target? (initial state for FollowButton on other screens) */
export async function isFollowing(userId: string, target: FollowTarget, targetId: string): Promise<boolean> {
  const supabase = await createClient();
  const column = target === "trainer" ? "trainer_id" : target === "organization" ? "organization_id" : "category_id";
  const { data } = await supabase.from("follows").select("id").eq("user_id", userId).eq(column, targetId).maybeSingle();
  return !!data;
}
