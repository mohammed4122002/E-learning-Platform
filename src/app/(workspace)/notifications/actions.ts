"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import type { FormState } from "@/lib/validation/auth";
import { toArabicDigits } from "@/lib/format";

const ACTION_KINDS = ["action_required", "waitlist_invite"];
const idsSchema = z.array(z.uuid()).min(1).max(200);

async function owner() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, uid: data?.claims?.sub ?? null };
}

/** GEN-NOT-01 · Selection → أرشفة (hidden from the list, kept under «المؤرشفة»). */
export async function archiveNotifications(ids: string[], archive = true): Promise<FormState> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { status: "error", message: toArabicError({ code: "invalid_input" }) };
  const { supabase, uid } = await owner();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  const { error } = await supabase
    .from("notifications")
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq("user_id", uid)
    .in("id", parsed.data);
  if (error) return { status: "error", message: toArabicError(error) };
  revalidatePath("/", "layout");
  return { status: "success", message: archive ? "نُقلت الإشعارات إلى المؤرشفة." : "أُعيدت الإشعارات إلى القائمة." };
}

/** GEN-NOT-01 · Selection → حذف. Unread deadline notifications are protected until they expire. */
export async function deleteSelectedNotifications(ids: string[]): Promise<FormState & { skipped?: number }> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { status: "error", message: toArabicError({ code: "invalid_input" }) };
  const { supabase, uid } = await owner();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };

  const { data: rows, error: readError } = await supabase.from("notifications").select("id, kind, read_at").eq("user_id", uid).in("id", parsed.data);
  if (readError) return { status: "error", message: toArabicError(readError) };
  const deletable = (rows ?? []).filter((r) => !(ACTION_KINDS.includes(r.kind) && !r.read_at)).map((r) => r.id);
  const skipped = (rows ?? []).length - deletable.length;
  if (deletable.length) {
    const { error } = await supabase.from("notifications").delete().eq("user_id", uid).in("id", deletable);
    if (error) return { status: "error", message: toArabicError(error) };
  }
  revalidatePath("/", "layout");
  return {
    status: "success",
    skipped,
    message: skipped ? `حُذفت ${toArabicDigits(deletable.length)} وبقيت ${toArabicDigits(skipped)} تحتاج إجراءك.` : "حُذفت الإشعارات المحددة.",
  };
}
