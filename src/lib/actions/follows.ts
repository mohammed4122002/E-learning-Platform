"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import type { Database } from "@/types/database";

export type FollowTarget = "trainer" | "organization" | "category";
export type FollowResult = { ok: true; following: boolean } | { ok: false; message: string };

const COLUMN: Record<FollowTarget, "trainer_id" | "organization_id" | "category_id"> = {
  trainer: "trainer_id",
  organization: "organization_id",
  category: "category_id",
};

/**
 * TRN-FLW-01 · follow / unfollow a trainer, a training organisation or a category (owner-scoped `follows`, RLS follows_own).
 * `follow` states the desired end state so repeated clicks are idempotent.
 */
export async function setFollow(target: FollowTarget, targetId: string, follow: boolean): Promise<FollowResult> {
  if (!(target in COLUMN) || !z.uuid().safeParse(targetId).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  const column = COLUMN[target];

  if (follow) {
    const { data: existing } = await supabase.from("follows").select("id").eq("user_id", uid).eq(column, targetId).maybeSingle();
    if (!existing) {
      const row: Database["public"]["Tables"]["follows"]["Insert"] = { user_id: uid, [column]: targetId };
      const { error } = await supabase.from("follows").insert(row);
      if (error && error.code !== "23505") return { ok: false, message: toArabicError(error) };
    }
  } else {
    const { error } = await supabase.from("follows").delete().eq("user_id", uid).eq(column, targetId);
    if (error) return { ok: false, message: toArabicError(error) };
  }
  revalidatePath("/trainee/following");
  revalidatePath("/trainee");
  return { ok: true, following: follow };
}
