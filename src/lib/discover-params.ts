import type { CourseLevel, CourseMode } from "@/types/views";

/*
 * TRN-DSC-01 state lives entirely in the URL (shareable, back/forward friendly, read server-side):
 *   q · cat (category slugs) · mode · level · city · price · rating · sort · page · compare (course ids) · focus
 * This module is shared by Server Components (parsing) and Client Components (building hrefs).
 */
export const DISCOVER_PATH = "/trainee/discover";
export const PAGE_SIZE = 12;
export const COMPARE_MAX = 3;
export const COMPARE_MIN = 2;

export const SORTS = {
  rating: "الأعلى تقييمًا",
  recommended: "الأنسب لي",
  newest: "الأحدث",
  price_asc: "السعر: الأقل أولًا",
  price_desc: "السعر: الأعلى أولًا",
} as const;
export type SortKey = keyof typeof SORTS;

/** Figma filter copy (Nav / Filter Group · نمط الحضور). */
export const MODE_FILTER_LABELS: Record<CourseMode, string> = {
  in_person: "حضوري",
  live_remote: "عن بُعد",
  recorded: "مسجَّل",
};
export const LEVEL_FILTER_LABELS: Record<CourseLevel, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

export const PRICE_RANGES = {
  free: { label: "مجانية", min: null, max: 0 },
  lte200: { label: "حتى ٢٠٠ ر.س", min: null, max: 200 },
  "200-400": { label: "٢٠٠ – ٤٠٠ ر.س", min: 200, max: 400 },
  gt400: { label: "أكثر من ٤٠٠ ر.س", min: 400.01, max: null },
} as const;
export type PriceKey = keyof typeof PRICE_RANGES;

export const RATING_OPTIONS = {
  "4": "٤ نجوم فأكثر",
  "3": "٣ نجوم فأكثر",
} as const;
export type RatingKey = keyof typeof RATING_OPTIONS;

const MODES = Object.keys(MODE_FILTER_LABELS) as CourseMode[];
const LEVELS = Object.keys(LEVEL_FILTER_LABELS) as CourseLevel[];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,80}$/;

export type DiscoverState = {
  q: string;
  cat: string[];
  mode: CourseMode[];
  level: CourseLevel[];
  city: string[];
  price: PriceKey | null;
  rating: RatingKey | null;
  sort: SortKey;
  page: number;
  compare: string[];
  focus: boolean;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}
function list(v: string | string[] | undefined): string[] {
  const raw = Array.isArray(v) ? v.join(",") : (v ?? "");
  return Array.from(new Set(raw.split(",").map((s) => s.trim()).filter(Boolean)));
}

export function isUuid(v: string): boolean {
  return UUID.test(v);
}

/** Parses (and sanitises) the URL search params; unknown values are dropped rather than failing the page. */
export function parseDiscover(params: RawParams): DiscoverState {
  const sort = first(params.sort);
  const price = first(params.price);
  const rating = first(params.rating);
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 120),
    cat: list(params.cat).filter((s) => SLUG.test(s)).slice(0, 12),
    mode: list(params.mode).filter((m): m is CourseMode => (MODES as string[]).includes(m)),
    level: list(params.level).filter((l): l is CourseLevel => (LEVELS as string[]).includes(l)),
    city: list(params.city).map((c) => c.slice(0, 80)).slice(0, 12),
    price: price in PRICE_RANGES ? (price as PriceKey) : null,
    rating: rating in RATING_OPTIONS ? (rating as RatingKey) : null,
    sort: sort in SORTS ? (sort as SortKey) : "rating",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 500) : 1,
    compare: list(params.compare).filter(isUuid).slice(0, COMPARE_MAX),
    focus: first(params.focus) === "search",
  };
}

/** Number of active filters (the query counts as one) — used by the empty state copy. */
export function activeFilterCount(s: DiscoverState): number {
  return (s.q ? 1 : 0) + s.cat.length + s.mode.length + s.level.length + s.city.length + (s.price ? 1 : 0) + (s.rating ? 1 : 0);
}

export type DiscoverPatch = Partial<Omit<DiscoverState, "focus">> & { focus?: boolean };

/** Builds a discover URL from the current state and a patch. Filter changes reset the page unless `page` is patched. */
export function discoverHref(state: DiscoverState, patch: DiscoverPatch = {}): string {
  const filtersChanged = Object.keys(patch).some((k) => !["page", "compare", "focus", "sort"].includes(k));
  const next: DiscoverState = { ...state, focus: false, ...patch, page: patch.page ?? (filtersChanged || patch.sort ? 1 : state.page) };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.cat.length) sp.set("cat", next.cat.join(","));
  if (next.mode.length) sp.set("mode", next.mode.join(","));
  if (next.level.length) sp.set("level", next.level.join(","));
  if (next.city.length) sp.set("city", next.city.join(","));
  if (next.price) sp.set("price", next.price);
  if (next.rating) sp.set("rating", next.rating);
  if (next.sort !== "rating") sp.set("sort", next.sort);
  if (next.page > 1) sp.set("page", String(next.page));
  if (next.compare.length) sp.set("compare", next.compare.join(","));
  if (next.focus) sp.set("focus", "search");
  const qs = sp.toString();
  return qs ? `${DISCOVER_PATH}?${qs}` : DISCOVER_PATH;
}

export function toggleIn<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function compareHref(ids: string[]): string {
  return `/trainee/compare?ids=${ids.join(",")}`;
}
