"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";

type Result = { ok: boolean; message: string };

const uuid = z.uuid();
const REASONS = ["schedule_conflict", "price_change", "not_available", "other"] as const;

function done(message: string): Result {
  revalidatePath("/trainer", "layout");
  return { ok: true, message };
}

/** TRR-BID-03 «اسحب العرض» and TRR-BID-05 «اعتذر عن العرض» (withdraw_training_bid). */
export async function withdrawBid(bidId: string, reason: string, note: string): Promise<Result> {
  if (!uuid.safeParse(bidId).success || !(REASONS as readonly string[]).includes(reason) || note.length > 500) {
    return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_training_bid", { p_bid: bidId, p_reason: reason, p_note: note.trim() || undefined });
  if (error) return { ok: false, message: toArabicError(error) };
  return done("سُحب العرض وأُبلغت الجهة.");
}

/** «راسل الجهة»: opens the bid's conversation with the organization's members. */
export async function messageOrganization(bidId: string): Promise<Result> {
  if (!uuid.safeParse(bidId).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_bid_conversation", { p_bid: bidId });
  if (error || !data) return { ok: false, message: toArabicError(error) };
  revalidatePath("/messages", "layout");
  redirect(`/messages/${data}`);
}

/** «ابدأ التفاوض» / «تفاوض على الشروط». */
export async function startNegotiation(bidId: string): Promise<Result & { id?: string }> {
  if (!uuid.safeParse(bidId).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_bid_negotiation", { p_bid: bidId });
  if (error || !data) return { ok: false, message: toArabicError(error) };
  return { ...done(""), id: data };
}

const termValue = z.union([
  z.number(),
  z.string().max(40),
  z.object({ days: z.number().int(), hours: z.number() }),
  z.object({ starts_on: z.iso.date(), ends_on: z.iso.date() }),
]);
const termsSchema = z
  .object({
    price: z.object({ value: z.number(), reason: z.string().max(500).optional() }).optional(),
    duration: z.object({ value: termValue, reason: z.string().max(500).optional() }).optional(),
    dates: z.object({ value: termValue, reason: z.string().max(500).optional() }).optional(),
    payment_terms: z.object({ value: z.string().max(40), reason: z.string().max(500).optional() }).optional(),
  })
  .strict();

/** Saves the proposal as a draft, or sends it to the organization (save_bid_negotiation). */
export async function saveNegotiation(negotiationId: string, terms: unknown, message: string, send: boolean): Promise<Result> {
  const parsed = termsSchema.safeParse(terms);
  if (!uuid.safeParse(negotiationId).success || !parsed.success || message.length > 2000) {
    return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_bid_negotiation", {
    p_negotiation: negotiationId,
    p_terms: parsed.data,
    p_message: message,
    p_send: send,
  });
  if (error) return { ok: false, message: toArabicError(error) };
  return done(send ? "أُرسل اقتراحك للجهة." : "حُفظ اقتراحك كمسودة — تجده في «عروضي» بحالة مسودة تفاوض.");
}

/** «إلغاء التفاوض» (draft only). */
export async function cancelNegotiation(negotiationId: string): Promise<Result> {
  if (!uuid.safeParse(negotiationId).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_bid_negotiation", { p_negotiation: negotiationId });
  if (error) return { ok: false, message: toArabicError(error) };
  return done("أُلغي التفاوض — الشروط الأصلية كما هي.");
}

/** «اسحب الاقتراح». */
export async function withdrawProposal(negotiationId: string): Promise<Result> {
  if (!uuid.safeParse(negotiationId).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_bid_negotiation", { p_negotiation: negotiationId });
  if (error) return { ok: false, message: toArabicError(error) };
  return done("سُحب الاقتراح. عادت الشروط الأصلية واستؤنفت مهلة التعاقد.");
}

/** «اقبل الشروط المقابلة» / «ارفض وعُد للشروط الأصلية». */
export async function respondToCounter(negotiationId: string, accept: boolean): Promise<Result> {
  if (!uuid.safeParse(negotiationId).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_bid_counter", { p_negotiation: negotiationId, p_accept: accept });
  if (error) return { ok: false, message: toArabicError(error) };
  return done(accept ? "اتُّفق على الشروط المقابلة. يتبقى التعاقد." : "عاد العرض لشروطه الأصلية.");
}
