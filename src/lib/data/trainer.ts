import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth";
import type { Database } from "@/types/database";
import { programPhase, type ProgramPhase } from "@/lib/trainer-programs";

/* Trainer workspace read models (TRR-*). Everything runs as the signed-in trainer (RLS); cross-table figures that
 * RLS does not expose to trainers (payments, ratings aggregates) come from the `trainer_stats()` RPC. */

export type TrainerProfileRow = Database["public"]["Tables"]["trainer_profiles"]["Row"];

export async function getTrainerProfile(userId: string): Promise<TrainerProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trainer_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export type TrainerStats = {
  commissionPercent: number;
  available: number;
  pending: number;
  monthTotal: number;
  threeMonthAvg: number;
  firstPaymentAt: string | null;
  activeTrainees: number;
  newTraineesMonth: number;
  firstEnrollmentAt: string | null;
  ratingCount: number;
  ratingTrainer: number | null;
  ratingContent: number | null;
  ratingOrganization: number | null;
  lowRatings: number;
  platformRatingAvg: number | null;
};

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export const getTrainerStats = cache(async (): Promise<TrainerStats> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trainer_stats");
  if (error) throw new Error(error.message);
  const s = (data ?? {}) as Record<string, unknown>;
  return {
    commissionPercent: num(s.commission_percent) ?? 10,
    available: num(s.available) ?? 0,
    pending: num(s.pending) ?? 0,
    monthTotal: num(s.month_total) ?? 0,
    threeMonthAvg: num(s.three_month_avg) ?? 0,
    firstPaymentAt: (s.first_payment_at as string | null) ?? null,
    activeTrainees: num(s.active_trainees) ?? 0,
    newTraineesMonth: num(s.new_trainees_month) ?? 0,
    firstEnrollmentAt: (s.first_enrollment_at as string | null) ?? null,
    ratingCount: num(s.rating_count) ?? 0,
    ratingTrainer: num(s.rating_trainer),
    ratingContent: num(s.rating_content),
    ratingOrganization: num(s.rating_organization),
    lowRatings: num(s.low_ratings) ?? 0,
    platformRatingAvg: num(s.platform_rating_avg),
  };
});

export type Qualification = {
  id: string;
  kind: "academic" | "professional";
  title: string;
  issuer: string;
  year: number | null;
  verified: boolean;
  hasFile: boolean;
  createdAt: string;
};
export type Experience = {
  id: string;
  title: string;
  organization: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  createdAt: string;
};
export type TrainerProgram = {
  id: string;
  slug: string;
  title: string;
  status: string;
  /** Lifecycle from status + review_state (`programPhase`): draft · under_review · needs_changes · rejected · published · suspended. */
  phase: ProgramPhase;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  coursesCount: number;
  learners: number;
  ratingAvg: number | null;
};
export type TrainerCourse = {
  id: string;
  slug: string;
  title: string;
  programId: string;
  mode: Database["public"]["Enums"]["course_mode"];
  status: Database["public"]["Enums"]["course_status"];
  startsAt: string | null;
  endsAt: string | null;
  learners: number;
  capacity: number | null;
  ratingAvg: number;
  ratingCount: number;
  price: number;
  city: string | null;
  venue: string | null;
  coverPath: string | null;
  durationHours: number | null;
  organization: string | null;
  createdAt: string;
};

export type TrainerOverview = {
  profile: TrainerProfileRow | null;
  account: { fullName: string; headline: string | null; bio: string | null; avatarPath: string | null; city: string | null; isPublic: boolean };
  identityStatus: CurrentUser["identityStatus"];
  identityVerifiedAt: string | null;
  identityPendingSince: string | null;
  workspaceSince: string | null;
  qualifications: Qualification[];
  experiences: Experience[];
  programs: TrainerProgram[];
  courses: TrainerCourse[];
  portfolioCount: number;
  eventsCount: number;
  stats: TrainerStats;
};

