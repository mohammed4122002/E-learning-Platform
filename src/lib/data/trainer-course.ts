import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/*
 * Shared read model of a course seen by its trainer (TRR-CRS-*): the course row, its program/provider and
 * the people around it. Every trainer-ops page starts with getManagedCourse(), which 404s unless the signed-in
 * user manages the course (manages_course(): trainer of the course or member of its provider organization).
 */

export type CourseStatus = Database["public"]["Enums"]["course_status"];
export type CourseMode = Database["public"]["Enums"]["course_mode"];
export type EnrollmentStatus = Database["public"]["Enums"]["enrollment_status"];

export type ManagedCourse = {
  id: string;
  slug: string;
  title: string;
  mode: CourseMode;
  status: CourseStatus;
  capacity: number | null;
  minCapacity: number | null;
  startsAt: string | null;
  endsAt: string | null;
  city: string | null;
  venue: string | null;
  price: number;
  currency: string;
  durationHours: number | null;
  organizationId: string | null;
  organizationName: string | null;
  programId: string;
  programTitle: string;
  programVersion: number | null;
  trainerId: string;
  trainerName: string;
};

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export const getManagedCourse = cache(async (courseId: string): Promise<ManagedCourse> => {
  if (!isUuid(courseId)) notFound();
  const supabase = await createClient();
  const [{ data: c }, { data: manages }] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id, slug, title, mode, status, capacity, min_capacity, starts_at, ends_at, city, venue, price, currency, duration_hours, organization_id, program_id, trainer_id, organizations(name), programs(title), program_versions(version), profiles!courses_trainer_id_fkey(full_name)",
      )
      .eq("id", courseId)
      .maybeSingle(),
    supabase.rpc("manages_course", { c: courseId }),
  ]);
  if (!c || !manages) notFound();
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    mode: c.mode,
    status: c.status,
    capacity: c.capacity,
    minCapacity: c.min_capacity,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    city: c.city,
    venue: c.venue,
    price: Number(c.price),
    currency: c.currency,
    durationHours: c.duration_hours === null ? null : Number(c.duration_hours),
    organizationId: c.organization_id,
    organizationName: c.organizations?.name ?? null,
    programId: c.program_id,
    programTitle: c.programs?.title ?? c.title,
    programVersion: c.program_versions?.version ?? null,
    trainerId: c.trainer_id,
    trainerName: c.profiles?.full_name ?? "",
  };
});

export type Person = { id: string; name: string; avatarPath: string | null };

/** Names of enrollees / waitlist / raters (profiles are private; course_people() exposes names to the staff only). */
export const getCoursePeople = cache(async (courseId: string): Promise<Map<string, Person>> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("course_people", { p_course: courseId });
  return new Map((data ?? []).map((p) => [p.person_id, { id: p.person_id, name: p.full_name, avatarPath: p.avatar_path }]));
});

export const ACTIVE_ENROLLMENT: EnrollmentStatus[] = ["confirmed", "in_progress", "completed"];

export type SessionRow = {
  id: string;
  position: number;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  location: string | null;
  meetingUrl: string | null;
};

export const getCourseSessions = cache(async (courseId: string): Promise<SessionRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_sessions")
    .select("id, position, title, starts_at, ends_at, status, location, meeting_url")
    .eq("course_id", courseId)
    .order("position");
  return (data ?? []).map((s) => ({
    id: s.id,
    position: s.position,
    title: s.title,
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    status: s.status,
    location: s.location,
    meetingUrl: s.meeting_url,
  }));
});

/** Short course label used in breadcrumbs («دورة مارس»). */
export function runLabel(c: Pick<ManagedCourse, "startsAt" | "title" | "mode">): string {
  if (c.mode === "recorded" || !c.startsAt) return c.title;
  const month = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { month: "long", timeZone: "Asia/Riyadh" }).format(new Date(c.startsAt));
  return `دورة ${month}`;
}

/** «أساسيات إدارة المشاريع · دورة مارس» */
export function courseLabel(c: ManagedCourse): string {
  const run = runLabel(c);
  return c.title.includes(run) || run === c.title ? c.title : `${c.programTitle} · ${run}`;
}
