import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatRelative, pluralAr } from "@/lib/format";
import { getTrainerOverview, type TrainerOverview } from "@/lib/data/trainer";

/*
 * TRR-QUE-01 · بانتظار إجرائي — every item is derived from real rows (sessions without attendance, draft / submitted
 * programs, identity review, provider approvals, pending earnings, an empty calendar). Dismissals reuse queue_dismissals.
 */

export type QueueIcon = "alert" | "building" | "star" | "hourglass" | "banknote" | "shield" | "file" | "calendar";
export type QueueCategory = "ratings" | "finance" | "courses" | "other";

export type TrainerQueueItem = {
  key: string;
  kind: "action" | "processing";
  category: QueueCategory;
  icon: QueueIcon;
  title: string;
  description: string;
  step: string;
  owner: string;
  ownerYou: boolean;
  eta: string;
  ref: string;
  age: string | null;
  primary: { label: string; href: string };
  secondary: "snooze" | "hide";
  sortAt: number;
  /** Short line for the dashboard card ("السلامة المهنية · انتهت أمس"). */
  summary: string;
};

export type UpcomingItem = { key: string; icon: "session" | "certificate"; title: string; detail: string };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Stable, human-friendly reference ("TRR-8204") derived from the item key. */
function refFor(key: string) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `TRR-${1000 + (h % 9000)}`;
}

