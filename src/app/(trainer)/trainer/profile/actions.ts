"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import type { Json } from "@/types/database";

/* TRR-PRF-02 / TRR-PRF-03 writes. Every row is owner-scoped (RLS: trainer_id / user_id = auth.uid()). */

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, uid: data?.claims?.sub ?? null };
}

function revalidateProfile() {
  revalidatePath("/trainer", "layout");
}

async function ensureTrainerRow(supabase: Awaited<ReturnType<typeof createClient>>, uid: string) {
  await supabase.from("trainer_profiles").upsert({ user_id: uid }, { onConflict: "user_id", ignoreDuplicates: true });
}

/** Marks the professional profile complete the first time bio + headline + a specialty exist (journey stage 3). */
async function touchCompletion(supabase: Awaited<ReturnType<typeof createClient>>, uid: string) {
  const [{ data: p }, { data: t }] = await Promise.all([
    supabase.from("profiles").select("bio, headline").eq("id", uid).single(),
    supabase.from("trainer_profiles").select("specialties, profile_completed_at").eq("user_id", uid).maybeSingle(),
  ]);
  if (!t || t.profile_completed_at) return;
  if ((p?.bio?.trim().length ?? 0) >= 20 && p?.headline?.trim() && t.specialties.length > 0) {
    await supabase.from("trainer_profiles").update({ profile_completed_at: new Date().toISOString() }).eq("user_id", uid);
  }
}

const basics = z.object({
  field: z.enum(["headline", "bio"]),
  value: z.string().trim().max(1200, "النص طويل جدًا"),
});

/** «كل تعديل يُحفظ فورًا» — saves the headline or the bio on blur. */
export async function saveTrainerBasics(field: "headline" | "bio", value: string): Promise<{ ok: boolean; message: string }> {
  const parsed = basics.safeParse({ field, value });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? toArabicError({ code: "invalid_input" }) };
  if (parsed.data.field === "headline" && parsed.data.value.length > 120) return { ok: false, message: "العنوان المهني طويل جدًا (١٢٠ حرفًا كحد أقصى)." };
  const { supabase, uid } = await session();
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  const { error } = await supabase
    .from("profiles")
    .update(parsed.data.field === "bio" ? { bio: parsed.data.value || null } : { headline: parsed.data.value || null })
    .eq("id", uid);
  if (error) return { ok: false, message: toArabicError(error) };
  await ensureTrainerRow(supabase, uid);
  await touchCompletion(supabase, uid);
  revalidateProfile();
  return { ok: true, message: parsed.data.field === "bio" ? "حُفظت نبذتك." : "حُفظ عنوانك المهني." };
}

/* ── Qualifications (الاعتمادات والمؤهلات) ─────────────────────────────────────────────── */

const qualification = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  kind: z.enum(["academic", "professional"], { error: "اختر نوع المؤهل" }),
  title: z.string().trim().min(2, "اكتب اسم المؤهل").max(160, "الاسم طويل جدًا"),
  issuer: z.string().trim().min(2, "اكتب الجهة المانحة").max(160, "الاسم طويل جدًا"),
  year: z.union([z.literal(""), z.coerce.number().int().min(1950, "سنة غير صحيحة").max(new Date().getFullYear(), "سنة غير صحيحة")]),
  filePath: z.string().max(300).optional(),
});

export async function saveQualification(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(["id", "kind", "title", "issuer", "year", "filePath"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = qualification.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: raw };
  const { supabase, uid } = await session();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }), values: raw };
  const d = parsed.data;
  if (d.filePath && !d.filePath.startsWith(`${uid}/`)) return { status: "error", message: toArabicError({ code: "forbidden" }), values: raw };
  const row = { kind: d.kind, title: d.title, issuer: d.issuer, year: d.year === "" ? null : d.year, ...(d.filePath ? { file_path: d.filePath } : {}) };
  const res = d.id
    ? await supabase.from("trainer_qualifications").update(row).eq("id", d.id).eq("trainer_id", uid).select("id").maybeSingle()
    : await supabase.from("trainer_qualifications").insert({ ...row, trainer_id: uid }).select("id").single();
  if (res.error) return { status: "error", message: toArabicError(res.error), values: raw };
  if (!res.data) return { status: "error", message: toArabicError({ code: "not_found" }), values: raw };
  revalidateProfile();
  return { status: "success", message: d.id ? "حُدّث المؤهل." : "أُضيف المؤهل إلى ملفك." };
}

