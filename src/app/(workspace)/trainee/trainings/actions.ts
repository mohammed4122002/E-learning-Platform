"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorCode, toArabicError } from "@/lib/errors";
import { WITHDRAW_REASONS } from "@/lib/trainings";
import { checkInSchema, fieldErrorsOf, idSchema, refundSchema, withdrawSchema, type FormState } from "@/lib/validation/trainings";

function revalidateTrainings(enrollmentId?: string) {
  revalidatePath("/trainee/trainings");
  revalidatePath("/trainee/queue");
  if (enrollmentId) revalidatePath(`/trainee/trainings/${enrollmentId}`);
  revalidatePath("/trainee", "layout");
}

const kept = (formData: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));

/**
 * TRN-MYE-03 · «أكّد الانسحاب واطلب الاسترداد» → withdraw_enrollment, then request_refund when the tier pays out.
 * The refund amount is computed by the database (refund_quote) at the withdrawal time.
 */
export async function withdrawEnrollment(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = withdrawSchema.safeParse(Object.fromEntries(formData));
  const values = kept(formData, ["reason", "details"]);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const { enrollmentId, reason, details } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.rpc("withdraw_enrollment", { p_enrollment: enrollmentId, p_reason: reason });
  if (error) return { status: "error", message: toArabicError(error), values };

  const refundReason = WITHDRAW_REASONS.find((r) => r.value === reason);
  const mapped = refundReason && "refund" in refundReason ? refundReason.refund : reason;
  const { data: quote } = await supabase.rpc("refund_quote", { p_enrollment: enrollmentId });
  let refundId: string | null = null;
  if (quote?.[0] && quote[0].percent > 0) {
    const { data: rid, error: refundError } = await supabase.rpc("request_refund", { p_enrollment: enrollmentId, p_reason: mapped, p_details: details ?? "" });
    if (!refundError) refundId = rid;
    else if (errorCode(refundError) !== "nothing_to_refund") {
      revalidateTrainings(enrollmentId);
      redirect(`/trainee/trainings/${enrollmentId}/refund?withdrawn=1`);
    }
  }
  revalidateTrainings(enrollmentId);
  redirect(refundId ? `/trainee/refunds/${refundId}?submitted=1` : `/trainee/trainings/${enrollmentId}?withdrawn=1`);
}

/** TRN-RFD-01 · «أرسل طلب الاسترداد» → request_refund (amount computed by the refund tiers). */
export async function requestRefund(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = refundSchema.safeParse(Object.fromEntries(formData));
  const values = kept(formData, ["reason", "details"]);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_refund", {
    p_enrollment: parsed.data.enrollmentId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details ?? "",
  });
  if (error) return { status: "error", message: toArabicError(error), values };
  revalidateTrainings(parsed.data.enrollmentId);
  redirect(`/trainee/refunds/${data}?submitted=1`);
}

export type CheckInResult = {
  status: "idle" | "success" | "already" | "invalid" | "expired" | "error";
  message?: string;
  checkedInAt?: string;
  sessionId?: string;
  code?: string;
};

/** TRN-MYE-02 · تسجيل الحضور (QR or typed code) → check_in. */
export async function checkIn(enrollmentId: string, rawCode: string): Promise<CheckInResult> {
  const parsed = checkInSchema.safeParse({ enrollmentId, code: rawCode });
  if (!parsed.success) return { status: "invalid", message: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in", { p_code: parsed.data.code });
  if (error) {
    const code = errorCode(error);
    if (code === "invalid_code") return { status: "invalid", message: toArabicError(error), code: parsed.data.code };
    if (code === "code_expired") return { status: "expired", message: toArabicError(error), code: parsed.data.code };
    return { status: "error", message: toArabicError(error), code: parsed.data.code };
  }
  const row = data?.[0];
  revalidateTrainings(enrollmentId);
  return { status: row?.already ? "already" : "success", checkedInAt: row?.checked_in_at, sessionId: row?.session_id, code: parsed.data.code };
}

/** TRN-MYE-02 · «الدخول إلى الجلسة» → join_live_session (records online attendance, returns the meeting link). */
export async function joinLiveSession(enrollmentId: string, sessionId: string): Promise<{ ok: boolean; url?: string; message?: string; code?: string }> {
  if (!idSchema.safeParse(sessionId).success || !idSchema.safeParse(enrollmentId).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_live_session", { p_session: sessionId });
  if (error || !data?.[0]) return { ok: false, message: toArabicError(error), code: errorCode(error) ?? undefined };
  revalidateTrainings(enrollmentId);
  return { ok: true, url: data[0].meeting_url };
}
