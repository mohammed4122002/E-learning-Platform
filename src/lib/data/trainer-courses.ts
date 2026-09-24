import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { coverUrl } from "@/lib/storage";
import { daysUntil, riyadhParts, type CourseStatus } from "@/lib/trainer-courses";
import type { CourseLevel, CourseMode } from "@/types/views";

/* Read models for TRR-CRS-01 (دوراتي) and the shared course header (TRR-CRS-05). Everything runs as the
   signed-in trainer — RLS limits rows to courses they manage. */

export type ListState = "running" | "upcoming" | "full" | "ended" | "cancelled";

export type SessionLite = { id: string; position: number; title: string; startsAt: string; endsAt: string; status: string; moduleId: string | null; location: string | null };

export type TrainerCourseItem = {
  id: string;
  slug: string;
  title: string;
  programTitle: string;
  mode: CourseMode;
  status: CourseStatus;
  state: ListState;
  isDraft: boolean;
  venue: string | null;
  city: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  capacity: number | null;
  seatsTaken: number;
  buyers: number;
  waitlist: number;
  publishedLessons: number;
  sessions: SessionLite[];
  nextSession: SessionLite | null;
  todaySession: SessionLite | null;
  /** Last ended session that nobody's attendance was recorded for (trainees are registered). */
  missedAttendance: SessionLite | null;
  meetingReady: boolean;
  blockers: string[];
};

export type TrainerCoursesList = {
  items: TrainerCourseItem[];
  stats: { running: number; upcoming: number; activeTrainees: number; occupancy: number };
  availability: { busyDays: number; daysInMonth: number; nextFreeDay: string | null };
  liveReady: TrainerCourseItem | null;
  firstProgram: { id: string; title: string } | null;
};

const ACTIVE = ["confirmed", "in_progress", "completed", "pending_provider"];

function stateOf(c: { status: CourseStatus; mode: CourseMode; startsAt: string | null; endsAt: string | null; capacity: number | null; seatsTaken: number }, now: Date): ListState {
  if (c.status === "cancelled") return "cancelled";
  if (c.status === "completed" || (c.mode !== "recorded" && c.endsAt && new Date(c.endsAt) < now)) return "ended";
  if (c.status === "in_progress" || (c.status === "open" && c.startsAt && new Date(c.startsAt) <= now)) return "running";
  if (c.mode !== "recorded" && c.capacity && c.seatsTaken >= c.capacity && c.status !== "draft") return "full";
  return "upcoming";
}

