"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REMEMBER_COOKIE } from "@/lib/supabase/cookies";
import { env } from "@/lib/env";
import { errorCode, toArabicError } from "@/lib/errors";
import { safeNext } from "@/lib/auth";
import {
  emailSchema,
  fieldErrorsOf,
  loginSchema,
  otpSchema,
  registerSchema,
  resetPasswordSchema,
  type FormState,
} from "@/lib/validation/auth";

const values = (formData: FormData, keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));

/** PUB-AUT-02 · تسجيل الدخول */
export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const kept = values(formData, ["email"]);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: kept };

  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, parsed.data.remember ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(parsed.data.remember ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  });

  const supabase = await createClient({ remember: parsed.data.remember });
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    if (errorCode(error) === "email_not_confirmed") {
      await supabase.auth.resend({ type: "signup", email: parsed.data.email });
      redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}&next=${encodeURIComponent(safeNext(formData.get("next")))}`);
    }
    return { status: "error", message: toArabicError(error), values: kept };
  }
  redirect(safeNext(formData.get("next"), "/"));
}

/**
 * Supabase Auth gives up after 10 s while its SMTP server is still sending (504 `request_timeout`).
 * The user and the e-mail have been created by then, so the flow continues as if it succeeded.
 */
function isSlowEmailSend(error: { status?: number; code?: string } | null) {
  return Boolean(error && (error.status === 504 || error.code === "request_timeout"));
}

/** PUB-AUT-01 · إنشاء حساب */
export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  const kept = values(formData, ["fullName", "phone", "email"]);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: kept };

  const next = safeNext(formData.get("next"), "/select-workspace");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
      emailRedirectTo: `${env.siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error && !isSlowEmailSend(error)) return { status: "error", message: toArabicError(error), values: kept };
  // Supabase returns a user without identities when the e-mail is already registered.
  if (data?.user && data.user.identities?.length === 0) {
    return { status: "error", fieldErrors: { email: toArabicError({ code: "user_already_exists" }) }, values: kept };
  }
  if (data?.session) redirect(next);
  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}&next=${encodeURIComponent(next)}`);
}

/** PUB-AUT-03 · تحقّق من هويتك (e-mail code after sign-up) */
export async function verifySignupCode(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = otpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.token, type: "email" });
  if (error) return { status: "error", message: toArabicError({ code: "otp_expired" }) };
  redirect(safeNext(formData.get("next"), "/select-workspace"));
}

export async function resendSignupCode(email: string): Promise<FormState> {
  const parsed = emailSchema.safeParse({ email });
  if (!parsed.success) return { status: "error", message: "تحقق من صيغة البريد الإلكتروني" };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data.email });
  if (error && !isSlowEmailSend(error)) return { status: "error", message: toArabicError(error) };
  return { status: "success", message: "أرسلنا رمزًا جديدًا إلى بريدك." };
}

/** PUB-AUT-04 · خطوة ١ — طلب الرمز */
export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: values(formData, ["email"]) };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/forgot-password/new`,
  });
  // Rate limits are surfaced; unknown e-mails are not (no account enumeration).
  if (error && ["over_email_send_rate_limit", "over_request_rate_limit"].includes(errorCode(error) ?? "")) {
    return { status: "error", message: toArabicError(error), values: values(formData, ["email"]) };
  }
  redirect(`/forgot-password/verify?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function resendRecoveryCode(email: string): Promise<FormState> {
  const parsed = emailSchema.safeParse({ email });
  if (!parsed.success) return { status: "error", message: "تحقق من صيغة البريد الإلكتروني" };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/forgot-password/new`,
  });
  if (error && errorCode(error) && !isSlowEmailSend(error)) return { status: "error", message: toArabicError(error) };
  return { status: "success", message: "أرسلنا رمزًا جديدًا إلى بريدك." };
}

/** PUB-AUT-04 · خطوة ٢ — رمز التحقق */
export async function verifyRecoveryCode(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = otpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.token, type: "recovery" });
  if (error) return { status: "error", message: toArabicError({ code: "otp_expired" }) };
  redirect("/forgot-password/new");
}

/** PUB-AUT-04 · خطوة ٣ — كلمة مرور جديدة (requires the recovery session from step 2 or the e-mail link) */
export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { status: "error", message: "انتهت صلاحية رابط الاسترجاع. اطلب رمزًا جديدًا." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: toArabicError(error) };
  redirect("/?password=updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
