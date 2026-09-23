import "server-only";
import { createClient } from "@/lib/supabase/server";
import { COURSE_CARD_SELECT, courseBase, toCatalogCard, type CourseCardRow } from "@/lib/data/courses";
import { ENROLLMENT_STATUS, FUNDING_LABELS } from "@/lib/labels";
import { formatNumericDate, formatPrice, formatRelative, formatSessionTime, pluralAr, toArabicDigits } from "@/lib/format";
import type { CourseCardView } from "@/types/views";

export type ActivityKind = "lesson" | "quiz" | "session" | "refund" | "certificate" | "enrollment";
export type ActivityItem = { id: string; kind: ActivityKind; at: string; title: string; description: string };
export type MilestoneView = { id: string; value: string; label: string; description: string; tone: "brand" | "success" | "info"; progress?: number };
export type CertificateView = {
  id: string;
  title: string;
  meta: string;
  kind: "platform" | "external";
  status: { label: string; tone: "success" | "warning" | "error" };
  href: string;
  verifyCode: string | null;
};
export type AchievementView = { id: string; label: string; earned: boolean };

export type DashboardView = {
  hero: { track: string | null; greeting: string; summary: string; percent: number; primaryHref: string; hasEnrollments: boolean };
  waitlistInvite: { entryId: string; courseTitle: string; expiresAt: string; otherWaiting: number } | null;
  continueCourses: CourseCardView[];
  activeCount: number;
  nextSessionAt: string | null;
  recommended: CourseCardView[];
  activity: ActivityItem[];
  milestones: MilestoneView[];
  certificates: CertificateView[];
  achievements: AchievementView[];
};

const ACTIVE = ["pending_provider", "confirmed", "in_progress"] as const;

function greetingFor(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Riyadh" }).format(now));
  return hour < 12 ? "صباح الخير" : "مساء الخير";
}

