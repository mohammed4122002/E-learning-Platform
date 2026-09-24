"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";

/** TRR-HLP-02 «هل أفادك هذا الدليل؟» — one answer per user and guide (RLS: own rows only). */
export async function rateTrainerGuide(articleId: string, helpful: boolean): Promise<{ ok: boolean; message?: string }> {
  if (!z.string().uuid().safeParse(articleId).success) return { ok: false, message: toArabicError({ message: "invalid_input" }) };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return { ok: false, message: toArabicError({ message: "forbidden" }) };
  const { error } = await supabase
    .from("help_article_feedback")
    .upsert({ article_id: articleId, user_id: uid, helpful, created_at: new Date().toISOString() }, { onConflict: "article_id,user_id" });
  if (error) return { ok: false, message: toArabicError(error) };
  return { ok: true };
}
