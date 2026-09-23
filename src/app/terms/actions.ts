"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { TERMS_VERSION } from "./content";

/** GEN-TRM-01 · أوافق ومتابعة — records the accepted version with a timestamp for signed-in users. */
export async function acceptTerms(formData: FormData) {
  if (formData.get("agree") !== "on") redirect("/terms?error=agree");
  const next = safeNext(formData.get("next"), "");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (uid) {
    await supabase.from("terms_acceptances").upsert({ user_id: uid, version: TERMS_VERSION }, { onConflict: "user_id,version", ignoreDuplicates: true });
    redirect(next || "/");
  }
  redirect(next || "/register");
}

/** GEN-TRM-01 · رفض والخروج */
export async function declineTerms() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) {
    await supabase.auth.signOut();
    redirect("/login");
  }
  redirect("/");
}
