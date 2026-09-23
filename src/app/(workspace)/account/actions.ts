"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { toArabicError } from "@/lib/errors";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import { accountSchema, localeSchema } from "@/lib/validation/profile";
import { passwordRules } from "@/lib/validation/auth";
import { readPrefs, type NotificationPrefs } from "@/lib/data/account";
import type { Json } from "@/types/database";

const values = (formData: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, uid: data?.claims?.sub ?? null, email: typeof data?.claims?.email === "string" ? data.claims.email : "" };
}

/** GEN-ACC-01 · ١ هويتك على المنصة — name (unless verified), phone, e-mail (confirmation link to the new address). */
export async function updateAccount(_: FormState, formData: FormData): Promise<FormState> {
  const kept = values(formData, ["fullName", "phone", "email"]);
  const raw = Object.fromEntries(formData);
  if (!formData.has("fullName")) delete raw.fullName;
  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: kept };

  const { supabase, uid, email } = await session();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }), values: kept };

  const { data: profile } = await supabase.from("profiles").select("identity_status").eq("id", uid).single();
  const settings = await supabase.from("account_settings").upsert({ user_id: uid, phone: parsed.data.phone }, { onConflict: "user_id" });
  if (settings.error) return { status: "error", message: toArabicError(settings.error), values: kept };
  // A verified name is locked: changing it needs a new identity verification.
  if (parsed.data.fullName && profile?.identity_status !== "verified") {
    const res = await supabase.from("profiles").update({ full_name: parsed.data.fullName }).eq("id", uid);
    if (res.error) return { status: "error", message: toArabicError(res.error), values: kept };
  }

  let message = "حُفظت بيانات حسابك.";
  if (parsed.data.email !== email.toLowerCase()) {
    const { error } = await supabase.auth.updateUser(
      { email: parsed.data.email },
      { emailRedirectTo: `${env.siteUrl}/auth/confirm?next=${encodeURIComponent("/account?email=changed")}` },
    );
    if (error) return { status: "error", fieldErrors: { email: toArabicError(error) }, values: kept };
    message = `حُفظت بياناتك. أرسلنا رابط تأكيد إلى ${parsed.data.email} — لن يتغيّر بريدك حتى تضغط الرابط.`;
  }
  revalidatePath("/account", "layout");
  revalidatePath("/", "layout");
  return { status: "success", message, values: kept };
}

/** GEN-ACC-01 · اللغة والمنطقة (auto-saved on change). */
export async function updateLocale(input: { locale: string; timezone: string; arabicDigits: boolean }): Promise<FormState> {
  const parsed = localeSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: toArabicError({ code: "invalid_input" }) };
  const { supabase, uid } = await session();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  const { error } = await supabase
    .from("account_settings")
    .upsert({ user_id: uid, locale: parsed.data.locale, timezone: parsed.data.timezone, arabic_digits: parsed.data.arabicDigits }, { onConflict: "user_id" });
  if (error) return { status: "error", message: toArabicError(error) };
  revalidatePath("/account");
  return { status: "success", message: "حُفظ التغيير." };
}

/* ── ٢ الأمان والجلسات ─────────────────────────────────────────────────── */

const passwordChangeSchema = z
  .object({
    current: z.string().min(1, "أدخل كلمة المرور الحالية"),
    password: z
      .string()
      .max(72, "كلمة المرور طويلة جدًا")
      .refine((v) => passwordRules.every((r) => r.test(v)), "٨ أحرف على الأقل، وتتضمن رقمًا وحرفًا كبيرًا وحرفًا صغيرًا."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "كلمتا المرور غير متطابقتين" })
  .refine((d) => d.password !== d.current, { path: ["password"], message: "كلمة المرور الجديدة يجب أن تختلف عن الحالية." });

/** Re-authenticates with the current password, then updates it (supabase.auth.updateUser). */
export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  const { supabase, uid, email } = await session();
  if (!uid || !email) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };

  const { error: authError } = await supabase.auth.signInWithPassword({ email, password: parsed.data.current });
  if (authError) return { status: "error", fieldErrors: { current: "كلمة المرور الحالية غير صحيحة." } };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: toArabicError(error) };
  return { status: "success", message: "تغيّرت كلمة المرور. استخدمها في المرة القادمة التي تسجّل فيها الدخول." };
}

/** Signs out every other session of this user (auth.signOut({ scope: "others" })). */
export async function signOutOtherSessions(): Promise<FormState> {
  const { supabase, uid } = await session();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { status: "error", message: toArabicError(error) };
  return { status: "success", message: "أُنهيت كل الجلسات الأخرى. هذا الجهاز ما زال مسجّلًا." };
}

/* ── ٣ الإشعارات ───────────────────────────────────────────────────────── */

export async function updateNotificationPrefs(next: NotificationPrefs): Promise<FormState> {
  const prefs = readPrefs(next); // normalises shape and keeps the mandatory channels on
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(prefs.quietHours.from) || !time.test(prefs.quietHours.to)) return { status: "error", message: toArabicError({ code: "invalid_input" }) };
  const { supabase, uid } = await session();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  const { error } = await supabase.from("account_settings").upsert({ user_id: uid, notification_prefs: prefs as unknown as Json }, { onConflict: "user_id" });
  if (error) return { status: "error", message: toArabicError(error) };
  revalidatePath("/account/notifications");
  return { status: "success", message: "حُفظت تفضيلاتك." };
}

/* ── ٤ الخصوصية والبيانات ──────────────────────────────────────────────── */

const privacySchema = z.object({
  field: z.enum(["is_public", "show_certificates", "show_learning_record"]),
  value: z.boolean(),
});

export async function updatePrivacy(field: string, value: boolean): Promise<FormState> {
  const parsed = privacySchema.safeParse({ field, value });
  if (!parsed.success) return { status: "error", message: toArabicError({ code: "invalid_input" }) };
  const { supabase, uid } = await session();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  const { error } =
    parsed.data.field === "is_public"
      ? await supabase.from("profiles").update({ is_public: parsed.data.value }).eq("id", uid)
      : await supabase
          .from("account_settings")
          .upsert(
            parsed.data.field === "show_certificates"
              ? { user_id: uid, show_certificates: parsed.data.value }
              : { user_id: uid, show_learning_record: parsed.data.value },
            { onConflict: "user_id" },
          );
  if (error) return { status: "error", message: toArabicError(error) };
  revalidatePath("/account/privacy");
  revalidatePath("/trainee/profile", "layout");
  return { status: "success", message: "حُفظ إعداد الخصوصية." };
}

/** BR-S3: freeze (reversible by signing in again via support) or request deletion; both refuse while commitments exist. */
export async function closeAccount(kind: "freeze" | "delete"): Promise<FormState> {
  const { supabase, uid } = await session();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  const { error } = kind === "delete" ? await supabase.rpc("request_account_deletion") : await supabase.rpc("freeze_account");
  if (error) return { status: "error", message: toArabicError(error) };
  await supabase.auth.signOut();
  redirect(`/login?account=${kind === "delete" ? "deleted" : "frozen"}`);
}
