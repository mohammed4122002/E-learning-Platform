"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";

const KEY = /^[a-z_]{2,24}:[a-z0-9-]{2,40}$/;

/** TRR-QUE-01 · «ليس الآن» hides an item for 24 hours; «إخفاء من الطابور» hides an in-processing item for good. */
export async function dismissTrainerQueueItem(key: string, mode: "snooze" | "hide"): Promise<{ ok: boolean; message: string }> {
  if (!KEY.test(key) || (mode !== "snooze" && mode !== "hide")) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  const { error } = await supabase.from("queue_dismissals").upsert(
    { user_id: uid, item_key: `trainer:${key}`, hidden_until: mode === "snooze" ? new Date(Date.now() + 24 * 3_600_000).toISOString() : null },
    { onConflict: "user_id,item_key" },
  );
  if (error) return { ok: false, message: toArabicError(error) };
  revalidatePath("/trainer", "layout");
  return { ok: true, message: mode === "snooze" ? "أخفينا البند حتى الغد — سيعود إن بقي بحاجة إلى إجرائك." : "أُخفي البند من الطابور." };
}