export async function deleteQualification(id: string): Promise<{ ok: boolean; message: string }> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const { supabase, uid } = await session();
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  const { data, error } = await supabase.from("trainer_qualifications").delete().eq("id", id).eq("trainer_id", uid).select("id");
  if (error) return { ok: false, message: toArabicError(error) };
  if (!data?.length) return { ok: false, message: toArabicError({ code: "qualification_locked" }) };
  revalidateProfile();
  return { ok: true, message: "حُذف المؤهل من ملفك." };
}

/* ── Experiences (الخبرات والأعمال) — same table as the trainee profile ─────────────────── */

const month = /^\d{4}-(0[1-9]|1[0-2])$/;
const experience = z
  .object({
    id: z.union([z.literal(""), z.uuid()]),
    title: z.string().trim().min(2, "اكتب المسمى الوظيفي").max(120, "المسمى طويل جدًا"),
    organization: z.string().trim().min(2, "اكتب اسم الجهة").max(120, "الاسم طويل جدًا"),
    startMonth: z.string().regex(month, "اختر تاريخ البداية"),
    endMonth: z.string().optional(),
    isCurrent: z.boolean(),
  })
  .refine((d) => d.isCurrent || (d.endMonth && month.test(d.endMonth)), { path: ["endMonth"], message: "اختر تاريخ الانتهاء أو حدّد «ما زلت أعمل هنا»" })
  .refine((d) => d.isCurrent || !d.endMonth || d.endMonth >= d.startMonth, { path: ["endMonth"], message: "تاريخ الانتهاء قبل تاريخ البداية" });

export async function saveTrainerExperience(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(["id", "title", "organization", "startMonth", "endMonth"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = experience.safeParse({ ...raw, isCurrent: formData.get("isCurrent") === "on" });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: raw };
  const { supabase, uid } = await session();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }), values: raw };
  const d = parsed.data;
  const row = { title: d.title, organization: d.organization, start_date: `${d.startMonth}-01`, end_date: d.isCurrent ? null : `${d.endMonth}-01`, is_current: d.isCurrent };
  const res = d.id
    ? await supabase.from("experiences").update(row).eq("id", d.id).eq("user_id", uid).select("id").maybeSingle()
    : await supabase.from("experiences").insert({ ...row, user_id: uid }).select("id").single();
  if (res.error) return { status: "error", message: toArabicError(res.error), values: raw };
  if (!res.data) return { status: "error", message: toArabicError({ code: "not_found" }), values: raw };
  revalidateProfile();
  revalidatePath("/trainee/profile", "layout");
  return { status: "success", message: d.id ? "حُدّثت الخبرة." : "أُضيفت الخبرة إلى ملفك." };
}

export async function deleteTrainerExperience(id: string): Promise<{ ok: boolean; message: string }> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const { supabase, uid } = await session();
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  const { error } = await supabase.from("experiences").delete().eq("id", id).eq("user_id", uid);
  if (error) return { ok: false, message: toArabicError(error) };
  revalidateProfile();
  revalidatePath("/trainee/profile", "layout");
  return { ok: true, message: "حُذفت الخبرة." };
}

/* ── CV, visible programs, visibility levels ────────────────────────────────────────────── */

const mediaPath = (uid: string) => z.string().regex(new RegExp(`^${uid}/[0-9a-z-]{8,80}\\.(pdf|png|jpe?g|webp)$`, "i"));

