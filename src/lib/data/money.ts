import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getWaitlistEntries } from "@/lib/data/trainings";
import { formatDayMonth, formatPrice, formatRelative } from "@/lib/format";
import { refCode } from "@/lib/trainings";
import type { Tone } from "@/types/views";

/* ─────────────────────────────── TRN-QUE-01 · بانتظار إجرائي ─────────────────────────────── */

export type QueueStatus = "action" | "waiting" | "approved" | "rejected" | "expired";
export type QueueFilter = "all" | "action" | "waiting" | "done";
export type ChipIcon = "timer" | "clock" | "check" | "alert" | "ban" | "hourglass" | "x";

export type QueueItem = {
  key: string;
  status: QueueStatus;
  title: string;
  badge: { label: string; icon: ChipIcon };
  description: string;
  step: string;
  owner: { label: string; you: boolean };
  eta: string;
  ref: string;
  chip: { label: string; tone: Tone; icon: ChipIcon; until?: string };
  primary: { label: string; href: string; variant: "primary" | "outline" | "secondary" };
  secondary: "snooze" | "hide";
  sortAt: number;
};

export type QueueView = { items: QueueItem[]; counts: Record<QueueFilter, number> };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export async function getQueue(userId: string): Promise<QueueView> {
  const supabase = await createClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const [holdsRes, providerRes, refundsRes, disputesRes, endedRes, dismissRes, waitlist] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, created_at, hold_expires_at, courses(title, starts_at)")
      .eq("trainee_id", userId)
      .eq("status", "pending_payment")
      .gt("hold_expires_at", nowIso),
    supabase
      .from("enrollments")
      .select("id, created_at, courses(title, starts_at, organizations(name))")
      .eq("trainee_id", userId)
      .eq("status", "pending_provider"),
    supabase
      .from("refund_requests")
      .select("id, status, amount, created_at, decided_at, decision_note, cancelled_at, enrollment_id, enrollments(currency, courses(title), payments(id, status))")
      .eq("trainee_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("disputes")
      .select("id, status, created_at, updated_at, payment_id, payments(enrollments(courses(title)))")
      .eq("trainee_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("enrollments")
      .select("id, status, ended_at, end_reason, price_paid, currency, courses(title)")
      .eq("trainee_id", userId)
      .in("status", ["cancelled", "withdrawn"])
      .gt("price_paid", 0),
    supabase.from("queue_dismissals").select("item_key, hidden_until").eq("user_id", userId),
    getWaitlistEntries(userId),
  ]);
  for (const r of [holdsRes, providerRes, refundsRes, disputesRes, endedRes]) if (r.error) throw r.error;

  const hidden = new Set(
    (dismissRes.data ?? []).filter((d) => !d.hidden_until || new Date(d.hidden_until).getTime() > now).map((d) => d.item_key),
  );
  const items: QueueItem[] = [];
  const refunds = refundsRes.data ?? [];
  const disputes = disputesRes.data ?? [];
  const disputedPayments = new Set(disputes.map((d) => d.payment_id));

  for (const e of holdsRes.data ?? []) {
    const title = e.courses?.title ?? "";
    items.push({
      key: `pay:${e.id}`,
      status: "action",
      title: "مطلوب إجراء منك",
      badge: { label: "عاجل", icon: "alert" },
      description: `أكمل دفع «${title}»${e.courses?.starts_at ? ` — دورة ${formatDayMonth(e.courses.starts_at)}` : ""}`,
      step: "الخطوة ٢ من ٣ · الدفع",
      owner: { label: "أنت", you: true },
      eta: "فور إتمام الدفع",
      ref: refCode("REF", e.id, e.created_at),
      chip: { label: "يتبقى", tone: "error", icon: "timer", until: e.hold_expires_at! },
      primary: { label: "أكمل الدفع", href: `/checkout/${e.id}/pay`, variant: "primary" },
      secondary: "snooze",
      sortAt: new Date(e.hold_expires_at!).getTime() - 10 * DAY,
    });
  }

  for (const w of waitlist) {
    if (w.status === "invited" && w.inviteExpiresAt) {
      items.push({
        key: `invite:${w.id}`,
        status: "action",
        title: "مقعد متاح لك",
        badge: { label: "عاجل", icon: "alert" },
        description: `اقبل مقعدك في «${w.courseTitle}» قبل انتهاء المهلة`,
        step: "الخطوة ٢ من ٣ · قبول المقعد",
        owner: { label: "أنت", you: true },
        eta: "قبل انتهاء المهلة",
        ref: w.ref,
        chip: { label: "يتبقى", tone: "error", icon: "timer", until: w.inviteExpiresAt },
        primary: { label: "اقبل المقعد", href: `/trainee/waitlist/${w.id}`, variant: "primary" },
        secondary: "snooze",
        sortAt: new Date(w.inviteExpiresAt).getTime() - 10 * DAY,
      });
    } else if (w.status === "expired" && w.inviteExpiresAt && now - new Date(w.inviteExpiresAt).getTime() < 7 * DAY) {
      items.push({
        key: `waitlist:${w.id}`,
        status: "expired",
        title: "انتهت المهلة",
        badge: { label: "منتهية", icon: "ban" },
        description: `لم تُقبل دعوة شغور المقعد في «${w.courseTitle}» خلال المهلة`,
        step: "الخطوة ٢ من ٣ · منتهية",
        owner: { label: "—", you: false },
        eta: "لا تحديث متوقع",
        ref: w.ref,
        chip: { label: `انتهت ${formatRelative(w.inviteExpiresAt)}`, tone: "neutral", icon: "ban" },
        primary: { label: "انضم لقائمة الانتظار", href: `/trainee/waitlist/${w.id}`, variant: "outline" },
        secondary: "hide",
        sortAt: new Date(w.inviteExpiresAt).getTime(),
      });
    }
  }

  for (const e of providerRes.data ?? []) {
    const c = e.courses as unknown as { title: string; organizations: { name: string } | null } | null;
    items.push({
      key: `provider:${e.id}`,
      status: "waiting",
      title: "بانتظار طرف آخر",
      badge: { label: "بالانتظار", icon: "hourglass" },
      description: `تأكيد مقعدك في «${c?.title ?? ""}» من الجهة التدريبية`,
      step: "الخطوة ٢ من ٣ · تأكيد المقعد",
      owner: { label: c?.organizations?.name ?? "الجهة التدريبية", you: false },
      eta: "خلال ٢٤ ساعة عمل",
      ref: refCode("ENR", e.id, e.created_at),
      chip: { label: `قُدّم ${formatRelative(e.created_at)}`, tone: "warning", icon: "clock" },
      primary: { label: "تتبّع الطلب", href: `/trainee/trainings/${e.id}`, variant: "outline" },
      secondary: "snooze",
      sortAt: new Date(e.created_at).getTime(),
    });
  }

  for (const r of refunds) {
    const title = r.enrollments?.courses?.title ?? "";
    const currency = r.enrollments?.currency ?? "SAR";
    const ref = refCode("RFD", r.id, r.created_at);
    if (r.status === "under_review") {
      items.push({
        key: `refund:${r.id}`,
        status: "waiting",
        title: "بانتظار طرف آخر",
        badge: { label: "بالانتظار", icon: "hourglass" },
        description: `مراجعة طلب استرداد «${title}»`,
        step: "الخطوة ٢ من ٤ · المراجعة المالية",
        owner: { label: "إدارة المنصة", you: false },
        eta: "خلال ٢٤–٤٨ ساعة عمل",
        ref,
        chip: { label: `قُدّم ${formatRelative(r.created_at)}`, tone: "warning", icon: "clock" },
        primary: { label: "تتبّع الطلب", href: `/trainee/refunds/${r.id}`, variant: "outline" },
        secondary: "snooze",
        sortAt: new Date(r.created_at).getTime(),
      });
    } else if (r.status === "approved" && r.decided_at && now - new Date(r.decided_at).getTime() < 14 * DAY) {
      items.push({
        key: `refund:${r.id}`,
        status: "approved",
        title: "تمت الموافقة",
        badge: { label: "معتمد", icon: "check" },
        description: `اعتُمد استرداد «${title}» بمبلغ ${formatPrice(Number(r.amount), currency)}`,
        step: "الخطوة ٣ من ٤ · اعتُمد الصرف",
        owner: { label: "—", you: false },
        eta: "يُحوَّل خلال ٣–٧ أيام عمل",
        ref,
        chip: { label: `تم التحديث ${formatRelative(r.decided_at)}`, tone: "success", icon: "check" },
        primary: { label: "اعرض التفاصيل", href: `/trainee/refunds/${r.id}`, variant: "secondary" },
        secondary: "hide",
        sortAt: new Date(r.decided_at).getTime(),
      });
    } else if (r.status === "rejected" && !r.cancelled_at && r.decided_at && now - new Date(r.decided_at).getTime() < 7 * DAY) {
      const payment = (r.enrollments?.payments ?? []).find((p) => p.status === "succeeded" || p.status === "refunded");
      if (payment && disputedPayments.has(payment.id)) continue;
      items.push({
        key: `refund:${r.id}`,
        status: "rejected",
        title: "رُفض الطلب",
        badge: { label: "مرفوض", icon: "x" },
        description: `سبب الرفض: ${r.decision_note ?? "لم يستوفِ الطلب شروط سياسة الاسترداد"}`,
        step: "الخطوة ٣ من ٣ · قرار",
        owner: { label: "أنت — يمكنك التظلّم", you: false },
        eta: "مهلة التظلّم ٧ أيام",
        ref,
        chip: { label: `رُفض ${formatRelative(r.decided_at)}`, tone: "error", icon: "alert" },
        primary: payment
          ? { label: "قدّم تظلّمًا", href: `/trainee/disputes/new?payment=${payment.id}`, variant: "primary" }
          : { label: "اعرض التفاصيل", href: `/trainee/refunds/${r.id}`, variant: "outline" },
        secondary: "snooze",
        sortAt: new Date(r.decided_at).getTime(),
      });
    }
  }

  for (const d of disputes) {
    const title = (d.payments as unknown as { enrollments: { courses: { title: string } | null } | null } | null)?.enrollments?.courses?.title ?? "";
    const ref = refCode("DSP", d.id, d.created_at);
    if (d.status === "open" || d.status === "under_review") {
      items.push({
        key: `dispute:${d.id}`,
        status: "waiting",
        title: "بانتظار طرف آخر",
        badge: { label: "بالانتظار", icon: "hourglass" },
        description: `مراجعة نزاعك المالي على «${title}»`,
        step: d.status === "open" ? "الخطوة ٢ من ٤ · إسناد لمراجع مستقل" : "الخطوة ٣ من ٤ · رد الجهة التدريبية",
        owner: { label: "إدارة النزاعات", you: false },
        eta: "خلال ٧ أيام عمل كحد أقصى",
        ref,
        chip: { label: `فُتح ${formatRelative(d.created_at)}`, tone: "warning", icon: "clock" },
        primary: { label: "تتبّع النزاع", href: `/trainee/disputes/${d.id}`, variant: "outline" },
        secondary: "snooze",
        sortAt: new Date(d.created_at).getTime(),
      });
    } else if (d.status === "resolved" && now - new Date(d.updated_at).getTime() < 14 * DAY) {
      items.push({
        key: `dispute:${d.id}`,
        status: "approved",
        title: "حُسم النزاع",
        badge: { label: "محسوم", icon: "check" },
        description: `صدر القرار في نزاعك على «${title}»`,
        step: "الخطوة ٤ من ٤ · القرار النهائي",
        owner: { label: "—", you: false },
        eta: "القرار نهائي",
        ref,
        chip: { label: `تم التحديث ${formatRelative(d.updated_at)}`, tone: "success", icon: "check" },
        primary: { label: "اعرض التفاصيل", href: `/trainee/disputes/${d.id}`, variant: "secondary" },
        secondary: "hide",
        sortAt: new Date(d.updated_at).getTime(),
      });
    }
  }

  // Paid enrollments that ended without a refund request but still qualify for one (course cancelled, withdrawal).
  const refundedEnrollments = new Set(refunds.filter((r) => !r.cancelled_at).map((r) => r.enrollment_id));
  const candidates = (endedRes.data ?? []).filter((e) => e.end_reason !== "hold_expired" && !refundedEnrollments.has(e.id)).slice(0, 5);
  const quotes = await Promise.all(candidates.map((e) => supabase.rpc("refund_quote", { p_enrollment: e.id })));
  candidates.forEach((e, i) => {
    const q = quotes[i].data?.[0];
    if (!q || q.percent <= 0) return;
    const cancelled = e.status === "cancelled";
    items.push({
      key: `refund_due:${e.id}`,
      status: "action",
      title: "مطلوب إجراء منك",
      badge: { label: cancelled ? "دورة ملغاة" : "استرداد مستحق", icon: "alert" },
      description: `اطلب استرداد «${e.courses?.title ?? ""}» — المبلغ المستحق ${formatPrice(Number(q.amount), e.currency)}`,
      step: "الخطوة ١ من ٤ · تقديم الطلب",
      owner: { label: "أنت", you: true },
      eta: "فور تقديم الطلب",
      ref: refCode("ENR", e.id, e.ended_at),
      chip: { label: `${cancelled ? "أُلغيت" : "انسحبت"} ${formatRelative(e.ended_at ?? nowIso)}`, tone: "error", icon: "alert" },
      primary: { label: "اطلب الاسترداد", href: `/trainee/trainings/${e.id}/refund`, variant: "primary" },
      secondary: "snooze",
      sortAt: new Date(e.ended_at ?? nowIso).getTime() - 5 * DAY,
    });
  });

  const visible = items.filter((i) => !hidden.has(i.key));
  const order: Record<QueueStatus, number> = { action: 0, rejected: 1, waiting: 2, approved: 3, expired: 4 };
  visible.sort((a, b) => order[a.status] - order[b.status] || a.sortAt - b.sortAt);
  const counts: Record<QueueFilter, number> = {
    all: visible.length,
    action: visible.filter((i) => i.status === "action" || i.status === "rejected").length,
    waiting: visible.filter((i) => i.status === "waiting").length,
    done: visible.filter((i) => i.status === "approved" || i.status === "expired").length,
  };
  return { items: visible, counts };
}

