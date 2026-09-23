import "server-only";
import { createClient } from "@/lib/supabase/server";
import { refundPolicy } from "@/lib/data/programs";
import type { CourseLevel, CourseMode } from "@/types/views";

/** TRN-CMP-01 · مقارنة البرامج — 2–3 courses side by side. */
export type CompareColumn = {
  id: string;
  slug: string;
  title: string;
  provider: string;
  programSlug: string;
  categoryId: string | null;
  categoryName: string | null;
  price: number;
  currency: string;
  hours: number | null;
  level: CourseLevel;
  rating: number;
  ratingCount: number;
  mode: CourseMode;
  seatsLeft: number | null;
  capacity: number | null;
  certificate: boolean;
  assignment: boolean;
  refund: string;
  best: boolean;
};

export async function getComparison(ids: string[], userId: string): Promise<CompareColumn[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const [coursesRes, factsRes, prefsRes] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id, slug, title, price, currency, duration_hours, level, mode, rating_avg, rating_count, capacity, status, organizations(name), trainer:profiles!courses_trainer_id_fkey(full_name), programs(slug, category_id, categories(name))",
      )
      .in("id", ids),
    supabase.rpc("course_public_facts", { p_courses: ids }),
    supabase.from("trainee_preferences").select("category_ids, level, modes").eq("user_id", userId).maybeSingle(),
  ]);
  if (coursesRes.error) throw new Error(`compare courses: ${coursesRes.error.message}`);
  if (factsRes.error) throw new Error(`course_public_facts: ${factsRes.error.message}`);

  const facts = new Map((factsRes.data ?? []).map((f) => [f.course_id, f]));
  const rows = (coursesRes.data ?? []) as unknown as {
    id: string;
    slug: string;
    title: string;
    price: number;
    currency: string;
    duration_hours: number | null;
    level: CourseLevel;
    mode: CourseMode;
    rating_avg: number;
    rating_count: number;
    capacity: number | null;
    status: string;
    organizations: { name: string } | null;
    trainer: { full_name: string } | null;
    programs: { slug: string; category_id: string | null; categories: { name: string } | null } | null;
  }[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const prefs = prefsRes.data;

  const columns: CompareColumn[] = ids
    .map((id) => byId.get(id))
    .filter((r): r is (typeof rows)[number] => !!r)
    .map((r) => {
      const f = facts.get(r.id);
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        provider: r.organizations?.name ?? r.trainer?.full_name ?? "مدرب مستقل",
        programSlug: r.programs?.slug ?? r.slug,
        categoryId: r.programs?.category_id ?? null,
        categoryName: r.programs?.categories?.name ?? null,
        price: Number(r.price),
        currency: r.currency,
        hours: r.duration_hours === null ? null : Number(r.duration_hours),
        level: r.level,
        rating: Number(r.rating_avg),
        ratingCount: r.rating_count,
        mode: r.mode,
        seatsLeft: f?.seats_left ?? null,
        capacity: r.capacity,
        // Every completed course issues a verifiable platform certificate (issue_certificate).
        certificate: true,
        assignment: (f?.assignments ?? 0) > 0,
        refund: refundPolicy(r.mode).short,
        best: false,
      };
    });

  // "الأنسب لمسارك": the single best match with the trainee's onboarding preferences (ties → no highlight).
  if (prefs && columns.length > 1) {
    const score = (c: CompareColumn) =>
      (c.categoryId && prefs.category_ids?.includes(c.categoryId) ? 4 : 0) + (prefs.level === c.level ? 2 : 0) + (prefs.modes?.includes(c.mode) ? 1 : 0);
    const scores = columns.map(score);
    const top = Math.max(...scores);
    if (top > 0 && scores.filter((s) => s === top).length === 1) columns[scores.indexOf(top)].best = true;
  }
  return columns;
}