export async function setCv(path: string, name: string, size: number): Promise<{ ok: boolean; message: string }> {
  const { supabase, uid } = await session();
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  if (!mediaPath(uid).safeParse(path).success || !path.endsWith(".pdf")) return { ok: false, message: toArabicError({ code: "forbidden" }) };
  await ensureTrainerRow(supabase, uid);
  const { data: prev } = await supabase.from("trainer_profiles").select("cv_path").eq("user_id", uid).single();
  const { error } = await supabase
    .from("trainer_profiles")
    .update({ cv_path: path, cv_name: name.slice(0, 120), cv_size: Math.max(0, Math.min(Math.round(size), 20_000_000)) })
    .eq("user_id", uid);
  if (error) return { ok: false, message: toArabicError(error) };
  if (prev?.cv_path && prev.cv_path !== path) await supabase.storage.from("trainer-media").remove([prev.cv_path]);
  revalidateProfile();
  return { ok: true, message: "رُفعت سيرتك الذاتية — تظهر للجهات للتنزيل." };
}

export async function removeCv(): Promise<{ ok: boolean; message: string }> {
  const { supabase, uid } = await session();
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  const { data: prev } = await supabase.from("trainer_profiles").select("cv_path").eq("user_id", uid).single();
  const { error } = await supabase.from("trainer_profiles").update({ cv_path: null, cv_name: null, cv_size: null }).eq("user_id", uid);
  if (error) return { ok: false, message: toArabicError(error) };
  if (prev?.cv_path) await supabase.storage.from("trainer-media").remove([prev.cv_path]);
  revalidateProfile();
  return { ok: true, message: "حُذفت السيرة الذاتية من ملفك." };
}

export async function setProgramVisible(programId: string, visible: boolean): Promise<{ ok: boolean; message: string }> {
  if (!z.uuid().safeParse(programId).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const { supabase, uid } = await session();
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  const { data: own } = await supabase.from("programs").select("id").eq("id", programId).eq("owner_id", uid).maybeSingle();
  if (!own) return { ok: false, message: toArabicError({ code: "forbidden" }) };
  await ensureTrainerRow(supabase, uid);
  const { data: t } = await supabase.from("trainer_profiles").select("hidden_program_ids").eq("user_id", uid).single();
  const hidden = new Set(t?.hidden_program_ids ?? []);
  if (visible) hidden.delete(programId);
  else hidden.add(programId);
  const { error } = await supabase.from("trainer_profiles").update({ hidden_program_ids: [...hidden] }).eq("user_id", uid);
  if (error) return { ok: false, message: toArabicError(error) };
  revalidateProfile();
  return { ok: true, message: visible ? "يظهر البرنامج الآن في ملفك." : "أُخفي البرنامج من ملفك." };
}

const VIS_KEYS = ["profile", "credentials", "experience", "availability", "trainees"] as const;
const NEXT_LEVEL = { public: "orgs", orgs: "private", private: "public" } as const;

/** «اضغط أي بند لتغيير مستوى ظهوره»: عام → الجهات → خاص → عام. */
export async function cycleVisibility(key: (typeof VIS_KEYS)[number]): Promise<{ ok: boolean; message: string }> {
  if (!(VIS_KEYS as readonly string[]).includes(key)) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const { supabase, uid } = await session();
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  await ensureTrainerRow(supabase, uid);
  const { data: t } = await supabase.from("trainer_profiles").select("visibility").eq("user_id", uid).single();
  const current = { profile: "public", credentials: "public", experience: "public", availability: "orgs", trainees: "orgs", ...((t?.visibility ?? {}) as Record<string, string>) };
  const level = NEXT_LEVEL[(current[key] as keyof typeof NEXT_LEVEL) ?? "public"];
  const { error } = await supabase
    .from("trainer_profiles")
    .update({ visibility: { ...current, [key]: level } as Json })
    .eq("user_id", uid);
  if (error) return { ok: false, message: toArabicError(error) };
  revalidateProfile();
  return { ok: true, message: level === "public" ? "أصبح البند عامًا — يراه أي زائر." : level === "orgs" ? "أصبح البند للجهات التدريبية فقط." : "أصبح البند خاصًا — لا يراه أحد." };
}

/* ── Portfolio (TRR-PRF-03 معرض الأعمال) ─────────────────────────────────────────────── */

const optionalInt = (min: number, max: number) => z.union([z.literal(""), z.coerce.number().int().min(min, "رقم غير صحيح").max(max, "رقم غير صحيح")]);
const portfolio = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  kind: z.enum(["delivered", "material", "program"], { error: "اختر نوع العمل" }),
  title: z.string().trim().min(3, "اكتب عنوان العمل").max(140, "العنوان طويل جدًا"),
  organization: z.string().trim().max(120, "الاسم طويل جدًا"),
  happenedOn: z.union([z.literal(""), z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "اختر الشهر")]),
  durationDays: optionalInt(1, 365),
  traineesCount: optionalInt(1, 100000),
  coursesCount: optionalInt(1, 1000),
  pageCount: optionalInt(1, 5000),
  fileFormat: z.string().trim().max(12),
});