export const listTrainerCourses = cache(async (userId: string): Promise<TrainerCoursesList> => {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("courses")
    .select("id, slug, title, mode, status, venue, city, starts_at, ends_at, created_at, capacity, programs(title)")
    .eq("trainer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("trainer_courses_unavailable");
  const courses = rows ?? [];
  const ids = courses.map((c) => c.id);
  const now = new Date();
  const monthStart = `${riyadhParts(now.toISOString()).date.slice(0, 7)}-01`;
  const [y, m] = monthStart.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const [enrollRes, sessionRes, waitRes, lessonRes, privRes, monthRes, aheadRes, programRes] = await Promise.all([
    ids.length ? supabase.from("enrollments").select("course_id, status, hold_expires_at").in("course_id", ids) : Promise.resolve({ data: [] as { course_id: string; status: string; hold_expires_at: string | null }[] }),
    ids.length
      ? supabase.from("course_sessions").select("id, course_id, position, title, starts_at, ends_at, status, module_id, location").in("course_id", ids).order("starts_at")
      : Promise.resolve({ data: [] as { id: string; course_id: string; position: number; title: string; starts_at: string; ends_at: string; status: string; module_id: string | null; location: string | null }[] }),
    ids.length ? supabase.from("waitlist_entries").select("course_id").in("course_id", ids).in("status", ["waiting", "invited"]) : Promise.resolve({ data: [] as { course_id: string }[] }),
    ids.length ? supabase.from("lessons").select("course_id").in("course_id", ids).not("published_at", "is", null) : Promise.resolve({ data: [] as { course_id: string }[] }),
    ids.length ? supabase.from("course_private").select("course_id, meeting_url").in("course_id", ids) : Promise.resolve({ data: [] as { course_id: string; meeting_url: string | null }[] }),
    supabase.rpc("trainer_busy_days", { p_trainer: userId, p_from: monthStart, p_days: daysInMonth }),
    supabase.rpc("trainer_busy_days", { p_trainer: userId, p_from: riyadhParts(now.toISOString()).date, p_days: 60 }),
    supabase.from("programs").select("id, title").eq("owner_id", userId).eq("status", "published").order("published_at", { ascending: false }).limit(1),
  ]);

  const sessions = sessionRes.data ?? [];
  const endedIds = sessions.filter((s) => new Date(s.ends_at) < now && s.status !== "cancelled" && daysUntil(s.ends_at, now) >= -14).map((s) => s.id);
  const attendanceRes = endedIds.length ? await supabase.from("attendance").select("session_id").in("session_id", endedIds) : { data: [] as { session_id: string }[] };
  const attended = new Set((attendanceRes.data ?? []).map((a) => a.session_id));
  const enrollments = enrollRes.data ?? [];
  const drafts = courses.filter((c) => c.status === "draft");
  const blockerEntries = await Promise.all(
    drafts.map(async (c) => {
      const { data } = await supabase.rpc("course_publish_blockers", { p_course: c.id });
      return [c.id, (data ?? []).map((b) => b.code)] as const;
    }),
  );
  const blockersBy = new Map(blockerEntries);
  const today = riyadhParts(now.toISOString()).date;

  const items: TrainerCourseItem[] = courses.map((c) => {
    const own = enrollments.filter((e) => e.course_id === c.id);
    const seatsTaken = own.filter((e) => ACTIVE.includes(e.status) || (e.status === "pending_payment" && e.hold_expires_at && new Date(e.hold_expires_at) > now)).length;
    const buyers = own.filter((e) => ACTIVE.includes(e.status)).length;
    const ss: SessionLite[] = sessions
      .filter((s) => s.course_id === c.id)
      .map((s) => ({ id: s.id, position: s.position, title: s.title, startsAt: s.starts_at, endsAt: s.ends_at, status: s.status, moduleId: s.module_id, location: s.location }));
    const live = ss.filter((s) => s.status !== "cancelled");
    const nextSession = live.find((s) => new Date(s.endsAt) >= now) ?? null;
    const todaySession = live.find((s) => riyadhParts(s.startsAt).date === today) ?? null;
    const missedAttendance =
      buyers > 0 && c.status !== "draft"
        ? ([...live].reverse().find((s) => new Date(s.endsAt) < now && endedIds.includes(s.id) && !attended.has(s.id)) ?? null)
        : null;
    const base = {
      status: c.status as CourseStatus,
      mode: c.mode,
      startsAt: c.starts_at,
      endsAt: c.ends_at,
      capacity: c.capacity,
      seatsTaken,
    };
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      programTitle: (c.programs as { title: string } | null)?.title ?? "",
      mode: c.mode,
      status: c.status as CourseStatus,
      state: stateOf(base, now),
      isDraft: c.status === "draft",
      venue: c.venue,
      city: c.city,
      startsAt: c.starts_at,
      endsAt: c.ends_at,
      createdAt: c.created_at,
      capacity: c.capacity,
      seatsTaken,
      buyers,
      waitlist: (waitRes.data ?? []).filter((w) => w.course_id === c.id).length,
      publishedLessons: (lessonRes.data ?? []).filter((l) => l.course_id === c.id).length,
      sessions: ss,
      nextSession,
      todaySession,
      missedAttendance,
      meetingReady: Boolean((privRes.data ?? []).find((p) => p.course_id === c.id)?.meeting_url),
      blockers: blockersBy.get(c.id) ?? [],
    };
  });

  const published = items.filter((i) => !i.isDraft && i.state !== "cancelled");
  const scheduled = published.filter((i) => i.mode !== "recorded" && i.capacity);
  const occupancy = scheduled.length ? Math.round((scheduled.reduce((s, i) => s + Math.min(1, i.seatsTaken / (i.capacity ?? 1)), 0) / scheduled.length) * 100) : 0;
  const activeTrainees = enrollments.filter((e) => e.status === "confirmed" || e.status === "in_progress").length;
  const busy = (monthRes.data ?? []).filter((d) => d.busy).length;
  const nextFree = (aheadRes.data ?? []).find((d) => !d.busy)?.day ?? null;
  const liveReady =
    items
      .filter((i) => i.mode === "live_remote" && !i.isDraft && i.meetingReady && i.nextSession && i.state !== "ended" && i.state !== "cancelled")
      .sort((a, b) => (a.nextSession!.startsAt < b.nextSession!.startsAt ? -1 : 1))[0] ?? null;

  return {
    items,
    stats: {
      running: published.filter((i) => i.state === "running").length,
      upcoming: items.filter((i) => i.state === "upcoming").length,
      activeTrainees,
      occupancy,
    },
    availability: { busyDays: busy, daysInMonth, nextFreeDay: nextFree },
    liveReady,
    firstProgram: programRes.data?.[0] ?? null,
  };
});