/** Everything the trainer home / journey / profile screens derive their state from. Cached per request. */
export const getTrainerOverview = cache(async (userId: string): Promise<TrainerOverview> => {
  const supabase = await createClient();
  const [profile, account, ws, idv, quals, exps, programs, courses, portfolio, events, stats] = await Promise.all([
    supabase.from("trainer_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("full_name, headline, bio, avatar_path, city, is_public, identity_status").eq("id", userId).single(),
    supabase.from("user_workspaces").select("created_at").eq("user_id", userId).eq("kind", "trainer").maybeSingle(),
    supabase.from("identity_verifications").select("status, submitted_at, reviewed_at").eq("user_id", userId).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("trainer_qualifications").select("id, kind, title, issuer, year, file_path, verified_at, created_at").eq("trainer_id", userId).order("created_at"),
    supabase.from("experiences").select("id, title, organization, start_date, end_date, is_current, created_at").eq("user_id", userId).order("start_date", { ascending: false }),
    supabase.from("programs").select("id, slug, title, status, review_state, submitted_at, created_at, updated_at").eq("owner_id", userId).order("updated_at", { ascending: false }),
    supabase
      .from("courses")
      .select("id, slug, title, program_id, mode, status, starts_at, ends_at, learners_count, capacity, rating_avg, rating_count, price, city, venue, cover_path, duration_hours, created_at, organizations(name)")
      .eq("trainer_id", userId)
      .order("starts_at", { ascending: false, nullsFirst: false }),
    supabase.from("trainer_portfolio_items").select("id", { count: "exact", head: true }).eq("trainer_id", userId),
    supabase.from("trainer_calendar_events").select("id", { count: "exact", head: true }).eq("trainer_id", userId),
    getTrainerStats(),
  ]);
  for (const r of [profile, account, ws, idv, quals, exps, programs, courses, portfolio, events]) if (r.error) throw new Error(r.error.message);

  const courseRows: TrainerCourse[] = (courses.data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    programId: c.program_id,
    mode: c.mode,
    status: c.status,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    learners: c.learners_count,
    capacity: c.capacity,
    ratingAvg: Number(c.rating_avg),
    ratingCount: c.rating_count,
    price: Number(c.price),
    city: c.city,
    venue: c.venue,
    coverPath: c.cover_path,
    durationHours: c.duration_hours === null ? null : Number(c.duration_hours),
    organization: (c.organizations as { name: string } | null)?.name ?? null,
    createdAt: c.created_at,
  }));

  const programRows: TrainerProgram[] = (programs.data ?? []).map((p) => {
    const own = courseRows.filter((c) => c.programId === p.id);
    const rated = own.filter((c) => c.ratingCount > 0);
    const ratingSum = rated.reduce((s, c) => s + c.ratingAvg * c.ratingCount, 0);
    const ratingCount = rated.reduce((s, c) => s + c.ratingCount, 0);
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: p.status,
      phase: programPhase(p.status, p.review_state),
      submittedAt: p.submitted_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      coursesCount: own.length,
      learners: own.reduce((s, c) => s + c.learners, 0),
      ratingAvg: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    };
  });

  const a = account.data!;
  return {
    profile: profile.data,
    account: { fullName: a.full_name, headline: a.headline, bio: a.bio, avatarPath: a.avatar_path, city: a.city, isPublic: a.is_public },
    identityStatus: a.identity_status,
    identityVerifiedAt: idv.data?.status === "verified" ? (idv.data.reviewed_at ?? idv.data.submitted_at) : null,
    identityPendingSince: idv.data?.status === "pending" ? idv.data.submitted_at : null,
    workspaceSince: ws.data?.created_at ?? null,
    qualifications: (quals.data ?? []).map((q) => ({
      id: q.id,
      kind: q.kind as Qualification["kind"],
      title: q.title,
      issuer: q.issuer,
      year: q.year,
      verified: Boolean(q.verified_at),
      hasFile: Boolean(q.file_path),
      createdAt: q.created_at,
    })),
    experiences: (exps.data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      organization: e.organization,
      startDate: e.start_date,
      endDate: e.end_date,
      isCurrent: e.is_current,
      createdAt: e.created_at,
    })),
    programs: programRows,
    courses: courseRows,
    portfolioCount: portfolio.count ?? 0,
    eventsCount: events.count ?? 0,
    stats,
  };
});

/* ─── Accreditation journey (TRR-JRN-01): nine stages, all derived from real data ─────────────────────── */

export type StageKey = "account" | "identity" | "profile" | "qualifications" | "program" | "review" | "course" | "trainees" | "revenue";
export type Stage = {
  key: StageKey;
  n: number;
  title: string;
  description: string;
  done: boolean;
  doneAt: string | null;
  state: "done" | "current" | "locked";
  /** Why the stage is locked, or what is missing ("ناقص مؤهلان"). */
  note: string;
  href: string;
};