const hoursWord = (n: number) => pluralAr(n, ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"]);
const daysWord = (n: number) => pluralAr(n, ["يوم واحد", "يومان", "أيام", "يومًا"]);

export const getTrainerQueue = cache(async (userId: string): Promise<{ items: TrainerQueueItem[]; upcoming: UpcomingItem[]; doneThisWeek: number; overview: TrainerOverview }> => {
  const supabase = await createClient();
  const o = await getTrainerOverview(userId);
  const now = Date.now();
  const liveCourses = o.courses.filter((c) => c.mode !== "recorded");
  const courseIds = liveCourses.map((c) => c.id);
  const none = ["00000000-0000-0000-0000-000000000000"];

  const [sessionsRes, dismissRes, pendingRes] = await Promise.all([
    supabase
      .from("course_sessions")
      .select("id, course_id, position, title, starts_at, ends_at, status")
      .in("course_id", courseIds.length ? courseIds : none)
      .gte("ends_at", new Date(now - 7 * DAY).toISOString())
      .lte("starts_at", new Date(now + 30 * DAY).toISOString())
      .order("starts_at"),
    supabase.from("queue_dismissals").select("item_key, hidden_until").eq("user_id", userId),
    supabase
      .from("enrollments")
      .select("id, course_id, created_at")
      .in("course_id", o.courses.length ? o.courses.map((c) => c.id) : none)
      .eq("status", "pending_provider"),
  ]);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  const sessions = (sessionsRes.data ?? []).filter((s) => s.status !== "cancelled");

  const ended = sessions.filter((s) => new Date(s.ends_at).getTime() <= now);
  const attendance = ended.length
    ? await supabase.from("attendance").select("session_id").in("session_id", ended.map((s) => s.id))
    : { data: [] as { session_id: string }[], error: null };
  if (attendance.error) throw new Error(attendance.error.message);
  const recorded = new Set((attendance.data ?? []).map((a) => a.session_id));
  const courseById = new Map(o.courses.map((c) => [c.id, c]));

  const items: TrainerQueueItem[] = [];

  // 1 · Attendance to record within the 48-hour window (TRR-HLP «قواعد رصد الحضور ومهلة الـ٤٨ ساعة»).
  for (const s of ended) {
    const endedAt = new Date(s.ends_at).getTime();
    if (recorded.has(s.id) || now - endedAt > 2 * DAY) continue;
    const course = courseById.get(s.course_id);
    const left = Math.max(1, Math.ceil((endedAt + 2 * DAY - now) / HOUR));
    const key = `attendance:${s.id}`;
    items.push({
      key,
      kind: "action",
      category: "courses",
      icon: "alert",
      title: `رصد حضور ${s.title}`,
      description: `${course?.title ?? ""} · انتهت الجلسة ${formatRelative(s.ends_at)} ولم يُرصد الحضور`,
      step: "الخطوة ٢ من ٣ · الرصد",
      owner: "أنت",
      ownerYou: true,
      eta: `يتبقى ${hoursWord(left)} قبل القفل التلقائي`,
      ref: refFor(key),
      age: now - endedAt > DAY ? `متأخر ${daysWord(Math.floor((now - endedAt) / DAY))}` : `انتهت ${formatRelative(s.ends_at)}`,
      primary: { label: "ارصد الحضور", href: `/trainer/courses/${s.course_id}` },
      secondary: "snooze",
      sortAt: endedAt + 2 * DAY,
      summary: `${course?.title ?? ""} · انتهت ${formatRelative(s.ends_at)}`,
    });
  }

  // 2 · Draft programs waiting to be completed and submitted.
  for (const p of o.programs.filter((x) => x.status === "draft")) {
    const key = `program_draft:${p.id}`;
    items.push({
      key,
      kind: "action",
      category: "courses",
      icon: "file",
      title: `أكمل مسودة «${p.title}»`,
      description: `محفوظة ${formatRelative(p.updatedAt)} · لم تُرسل للمراجعة بعد`,
      step: "الخطوة ١ من ٤ · المسودة",
      owner: "أنت",
      ownerYou: true,
      eta: "حين ترسلها للمراجعة",
      ref: refFor(key),
      age: `محفوظة ${formatRelative(p.updatedAt)}`,
      primary: { label: "أكمل المسودة", href: `/trainer/programs/${p.id}` },
      secondary: "snooze",
      sortAt: new Date(p.updatedAt).getTime() + 30 * DAY,
      summary: `لم يُرسل بعد · محفوظة ${formatRelative(p.updatedAt)}`,
    });
  }

  // 3 · No availability yet: organizations cannot plan with an empty calendar.
  const upcomingSessions = sessions.filter((s) => new Date(s.starts_at).getTime() > now);
  if (o.eventsCount === 0 && upcomingSessions.length === 0) {
    const key = "availability:calendar";
    items.push({
      key,
      kind: "action",
      category: "courses",
      icon: "calendar",
      title: "حدّد أيام توفّرك",
      description: "الجهات لا تستطيع طلبك ما لم تعرف متى تكون متاحًا",
      step: "الخطوة ١ من ١ · التقويم",
      owner: "أنت",
      ownerYou: true,
      eta: "فور إضافة أول موعد",
      ref: refFor(key),
      age: null,
      primary: { label: "افتح تقويمي", href: "/trainer/calendar" },
      secondary: "snooze",
      sortAt: now + 60 * DAY,
      summary: "الجهات لا تستطيع طلبك ما لم تعرف متى تكون متاحًا",
    });
  }

  // 4 · Programs under platform review.
  for (const p of o.programs.filter((x) => !["draft", "published", "archived"].includes(x.status))) {
    const key = `program_review:${p.id}`;
    items.push({
      key,
      kind: "processing",
      category: "courses",
      icon: "hourglass",
      title: `مراجعة برنامج ${p.title}`,
      description: "أُرسل للمراجعة مع الإقرار — تراجعه المنصة خلال ٣ أيام عمل",
      step: "الخطوة ٣ من ٤ · المراجعة",
      owner: "إدارة المنصة",
      ownerYou: false,
      eta: "خلال ٣ أيام عمل",
      ref: refFor(key),
      age: `أُرسل ${formatRelative(p.updatedAt)}`,
      primary: { label: "تتبّع الطلب", href: `/trainer/programs/${p.id}` },
      secondary: "hide",
      sortAt: new Date(p.updatedAt).getTime() + 3 * DAY,
      summary: `أُرسل ${formatRelative(p.updatedAt)}`,
    });
  }

  // 5 · Identity verification under review.
  if (o.identityPendingSince) {
    const key = "identity_review:account";
    items.push({
      key,
      kind: "processing",
      category: "other",
      icon: "shield",
      title: "مراجعة توثيق هويتك",
      description: "أرسلت هويتك للتحقق — يُفتح النشر والشهادات فور اعتمادها",
      step: "الخطوة ٢ من ٣ · المراجعة",
      owner: "إدارة المنصة",
      ownerYou: false,
      eta: "خلال يومي عمل",
      ref: refFor(key),
      age: `أُرسل ${formatRelative(o.identityPendingSince)}`,
      primary: { label: "اعرض التفاصيل", href: "/account" },
      secondary: "hide",
      sortAt: new Date(o.identityPendingSince).getTime() + 2 * DAY,
      summary: `أُرسل ${formatRelative(o.identityPendingSince)}`,
    });
  }

  // 6 · Enrollments waiting for the provider's approval on the trainer's courses.
  const pendingByCourse = new Map<string, { count: number; oldest: string }>();
  for (const e of pendingRes.data ?? []) {
    const cur = pendingByCourse.get(e.course_id);
    pendingByCourse.set(e.course_id, { count: (cur?.count ?? 0) + 1, oldest: cur && cur.oldest < e.created_at ? cur.oldest : e.created_at });
  }
  for (const [courseId, v] of pendingByCourse) {
    const course = courseById.get(courseId);
    const key = `provider_approval:${courseId}`;
    items.push({
      key,
      kind: "processing",
      category: "courses",
      icon: "building",
      title: `تسجيلات بانتظار موافقة الجهة · ${course?.title ?? ""}`,
      description: `${pluralAr(v.count, ["طلب تسجيل واحد", "طلبا تسجيل", "طلبات تسجيل", "طلب تسجيل"])} بانتظار قرار ${course?.organization ?? "الجهة"}`,
      step: "الخطوة ٢ من ٣ · قرار الجهة",
      owner: course?.organization ?? "الجهة",
      ownerYou: false,
      eta: "خلال يومي عمل",
      ref: refFor(key),
      age: `وصلت ${formatRelative(v.oldest)}`,
      primary: { label: "اعرض التفاصيل", href: `/trainer/courses/${courseId}` },
      secondary: "hide",
      sortAt: new Date(v.oldest).getTime() + 2 * DAY,
      summary: `وصلت ${formatRelative(v.oldest)}`,
    });
  }

  // 7 · Earnings on hold until courses end and the refund window passes.
  if (o.stats.pending > 0) {
    const key = "settlement:pending";
    items.push({
      key,
      kind: "processing",
      category: "finance",
      icon: "banknote",
      title: "تسوية أرباح معلّقة",
      description: `${formatPrice(Math.round(o.stats.pending * 100) / 100)} بعد خصم العمولة`,
      step: "الخطوة ٢ من ٣ · التسوية",
      owner: "الإدارة المالية",
      ownerYou: false,
      eta: "بعد انتهاء الدورة ومهلة الاسترداد",
      ref: refFor(key),
      age: null,
      primary: { label: "اعرض التفاصيل", href: "/trainer/finance" },
      secondary: "hide",
      sortAt: now + 7 * DAY,
      summary: `${formatPrice(Math.round(o.stats.pending * 100) / 100)} بعد خصم العمولة`,
    });
  }

  const dismissed = new Map((dismissRes.data ?? []).filter((d) => d.item_key.startsWith("trainer:")).map((d) => [d.item_key.slice(8), d.hidden_until]));
  const visible = items.filter((i) => {
    if (!dismissed.has(i.key)) return true;
    const until = dismissed.get(i.key);
    return until ? new Date(until).getTime() < now : false;
  });
  visible.sort((a, b) => (a.kind === b.kind ? a.sortAt - b.sortAt : a.kind === "action" ? -1 : 1));

  // «ما القادم؟» (empty state): next live sessions and courses about to end.
  const upcoming: UpcomingItem[] = [];
  const nextSession = upcomingSessions[0];
  if (nextSession) {
    const days = Math.max(1, Math.round((new Date(nextSession.starts_at).getTime() - now) / DAY));
    upcoming.push({ key: `s-${nextSession.id}`, icon: "session", title: `${nextSession.title} · بعد ${daysWord(days)}`, detail: "سترصد حضورها بعد انتهائها" });
  }
  for (const c of o.courses.filter((x) => x.status === "in_progress" && x.endsAt && new Date(x.endsAt).getTime() > now).slice(0, 2)) {
    const days = Math.max(1, Math.round((new Date(c.endsAt!).getTime() - now) / DAY));
    upcoming.push({ key: `c-${c.id}`, icon: "certificate", title: `${c.title} تنتهي · بعد ${daysWord(days)}`, detail: "ثم تعتمد النتائج وتصدر الشهادات" });
  }

  const weekAgo = now - 7 * DAY;
  const doneThisWeek = ended.filter((s) => recorded.has(s.id) && new Date(s.ends_at).getTime() >= weekAgo).length;

  return { items: visible, upcoming, doneThisWeek, overview: o };
});

export function queueCounts(items: TrainerQueueItem[]) {
  return {
    all: items.length,
    action: items.filter((i) => i.kind === "action").length,
    processing: items.filter((i) => i.kind === "processing").length,
    ratings: items.filter((i) => i.category === "ratings").length,
    finance: items.filter((i) => i.category === "finance").length,
    courses: items.filter((i) => i.category === "courses").length,
  };
}
