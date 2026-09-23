import "server-only";
import { createClient } from "@/lib/supabase/server";
import { COURSE_CARD_SELECT, toCatalogCard, type CourseCardRow } from "@/lib/data/courses";
import type { CourseCardView } from "@/types/views";

/* TRN-FAV-01 · المفضلة read model. */

export type FavoriteAvailability = "available" | "full" | "unscheduled";
export type FavoriteItem = { card: CourseCardView; savedAt: string; availability: FavoriteAvailability; seatsLeft: number | null };

export async function getFavorites(userId: string): Promise<FavoriteItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select(`created_at, courses(${COURSE_CARD_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data as unknown as { created_at: string; courses: CourseCardRow | null }[]).filter((r) => r.courses);

  const seats = await Promise.all(
    rows.map(async (r) => {
      const c = r.courses!;
      if (c.mode === "recorded" || c.status !== "open") return null;
      const { data: left } = await supabase.rpc("course_seats_left", { p_course: c.id });
      return typeof left === "number" ? left : null;
    }),
  );

  const now = Date.now();
  return rows.map((r, i) => {
    const c = r.courses!;
    const seatsLeft = seats[i];
    const scheduled = c.mode === "recorded" || (!!c.starts_at && new Date(c.starts_at).getTime() > now);
    const availability: FavoriteAvailability =
      c.status !== "open" || !scheduled ? "unscheduled" : seatsLeft !== null && seatsLeft <= 0 ? "full" : "available";
    const status =
      availability === "full"
        ? { label: "مكتملة المقاعد", tone: "error" as const }
        : availability === "unscheduled"
          ? { label: "بلا دورة مجدولة", tone: "neutral" as const }
          : seatsLeft !== null && seatsLeft <= 5
            ? { label: "مقاعد محدودة", tone: "warning" as const }
            : null;
    return { card: toCatalogCard(c, { status }), savedAt: r.created_at, availability, seatsLeft };
  });
}

/** Saved course ids of the user — for FavoriteButton initial state on other screens. */
export async function getFavoriteCourseIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("course_id").eq("user_id", userId);
  return new Set((data ?? []).map((f) => f.course_id));
}
