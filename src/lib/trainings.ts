/*
 * Shared (server + client safe) helpers for the trainings / money / waitlist area:
 * human reference codes, reason labels and session-state derivation. No data access here.
 */
import type { Tone } from "@/types/views";
import { toArabicDigits } from "@/lib/format";

/** "ENR-2026-0412" — a short, stable reference derived from the row id (shown in mono, LTR). */
export function refCode(prefix: "ENR" | "RFD" | "DSP" | "WTL" | "REF" | "ATT", id: string, at?: string | Date | null): string {
  const year = at ? new Date(at).getUTCFullYear() : new Date().getUTCFullYear();
  const n = parseInt(id.replace(/-/g, "").slice(0, 7), 16) % 100000;
  return `${prefix}-${year}-${String(n).padStart(5, "0")}`;
}

/** refund_requests.reason (DB check) → Arabic chip copy. */
export const REFUND_REASONS = [
  { value: "schedule", label: "تعارض في المواعيد" },
  { value: "personal", label: "ظرف طارئ" },
  { value: "quality", label: "جودة المحتوى أو التقديم" },
  { value: "content_mismatch", label: "ليس ما توقعته من الوصف" },
  { value: "duplicate", label: "سجّلت بالخطأ" },
  { value: "other", label: "سبب آخر" },
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number]["value"];
export const REFUND_REASON_LABEL: Record<string, string> = Object.fromEntries(REFUND_REASONS.map((r) => [r.value, r.label]));

/** Recorded-course refund reasons (TRN-RFD-01 · مسجَّلة chips) → refund_requests.reason. */
export const RECORDED_REFUND_REASONS = [
  { value: "quality", label: "جودة الفيديو" },
  { value: "content_mismatch", label: "ليس ما توقعته من الوصف" },
  { value: "personal", label: "لا يناسب مستواي" },
  { value: "duplicate", label: "اشتريت بالخطأ" },
  { value: "other", label: "سبب آخر" },
] as const;

/** Withdrawal reasons (TRN-MYE-03 chips) mapped onto refund reasons. */
export const WITHDRAW_REASONS = [
  { value: "schedule", label: "تعارض في المواعيد" },
  { value: "personal", label: "ظرف طارئ" },
  { value: "distance", label: "المكان بعيد", refund: "other" },
  { value: "duplicate", label: "سجّلت بالخطأ" },
  { value: "other", label: "سبب آخر" },
] as const;

/** disputes.reason → TRN-DSP-01 chips ("لماذا ترى القرار غير صحيح؟"). */
export const DISPUTE_REASONS = [
  { value: "not_delivered", label: "لم تُقدَّم الخدمة كما وُصفت" },
  { value: "withdrawal_date", label: "تاريخ الانسحاب غير دقيق" },
  { value: "course_cancelled", label: "الدورة أُلغيت أو أُجّلت" },
  { value: "wrong_amount", label: "خصم مبلغ خاطئ" },
  { value: "refund_not_received", label: "لم يصلني المبلغ المسترد" },
  { value: "double_charge", label: "خُصم المبلغ مرتين" },
  { value: "other", label: "سبب آخر" },
] as const;
export type DisputeReason = (typeof DISPUTE_REASONS)[number]["value"];
export const DISPUTE_REASON_LABEL: Record<string, string> = Object.fromEntries(DISPUTE_REASONS.map((r) => [r.value, r.label]));

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: "البطاقة",
  mada: "بطاقة مدى",
  apple_pay: "Apple Pay",
  bank_transfer: "تحويل بنكي",
  free: "مجانية",
};

export const DISPUTE_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "مفتوح", tone: "info" },
  under_review: { label: "بانتظار رد الجهة", tone: "warning" },
  resolved: { label: "حُسم", tone: "success" },
  closed: { label: "مغلق", tone: "neutral" },
};

/** Live-session sub-states (TRN-MYE-02 · الجلسة المباشرة). */
export type LiveSessionState = "scheduled" | "join" | "waiting_host" | "ended" | "cancelled" | "error";

export function liveSessionState(
  s: { starts_at: string; ends_at: string; status: string; meeting_url: string | null },
  now: Date = new Date(),
): LiveSessionState {
  if (s.status === "cancelled") return "cancelled";
  const start = new Date(s.starts_at).getTime();
  const end = new Date(s.ends_at).getTime();
  if (s.status === "ended" || now.getTime() > end) return "ended";
  if (now.getTime() < start - 10 * 60_000) return "scheduled";
  if (s.status !== "live") return "waiting_host";
  return s.meeting_url ? "join" : "error";
}

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

/** "٢٫٤ م.ب" / "٨٥٠ ك.ب" */
export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} م.ب`
    : `${toArabicDigits(Math.max(1, Math.round(bytes / 1024)))} ك.ب`;
