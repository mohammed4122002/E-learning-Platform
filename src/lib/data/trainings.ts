import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { COURSE_CARD_SELECT, courseBase, toCatalogCard, type CourseCardRow } from "@/lib/data/courses";
import { ENROLLMENT_STATUS, FUNDING_LABELS, LEVEL_LABELS } from "@/lib/labels";
import { formatDayMonth, formatSessionTime, formatTime, toArabicDigits } from "@/lib/format";
import { avatarUrl } from "@/lib/storage";
import { liveSessionState, refCode, type LiveSessionState } from "@/lib/trainings";
import type { CourseCardView, CourseMode, EnrollmentStatus } from "@/types/views";

/* ─────────────────────────────── Shared shapes ─────────────────────────────── */

const ACTIVE: EnrollmentStatus[] = ["pending_provider", "confirmed", "in_progress"];
const RIYADH = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" });
const dayKey = (d: string | Date) => RIYADH.format(typeof d === "string" ? new Date(d) : d);

type SessionRow = { id: string; course_id: string; position: number; title: string; starts_at: string; ends_at: string; location: string | null; meeting_url: string | null; status: string };

export type SessionState = "attended" | "today" | "absent" | "upcoming" | "cancelled";
export type SessionView = {
  id: string;
  position: number;
  title: string;
  startsAt: string;
  endsAt: string;
  day: string;
  time: string;
  location: string | null;
  state: SessionState;
  live: LiveSessionState;
  meetingUrl: string | null;
};

function toSessionView(s: SessionRow, attended: Set<string>, now: Date): SessionView {
  let state: SessionState;
  if (s.status === "cancelled") state = "cancelled";
  else if (attended.has(s.id)) state = "attended";
  else if (dayKey(s.starts_at) === dayKey(now) || (new Date(s.starts_at) <= now && new Date(s.ends_at) >= now)) state = "today";
  else if (new Date(s.ends_at) < now) state = "absent";
  else state = "upcoming";
  const weekday = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { weekday: "long", timeZone: "Asia/Riyadh" }).format(new Date(s.starts_at));
  return {
    id: s.id,
    position: s.position,
    title: s.title,
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    day: `${weekday} ${formatDayMonth(s.starts_at)}`,
    time: `${formatTime(s.starts_at)} – ${formatTime(s.ends_at)}`,
    location: s.location,
    state,
    live: liveSessionState(s, now),
    meetingUrl: s.meeting_url,
  };
}

/* ─────────────────────────────── TRN-MYE-01 · ملف التدريب ─────────────────────────────── */

export type TrainingsTab = "active" | "waitlist" | "completed" | "withdrawn" | "cancelled";
export type ModeFilter = "all" | CourseMode;

export type WaitlistEntryView = {
  id: string;
  ref: string;
  status: "invited" | "waiting" | "expired";
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  mode: CourseMode;
  meta: string;
  joinedAt: string;
  inviteExpiresAt: string | null;
  position: number | null;
  total: number | null;
  price: number;
  currency: string;
};

export type TrainingsFileView = {
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  track: string | null;
  memberSince: string;
  stats: { total: number; hours: number; certificates: number; rating: number | null };
  plan: { completed: number; total: number; percent: number };
  journey: { following: number; purchased: number; active: number; completed: number; certificates: number };
  invite: { entryId: string; courseTitle: string; meta: string; expiresAt: string } | null;
  cancelled: { enrollmentId: string; courseTitle: string; meta: string; refundHref: string } | null;
  live: { enrollmentId: string; courseTitle: string; provider: string; nextSession: string | null; status: string } | null;
  modeCounts: Record<CourseMode, number>;
  tabCounts: Record<TrainingsTab, number>;
  inviteCount: number;
  cards: CourseCardView[];
  waitlist: WaitlistEntryView[];
  recommended: CourseCardView[];
};