/* ── Shared course header (TRR-CRS-05 layout) ──────────────────────────────────────────────── */

export type CourseHeader = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  mode: CourseMode;
  level: CourseLevel;
  status: CourseStatus;
  cover: string | null;
  venue: string | null;
  city: string | null;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number | null;
  minCapacity: number | null;
  price: number;
  currency: string;
  priceLocked: boolean;
  durationHours: number | null;
  ratingAvg: number;
  ratingCount: number;
  pageViews: number;
  salesPausedAt: string | null;
  publishedAt: string | null;
  program: { id: string; title: string; slug: string; version: number; currentVersion: number; versionCreatedAt: string };
  snapshot: Record<string, unknown>;
  sessions: SessionLite[];
  seatsTaken: number;
  buyers: number;
  revenue: number;
  attendanceAvg: number | null;
  flags: {
    recordSessions: boolean;
    liveQuestions: boolean;
    autoAttendance: boolean;
    waitlistEnabled: boolean;
    lifetimeAccess: boolean;
    allowDownloads: boolean;
    certificateOnCompletion: boolean;
  };
  meetingPlatform: string | null;
  meetingUrl: string | null;
  pricingSet: boolean;
};

/** One course the signed-in user manages, or null (RLS hides other trainers' drafts; the id filter + manages check hides the rest). */
export const getCourseHeader = cache(async (courseId: string): Promise<CourseHeader | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(courseId)) return null;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data: c } = await supabase
    .from("courses")
    .select(
      "id, slug, title, summary, mode, level, status, cover_path, venue, city, starts_at, ends_at, capacity, min_capacity, price, currency, price_locked_at, duration_hours, rating_avg, rating_count, page_views, sales_paused_at, published_at, trainer_id, organization_id, record_sessions, live_questions, auto_attendance, waitlist_enabled, lifetime_access, allow_downloads, certificate_on_completion, meeting_platform, pricing_set_at, programs(id, title, slug, current_version), program_versions(version, snapshot, created_at)",
    )
    .eq("id", courseId)
    .maybeSingle();
  if (!c) return null;
  if (c.trainer_id !== uid) {
    // Organization staff also manage courses; manages_course() is the source of truth.
    const { data: priv } = await supabase.from("course_private").select("course_id").eq("course_id", courseId).maybeSingle();
    if (!priv) return null;
  }
  const [sessionsRes, enrollRes, privRes] = await Promise.all([
    supabase.from("course_sessions").select("id, position, title, starts_at, ends_at, status, module_id, location").eq("course_id", courseId).order("position"),
    supabase.from("enrollments").select("id, status, price_paid, hold_expires_at").eq("course_id", courseId),
    supabase.from("course_private").select("meeting_url").eq("course_id", courseId).maybeSingle(),
  ]);
  const now = new Date();
  const en = enrollRes.data ?? [];
  const sessions: SessionLite[] = (sessionsRes.data ?? []).map((s) => ({
    id: s.id,
    position: s.position,
    title: s.title,
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    status: s.status,
    moduleId: s.module_id,
    location: s.location,
  }));
  const ended = sessions.filter((s) => new Date(s.endsAt) < now && s.status !== "cancelled").map((s) => s.id);
  const buyersList = en.filter((e) => ACTIVE.includes(e.status));
  let attendanceAvg: number | null = null;
  if (ended.length && buyersList.length) {
    const { count } = await supabase.from("attendance").select("session_id", { count: "exact", head: true }).in("session_id", ended);
    attendanceAvg = Math.round(((count ?? 0) / (ended.length * buyersList.length)) * 100);
  }
  const program = c.programs as { id: string; title: string; slug: string; current_version: number } | null;
  const version = c.program_versions as { version: number; snapshot: unknown; created_at: string } | null;
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    mode: c.mode,
    level: c.level,
    status: c.status as CourseStatus,
    cover: coverUrl(c.cover_path),
    venue: c.venue,
    city: c.city,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    capacity: c.capacity,
    minCapacity: c.min_capacity,
    price: Number(c.price),
    currency: c.currency,
    priceLocked: Boolean(c.price_locked_at) || en.some((e) => ACTIVE.includes(e.status) || e.status === "pending_payment"),
    durationHours: c.duration_hours === null ? null : Number(c.duration_hours),
    ratingAvg: Number(c.rating_avg),
    ratingCount: c.rating_count,
    pageViews: c.page_views,
    salesPausedAt: c.sales_paused_at,
    publishedAt: c.published_at,
    program: {
      id: program?.id ?? "",
      title: program?.title ?? "",
      slug: program?.slug ?? "",
      version: version?.version ?? 1,
      currentVersion: program?.current_version ?? 1,
      versionCreatedAt: version?.created_at ?? c.published_at ?? "",
    },
    snapshot: (version?.snapshot && typeof version.snapshot === "object" ? version.snapshot : {}) as Record<string, unknown>,
    sessions,
    seatsTaken: en.filter((e) => ACTIVE.includes(e.status) || (e.status === "pending_payment" && e.hold_expires_at && new Date(e.hold_expires_at) > now)).length,
    buyers: buyersList.length,
    revenue: buyersList.reduce((s, e) => s + Number(e.price_paid), 0),
    attendanceAvg,
    flags: {
      recordSessions: c.record_sessions,
      liveQuestions: c.live_questions,
      autoAttendance: c.auto_attendance,
      waitlistEnabled: c.waitlist_enabled,
      lifetimeAccess: c.lifetime_access,
      allowDownloads: c.allow_downloads,
      certificateOnCompletion: c.certificate_on_completion,
    },
    meetingPlatform: c.meeting_platform,
    meetingUrl: privRes.data?.meeting_url ?? null,
    pricingSet: Boolean(c.pricing_set_at),
  };
});

