import "server-only";
import { coverUrl } from "@/lib/storage";
import type { CourseCardView, CoverCrop, CourseLevel, CourseMode } from "@/types/views";

/** Columns every course card needs (PostgREST embedded select). */
export const COURSE_CARD_SELECT =
  "id, slug, title, mode, level, cover_path, cover_crop, duration_hours, price, currency, rating_avg, rating_count, learners_count, starts_at, status, capacity, programs(categories(name)), trainer:profiles!courses_trainer_id_fkey(full_name), organizations(name)" as const;

export type CourseCardRow = {
  id: string;
  slug: string;
  title: string;
  mode: CourseMode;
  level: CourseLevel;
  cover_path: string | null;
  cover_crop: unknown;
  duration_hours: number | null;
  price: number;
  currency: string;
  rating_avg: number;
  rating_count: number;
  learners_count: number;
  starts_at: string | null;
  status: string;
  capacity: number | null;
  programs: { categories: { name: string } | null } | null;
  trainer: { full_name: string } | null;
  organizations: { name: string } | null;
};

function isCrop(v: unknown): v is CoverCrop {
  return !!v && typeof v === "object" && ["top", "left", "width", "height"].every((k) => typeof (v as Record<string, unknown>)[k] === "number");
}

export function courseBase(row: CourseCardRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.programs?.categories?.name ?? null,
    mode: row.mode,
    cover: { src: coverUrl(row.cover_path), crop: isCrop(row.cover_crop) ? row.cover_crop : null },
    source: row.organizations
      ? { kind: "provider" as const, name: row.organizations.name }
      : { kind: "independent" as const, name: row.trainer?.full_name ?? "مدرب مستقل" },
  };
}

/** Catalog card ("مقترحة لك", discovery results, favorites). */
export function toCatalogCard(row: CourseCardRow, opts?: { status?: CourseCardView["status"]; cta?: string }): CourseCardView {
  return {
    ...courseBase(row),
    variant: "catalog",
    status: opts?.status ?? null,
    href: `/courses/${row.slug}`,
    cta: opts?.cta ?? "اعرض التفاصيل",
    rating: Number(row.rating_avg),
    ratingCount: row.rating_count,
    durationHours: row.duration_hours === null ? null : Number(row.duration_hours),
    level: row.level,
    learners: row.learners_count,
    price: Number(row.price),
    currency: row.currency,
  };
}