/* ─────────────────────────────── TRN-RFD-02 · متابعة طلب الاسترداد ─────────────────────────────── */

export type RefundDetail = {
  id: string;
  ref: string;
  status: "under_review" | "approved" | "rejected";
  cancelled: boolean;
  amount: number;
  currency: string;
  reason: string;
  details: string | null;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  requiresAdmin: boolean;
  enrollmentId: string;
  courseTitle: string;
  courseSlug: string;
  paymentId: string | null;
  paymentMethod: string | null;
  disputeId: string | null;
};

export async function getRefund(userId: string, id: string): Promise<RefundDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: r, error } = await supabase
    .from("refund_requests")
    .select(
      "id, status, amount, reason, details, decision_note, created_at, decided_at, cancelled_at, requires_admin, enrollment_id, enrollments(currency, courses(title, slug), payments(id, method, status))",
    )
    .eq("id", id)
    .eq("trainee_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!r) return null;
  const payment = (r.enrollments?.payments ?? []).find((p) => p.status === "succeeded" || p.status === "refunded") ?? null;
  let disputeId: string | null = null;
  if (payment) {
    const { data: d } = await supabase.from("disputes").select("id").eq("payment_id", payment.id).order("created_at", { ascending: false }).limit(1);
    disputeId = d?.[0]?.id ?? null;
  }
  return {
    id: r.id,
    ref: refCode("RFD", r.id, r.created_at),
    status: r.status,
    cancelled: !!r.cancelled_at,
    amount: Number(r.amount),
    currency: r.enrollments?.currency ?? "SAR",
    reason: r.reason,
    details: r.details,
    decisionNote: r.decision_note,
    createdAt: r.created_at,
    decidedAt: r.decided_at,
    requiresAdmin: r.requires_admin,
    enrollmentId: r.enrollment_id,
    courseTitle: r.enrollments?.courses?.title ?? "",
    courseSlug: r.enrollments?.courses?.slug ?? "",
    paymentId: payment?.id ?? null,
    paymentMethod: payment?.method ?? null,
    disputeId,
  };
}

