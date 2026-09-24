"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTrainer } from "@/lib/auth";
import { toArabicError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { END_REASONS, type EndReason } from "@/lib/trainer-affiliations";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";

/* TRR-AFL-01/02/03 server actions. Every rule (status, expiry, exclusivity, notice period) lives in the RPCs. */

const uuid = z.uuid();

function touch() {
  revalidatePath("/trainer/affiliations", "layout");
  revalidatePath("/trainer");
}

/** «اقبل الارتباط» (AFL-02) → AFL-01 with the «تم إنشاء الارتباط» result (4266:2). */
export async function acceptInvitation(_: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/affiliations");
  const id = uuid.safeParse(fd.get("invitationId"));
  if (!id.success) return { status: "error", message: toArabicError({ code: "not_found" }) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_affiliation_invitation", { p_invitation: id.data });
  if (error || !data) return { status: "error", message: toArabicError(error) };
  touch();
  redirect(`/trainer/affiliations?done=accepted&id=${data}`);
}

/** «ارفض» / «ارفض الدعوة» — the organization is told without a reason. */
export async function declineInvitation(_: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/affiliations");
  const id = uuid.safeParse(fd.get("invitationId"));
  if (!id.success) return { status: "error", message: toArabicError({ code: "not_found" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_affiliation_invitation", { p_invitation: id.data });
  if (error) return { status: "error", message: toArabicError(error) };
  touch();
  redirect("/trainer/affiliations?done=declined");
}

/** «تفاوض على الشروط» / «راسل الجهة» / the «قبل الإنهاء — جرّب هذا» rows: a conversation with the organization. */
export async function openOrgConversation(_: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/affiliations");
  const org = uuid.safeParse(fd.get("orgId"));
  const subject = z.string().trim().min(2).max(200).safeParse(fd.get("subject"));
  if (!org.success || !subject.success) return { status: "error", message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_org_conversation", { p_org: org.data, p_subject: subject.data });
  if (error || !data) return { status: "error", message: toArabicError(error) };
  redirect(`/messages/${data}`);
}

const endSchema = z.object({
  affiliationId: uuid,
  reason: z.enum(Object.keys(END_REASONS) as [EndReason, ...EndReason[]], { error: "اختر سبب الإنهاء" }),
  message: z.string().trim().max(2000, "الرسالة طويلة جدًا (٢٠٠٠ حرف كحد أقصى)").optional().default(""),
  ack: z.literal("on", { error: "أشّر على الإقرار أولًا ليُفعَّل الإنهاء" }),
});

/** «أنهِ الارتباط» (AFL-03) → AFL-01 with the «أُنهي الارتباط» result (4266:363). */
export async function endAffiliation(_: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/affiliations");
  const raw = { affiliationId: fd.get("affiliationId"), reason: fd.get("reason") ?? undefined, message: fd.get("message") ?? "", ack: fd.get("ack") ?? undefined };
  const values = { reason: String(fd.get("reason") ?? ""), message: String(fd.get("message") ?? "") };
  const parsed = endSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_affiliation", {
    p_affiliation: parsed.data.affiliationId,
    p_reason: parsed.data.reason,
    p_message: parsed.data.message,
    p_ack: true,
  });
  if (error) return { status: "error", message: toArabicError(error), values };
  touch();
  redirect(`/trainer/affiliations?done=ended&id=${parsed.data.affiliationId}`);
}

/** «تراجع — أبقِ الارتباط» while the notice period runs. */
export async function cancelAffiliationEnd(_: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/affiliations");
  const id = uuid.safeParse(fd.get("affiliationId"));
  if (!id.success) return { status: "error", message: toArabicError({ code: "not_found" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_affiliation_end", { p_affiliation: id.data });
  if (error) return { status: "error", message: toArabicError(error) };
  touch();
  redirect("/trainer/affiliations?done=kept");
}