/** "v1.4" style label from an integer version (programs keep integer versions; v1.n reads like Figma). */
export function versionLabel(v: number): string {
  return `v${v}.0`;
}

/** Snapshot helpers (program version is the source of description/objectives/audience). */
export function snapshotList(s: Record<string, unknown>, key: string): string[] {
  const v = s[key];
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

/* ── Content (modules → lessons → materials) for the course staff ─────────────────────────── */

export type TrainerLesson = {
  id: string;
  moduleId: string;
  position: number;
  title: string;
  kind: "video" | "text" | "file" | "quiz";
  durationSeconds: number;
  mediaPath: string | null;
  mediaSize: number | null;
  mediaType: string | null;
  body: string | null;
  isPreview: boolean;
  publishedAt: string | null;
  hasMaterial: boolean;
  quiz: { id: string; passPercent: number; timeLimitMinutes: number | null; maxAttempts: number; questions: { id: string; text: string; options: string[]; answer: number }[] } | null;
};

export type TrainerModule = { id: string; position: number; title: string; fromProgram: boolean; lessons: TrainerLesson[] };

export type TrainerContent = {
  modules: TrainerModule[];
  lessons: TrainerLesson[];
  totals: { modules: number; lessons: number; videos: number; uploadedVideos: number; seconds: number; previews: number; missing: TrainerLesson[]; drafts: TrainerLesson[] };
};

export const getTrainerContent = cache(async (courseId: string): Promise<TrainerContent> => {
  const supabase = await createClient();
  const [modsRes, lessonsRes, quizRes] = await Promise.all([
    supabase.from("course_modules").select("id, position, title, from_program").eq("course_id", courseId).order("position"),
    supabase
      .from("lessons")
      .select("id, module_id, position, title, kind, duration_seconds, media_path, media_size, media_type, body, is_preview, published_at")
      .eq("course_id", courseId)
      .order("position"),
    supabase.from("quizzes").select("id, lesson_id, pass_percent, time_limit_minutes, max_attempts, questions").eq("course_id", courseId),
  ]);
  if (modsRes.error || lessonsRes.error) throw new Error("course_content_unavailable");
  const quizBy = new Map((quizRes.data ?? []).filter((q) => q.lesson_id).map((q) => [q.lesson_id as string, q]));
  const lessons: TrainerLesson[] = (lessonsRes.data ?? []).map((l) => {
    const q = quizBy.get(l.id);
    const questions = Array.isArray(q?.questions)
      ? (q!.questions as { id: string; text: string; options: string[]; answer: number }[]).map((x) => ({
          id: String(x.id),
          text: String(x.text),
          options: (x.options ?? []).map(String),
          answer: Number(x.answer),
        }))
      : [];
    const hasMaterial = l.kind === "quiz" ? questions.length > 0 : l.kind === "text" ? Boolean(l.body?.trim()) : Boolean(l.media_path);
    return {
      id: l.id,
      moduleId: l.module_id,
      position: l.position,
      title: l.title,
      kind: l.kind,
      durationSeconds: l.duration_seconds,
      mediaPath: l.media_path,
      mediaSize: l.media_size,
      mediaType: l.media_type,
      body: l.body,
      isPreview: l.is_preview,
      publishedAt: l.published_at,
      hasMaterial,
      quiz: q ? { id: q.id, passPercent: q.pass_percent, timeLimitMinutes: q.time_limit_minutes, maxAttempts: q.max_attempts, questions } : null,
    };
  });
  const modules: TrainerModule[] = (modsRes.data ?? []).map((m) => ({
    id: m.id,
    position: m.position,
    title: m.title,
    fromProgram: m.from_program,
    lessons: lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.position - b.position),
  }));
  const ordered = modules.flatMap((m) => m.lessons);
  const videos = ordered.filter((l) => l.kind === "video");
  return {
    modules,
    lessons: ordered,
    totals: {
      modules: modules.length,
      lessons: ordered.length,
      videos: videos.length,
      uploadedVideos: videos.filter((v) => v.mediaPath).length,
      seconds: ordered.reduce((s, l) => s + l.durationSeconds, 0),
      previews: ordered.filter((l) => l.isPreview).length,
      missing: ordered.filter((l) => !l.hasMaterial),
      drafts: ordered.filter((l) => !l.publishedAt),
    },
  };
});