/* ─────────────────────────────── TRN-DSP-01/02 · النزاع المالي ─────────────────────────────── */

export type DisputeSubject = {
  paymentId: string;
  amount: number;
  currency: string;
  courseTitle: string;
  enrollmentId: string | null;
  refund: { id: string; ref: string; status: string; note: string | null; decidedAt: string | null; amount: number } | null;
};

async function subjectForPayment(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, paymentId: string): Promise<DisputeSubject | null> {
  const { data: p, error } = await supabase
    .from("payments")
    .select("id, amount, currency, status, enrollment_id, enrollments(courses(title), refund_requests(id, status, decision_note, decided_at, amount, created_at, cancelled_at))")
    .eq("id", paymentId)
    .eq("trainee_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;
  const refunds = (p.enrollments?.refund_requests ?? []).filter((r) => !r.cancelled_at).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const r = refunds[0];
  return {
    paymentId: p.id,
    amount: Number(p.amount),
    currency: p.currency,
    courseTitle: p.enrollments?.courses?.title ?? "",
    enrollmentId: p.enrollment_id,
    refund: r ? { id: r.id, ref: refCode("RFD", r.id, r.created_at), status: r.status, note: r.decision_note, decidedAt: r.decided_at, amount: Number(r.amount) } : null,
  };
}

export type DisputeDraft = DisputeSubject & { eligible: boolean; openDisputeId: string | null };

export async function getDisputeDraft(userId: string, paymentId: string): Promise<DisputeDraft | null> {
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) return null;
  const supabase = await createClient();
  const subject = await subjectForPayment(supabase, userId, paymentId);
  if (!subject) return null;
  const [{ data: pay }, { data: open }] = await Promise.all([
    supabase.from("payments").select("status").eq("id", paymentId).single(),
    supabase.from("disputes").select("id").eq("payment_id", paymentId).in("status", ["open", "under_review"]).limit(1),
  ]);
  return { ...subject, eligible: pay?.status === "succeeded" || pay?.status === "refunded", openDisputeId: open?.[0]?.id ?? null };
}