type EnrollmentCardRow = {
  id: string;
  status: EnrollmentStatus;
  funding: string;
  price_paid: number;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
  course_id: string;
  courses: CourseCardRow;
};

function tabOf(e: { status: EnrollmentStatus; end_reason: string | null }): TrainingsTab | null {
  if (ACTIVE.includes(e.status)) return "active";
  if (e.status === "completed") return "completed";
  if (e.status === "withdrawn") return "withdrawn";
  if (e.status === "access_revoked" || (e.status === "cancelled" && e.end_reason !== "hold_expired")) return "cancelled";
  return null;
}

function waitlistMeta(c: { mode: CourseMode; starts_at: string | null; city: string | null; venue: string | null }) {
  const parts: string[] = [];
  if (c.starts_at) parts.push(`دورة ${formatDayMonth(c.starts_at)}`);
  if (c.mode === "in_person") {
    if (c.city) parts.push(c.city);
    if (c.venue) parts.push(c.venue);
  } else parts.push(c.mode === "live_remote" ? "عن بُعد" : "مسجَّلة");
  return parts.join(" · ");
}

export async function getWaitlistEntries(userId: string): Promise<WaitlistEntryView[]> {
  const supabase = await createClient();
  const [{ data }, { data: positions }] = await Promise.all([
    supabase
      .from("waitlist_entries")
      .select("id, status, created_at, invited_at, invite_expires_at, course_id, courses(id, slug, title, mode, starts_at, city, venue, price, currency)")
      .eq("trainee_id", userId)
      .in("status", ["waiting", "invited", "expired"])
      .order("created_at", { ascending: false }),
    supabase.rpc("my_waitlist_positions"),
  ]);
  const pos = new Map((positions ?? []).map((p) => [p.entry_id, p]));
  const now = Date.now();
  const monthAgo = now - 30 * 864e5;
  return (data ?? [])
    .filter((w) => w.courses)
    .filter((w) => w.status !== "expired" || new Date(w.invite_expires_at ?? w.created_at).getTime() > monthAgo)
    .map((w) => {
      const c = w.courses!;
      const lapsed = w.status === "invited" && w.invite_expires_at && new Date(w.invite_expires_at).getTime() <= now;
      const status = (lapsed ? "expired" : w.status) as WaitlistEntryView["status"];
      return {
        id: w.id,
        ref: refCode("WTL", w.id, w.created_at),
        status,
        courseId: c.id,
        courseSlug: c.slug,
        courseTitle: c.title,
        mode: c.mode,
        meta: waitlistMeta(c),
        joinedAt: w.created_at,
        inviteExpiresAt: w.invite_expires_at,
        position: pos.get(w.id)?.queue_position ?? null,
        total: pos.get(w.id)?.total ?? null,
        price: Number(c.price),
        currency: c.currency,
      };
    })
    .sort((a, b) => ["invited", "waiting", "expired"].indexOf(a.status) - ["invited", "waiting", "expired"].indexOf(b.status));
}

