import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCoursePeople, getCourseSessions, type ManagedCourse } from "@/lib/data/trainer-course";

/*
 * TRR-CRS-05 · ٥ المتدربون (436:19902), TRR-CRS-03 recorded variant (327:11674) and the seats screens (462:*).
 * Attendance = attended sessions / sessions that already ended (cancelled sessions excluded).
 */

export type AttendanceBand = "regular" | "below" | "at_risk" | "none";

export type RosterRow = {
  enrollmentId: string;
  traineeId: string;
  name: string;
  enrolledAt: string;
  status: string;
  attended: number;
  ended: number;
  percent: number | null;
  band: AttendanceBand;
  /** Recorded courses: lessons completed. */
  lessonsDone: number;
  lessonsTotal: number;
  certificateIssued: boolean;
};

export type WaitRow = { id: string; traineeId: string; name: string; since: string; status: "waiting" | "invited"; invitedUntil: string | null };

export type Roster = {
  rows: RosterRow[];
  waitlist: WaitRow[];
  seatsTaken: number;
  holds: { enrollmentId: string; name: string; expiresAt: string | null }[];
  endedSessions: number;
  totalSessions: number;
  remainingSessions: number;
  withdrawn: number;
  revenue: number;
};

const ACTIVE = new Set(["pending_provider", "confirmed", "in_progress", "completed"]);

export async function getRoster(course: ManagedCourse): Promise<Roster> {
  const supabase = await createClient();
  const now = Date.now();
  const [people, sessions, enrRes, waitRes, lessonsRes, certRes] = await Promise.all([
    getCoursePeople(course.id),
    getCourseSessions(course.id),
    supabase
      .from("enrollments")
      .select("id, trainee_id, status, created_at, hold_expires_at, price_paid, end_reason")
      .eq("course_id", course.id)
      .order("created_at"),
    supabase
      .from("waitlist_entries")
      .select("id, trainee_id, status, created_at, invite_expires_at")
      .eq("course_id", course.id)
      .in("status", ["waiting", "invited"])
      .order("created_at"),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", course.id).not("published_at", "is", null),
    supabase.from("certificates").select("enrollment_id").eq("course_id", course.id).eq("status", "issued"),
  ]);

  const live = sessions.filter((s) => s.status !== "cancelled");
  const ended = live.filter((s) => new Date(s.endsAt).getTime() <= now);
  const endedIds = ended.map((s) => s.id);
  const enrollments = enrRes.data ?? [];
  const traineeIds = enrollments.map((e) => e.trainee_id);

  const [attRes, progRes] = await Promise.all([
    endedIds.length && traineeIds.length
      ? supabase.from("attendance").select("session_id, trainee_id").in("session_id", endedIds)
      : Promise.resolve({ data: [] as { session_id: string; trainee_id: string }[] }),
    course.mode === "recorded" && traineeIds.length
      ? supabase.from("lesson_progress").select("trainee_id, completed_at").eq("course_id", course.id).not("completed_at", "is", null)
      : Promise.resolve({ data: [] as { trainee_id: string; completed_at: string | null }[] }),
  ]);
  const attendedBy = new Map<string, number>();
  (attRes.data ?? []).forEach((a) => attendedBy.set(a.trainee_id, (attendedBy.get(a.trainee_id) ?? 0) + 1));
  const lessonsBy = new Map<string, number>();
  (progRes.data ?? []).forEach((p) => lessonsBy.set(p.trainee_id, (lessonsBy.get(p.trainee_id) ?? 0) + 1));
  const certs = new Set((certRes.data ?? []).map((c) => c.enrollment_id));
  const lessonsTotal = lessonsRes.count ?? 0;
  const remaining = live.length - ended.length;
  const required = Math.ceil(live.length * 0.75);

  // A cancelled course keeps showing who was enrolled at cancellation time (4236:1195).
  const inRoster = (e: { status: string; end_reason: string | null }) =>
    ACTIVE.has(e.status) || (course.status === "cancelled" && e.status === "cancelled" && e.end_reason === "course_cancelled");
  const rows: RosterRow[] = enrollments
    .filter(inRoster)
    .map((e) => {
      const attended = attendedBy.get(e.trainee_id) ?? 0;
      const percent = ended.length ? Math.round((attended / ended.length) * 100) : null;
      let band: AttendanceBand = "none";
      if (percent !== null) {
        if (percent >= 75) band = "regular";
        else band = required - attended >= remaining ? "at_risk" : "below";
      }
      return {
        enrollmentId: e.id,
        traineeId: e.trainee_id,
        name: people.get(e.trainee_id)?.name ?? "متدرب",
        enrolledAt: e.created_at,
        status: e.status,
        attended,
        ended: ended.length,
        percent,
        band,
        lessonsDone: lessonsBy.get(e.trainee_id) ?? 0,
        lessonsTotal,
        certificateIssued: certs.has(e.id),
      };
    });

  const holds = enrollments
    .filter((e) => e.status === "pending_payment" && e.hold_expires_at && new Date(e.hold_expires_at).getTime() > now)
    .map((e) => ({ enrollmentId: e.id, name: people.get(e.trainee_id)?.name ?? "متدرب", expiresAt: e.hold_expires_at }));

  return {
    rows,
    waitlist: (waitRes.data ?? []).map((w) => ({
      id: w.id,
      traineeId: w.trainee_id,
      name: people.get(w.trainee_id)?.name ?? "متدرب",
      since: w.created_at,
      status: w.status as "waiting" | "invited",
      invitedUntil: w.invite_expires_at,
    })),
    seatsTaken: rows.length + holds.length,
    holds,
    endedSessions: ended.length,
    totalSessions: live.length,
    remainingSessions: remaining,
    withdrawn: enrollments.filter((e) => e.status === "withdrawn").length,
    revenue: enrollments.filter((e) => ACTIVE.has(e.status)).reduce((sum, e) => sum + Number(e.price_paid), 0),
  };
}

