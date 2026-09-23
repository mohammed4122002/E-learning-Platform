"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";

export type ToggleResult = { ok: true; saved: boolean } | { ok: false; message: string };

/**
 * TRN-FAV-01 · add / remove a course from «المفضلة» (owner-scoped `favorites` row, RLS favorites_own).
 * `save` states the desired end state so double clicks stay idempotent.
 */
export async function toggleFavorite(courseId: string, save: boolean): Promise<ToggleResult> {
  if (!z.uuid().safeParse(courseId).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };

  const { error } = save
    ? await supabase.from("favorites").upsert({ user_id: uid, course_id: courseId }, { onConflict: "user_id,course_id", ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", uid).eq("course_id", courseId);
  if (error) return { ok: false, message: toArabicError(error) };

  revalidatePath("/trainee/favorites");
  return { ok: true, saved: save };
}
