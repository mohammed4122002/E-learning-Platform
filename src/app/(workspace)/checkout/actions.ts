"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorCode, toArabicError } from "@/lib/errors";
import { processPayment } from "@/lib/payments";
import type { FormState } from "@/lib/validation/auth";

const proceedSchema = z.object({
  courseId: z.uuid(),
  slug: z.string().regex(/^[a-z0-9-]{2,140}$/),
  code: z.string().trim().max(32).optional(),
  funding: z.enum(["self", "employer", "sponsored"]).default("self"),
  agree: z.literal("on", { error: "يجب الموافقة على سياسة الاسترداد وشروط التسجيل للمتابعة." }),
});

/** TRN-ENR-01 → start the enrollment. Paid courses get a 15-minute seat hold (BR-L7) and go to payment. */
export async function proceedToPayment(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = proceedSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: { agree: parsed.error.issues[0]?.message ?? "" } };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_enrollment", {
    p_course: parsed.data.courseId,
    p_code: parsed.data.code || undefined,
    p_funding: parsed.data.funding,
  });
  if (error) {
    const code = errorCode(error);
    if (code === "already_enrolled") redirect(`/checkout/${parsed.data.slug}?state=enrolled`);
    return { status: "error", message: toArabicError(error) };
  }
  const row = data?.[0];
  if (!row) return { status: "error", message: toArabicError(null) };
  revalidatePath("/trainee", "layout");
  redirect(row.status === "pending_payment" ? `/checkout/${row.enrollment_id}/pay` : `/checkout/${row.enrollment_id}/done`);
}

const paySchema = z.object({
  enrollmentId: z.uuid(),
  method: z.enum(["card", "wallet"], { error: "اختر طريقة الدفع." }),
  idempotencyKey: z.string().min(16).max(80),
  simulateDecline: z.enum(["0", "1"]).default("0"),
});

/** TRN-ENR-03 · الدفع. One payment per attempt key (BR-L12); a declined card keeps the hold for a retry. */
export async function submitPayment(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = paySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "تحقق من بيانات الدفع." };
  const { enrollmentId, method, idempotencyKey, simulateDecline } = parsed.data;
  const supabase = await createClient();
  const { data: paymentId, error } = await supabase.rpc("create_payment", {
    p_enrollment: enrollmentId,
    p_method: method === "wallet" ? "apple_pay" : "card",
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    if (errorCode(error) === "hold_expired") redirect(`/checkout/${enrollmentId}?expired=1`);
    return { status: "error", message: toArabicError(error) };
  }
  const outcome = await processPayment(supabase, { paymentId: paymentId as string, simulateDecline: simulateDecline === "1" });
  revalidatePath("/trainee", "layout");
  if (!outcome.ok) {
    if (outcome.code === "card_declined") {
      return { status: "error", message: "رُفضت العملية من البنك المُصدِر. تحقق من بيانات البطاقة أو جرّب بطاقة أخرى — مقعدك ما زال محجوزًا." };
    }
    return { status: "error", message: toArabicError({ code: outcome.code }) };
  }
  redirect(`/checkout/${enrollmentId}/done`);
}