export type RosterSort = "attendance" | "recent" | "name";

export function sortRoster(rows: RosterRow[], sort: RosterSort, q: string): RosterRow[] {
  const needle = q.trim();
  const filtered = needle ? rows.filter((r) => r.name.includes(needle)) : rows;
  const copy = [...filtered];
  if (sort === "attendance") copy.sort((a, b) => (a.percent ?? 101) - (b.percent ?? 101) || a.name.localeCompare(b.name, "ar"));
  if (sort === "recent") copy.sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
  if (sort === "name") copy.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return copy;
}

// ── Recorded course (327:11674) ────────────────────────────────────────────────────────────────
export type RecordedModule = { id: string; position: number; title: string; lessons: number; published: number };
export type BuyerRow = {
  enrollmentId: string;
  traineeId: string;
  name: string;
  boughtAt: string;
  percent: number;
  moduleIndex: number | null;
  stalledDays: number | null;
  completed: boolean;
  certificateIssued: boolean;
};
export type RecordedView = {
  modules: RecordedModule[];
  buyers: BuyerRow[];
  thisMonth: number;
  avgCompletion: number;
  completedCount: number;
  revenue: number;
  pendingQuestions: number;
  oldestQuestionAt: string | null;
};

const STALL_DAYS = 14;

export async function getRecordedView(course: ManagedCourse, userId: string): Promise<RecordedView> {
  const supabase = await createClient();
  const [people, modRes, lessonRes, enrRes, progRes, certRes, convRes] = await Promise.all([
    getCoursePeople(course.id),
    supabase.from("course_modules").select("id, position, title").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id, module_id, published_at").eq("course_id", course.id),
    supabase
      .from("enrollments")
      .select("id, trainee_id, status, created_at, confirmed_at, price_paid")
      .eq("course_id", course.id)
      .in("status", ["confirmed", "in_progress", "completed"])
      .order("created_at"),
    supabase.from("lesson_progress").select("trainee_id, lesson_id, completed_at, updated_at").eq("course_id", course.id),
    supabase.from("certificates").select("enrollment_id").eq("course_id", course.id).eq("status", "issued"),
    supabase.from("conversations").select("id, messages(sender_id, created_at)").eq("course_id", course.id),
  ]);
  const lessons = (lessonRes.data ?? []).filter((l) => l.published_at);
  const modules = (modRes.data ?? []).map((m) => ({
    id: m.id,
    position: m.position,
    title: m.title,
    lessons: (lessonRes.data ?? []).filter((l) => l.module_id === m.id).length,
    published: lessons.filter((l) => l.module_id === m.id).length,
  }));
  const moduleOfLesson = new Map(lessons.map((l) => [l.id, l.module_id]));
  const certs = new Set((certRes.data ?? []).map((c) => c.enrollment_id));
  const progress = progRes.data ?? [];
  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const buyers: BuyerRow[] = (enrRes.data ?? []).map((e) => {
    const mine = progress.filter((p) => p.trainee_id === e.trainee_id);
    const done = new Set(mine.filter((p) => p.completed_at && moduleOfLesson.has(p.lesson_id)).map((p) => p.lesson_id));
    const percent = lessons.length ? Math.round((done.size / lessons.length) * 100) : 0;
    const current = modules.findIndex((m) => lessons.some((l) => l.module_id === m.id && !done.has(l.id)));
    const last = mine.reduce<number>((acc, p) => Math.max(acc, new Date(p.updated_at).getTime()), new Date(e.confirmed_at ?? e.created_at).getTime());
    const idleDays = Math.floor((now - last) / 86_400_000);
    return {
      enrollmentId: e.id,
      traineeId: e.trainee_id,
      name: people.get(e.trainee_id)?.name ?? "متدرب",
      boughtAt: e.confirmed_at ?? e.created_at,
      percent,
      moduleIndex: current >= 0 ? current + 1 : null,
      stalledDays: percent < 100 && idleDays >= STALL_DAYS ? idleDays : null,
      completed: percent >= 100 || e.status === "completed",
      certificateIssued: certs.has(e.id),
    };
  });

  let pending = 0;
  let oldest: string | null = null;
  for (const c of convRes.data ?? []) {
    const msgs = [...(c.messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg && lastMsg.sender_id !== userId) {
      pending += 1;
      if (!oldest || lastMsg.created_at < oldest) oldest = lastMsg.created_at;
    }
  }

  return {
    modules,
    buyers,
    thisMonth: buyers.filter((b) => new Date(b.boughtAt) >= monthStart).length,
    avgCompletion: buyers.length ? Math.round(buyers.reduce((s, b) => s + b.percent, 0) / buyers.length) : 0,
    completedCount: buyers.filter((b) => b.completed).length,
    revenue: (enrRes.data ?? []).reduce((s, e) => s + Number(e.price_paid), 0),
    pendingQuestions: pending,
    oldestQuestionAt: oldest,
  };
}

// ── Seats & waitlist (462:*) ───────────────────────────────────────────────────────────────────
export type SeatWaitRow = {
  id: string;
  traineeId: string;
  name: string;
  joinedAt: string;
  status: "waiting" | "invited" | "accepted" | "expired" | "left";
  inviteExpiresAt: string | null;
};
export type SeatsView = {
  capacity: number;
  enrolled: number;
  holds: { enrollmentId: string; name: string; expiresAt: string | null }[];
  taken: number;
  openInvites: number;
  free: number;
  waiting: number;
  entries: SeatWaitRow[];
  lastGrant: { name: string; nextName: string | null; at: string } | null;
};

export async function getSeatsView(course: ManagedCourse): Promise<SeatsView> {
  const supabase = await createClient();
  const now = Date.now();
  const [people, enrRes, waitRes] = await Promise.all([
    getCoursePeople(course.id),
    supabase.from("enrollments").select("id, trainee_id, status, hold_expires_at").eq("course_id", course.id),
    supabase.from("waitlist_entries").select("id, trainee_id, status, created_at, invited_at, invite_expires_at").eq("course_id", course.id).order("created_at"),
  ]);
  const enrollments = enrRes.data ?? [];
  const enrolled = enrollments.filter((e) => ACTIVE.has(e.status)).length;
  const holds = enrollments
    .filter((e) => e.status === "pending_payment" && e.hold_expires_at && new Date(e.hold_expires_at).getTime() > now)
    .map((e) => ({ enrollmentId: e.id, name: people.get(e.trainee_id)?.name ?? "متدرب", expiresAt: e.hold_expires_at }));
  const entries: SeatWaitRow[] = (waitRes.data ?? []).map((w) => ({
    id: w.id,
    traineeId: w.trainee_id,
    name: people.get(w.trainee_id)?.name ?? "متدرب",
    joinedAt: w.created_at,
    status: w.status,
    inviteExpiresAt: w.invite_expires_at,
  }));
  const openInvites = entries.filter((w) => w.status === "invited" && w.inviteExpiresAt && new Date(w.inviteExpiresAt).getTime() > now).length;
  const capacity = course.capacity ?? 0;
  const taken = enrolled + holds.length;
  const waitingRows = entries.filter((w) => w.status === "waiting");
  const lastInvited = [...(waitRes.data ?? [])].filter((w) => w.status === "invited" && w.invited_at).sort((a, b) => (b.invited_at ?? "").localeCompare(a.invited_at ?? ""))[0];
  return {
    capacity,
    enrolled,
    holds,
    taken,
    openInvites,
    free: Math.max(capacity - taken - openInvites, 0),
    waiting: waitingRows.length,
    entries,
    lastGrant: lastInvited
      ? { name: people.get(lastInvited.trainee_id)?.name ?? "متدرب", nextName: waitingRows[0]?.name ?? null, at: lastInvited.invited_at ?? lastInvited.created_at }
      : null,
  };
}

// ── Postpone / cancel (277:5339 / 277:5650) ───────────────────────────────────────────────────
export type OpsImpact = {
  registered: number;
  paidCount: number;
  collected: number;
  firstStart: string | null;
  lastEnd: string | null;
  daysToStart: number | null;
  sessions: { startsAt: string; endsAt: string }[];
  /** Other scheduled sessions of the same trainer (conflict check of the new dates). */
  busy: { courseTitle: string; startsAt: string; endsAt: string }[];
  cancellationsThisYear: number;
};

export async function getOpsImpact(course: ManagedCourse): Promise<OpsImpact> {
  const supabase = await createClient();
  const [sessions, enrRes, busyRes, opsRes] = await Promise.all([
    getCourseSessions(course.id),
    supabase.from("enrollments").select("id, status, price_paid").eq("course_id", course.id).in("status", ["pending_provider", "confirmed", "in_progress"]),
    supabase
      .from("course_sessions")
      .select("starts_at, ends_at, courses!inner(id, title, trainer_id, status)")
      .eq("courses.trainer_id", course.trainerId)
      .neq("course_id", course.id)
      .neq("status", "cancelled")
      .gte("ends_at", new Date().toISOString()),
    supabase
      .from("course_operations")
      .select("id", { count: "exact", head: true })
      .eq("kind", "cancel")
      .eq("actor_id", course.trainerId)
      .gte("created_at", new Date(Date.now() - 365 * 86_400_000).toISOString()),
  ]);
  const live = sessions.filter((s) => s.status !== "cancelled");
  const enrollments = enrRes.data ?? [];
  // Payments are private to the trainee (RLS); pending_provider/confirmed/in_progress enrollments with a price were settled.
  const paid = enrollments.filter((e) => Number(e.price_paid) > 0);
  const firstStart = live[0]?.startsAt ?? course.startsAt;
  const lastEnd = live.length ? live[live.length - 1].endsAt : course.endsAt;
  return {
    registered: enrollments.length,
    paidCount: paid.length,
    collected: paid.reduce((s, e) => s + Number(e.price_paid), 0),
    firstStart,
    lastEnd,
    daysToStart: firstStart ? Math.floor((new Date(firstStart).getTime() - Date.now()) / 86_400_000) : null,
    sessions: live.map((s) => ({ startsAt: s.startsAt, endsAt: s.endsAt })),
    busy: (busyRes.data ?? [])
      .filter((b) => b.courses && b.courses.status !== "cancelled")
      .map((b) => ({ courseTitle: b.courses?.title ?? "", startsAt: b.starts_at, endsAt: b.ends_at })),
    cancellationsThisYear: opsRes.count ?? 0,
  };
}

// ── Course operation log (cancelled banner 4236:1195) ─────────────────────────────────────────
export async function getLastOperation(courseId: string, kind: "cancel" | "postpone") {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_operations")
    .select("created_at, affected, reason, message, details")
    .eq("course_id", courseId)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
