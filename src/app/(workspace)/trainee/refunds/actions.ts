"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { idSchema } from "@/lib/validation/trainings";

/** TRN-RFD-02 · «إلغاء طلب الاسترداد» while it is still under review → cancel_refund_request. */
export async function cancelRefundRequest(refundId: string): Promise<{ ok: boolean; message: string }> {
  if (!idSchema.safeParse(refundId).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_refund_request", { p_refund: refundId });
  if (error) return { ok: false, message: toArabicError(error) };
  revalidatePath(`/trainee/refunds/${refundId}`);
  revalidatePath("/trainee/queue");
  revalidatePath("/trainee/trainings");
  return { ok: true, message: "ألغيت طلب الاسترداد. يمكنك تقديم طلب جديد متى شئت ما دمت مستحقًا." };
}