/** A published program version the trainer can build a course from (/trainer/courses/new?program=). */
export async function getProgramForNewCourse(programId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(programId)) return null;
  const supabase = await createClient();
  const { data: p } = await supabase.from("programs").select("id, title, status, current_version").eq("id", programId).maybeSingle();
  if (!p || p.status !== "published") return null;
  const { data: v } = await supabase
    .from("program_versions")
    .select("id, version, created_at")
    .eq("program_id", p.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!v) return null;
  return { id: p.id, title: p.title, versionId: v.id, version: v.version, currentVersion: p.current_version };
}

export async function latestPublishedProgramId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("programs").select("id").eq("owner_id", userId).eq("status", "published").order("published_at", { ascending: false }).limit(1);
  return data?.[0]?.id ?? null;
}

/* ── Trainer calendar (conflicts for the schedule step) ──────────────────────────────────── */

export type BusySlot = { startsAt: string; endsAt: string; label: string; kind: "course" | "personal" };

/** Sessions of the trainer's other live courses and their personal calendar events in the next ~9 months. */
export async function getTrainerBusySlots(userId: string, excludeCourseId: string): Promise<BusySlot[]> {
  const supabase = await createClient();
  const from = new Date(Date.now() - 86_400_000).toISOString();
  const to = new Date(Date.now() + 270 * 86_400_000).toISOString();
  const [coursesRes, eventsRes] = await Promise.all([
    supabase.from("courses").select("id, title").eq("trainer_id", userId).neq("id", excludeCourseId).in("status", ["draft", "open", "in_progress"]),
    supabase.from("trainer_calendar_events").select("title, starts_at, ends_at, recurrence").eq("trainer_id", userId).lte("starts_at", to),
  ]);
  const titles = new Map((coursesRes.data ?? []).map((c) => [c.id, c.title]));
  const ids = [...titles.keys()];
  const sessionsRes = ids.length
    ? await supabase.from("course_sessions").select("course_id, starts_at, ends_at").in("course_id", ids).neq("status", "cancelled").gte("ends_at", from).lte("starts_at", to)
    : { data: [] as { course_id: string; starts_at: string; ends_at: string }[] };
  const slots: BusySlot[] = (sessionsRes.data ?? []).map((s) => ({ startsAt: s.starts_at, endsAt: s.ends_at, label: `«${titles.get(s.course_id) ?? ""}»`, kind: "course" }));
  const step = { weekly: 7, biweekly: 14 } as Record<string, number>;
  for (const e of eventsRes.data ?? []) {
    const start = new Date(e.starts_at).getTime();
    const len = new Date(e.ends_at).getTime() - start;
    const push = (t: number) => {
      if (t + len >= Date.parse(from) && t <= Date.parse(to)) slots.push({ startsAt: new Date(t).toISOString(), endsAt: new Date(t + len).toISOString(), label: "ارتباط شخصي مسجَّل في تقويمك", kind: "personal" });
    };
    if (e.recurrence === "none") push(start);
    else if (e.recurrence === "monthly") {
      const d = new Date(start);
      for (let i = 0; i < 12; i++) {
        push(d.getTime());
        d.setUTCMonth(d.getUTCMonth() + 1);
      }
    } else {
      for (let t = start; t <= Date.parse(to); t += (step[e.recurrence] ?? 7) * 86_400_000) push(t);
    }
  }
  return slots;
}