export async function savePortfolioItem(_: FormState, formData: FormData): Promise<FormState & { id?: string }> {
  const keys = ["id", "kind", "title", "organization", "happenedOn", "durationDays", "traineesCount", "coursesCount", "pageCount", "fileFormat"];
  const raw = Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = portfolio.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: raw };
  const { supabase, uid } = await session();
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }), values: raw };
  const d = parsed.data;
  const num = (v: number | "") => (v === "" ? null : v);
  const row = {
    kind: d.kind,
    title: d.title,
    organization: d.organization || null,
    happened_on: d.happenedOn ? `${d.happenedOn}-01` : null,
    duration_days: num(d.durationDays),
    trainees_count: num(d.traineesCount),
    courses_count: num(d.coursesCount),
    page_count: num(d.pageCount),
    file_format: d.fileFormat || null,
  };
  const res = d.id
    ? await supabase.from("trainer_portfolio_items").update(row).eq("id", d.id).eq("trainer_id", uid).select("id").maybeSingle()
    : await supabase.from("trainer_portfolio_items").insert({ ...row, trainer_id: uid }).select("id").single();
  if (res.error) return { status: "error", message: toArabicError(res.error), values: raw };
  if (!res.data) return { status: "error", message: toArabicError({ code: "not_found" }), values: raw };
  revalidateProfile();
  return { status: "success", message: d.id ? "حُدّث العمل." : "أُضيف العمل إلى معرضك.", id: res.data.id };
}

/** Attaches uploaded images (already in trainer-media/<uid>/…) to a portfolio item. */
export async function attachPortfolioImages(id: string, paths: string[]): Promise<{ ok: boolean; message: string }> {
  const { supabase, uid } = await session();
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  if (!z.uuid().safeParse(id).success || paths.some((p) => !mediaPath(uid).safeParse(p).success)) return { ok: false, message: toArabicError({ code: "forbidden" }) };
  const { data: item } = await supabase.from("trainer_portfolio_items").select("image_paths").eq("id", id).eq("trainer_id", uid).maybeSingle();
  if (!item) return { ok: false, message: toArabicError({ code: "not_found" }) };
  const merged = [...new Set([...item.image_paths, ...paths])].slice(0, 6);
  const { error } = await supabase.from("trainer_portfolio_items").update({ image_paths: merged }).eq("id", id).eq("trainer_id", uid);
  if (error) return { ok: false, message: toArabicError(error) };
  revalidateProfile();
  return { ok: true, message: "حُفظت الصور." };
}

export async function deletePortfolioItem(id: string): Promise<{ ok: boolean; message: string }> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const { supabase, uid } = await session();
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  const { data, error } = await supabase.from("trainer_portfolio_items").delete().eq("id", id).eq("trainer_id", uid).select("image_paths");
  if (error) return { ok: false, message: toArabicError(error) };
  const paths = data?.[0]?.image_paths ?? [];
  if (paths.length) await supabase.storage.from("trainer-media").remove(paths);
  revalidateProfile();
  return { ok: true, message: "حُذف العمل من معرضك." };
}