/** Sent to the platform: waiting for its decision or already approved. */
const SUBMITTED = (p: TrainerProgram) => p.phase === "under_review" || p.phase === "published";

export function qualificationChecklist(o: TrainerOverview) {
  return [
    { key: "academic", label: "المؤهل الأكاديمي", done: o.qualifications.some((q) => q.kind === "academic"), missingLabel: "ناقص" },
    { key: "professional", label: "الاعتماد المهني", done: o.qualifications.some((q) => q.kind === "professional"), missingLabel: "ناقص" },
    { key: "experience", label: "خبرة سابقة واحدة", done: o.experiences.length > 0, missingLabel: "ناقصة" },
  ];
}

export function isProfileComplete(o: TrainerOverview) {
  // TRR-JRN-01 stage 3 «النبذة والتخصصات»: a bio, a professional headline and at least one specialty.
  return Boolean(o.account.bio && o.account.bio.trim().length >= 20 && o.account.headline?.trim() && (o.profile?.specialties.length ?? 0) > 0);
}

export function computeJourney(o: TrainerOverview): { stages: Stage[]; doneCount: number; percent: number; current: Stage | null } {
  const checklist = qualificationChecklist(o);
  const missingQuals = checklist.filter((c) => !c.done).length;
  const latest = (dates: (string | null | undefined)[]) => dates.filter(Boolean).sort().at(-1) ?? null;
  const earliest = (dates: (string | null | undefined)[]) => dates.filter(Boolean).sort()[0] ?? null;
  const submitted = o.programs.filter(SUBMITTED);
  const published = o.programs.filter((p) => p.phase === "published");
  const hasDraft = o.programs.some((p) => p.phase === "draft" || p.phase === "needs_changes");

  const raw: Omit<Stage, "state" | "n">[] = [
    { key: "account", title: "إنشاء الحساب", description: "سجّلت ووصلت للمنصة.", done: true, doneAt: o.workspaceSince, note: "", href: "/account" },
    {
      key: "identity",
      title: "توثيق الهوية",
      description: "رفعت هويتك وتحقّقنا منها.",
      done: o.identityStatus === "verified",
      doneAt: o.identityVerifiedAt,
      note: o.identityPendingSince ? "قيد المراجعة" : "",
      href: "/account",
    },
    {
      key: "profile",
      title: "بناء الملف المهني",
      description: "النبذة والتخصصات واللغات.",
      done: isProfileComplete(o),
      doneAt: o.profile?.profile_completed_at ?? o.profile?.updated_at ?? null,
      note: "بعد توثيق الهوية",
      href: "/trainer/profile/edit",
    },
    {
      key: "qualifications",
      title: "المؤهلات والخبرات",
      description: "ادعاءاتك المهنية موسومة «مُدخَلة من صاحبها».",
      done: missingQuals === 0,
      doneAt: latest([...o.qualifications.map((q) => q.createdAt), ...o.experiences.map((e) => e.createdAt)]),
      note: missingQuals === 0 ? "" : missingQuals === 1 ? "ناقص مؤهل واحد" : missingQuals === 2 ? "ناقص مؤهلان" : "ناقص ٣ مؤهلات",
      href: "/trainer/profile/edit#qualifications",
    },
    {
      key: "program",
      title: "إنشاء البرنامج التدريبي",
      description: "المنتج التعليمي: الوصف والأهداف والمحتوى والسعر.",
      done: submitted.length > 0,
      doneAt: earliest(submitted.map((p) => p.submittedAt ?? p.createdAt)),
      note: hasDraft ? "مسودة" : "يحتاج ملفًا مكتملًا",
      href: "/trainer/programs",
    },
    {
      key: "review",
      title: "مراجعة واعتماد البرنامج",
      description: "تراجعه المنصة خلال ٣ أيام عمل.",
      done: published.length > 0,
      doneAt: earliest(published.map((p) => p.updatedAt)),
      note: submitted.length > 0 ? "قيد المراجعة" : "بعد إرسال البرنامج",
      href: "/trainer/programs",
    },
    {
      key: "course",
      title: "إنشاء أول دورة",
      description: "تنفيذ مجدول للبرنامج المعتمد: تاريخ ومكان ومقاعد.",
      done: o.courses.length > 0,
      doneAt: earliest(o.courses.map((c) => c.createdAt)),
      note: "يشترط برنامجًا منشورًا",
      href: "/trainer/courses",
    },
    {
      key: "trainees",
      title: "استقبال المتدربين",
      description: "التسجيلات والحضور والنتائج والشهادات.",
      done: Boolean(o.stats.firstEnrollmentAt),
      doneAt: o.stats.firstEnrollmentAt,
      note: "بعد نشر الدورة",
      href: "/trainer/courses",
    },
    {
      key: "revenue",
      title: "تحقيق الإيرادات",
      description: "رصيدك ومستحقاتك وطلبات السحب.",
      done: Boolean(o.stats.firstPaymentAt),
      doneAt: o.stats.firstPaymentAt,
      note: "بعد أول تسجيل مدفوع",
      href: "/trainer/finance",
    },
  ];
  const currentIndex = raw.findIndex((s) => !s.done);
  const stages: Stage[] = raw.map((s, i) => ({
    ...s,
    n: i + 1,
    state: s.done ? "done" : i === currentIndex ? "current" : "locked",
  }));
  const doneCount = stages.filter((s) => s.done).length;
  return { stages, doneCount, percent: Math.round((doneCount / stages.length) * 100), current: currentIndex >= 0 ? stages[currentIndex] : null };
}

