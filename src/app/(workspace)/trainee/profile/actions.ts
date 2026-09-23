"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import { experienceSchema, profileSchema } from "@/lib/validation/profile";

const values = (formData: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, uid: data?.claims?.sub ?? null };
}

function revalidateProfile() {
  revalidatePath("/trainee/profile", "layout");
  revalidatePath("/account", "layout");
  revalidatePath("/u/[id]", "page");
}

/** TRN-PRF-02 · حفظ التعديلات («عاين ثم احفظ» saves then opens the public preview). */
export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const kept = values(formData, ["fullName", "headline", "bio", "city", "phone"]);
  const raw = Object.fromEntries(formData);
  if (!formData.has("fullName")) delete raw.fullName;
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: kept };

  const { supabase, uid } = await currentUserId();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }), values: kept };

  const { data: profile } = await supabase.from("profiles").select("identity_status").eq("id", uid).single();
  const update: { headline: string | null; bio: string | null; city: string | null; full_name?: string } = {
    headline: parsed.data.headline,
    bio: parsed.data.bio,
    city: parsed.data.city,
  };
  // Verified names are locked: changing them needs a new identity verification.
  if (parsed.data.fullName && profile?.identity_status !== "verified") update.full_name = parsed.data.fullName;

  const [profileRes, settingsRes] = await Promise.all([
    supabase.from("profiles").update(update).eq("id", uid),
    supabase.from("account_settings").upsert({ user_id: uid, phone: parsed.data.phone }, { onConflict: "user_id" }),
  ]);
  const error = profileRes.error ?? settingsRes.error;
  if (error) return { status: "error", message: toArabicError(error), values: kept };

  revalidateProfile();
  revalidatePath("/", "layout");
  if (parsed.data.intent === "preview") redirect("/trainee/profile?tab=preview&saved=1");
  return { status: "success", message: "حُفظت تعديلاتك وظهرت في ملفك.", values: kept };
}

/** TRN-PRF-01 · أوقف / فعّل مشاركة الملف (profiles.is_public). */
export async function setProfileVisibility(isPublic: boolean): Promise<FormState> {
  const { supabase, uid } = await currentUserId();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  const { error } = await supabase.from("profiles").update({ is_public: Boolean(isPublic) }).eq("id", uid);
  if (error) return { status: "error", message: toArabicError(error) };
  revalidateProfile();
  return { status: "success", message: isPublic ? "أصبح ملفك متاحًا عبر الرابط." : "أوقفنا مشاركة ملفك — الرابط لم يعد يعمل لغيرك." };
}

/* ── TRN-PRF-03 · صورة الملف ──────────────────────────────────────────── */

const avatarPath = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg|jpeg|png)$/i);

/** Points the profile at an uploaded avatar and deletes the previous object(s). */
export async function setAvatar(path: string, discardPath?: string | null): Promise<FormState> {
  const { supabase, uid } = await currentUserId();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  if (!avatarPath.safeParse(path).success || !path.startsWith(`${uid}/`)) return { status: "error", message: toArabicError({ code: "forbidden" }) };

  const { data: current } = await supabase.from("profiles").select("avatar_path").eq("id", uid).single();
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", uid);
  if (error) return { status: "error", message: toArabicError(error) };

  const stale = [current?.avatar_path, discardPath].filter((p): p is string => Boolean(p) && p !== path && p!.startsWith(`${uid}/`));
  if (stale.length) await supabase.storage.from("avatars").remove(stale);

  revalidateProfile();
  revalidatePath("/", "layout");
  return { status: "success", message: "ظهرت صورتك الجديدة في ملفك المهني." };
}

/** Removes the avatar from the profile but keeps the file so it can be restored in this session. */
export async function removeAvatar(): Promise<FormState & { previousPath?: string | null }> {
  const { supabase, uid } = await currentUserId();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  const { data: current } = await supabase.from("profiles").select("avatar_path").eq("id", uid).single();
  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", uid);
  if (error) return { status: "error", message: toArabicError(error) };
  revalidateProfile();
  revalidatePath("/", "layout");
  return { status: "success", previousPath: current?.avatar_path ?? null };
}

/** Deletes an uploaded avatar object that was never attached (upload cancelled after completion). */
export async function discardAvatar(path: string): Promise<void> {
  const { supabase, uid } = await currentUserId();
  if (!uid || !avatarPath.safeParse(path).success || !path.startsWith(`${uid}/`)) return;
  const { data: current } = await supabase.from("profiles").select("avatar_path").eq("id", uid).single();
  if (current?.avatar_path === path) return;
  await supabase.storage.from("avatars").remove([path]);
}

/* ── TRN-PRF-04 · الخبرات المهنية ─────────────────────────────────────── */

export async function saveExperience(_: FormState, formData: FormData): Promise<FormState> {
  const kept = values(formData, ["id", "title", "organization", "startMonth", "endMonth", "isCurrent", "description"]);
  const parsed = experienceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: kept };

  const { supabase, uid } = await currentUserId();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }), values: kept };

  const d = parsed.data;
  const row = {
    title: d.title,
    organization: d.organization,
    start_date: `${d.startMonth}-01`,
    end_date: d.isCurrent ? null : `${d.endMonth}-01`,
    is_current: d.isCurrent,
    description: d.description,
  };
  const res = d.id
    ? await supabase.from("experiences").update(row).eq("id", d.id).eq("user_id", uid).select("id").maybeSingle()
    : await supabase.from("experiences").insert({ ...row, user_id: uid }).select("id").single();
  if (res.error) return { status: "error", message: toArabicError(res.error), values: kept };
  if (!res.data) return { status: "error", message: toArabicError({ code: "not_found" }), values: kept };

  revalidateProfile();
  redirect(`/trainee/profile/experience?saved=${res.data.id}`);
}

export async function deleteExperience(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) redirect("/trainee/profile/experience");
  const { supabase, uid } = await currentUserId();
  if (!uid) redirect("/login");
  await supabase.from("experiences").delete().eq("id", id).eq("user_id", uid);
  revalidateProfile();
  redirect("/trainee/profile/experience?deleted=1");
}
