import "server-only";
import { createClient } from "@/lib/supabase/server";
import { COURSE_CARD_SELECT, toCatalogCard, type CourseCardRow } from "@/lib/data/courses";
import { PAGE_SIZE, PRICE_RANGES, type DiscoverState } from "@/lib/discover-params";
import type { CourseCardView, CourseLevel, CourseMode } from "@/types/views";

export type FacetOption = { value: string; label: string; count: number };

export type DiscoverView = {
  cards: CourseCardView[];
  total: number;
  page: number;
  pageCount: number;
  categories: FacetOption[];
  modes: Record<CourseMode, number>;
  levels: Record<CourseLevel, number>;
  cities: FacetOption[];
  /** slug → name for the active-filter chips. */
  categoryNames: Record<string, string>;
  compare: { id: string; title: string }[];
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Loads card rows for the given ids and keeps the order of `ids`. */
export async function loadCards(supabase: Supabase, ids: string[]): Promise<CourseCardRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("courses").select(COURSE_CARD_SELECT).in("id", ids);
  if (error) throw new Error(`course cards: ${error.message}`);
  const byId = new Map((data as unknown as CourseCardRow[]).map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is CourseCardRow => !!r);
}

function rpcFilters(state: DiscoverState, categoryIds: string[] | null) {
  const range = state.price ? PRICE_RANGES[state.price] : null;
  return {
    p_q: state.q || undefined,
    p_categories: categoryIds ?? undefined,
    p_modes: state.mode.length ? state.mode : undefined,
    p_levels: state.level.length ? state.level : undefined,
    p_price_min: range?.min ?? undefined,
    p_price_max: range?.max ?? undefined,
    p_min_rating: state.rating ? Number(state.rating) : undefined,
    p_cities: state.city.length ? state.city : undefined,
  };
}

/** TRN-DSC-01 — one page of results, facet counts and the compare selection, all filtered server-side. */
export async function getDiscover(state: DiscoverState): Promise<DiscoverView> {
  const supabase = await createClient();
  const { data: cats, error: catError } = await supabase.from("categories").select("id, slug, name").order("position");
  if (catError) throw new Error(`categories: ${catError.message}`);
  const categories = cats ?? [];
  const selected = categories.filter((c) => state.cat.includes(c.slug)).map((c) => c.id);
  // Unknown category slugs must not silently widen the search to "all categories".
  const categoryIds = state.cat.length ? (selected.length ? selected : ["00000000-0000-0000-0000-000000000000"]) : null;
  const filters = rpcFilters(state, categoryIds);

  const [results, facets, compareRows] = await Promise.all([
    supabase.rpc("discover_courses", { ...filters, p_sort: state.sort, p_limit: PAGE_SIZE, p_offset: (state.page - 1) * PAGE_SIZE }),
    supabase.rpc("discover_facets", filters),
    state.compare.length
      ? supabase.from("courses").select("id, title").in("id", state.compare)
      : Promise.resolve({ data: [] as { id: string; title: string }[], error: null }),
  ]);
  if (results.error) throw new Error(`discover_courses: ${results.error.message}`);
  if (facets.error) throw new Error(`discover_facets: ${facets.error.message}`);

  const rows = results.data ?? [];
  const total = rows.length ? Number(rows[0].total) : 0;
  const cards = (await loadCards(supabase, rows.map((r) => r.course_id))).map((r) => toCatalogCard(r));

  const counts = { category: new Map<string, number>(), mode: new Map<string, number>(), level: new Map<string, number>(), city: new Map<string, number>() };
  for (const f of facets.data ?? []) counts[f.facet as keyof typeof counts]?.set(f.value, Number(f.hits));

  const compareById = new Map((compareRows.data ?? []).map((c) => [c.id, c.title]));

  return {
    cards,
    total,
    page: state.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    categories: categories
      .map((c) => ({ value: c.slug, label: c.name, count: counts.category.get(c.id) ?? 0 }))
      // Keep selected categories visible even when their count drops to zero.
      .filter((c) => c.count > 0 || state.cat.includes(c.value))
      .sort((a, b) => Number(state.cat.includes(b.value)) - Number(state.cat.includes(a.value)) || b.count - a.count),
    modes: {
      in_person: counts.mode.get("in_person") ?? 0,
      live_remote: counts.mode.get("live_remote") ?? 0,
      recorded: counts.mode.get("recorded") ?? 0,
    },
    levels: {
      beginner: counts.level.get("beginner") ?? 0,
      intermediate: counts.level.get("intermediate") ?? 0,
      advanced: counts.level.get("advanced") ?? 0,
    },
    cities: [...new Set([...counts.city.keys(), ...state.city])]
      .map((city) => ({ value: city, label: city, count: counts.city.get(city) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ar")),
    categoryNames: Object.fromEntries(categories.map((c) => [c.slug, c.name])),
    compare: state.compare.filter((id) => compareById.has(id)).map((id) => ({ id, title: compareById.get(id)! })),
  };
}

/** No-results state (104:1582) · "برامج قريبة من بحثك": top-rated open courses, preferring the selected categories. */
export async function getNearbyCourses(state: DiscoverState, limit = 3): Promise<CourseCardView[]> {
  const supabase = await createClient();
  const attempt = async (cat: string[]) => {
    const { data: cats } = cat.length ? await supabase.from("categories").select("id").in("slug", cat) : { data: null };
    const { data, error } = await supabase.rpc("discover_courses", {
      p_categories: cats?.length ? cats.map((c) => c.id) : undefined,
      p_sort: "recommended",
      p_limit: limit,
      p_offset: 0,
    });
    if (error) throw new Error(`discover_courses: ${error.message}`);
    return (data ?? []).map((r) => r.course_id);
  };
  let ids = state.cat.length ? await attempt(state.cat) : [];
  if (ids.length === 0) ids = await attempt([]);
  return (await loadCards(supabase, ids)).map((r) => toCatalogCard(r));
}

export type Suggestion = {
  kind: "program" | "trainer" | "category" | "trending";
  id: string;
  label: string;
  slug: string | null;
  hours: number | null;
  rating: number | null;
  hits: number | null;
};

/** Nav / Search Overlay (138:1867) typeahead. */
export async function getSuggestions(q: string): Promise<Suggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("discover_suggest", { p_q: q || undefined });
  if (error) throw new Error(`discover_suggest: ${error.message}`);
  return (data ?? []).map((s) => ({
    kind: s.kind as Suggestion["kind"],
    id: s.id,
    label: s.label,
    slug: s.slug,
    hours: s.hours === null ? null : Number(s.hours),
    rating: s.rating === null ? null : Number(s.rating),
    hits: s.hits === null ? null : Number(s.hits),
  }));
}