/** Home state (TRR-DSH-01): new trainer (296:8159), partial accreditation (296:8468) or default (256:848). */
export function homeState(o: TrainerOverview): "new" | "partial" | "default" {
  if (o.courses.length > 0) return "default";
  const setupDone = o.identityStatus === "verified" && isProfileComplete(o) && qualificationChecklist(o).every((c) => c.done);
  if (!setupDone && o.programs.length === 0) return "new";
  return "partial";
}

/** «قوة ملفك» (TRR-PRF-02 · 290:7769): the eight elements that make a profile complete. */
export function profileStrength(o: TrainerOverview) {
  const items = [
    { key: "photo", label: "صورة شخصية", done: Boolean(o.account.avatarPath) },
    { key: "bio", label: "نبذة مهنية", done: Boolean(o.account.bio && o.account.bio.trim().length >= 20) },
    { key: "platform", label: "اعتماد المنصة", done: o.identityStatus === "verified" },
    { key: "qualifications", label: "مؤهلان", done: o.qualifications.length >= 2 },
    { key: "experiences", label: "خبرتان", done: o.experiences.length >= 2 },
    { key: "cv", label: "السيرة الذاتية", done: Boolean(o.profile?.cv_path) },
    { key: "portfolio", label: "معرض أعمال", done: o.portfolioCount > 0 },
    { key: "video", label: "فيديو تعريفي", done: Boolean(o.profile?.intro_video_url) },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, percent: Math.round((done / items.length) * 100) };
}

export type DaySession = {
  id: string;
  courseId: string;
  courseTitle: string;
  mode: TrainerCourse["mode"];
  title: string;
  startsAt: string;
  endsAt: string;
  place: string | null;
  organization: string | null;
  learners: number;
  attendanceRecorded: boolean;
};

/** Start of a Riyadh calendar day (UTC+3, no DST). */
export function riyadhDayStart(d: Date): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(d);
  return new Date(`${ymd}T00:00:00+03:00`);
}

/** Sessions of the trainer's courses between two instants — «جدول اليوم» and the calendar. */
export async function getSessionsBetween(o: TrainerOverview, from: Date, to: Date): Promise<DaySession[]> {
  if (o.courses.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_sessions")
    .select("id, course_id, title, starts_at, ends_at, location, status")
    .in("course_id", o.courses.map((c) => c.id))
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    .neq("status", "cancelled")
    .order("starts_at");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const att = rows.length ? await supabase.from("attendance").select("session_id").in("session_id", rows.map((r) => r.id)) : { data: [] as { session_id: string }[] };
  const recorded = new Set((att.data ?? []).map((a) => a.session_id));
  const byId = new Map(o.courses.map((c) => [c.id, c]));
  return rows.map((r) => {
    const c = byId.get(r.course_id);
    return {
      id: r.id,
      courseId: r.course_id,
      courseTitle: c?.title ?? "",
      mode: c?.mode ?? "in_person",
      title: r.title,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      place: r.location ?? c?.venue ?? null,
      organization: c?.organization ?? null,
      learners: c?.learners ?? 0,
      attendanceRecorded: recorded.has(r.id),
    };
  });
}