export async function getDashboard(userId: string, fullName: string): Promise<DashboardView> {
  const supabase = await createClient();
  const now = new Date();

  const [enrollmentsRes, prefsRes, invitesRes, waitingRes, certsRes, extCertsRes] = await Promise.all([
    supabase
      .from("enrollments")
      .select(`id, status, funding, confirmed_at, completed_at, course_id, courses(${COURSE_CARD_SELECT})`)
      .eq("trainee_id", userId)
      .not("status", "in", "(withdrawn,cancelled,access_revoked)")
      .order("created_at", { ascending: false }),
    supabase.from("trainee_preferences").select("category_ids").eq("user_id", userId).maybeSingle(),
    supabase
      .from("waitlist_entries")
      .select("id, invite_expires_at, courses(title)")
      .eq("trainee_id", userId)
      .eq("status", "invited")
      .gt("invite_expires_at", now.toISOString())
      .order("invite_expires_at")
      .limit(1),
    supabase.from("waitlist_entries").select("id", { count: "exact", head: true }).eq("trainee_id", userId).eq("status", "waiting"),
    supabase
      .from("certificates")
      .select("id, code, course_title, status, issued_at, organizations(name), trainer:profiles!certificates_trainer_id_fkey(full_name)")
      .eq("trainee_id", userId)
      .order("issued_at", { ascending: false }),
    supabase.from("external_certificates").select("id, title, issuer, issued_on, status").eq("trainee_id", userId).order("created_at", { ascending: false }),
  ]);

  const enrollments = (enrollmentsRes.data ?? []).filter((e) => e.courses) as unknown as {
    id: string;
    status: keyof typeof ENROLLMENT_STATUS;
    funding: string;
    confirmed_at: string | null;
    completed_at: string | null;
    course_id: string;
    courses: CourseCardRow;
  }[];
  const active = enrollments.filter((e) => (ACTIVE as readonly string[]).includes(e.status));
  const activeCourseIds = active.map((e) => e.course_id);

  // Progress inputs for active courses: sessions + attendance (live/in-person), lessons + progress (recorded).
  const [sessionsRes, attendanceRes, lessonsRes, progressRes] = await Promise.all([
    activeCourseIds.length
      ? supabase.from("course_sessions").select("id, course_id, starts_at, ends_at, status").in("course_id", activeCourseIds).order("starts_at")
      : Promise.resolve({ data: [] as { id: string; course_id: string; starts_at: string; ends_at: string; status: string }[] }),
    supabase.from("attendance").select("session_id, checked_in_at, course_sessions(title, starts_at, ends_at, courses(title))").eq("trainee_id", userId).order("checked_in_at", { ascending: false }),
    activeCourseIds.length
      ? supabase.from("lessons").select("id, course_id").in("course_id", activeCourseIds).not("published_at", "is", null)
      : Promise.resolve({ data: [] as { id: string; course_id: string }[] }),
    supabase
      .from("lesson_progress")
      .select("lesson_id, course_id, completed_at, lessons(title, duration_seconds), courses(title)")
      .eq("trainee_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
  ]);

  const sessions = sessionsRes.data ?? [];
  const attendedIds = new Set((attendanceRes.data ?? []).map((a) => a.session_id));
  const lessons = lessonsRes.data ?? [];
  const completedLessons = progressRes.data ?? [];
  const completedLessonIds = new Set(completedLessons.map((p) => p.lesson_id));

  let nextSessionAt: string | null = null;
  const continueCourses: CourseCardView[] = active.slice(0, 3).map((e) => {
    const c = e.courses;
    let progress: { label: string; percent: number };
    let nextSession: string | null = null;
    if (c.mode === "recorded") {
      const total = lessons.filter((l) => l.course_id === c.id).length;
      const done = lessons.filter((l) => l.course_id === c.id && completedLessonIds.has(l.id)).length;
      progress = { label: `الدروس · ${toArabicDigits(done)} من ${toArabicDigits(total)}`, percent: total ? (done / total) * 100 : 0 };
    } else {
      const own = sessions.filter((s) => s.course_id === c.id && s.status !== "cancelled");
      const attended = own.filter((s) => attendedIds.has(s.id)).length;
      progress = { label: `الحضور · ${toArabicDigits(attended)} من ${toArabicDigits(own.length)} جلسة`, percent: own.length ? (attended / own.length) * 100 : 0 };
      const upcoming = own.find((s) => new Date(s.ends_at) > now);
      if (upcoming) {
        nextSession = `الجلسة القادمة: ${formatSessionTime(upcoming.starts_at)}`;
        if (!nextSessionAt || upcoming.starts_at < nextSessionAt) nextSessionAt = upcoming.starts_at;
      }
    }
    return {
      ...courseBase(c),
      variant: "enrolled",
      status: ENROLLMENT_STATUS[e.status],
      href: `/trainee/trainings/${e.id}`,
      cta: c.mode === "recorded" ? "تابع التعلّم" : "تابع الدورة",
      progress,
      nextSession,
      funding: FUNDING_LABELS[e.funding] ?? "",
    };
  });

  // Recommendations: open courses the trainee is not enrolled in, preferred categories first.
  const enrolledIds = new Set(enrollments.map((e) => e.course_id));
  const { data: catalog } = await supabase.from("courses").select(COURSE_CARD_SELECT).eq("status", "open").order("created_at", { ascending: false }).limit(24);
  const preferred = new Set(prefsRes.data?.category_ids ?? []);
  const { data: prefCats } = preferred.size
    ? await supabase.from("categories").select("id, name").in("id", [...preferred])
    : { data: [] as { id: string; name: string }[] };
  const prefNames = new Set((prefCats ?? []).map((c) => c.name));
  const recommended = ((catalog ?? []) as unknown as CourseCardRow[])
    .filter((c) => !enrolledIds.has(c.id))
    .sort((a, b) => Number(prefNames.has(b.programs?.categories?.name ?? "")) - Number(prefNames.has(a.programs?.categories?.name ?? "")))
    .slice(0, 3)
    .map((c) => toCatalogCard(c, { status: prefNames.has(c.programs?.categories?.name ?? "") ? { label: "مقترح لك", tone: "accent" } : null }));

  // Activity feed from real events.
  const [quizRes, refundRes] = await Promise.all([
    supabase.from("quiz_attempts").select("id, score_percent, passed, submitted_at, quizzes(title, courses(title))").eq("trainee_id", userId).not("submitted_at", "is", null).order("submitted_at", { ascending: false }).limit(5),
    supabase.from("refund_requests").select("id, amount, decided_at, status, enrollments(currency)").eq("trainee_id", userId).eq("status", "approved").order("decided_at", { ascending: false }).limit(5),
  ]);
  const activity: ActivityItem[] = [
    ...completedLessons.slice(0, 5).map((p) => ({
      id: `l-${p.lesson_id}`,
      kind: "lesson" as const,
      at: p.completed_at!,
      title: `أنهيت درس «${p.lessons?.title ?? ""}»`,
      description: p.courses?.title ?? "",
    })),
    ...(quizRes.data ?? []).map((q) => ({
      id: `q-${q.id}`,
      kind: "quiz" as const,
      at: q.submitted_at!,
      title: q.passed ? `اجتزت ${q.quizzes?.title ?? "الاختبار"}` : `أنهيت ${q.quizzes?.title ?? "الاختبار"}`,
      description: `بنسبة ${toArabicDigits(q.score_percent ?? 0)}٪ · ${q.quizzes?.courses?.title ?? ""}`,
    })),
    ...(attendanceRes.data ?? []).slice(0, 5).map((a) => ({
      id: `a-${a.session_id}`,
      kind: "session" as const,
      at: a.checked_in_at,
      title: "حضرت جلسة",
      description: `${a.course_sessions?.title ?? ""} · ${a.course_sessions?.courses?.title ?? ""}`,
    })),
    ...(refundRes.data ?? []).map((r) => ({
      id: `r-${r.id}`,
      kind: "refund" as const,
      at: r.decided_at!,
      title: "اعتُمد استردادك",
      description: `${formatPrice(Number(r.amount), r.enrollments?.currency ?? "SAR")} — في طريقها لبطاقتك`,
    })),
    ...(certsRes.data ?? []).slice(0, 5).map((c) => ({
      id: `c-${c.id}`,
      kind: "certificate" as const,
      at: c.issued_at,
      title: "صدرت شهادتك",
      description: `${c.course_title} — قابلة للتحقق`,
    })),
    ...enrollments
      .filter((e) => e.confirmed_at)
      .slice(0, 5)
      .map((e) => ({ id: `e-${e.id}`, kind: "enrollment" as const, at: e.confirmed_at!, title: "تأكّد تسجيلك", description: e.courses.title })),
  ]
    .filter((a) => a.at)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  // Milestones: learning hours this week vs last week, verified certificates, plan completion.
  const weekAgo = new Date(now.getTime() - 7 * 864e5);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 864e5);
  const lessonSeconds = (from: Date, to: Date) =>
    completedLessons.filter((p) => new Date(p.completed_at!) >= from && new Date(p.completed_at!) < to).reduce((s, p) => s + (p.lessons?.duration_seconds ?? 0), 0);
  const sessionSeconds = (from: Date, to: Date) =>
    (attendanceRes.data ?? [])
      .filter((a) => new Date(a.checked_in_at) >= from && new Date(a.checked_in_at) < to && a.course_sessions)
      .reduce((s, a) => s + (new Date(a.course_sessions!.ends_at).getTime() - new Date(a.course_sessions!.starts_at).getTime()) / 1000, 0);
  const thisWeekH = Math.round((lessonSeconds(weekAgo, now) + sessionSeconds(weekAgo, now)) / 3600);
  const lastWeekH = Math.round((lessonSeconds(twoWeeksAgo, weekAgo) + sessionSeconds(twoWeeksAgo, weekAgo)) / 3600);
  const diff = thisWeekH - lastWeekH;
  const issued = (certsRes.data ?? []).filter((c) => c.status === "issued").length;
  const verifiedExternal = (extCertsRes.data ?? []).filter((c) => c.status === "verified").length;
  const plannable = enrollments.filter((e) => e.status !== "pending_payment");
  const completed = plannable.filter((e) => e.status === "completed").length;
  const planPercent = plannable.length ? Math.round((completed / plannable.length) * 100) : 0;

  // Track = most common category among the trainee's courses (or their first preferred field).
  const catCount = new Map<string, number>();
  plannable.forEach((e) => {
    const n = e.courses.programs?.categories?.name;
    if (n) catCount.set(n, (catCount.get(n) ?? 0) + 1);
  });
  const track = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? prefCats?.[0]?.name ?? null;

  const firstName = fullName.replace(/^(م\.|د\.|أ\.)\s*/, "").split(/\s+/)[0] || "";
  const remaining = plannable.length - completed;
  let summary: string;
  if (plannable.length === 0) {
    summary = "لم تبدأ أي دورة بعد. اكتشف البرامج المناسبة لمسارك وسجّل في أول دورة لك اليوم.";
  } else {
    summary = `أنجزت ${pluralAr(completed, ["دورة واحدة", "دورتين", "دورات", "دورة"])} من ${toArabicDigits(plannable.length)} في خطتك.`;
    if (completed === 0) summary = `سجّلت في ${pluralAr(plannable.length, ["دورة واحدة", "دورتين", "دورات", "دورة"])} ولم تُكمل أيًّا منها بعد.`;
    if (nextSessionAt) summary += ` جلستك القادمة ${formatRelative(nextSessionAt, now)}`;
    if (remaining > 0) summary += `${nextSessionAt ? " — " : " "}تبقّت ${pluralAr(remaining, ["دورة واحدة", "دورتان", "دورات", "دورة"])} لإكمال المسار.`;
    else summary += " أكملت كل دورات خطتك — أحسنت!";
  }

  const platformCerts: CertificateView[] = (certsRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.course_title,
    meta: `${c.organizations?.name ?? c.trainer?.full_name ?? ""} · ${formatNumericDate(c.issued_at)}`,
    kind: "platform",
    status: c.status === "issued" ? { label: "صادرة عن المنصة", tone: "success" } : { label: "مسحوبة", tone: "error" },
    href: `/trainee/certificates/${c.id}`,
    verifyCode: c.status === "issued" ? c.code : null,
  }));
  const externalCerts: CertificateView[] = (extCertsRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    meta: `${c.issuer} · ${formatNumericDate(c.issued_on)}`,
    kind: "external",
    status:
      c.status === "verified"
        ? { label: "شهادة خارجية — موثّقة من المنصة", tone: "success" }
        : c.status === "rejected"
          ? { label: "شهادة خارجية — مرفوضة", tone: "error" }
          : { label: "مرفوعة من صاحبها — لم تتحقق منها المنصة", tone: "warning" },
    href: `/trainee/certificates/external/${c.id}`,
    verifyCode: null,
  }));

  return {
    hero: {
      track,
      greeting: `${greetingFor(now)} ${firstName}`.trim(),
      summary,
      percent: planPercent,
      primaryHref: continueCourses[0]?.href ?? "/trainee/discover",
      hasEnrollments: plannable.length > 0,
    },
    waitlistInvite: invitesRes.data?.[0]
      ? {
          entryId: invitesRes.data[0].id,
          courseTitle: invitesRes.data[0].courses?.title ?? "",
          expiresAt: invitesRes.data[0].invite_expires_at!,
          otherWaiting: waitingRes.count ?? 0,
        }
      : null,
    continueCourses,
    activeCount: active.length,
    nextSessionAt,
    recommended,
    activity,
    milestones: [
      {
        id: "hours",
        value: toArabicDigits(thisWeekH),
        label: thisWeekH === 1 ? "ساعة هذا الأسبوع" : "ساعات هذا الأسبوع",
        description:
          diff > 0 ? `بزيادة ${pluralAr(diff, ["ساعة", "ساعتين", "ساعات", "ساعة"])} عن الأسبوع الماضي.` : diff < 0 ? `أقل بـ${pluralAr(-diff, ["ساعة", "ساعتين", "ساعات", "ساعة"])} من الأسبوع الماضي.` : "مثل الأسبوع الماضي.",
        tone: "info",
      },
      {
        id: "certificates",
        value: toArabicDigits(issued + verifiedExternal),
        label: "شهادات موثّقة",
        description: issued + verifiedExternal > 0 ? "كلها قابلة للتحقق برابط عام." : "ستظهر هنا شهاداتك بعد إتمام أول دورة.",
        tone: "success",
      },
      {
        id: "plan",
        value: `${toArabicDigits(planPercent)}٪`,
        label: "من خطتك التعليمية",
        description: plannable.length
          ? `أنجزت ${pluralAr(completed, ["دورة واحدة", "دورتين", "دورات", "دورة"])} من ${toArabicDigits(plannable.length)}${track ? ` في مسار ${track}` : ""}.`
          : "سجّل في دورتك الأولى لبدء خطتك.",
        tone: "brand",
        progress: planPercent,
      },
    ],
    certificates: [...platformCerts, ...externalCerts].slice(0, 2),
    achievements: [
      { id: "path-complete", label: "مسار مكتمل", earned: plannable.length > 0 && completed === plannable.length },
      { id: "five-courses", label: "خمس دورات", earned: completed >= 5 },
      { id: "first-certificate", label: "أول شهادة", earned: issued > 0 },
      { id: "ten-courses", label: "عشر دورات", earned: completed >= 10 },
    ],
  };
}
