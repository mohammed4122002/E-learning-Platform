import "server-only";
import { createClient } from "@/lib/supabase/server";
import { refCode } from "@/lib/trainings";
import type { CourseMode } from "@/types/views";

export { getWaitlistEntries, type WaitlistEntryView } from "@/lib/data/trainings";

export type WaitlistInviteView = {
  id: string;
  ref: string;
  status: "invited" | "expired" | "waiting" | "accepted" | "left";
  invitedAt: string | null;
  expiresAt: string | null;
  joinedAt: string;
  position: number | null;
  total: number | null;
  course: {
    id: string;
    slug: string;
    ref: string;
    title: string;
    mode: CourseMode;
    startsAt: string | null;
    endsAt: string | null;
    city: string | null;
    venue: string | null;
    trainer: string;
    price: number;
    currency: string;
    capacity: number | null;
    seatsLeft: number | null;
    firstSession: { startsAt: string; endsAt: string } | null;
  };
};

/** TRN-WTL-02 · one waitlist entry of the signed-in trainee (null when missing or foreign). */
export async function getWaitlistEntry(userId: string, id: string): Promise<WaitlistInviteView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: w, error } = await supabase
    .from("waitlist_entries")
    .select(
      "id, status, created_at, invited_at, invite_expires_at, course_id, courses(id, slug, title, mode, starts_at, ends_at, city, venue, price, currency, capacity, created_at, trainer:profiles!courses_trainer_id_fkey(full_name))",
    )
    .eq("id", id)
    .eq("trainee_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!w || !w.courses) return null;
  const c = w.courses as unknown as {
    id: string; slug: string; title: string; mode: CourseMode; starts_at: string | null; ends_at: string | null; city: string | null; venue: string | null;
    price: number; currency: string; capacity: number | null; created_at: string; trainer: { full_name: string } | null;
  };
  const [seats, sessions, positions] = await Promise.all([
    supabase.rpc("course_seats_left", { p_course: c.id }),
    supabase.from("course_sessions").select("starts_at, ends_at").eq("course_id", c.id).neq("status", "cancelled").order("starts_at").limit(1),
    w.status === "waiting" ? supabase.rpc("my_waitlist_positions") : Promise.resolve({ data: [] as { entry_id: string; queue_position: number; total: number }[] }),
  ]);
  const lapsed = w.status === "invited" && w.invite_expires_at && new Date(w.invite_expires_at).getTime() <= Date.now();
  const pos = (positions.data ?? []).find((p) => p.entry_id === w.id);
  return {
    id: w.id,
    ref: refCode("WTL", w.id, w.created_at),
    status: lapsed ? "expired" : w.status,
    invitedAt: w.invited_at,
    expiresAt: w.invite_expires_at,
    joinedAt: w.created_at,
    position: pos?.queue_position ?? null,
    total: pos?.total ?? null,
    course: {
      id: c.id,
      slug: c.slug,
      ref: refCode("REF", c.id, c.created_at).replace("REF", "CRS"),
      title: c.title,
      mode: c.mode,
      startsAt: c.starts_at,
      endsAt: c.ends_at,
      city: c.city,
      venue: c.venue,
      trainer: c.trainer?.full_name ?? "",
      price: Number(c.price),
      currency: c.currency,
      capacity: c.capacity,
      seatsLeft: typeof seats.data === "number" ? seats.data : null,
      firstSession: sessions.data?.[0] ? { startsAt: sessions.data[0].starts_at, endsAt: sessions.data[0].ends_at } : null,
    },
  };
}
