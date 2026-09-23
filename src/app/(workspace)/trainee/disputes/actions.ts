"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { attachmentSchema, disputeSchema, fieldErrorsOf, idSchema, type FormState } from "@/lib/validation/trainings";

export type DisputeFormState = FormState & { disputeId?: string };

function revalidateDisputes(id?: string) {
  if (id) revalidatePath(`/trainee/disputes/${id}`);
  revalidatePath("/trainee/queue");
}

/** TRN-DSP-01 · «أرسل النزاع» → open_dispute. Attachments are uploaded afterwards (they need the dispute id). */
export async function openDispute(_: DisputeFormState, formData: FormData): Promise<DisputeFormState> {
  const parsed = disputeSchema.safeParse(Object.fromEntries(formData));
  const values = Object.fromEntries(["reason", "details"].map((k) => [k, String(formData.get(k) ?? "")]));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_dispute", { p_payment: parsed.data.paymentId, p_reason: parsed.data.reason, p_details: parsed.data.details });
  if (error) return { status: "error", message: toArabicError(error), values };
  revalidateDisputes(data);
  return { status: "success", disputeId: data, values };
}

/** TRN-DSP-02 · registers an uploaded file (dispute-attachments/<uid>/<dispute>/…) → add_dispute_attachment. */
export async function addDisputeAttachment(input: { disputeId: string; path: string; name: string; size: number }): Promise<{ ok: boolean; message?: string }> {
  const parsed = attachmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? toArabicError({ code: "invalid_input" }) };
  const { disputeId, path, name, size } = parsed.data;
  if (path.split("/")[1] !== disputeId) return { ok: false, message: toArabicError({ code: "forbidden" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_dispute_attachment", { p_dispute: disputeId, p_path: path, p_name: name, p_size: size });
  if (error) return { ok: false, message: toArabicError(error) };
  revalidateDisputes(disputeId);
  return { ok: true };
}

/** «اسحب النزاع» before a decision → withdraw_dispute. */
export async function withdrawDispute(disputeId: string): Promise<{ ok: boolean; message: string }> {
  if (!idSchema.safeParse(disputeId).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_dispute", { p_dispute: disputeId });
  if (error) return { ok: false, message: toArabicError(error) };
  revalidateDisputes(disputeId);
  return { ok: true, message: "سحبت النزاع وأُغلق. يُفكّ تجميد المبلغ وفق القرار السابق." };
}
