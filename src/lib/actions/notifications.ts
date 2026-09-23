"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** GEN-NOT-01 · تعليم الكل كمقروء */
export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", data.claims.sub).is("read_at", null);
  revalidatePath("/", "layout");
}

export async function markNotificationRead(id: string) {
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  revalidatePath("/", "layout");
}

export async function markNotificationsRead(ids: string[]) {
  const valid = ids.filter((id) => z.uuid().safeParse(id).success).slice(0, 200);
  if (valid.length === 0) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", valid).is("read_at", null);
  revalidatePath("/", "layout");
}

export async function deleteNotifications(ids: string[]) {
  const valid = ids.filter((id) => z.uuid().safeParse(id).success).slice(0, 200);
  if (valid.length === 0) return;
  const supabase = await createClient();
  await supabase.from("notifications").delete().in("id", valid);
  revalidatePath("/", "layout");
}