export async function getTrainingsFile(userId: string, tab: TrainingsTab, mode: ModeFilter): Promise<TrainingsFileView> {
  const supabase = await createClient();
  const now = new Date();

  const [profileRes, enrollmentsRes, waitlist, certsRes, ratingsRes, followsRes] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_path, identity_status, created_at").eq("id", userId).single(),
    supabase
      .from("enrollments")
      .select(`id, status, funding, price_paid, created_at, confirmed_at, completed_at, ended_at, end_reason, course_id, courses(${COURSE_CARD_SELECT})`)
      .eq("trainee_id", userId)
      .neq("status", "pending_payment")
      .order("created_at", { ascending: false }),
    getWaitlistEntries(userId),
    supabase.from("certificates").select("id", { count: "exact", head: true }).eq("trainee_id", userId).eq("status", "issued"),
    supabase.from("course_ratings").select("content_score, trainer_score, organization_score").eq("trainee_id", userId),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (enrollmentsRes.error) throw enrollmentsRes.error;

  const enrollments = ((enrollmentsRes.data ?? []) as unknown as EnrollmentCardRow[]).filter(
    (e) => e.courses && !(e.status === "cancelled" && e.end_reason === "hold_expired"),
  );
  const courseIds = [...new Set(enrollments.map((e) => e.course_id))];

  const [sessionsRes, attendanceRes, lessonsRes, progressRes] = await Promise.all([
    courseIds.length
      ? supabase.from("course_sessions").select("id, course_id, position, title, starts_at, ends_at, location, meeting_url, status").in("course_id", courseIds).order("starts_at")
      : Promise.resolve({ data: [] as SessionRow[] }),
    supabase.from("attendance").select("session_id").eq("trainee_id", userId),
    courseIds.length
      ? supabase.from("lessons").select("id, course_id, duration_seconds").in("course_id", courseIds).not("published_at", "is", null)
      : Promise.resolve({ data: [] as { id: string; course_id: string; duration_seconds: number }[] }),
    supabase.from("lesson_progress").select("lesson_id").eq("trainee_id", userId).not("completed_at", "is", null),
  ]);
  const sessions = (sessionsRes.data ?? []) as SessionRow[];
  const attended = new Set((attendanceRes.data ?? []).map((a) => a.session_id));
  const lessons = lessonsRes.data ?? [];
  const doneLessons = new Set((progressRes.data ?? []).map((p) => p.lesson_id));

  // Training hours = attended session time + watched lesson time.
  const hours = Math.round(
    (sessions.filter((s) => attended.has(s.id)).reduce((t, s) => t + (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 1000, 0) +
      lessons.filter((l) => doneLessons.has(l.id)).reduce((t, l) => t + l.duration_seconds, 0)) /
      3600,
  );

  const ratings = ratingsRes.data ?? [];
  const rating = ratings.length
    ? ratings.reduce((t, r) => t + (r.content_score + r.trainer_score + (r.organization_score ?? r.trainer_score)) / 3, 0) / ratings.length
    : null;

  const active = enrollments.filter((e) => ACTIVE.includes(e.status));
  const completed = enrollments.filter((e) => e.status === "completed");
  const plannable = enrollments.filter((e) => e.status !== "withdrawn" && tabOf(e) !== "cancelled");
  const catCount = new Map<string, number>();
  plannable.forEach((e) => {
    const n = e.courses.programs?.categories?.name;
    if (n) catCount.set(n, (catCount.get(n) ?? 0) + 1);
  });
  const track = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const toCard = (e: EnrollmentCardRow): CourseCardView => {
    const c = e.courses;
    let progress: { label: string; percent: number };
    let nextSession: string | null = null;
    if (c.mode === "recorded") {
      const own = lessons.filter((l) => l.course_id === c.id);
      const done = own.filter((l) => doneLessons.has(l.id)).length;
      progress = { label: `الدروس · ${toArabicDigits(done)} من ${toArabicDigits(own.length)}`, percent: own.length ? (done / own.length) * 100 : 0 };
    } else {
      const own = sessions.filter((s) => s.course_id === c.id && s.status !== "cancelled");
      const att = own.filter((s) => attended.has(s.id)).length;
      progress = { label: `الحضور · ${toArabicDigits(att)} من ${toArabicDigits(own.length)} جلسة`, percent: own.length ? (att / own.length) * 100 : 0 };
      const upcoming = own.find((s) => new Date(s.ends_at) > now);
      if (upcoming && ACTIVE.includes(e.status)) nextSession = `الجلسة القادمة: ${formatSessionTime(upcoming.starts_at)}`;
    }
    const tabNow = tabOf(e);
    return {
      ...courseBase(c),
      variant: "enrolled",
      status: ENROLLMENT_STATUS[e.status],
      href: `/trainee/trainings/${e.id}`,
      cta: tabNow !== "active" ? "اعرض التفاصيل" : c.mode === "recorded" ? "تابع التعلّم" : "تابع الدورة",
      progress,
      nextSession,
      funding: FUNDING_LABELS[e.funding] ?? "",
    };
  };

  const modeCounts: Record<CourseMode, number> = { in_person: 0, recorded: 0, live_remote: 0 };
  enrollments.filter((e) => tabOf(e) === tab).forEach((e) => (modeCounts[e.courses.mode] += 1));
  if (tab === "waitlist") waitlist.forEach((w) => (modeCounts[w.mode] += 1));

  const tabCounts: Record<TrainingsTab, number> = { active: 0, waitlist: waitlist.length, completed: 0, withdrawn: 0, cancelled: 0 };
  enrollments.forEach((e) => {
    const t = tabOf(e);
    if (t && t !== "waitlist") tabCounts[t] += 1;
  });

  const cards = tab === "waitlist" ? [] : enrollments.filter((e) => tabOf(e) === tab && (mode === "all" || e.courses.mode === mode)).map(toCard);

  // Invite banner (TRN-WTL-02 entry point).
  const invite = waitlist.find((w) => w.status === "invited");

  // Cancelled-by-provider banner (4136:549): the most recent cancellation in the last 30 days.
  const cancelledEnrollment = enrollments.find(
    (e) => e.status === "cancelled" && e.end_reason !== "hold_expired" && e.ended_at && now.getTime() - new Date(e.ended_at).getTime() < 30 * 864e5,
  );

  // Live notice (4173:2): the nearest active live course with an upcoming session.
  let live: TrainingsFileView["live"] = null;
  for (const e of active.filter((x) => x.courses.mode === "live_remote")) {
    const next = sessions.find((s) => s.course_id === e.course_id && s.status !== "cancelled" && new Date(s.ends_at) > now);
    if (next && (!live || next.starts_at < (live.nextSession ?? ""))) {
      live = {
        enrollmentId: e.id,
        courseTitle: e.courses.title,
        provider: courseBase(e.courses).source.name,
        nextSession: next.starts_at,
        status: ENROLLMENT_STATUS[e.status].label,
      };
    }
  }

  let recommended: CourseCardView[] = [];
  if (tab === "active" && cards.length === 0) {
    const enrolledIds = new Set(courseIds);
    const { data: catalog } = await supabase.from("courses").select(COURSE_CARD_SELECT).eq("status", "open").order("rating_avg", { ascending: false }).limit(12);
    recommended = ((catalog ?? []) as unknown as CourseCardRow[])
      .filter((c) => !enrolledIds.has(c.id))
      .slice(0, 3)
      .map((c) => toCatalogCard(c, { status: { label: "مقترح لك", tone: "brand" } }));
  }

  const profile = profileRes.data;
  return {
    name: profile.full_name,
    avatarUrl: avatarUrl(profile.avatar_path),
    verified: profile.identity_status === "verified",
    track,
    memberSince: profile.created_at,
    stats: { total: plannable.length, hours, certificates: certsRes.count ?? 0, rating },
    plan: {
      completed: completed.length,
      total: plannable.length,
      percent: plannable.length ? Math.round((completed.length / plannable.length) * 100) : 0,
    },
    journey: {
      following: followsRes.count ?? 0,
      purchased: enrollments.filter((e) => Number(e.price_paid) > 0 || e.confirmed_at).length,
      active: active.length,
      completed: completed.length,
      certificates: certsRes.count ?? 0,
    },
    invite: invite && invite.inviteExpiresAt ? { entryId: invite.id, courseTitle: invite.courseTitle, meta: invite.meta, expiresAt: invite.inviteExpiresAt } : null,
    cancelled: cancelledEnrollment
      ? {
          enrollmentId: cancelledEnrollment.id,
          courseTitle: cancelledEnrollment.courses.title,
          meta: cancelledEnrollment.courses.starts_at ? `دورة ${formatDayMonth(cancelledEnrollment.courses.starts_at)}` : "",
          refundHref: `/trainee/trainings/${cancelledEnrollment.id}/refund`,
        }
      : null,
    live,
    modeCounts,
    tabCounts,
    inviteCount: waitlist.filter((w) => w.status === "invited").length,
    cards,
    waitlist: tab === "waitlist" ? waitlist.filter((w) => mode === "all" || w.mode === mode) : [],
    recommended,
  };
}

/* ─────────────────────────────── TRN-MYE-02 · تفاصيل تسجيلي ─────────────────────────────── */

export type ModuleView = {
  id: string;
  position: number;
  title: string;
  lessons: number;
  seconds: number;
  done: number;
  state: "completed" | "current" | "not_started";
  firstLessonId: string | null;
  resumeLessonId: string | null;
};

export type RefundSummary = { id: string; status: "under_review" | "approved" | "rejected"; cancelled: boolean; amount: number; createdAt: string };

export type EnrollmentDetail = {
  id: string;
  ref: string;
  status: EnrollmentStatus;
  statusLabel: string;
  endReason: string | null;
  createdAt: string;
  confirmedAt: string | null;
  endedAt: string | null;
  funding: string;
  pricePaid: number;
  currency: string;
  course: {
    id: string;
    slug: string;
    title: string;
    mode: CourseMode;
    status: string;
    level: string;
    category: string | null;
    trainer: string;
    provider: string | null;
    source: string;
    city: string | null;
    venue: string | null;
    startsAt: string | null;
    endsAt: string | null;
    durationHours: number | null;
    requiresApproval: boolean;
  };
  payment: { id: string; method: string; status: string; createdAt: string; amount: number } | null;
  receiptId: string | null;
  sessions: SessionView[];
  counts: { attended: number; absent: number; notStarted: number; total: number; percent: number };
  todaySession: SessionView | null;
  nextSession: SessionView | null;
  liveSession: SessionView | null;
  modules: ModuleView[];
  lessonsDone: number;
  lessonsTotal: number;
  resumeLessonId: string | null;
  lastLesson: { module: number; lesson: number } | null;
  files: { id: string; title: string; ext: string; url: string | null }[];
  hasQuiz: boolean;
  refunds: RefundSummary[];
  openRefund: RefundSummary | null;
  canWithdraw: boolean;
  isPaid: boolean;
};

/** One enrollment of the signed-in trainee with everything TRN-MYE-02 shows; null when missing or foreign. */
export const getEnrollmentDetail = cache(async (userId: string, enrollmentId: string): Promise<EnrollmentDetail | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(enrollmentId)) return null;
  const supabase = await createClient();
  const now = new Date();
  const { data: e, error } = await supabase
    .from("enrollments")
    .select(
      "id, status, funding, price_paid, currency, created_at, confirmed_at, ended_at, end_reason, course_id, courses(id, slug, title, mode, status, level, city, venue, starts_at, ends_at, duration_hours, requires_provider_approval, programs(categories(name)), trainer:profiles!courses_trainer_id_fkey(full_name), organizations(name))",
    )
    .eq("id", enrollmentId)
    .eq("trainee_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!e || !e.courses) return null;
  const c = e.courses as unknown as {
    id: string; slug: string; title: string; mode: CourseMode; status: string; level: keyof typeof LEVEL_LABELS; city: string | null; venue: string | null;
    starts_at: string | null; ends_at: string | null; duration_hours: number | null; requires_provider_approval: boolean;
    programs: { categories: { name: string } | null } | null; trainer: { full_name: string } | null; organizations: { name: string } | null;
  };

  const [sessionsRes, attendanceRes, paymentsRes, refundsRes, modulesRes, lessonsRes, progressRes] = await Promise.all([
    supabase.from("course_sessions").select("id, course_id, position, title, starts_at, ends_at, location, meeting_url, status").eq("course_id", c.id).order("position"),
    supabase.from("attendance").select("session_id").eq("trainee_id", userId),
    supabase.from("payments").select("id, method, status, created_at, amount, receipts(id)").eq("enrollment_id", e.id).order("created_at", { ascending: false }),
    supabase.from("refund_requests").select("id, status, cancelled_at, amount, created_at").eq("enrollment_id", e.id).order("created_at", { ascending: false }),
    c.mode === "recorded" ? supabase.from("course_modules").select("id, position, title").eq("course_id", c.id).order("position") : Promise.resolve({ data: [] as { id: string; position: number; title: string }[] }),
    c.mode === "recorded"
      ? supabase.from("lessons").select("id, module_id, position, duration_seconds, kind, title, media_path").eq("course_id", c.id).not("published_at", "is", null).order("position")
      : Promise.resolve({ data: [] as { id: string; module_id: string; position: number; duration_seconds: number; kind: string; title: string; media_path: string | null }[] }),
    c.mode === "recorded"
      ? supabase.from("lesson_progress").select("lesson_id, completed_at, updated_at").eq("trainee_id", userId).eq("course_id", c.id)
      : Promise.resolve({ data: [] as { lesson_id: string; completed_at: string | null; updated_at: string }[] }),
  ]);

  const attended = new Set((attendanceRes.data ?? []).map((a) => a.session_id));
  const sessions = ((sessionsRes.data ?? []) as SessionRow[]).map((s) => toSessionView(s, attended, now));
  const live = sessions.filter((s) => s.state !== "cancelled");
  const counts = {
    attended: live.filter((s) => s.state === "attended").length,
    absent: live.filter((s) => s.state === "absent").length,
    notStarted: live.filter((s) => s.state === "upcoming" || s.state === "today").length,
    total: live.length,
    percent: 0,
  };
  counts.percent = counts.total ? Math.round((counts.attended / counts.total) * 100) : 0;
  const todaySession = live.find((s) => s.state === "today") ?? null;
  const nextSession = live.find((s) => new Date(s.endsAt) > now) ?? null;
  const liveSession = c.mode === "live_remote" ? (live.find((s) => new Date(s.endsAt) > now) ?? sessions.filter((s) => new Date(s.startsAt) <= now).at(-1) ?? null) : null;

  const succeeded = (paymentsRes.data ?? []).find((p) => p.status === "succeeded" || p.status === "refunded") ?? null;
  const receipts = succeeded?.receipts as unknown as { id: string } | { id: string }[] | null | undefined;
  const receiptId = Array.isArray(receipts) ? (receipts[0]?.id ?? null) : (receipts?.id ?? null);

  // Recorded syllabus
  const lessons = lessonsRes.data ?? [];
  const progress = new Map((progressRes.data ?? []).map((p) => [p.lesson_id, p]));
  let currentFound = false;
  const modules: ModuleView[] = (modulesRes.data ?? []).map((m) => {
    const own = lessons.filter((l) => l.module_id === m.id);
    const done = own.filter((l) => progress.get(l.id)?.completed_at).length;
    let state: ModuleView["state"] = "not_started";
    if (own.length > 0 && done === own.length) state = "completed";
    else if (!currentFound) {
      state = "current";
      currentFound = true;
    }
    const resume = own.find((l) => !progress.get(l.id)?.completed_at);
    return {
      id: m.id,
      position: m.position,
      title: m.title,
      lessons: own.length,
      seconds: own.reduce((t, l) => t + l.duration_seconds, 0),
      done,
      state,
      firstLessonId: own[0]?.id ?? null,
      resumeLessonId: resume?.id ?? own[0]?.id ?? null,
    };
  });
  const lessonsDone = lessons.filter((l) => progress.get(l.id)?.completed_at).length;
  const lastTouched = [...(progressRes.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  let lastLesson: EnrollmentDetail["lastLesson"] = null;
  if (lastTouched) {
    const l = lessons.find((x) => x.id === lastTouched.lesson_id);
    const m = l && modules.find((x) => x.id === l.module_id);
    if (l && m) lastLesson = { module: m.position, lesson: l.position };
  }
  const current = modules.find((m) => m.state === "current");
  const fileLessons = lessons.filter((l) => l.kind === "file");
  const signed = fileLessons.some((l) => l.media_path)
    ? await supabase.storage.from("lesson-media").createSignedUrls(fileLessons.filter((l) => l.media_path).map((l) => l.media_path!), 600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const files = fileLessons.map((l) => ({
    id: l.id,
    title: l.title,
    ext: l.media_path && l.media_path.includes(".") ? (l.media_path.split(".").pop() ?? "").toLowerCase() : "",
    url: (signed.data ?? []).find((x) => x.path === l.media_path)?.signedUrl ?? null,
  }));

  const refunds: RefundSummary[] = (refundsRes.data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    cancelled: !!r.cancelled_at,
    amount: Number(r.amount),
    createdAt: r.created_at,
  }));
  const status = e.status as EnrollmentStatus;

  return {
    id: e.id,
    ref: refCode("ENR", e.id, e.created_at),
    status,
    statusLabel: ENROLLMENT_STATUS[status].label,
    endReason: e.end_reason,
    createdAt: e.created_at,
    confirmedAt: e.confirmed_at,
    endedAt: e.ended_at,
    funding: FUNDING_LABELS[e.funding] ?? "",
    pricePaid: Number(e.price_paid),
    currency: e.currency,
    course: {
      id: c.id,
      slug: c.slug,
      title: c.title,
      mode: c.mode,
      status: c.status,
      level: LEVEL_LABELS[c.level] ?? "",
      category: c.programs?.categories?.name ?? null,
      trainer: c.trainer?.full_name ?? "",
      provider: c.organizations?.name ?? null,
      source: c.organizations?.name ?? c.trainer?.full_name ?? "",
      city: c.city,
      venue: c.venue,
      startsAt: c.starts_at ?? sessions[0]?.startsAt ?? null,
      endsAt: c.ends_at ?? sessions.at(-1)?.endsAt ?? null,
      durationHours: c.duration_hours === null ? null : Number(c.duration_hours),
      requiresApproval: c.requires_provider_approval,
    },
    payment: succeeded ? { id: succeeded.id, method: succeeded.method, status: succeeded.status, createdAt: succeeded.created_at, amount: Number(succeeded.amount) } : null,
    receiptId,
    sessions,
    counts,
    todaySession,
    nextSession,
    liveSession,
    modules,
    lessonsDone,
    lessonsTotal: lessons.length,
    resumeLessonId: current?.resumeLessonId ?? modules[0]?.firstLessonId ?? null,
    lastLesson,
    files,
    hasQuiz: lessons.some((l) => l.kind === "quiz"),
    refunds,
    openRefund: refunds.find((r) => r.status === "under_review") ?? null,
    canWithdraw: ["pending_provider", "confirmed", "in_progress"].includes(status),
    isPaid: !!succeeded && Number(e.price_paid) > 0,
  };
});

/* ─────────────────────────────── Refund quote (TRN-MYE-03, TRN-RFD-01) ─────────────────────────────── */

export type RefundQuote = {
  percent: number;
  amount: number;
  tier: string;
  paid: number;
  currency: string;
  referenceAt: string;
  startsAt: string | null;
  daysBefore: number | null;
  windowEndsAt: string | null;
};

export async function getRefundQuote(enrollmentId: string): Promise<RefundQuote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("refund_quote", { p_enrollment: enrollmentId });
  if (error || !data?.[0]) return null;
  const q = data[0];
  return {
    percent: q.percent,
    amount: Number(q.amount),
    tier: q.tier,
    paid: Number(q.paid),
    currency: q.currency,
    referenceAt: q.reference_at,
    startsAt: q.starts_at ?? null,
    daysBefore: q.days_before ?? null,
    windowEndsAt: q.window_ends_at ?? null,
  };
}