export type DisputeDetail = {
  id: string;
  ref: string;
  status: "open" | "under_review" | "resolved" | "closed";
  reason: string;
  details: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  subject: DisputeSubject;
  attachments: { id: string; name: string; size: number; createdAt: string; url: string | null }[];
};

export async function getDispute(userId: string, id: string): Promise<DisputeDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: d, error } = await supabase
    .from("disputes")
    .select("id, status, reason, details, resolution, created_at, updated_at, payment_id, dispute_attachments(id, file_name, file_path, size_bytes, created_at)")
    .eq("id", id)
    .eq("trainee_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!d) return null;
  const subject = await subjectForPayment(supabase, userId, d.payment_id);
  if (!subject) return null;
  const files = [...(d.dispute_attachments ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const signed = files.length
    ? await supabase.storage.from("dispute-attachments").createSignedUrls(files.map((f) => f.file_path), 60 * 10)
    : { data: [] as { signedUrl: string | null }[] };
  return {
    id: d.id,
    ref: refCode("DSP", d.id, d.created_at),
    status: d.status,
    reason: d.reason,
    details: d.details,
    resolution: d.resolution,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    subject,
    attachments: files.map((f, i) => ({ id: f.id, name: f.file_name, size: f.size_bytes, createdAt: f.created_at, url: signed.data?.[i]?.signedUrl ?? null })),
  };
}
