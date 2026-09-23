"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import { messageSchema, newConversationSchema, reportSchema } from "@/lib/validation/profile";

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, uid: data?.claims?.sub ?? null };
}

/** GEN-MSG-01/02 · إرسال رسالة — direct insert, RLS checks membership and sender. */
export async function sendMessage(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: { body: String(formData.get("body") ?? "") } };
  const { supabase, uid } = await me();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };

  const { conversationId, body, attachmentPath } = parsed.data;
  if (attachmentPath && !attachmentPath.startsWith(`${conversationId}/`)) return { status: "error", message: toArabicError({ code: "forbidden" }) };

  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: uid, body, attachment_path: attachmentPath });
  if (error) return { status: "error", message: error.code === "42501" ? toArabicError({ code: "forbidden" }) : toArabicError(error), values: { body } };
  revalidatePath("/messages", "layout");
  return { status: "success" };
}

/** Marks the conversation as read for the current user (own participant row). */
export async function markConversationRead(conversationId: string): Promise<void> {
  if (!z.uuid().safeParse(conversationId).success) return;
  const { supabase, uid } = await me();
  if (!uid) return;
  await supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", uid);
  revalidatePath("/", "layout");
}

/** GEN-MSG-02 · كتم هذه المحادثة / إلغاء الكتم. */
export async function setConversationMuted(conversationId: string, muted: boolean): Promise<FormState> {
  if (!z.uuid().safeParse(conversationId).success) return { status: "error", message: toArabicError({ code: "invalid_input" }) };
  const { supabase, uid } = await me();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  const { error } = await supabase
    .from("conversation_participants")
    .update({ muted_at: muted ? new Date().toISOString() : null })
    .eq("conversation_id", conversationId)
    .eq("user_id", uid);
  if (error) return { status: "error", message: toArabicError(error) };
  revalidatePath("/messages", "layout");
  return { status: "success", message: muted ? "كتمنا المحادثة — لن تصلك إشعاراتها." : "أُلغي الكتم." };
}

/** GEN-MSG-02 · الإبلاغ عن مخالفة — reports the latest message from the other side. */
export async function reportConversation(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  const { supabase, uid } = await me();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  const { data: msg } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", parsed.data.conversationId)
    .neq("sender_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!msg) return { status: "error", message: "لا توجد رسائل من الطرف الآخر للإبلاغ عنها." };
  const { error } = await supabase
    .from("violation_reports")
    .insert({ reporter_id: uid, target_type: "message", target_id: msg.id, reason: parsed.data.reason, details: parsed.data.details || null });
  if (error) return { status: "error", message: toArabicError(error) };
  return { status: "success", message: "وصلنا بلاغك. سيراجعه فريق الثقة والأمان ويتواصل معك عند الحاجة." };
}

/** /messages/new?course=<slug> → start_conversation (BR-R1 routes it to the provider team or trainer). */
export async function startConversation(_: FormState, formData: FormData): Promise<FormState> {
  const kept = { subject: String(formData.get("subject") ?? ""), body: String(formData.get("body") ?? "") };
  const parsed = newConversationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: kept };
  const { supabase, uid } = await me();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }), values: kept };
  const { data, error } = await supabase.rpc("start_conversation", {
    p_course: parsed.data.courseId,
    p_subject: parsed.data.subject ?? "",
    p_body: parsed.data.body,
  });
  if (error || !data) return { status: "error", message: toArabicError(error), values: kept };
  revalidatePath("/messages", "layout");
  redirect(`/messages/${data}`);
}
