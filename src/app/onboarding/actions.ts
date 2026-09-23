"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { GOALS, HOURS, LEVELS, MODES, MODE_TO_COURSE_MODES, EXPERIENCE_YEARS, LEVEL_TO_COURSE_LEVEL } from "@/lib/onboarding";
import type { FormState } from "@/lib/validation/auth";
import type { Database } from "@/types/database";

type PrefsInsert = Database["public"]["Tables"]["trainee_preferences"]["Insert"];

const values = (list: { value: string }[]) => list.map((o) => o.value) as [string, ...string[]];

const stepSchemas = {
  1: z.object({ fields: z.array(z.string().max(40)).min(1, "اختر مجالًا واحدًا على الأقل").max(8) }),
  2: z.object({ goal: z.enum(values(GOALS), { error: "اختر هدفك من التعلم" }) }),
  3: z.object({ level: z.enum(values(LEVELS), { error: "اختر مستواك الحالي" }) }),
  4: z.object({ mode: z.enum(values(MODES), { error: "اختر نوع التدريب الذي تفضّله" }) }),
  5: z.object({ hours: z.enum(values(HOURS), { error: "اختر الوقت المتاح أسبوعيًا" }) }),
  6: z.object({
    jobTitle: z.string().trim().max(120, "المسمى الوظيفي طويل جدًا").optional(),
    experienceYears: z.union([z.literal(""), z.enum(EXPERIENCE_YEARS.map((y) => y.value) as [string, ...string[]])]).optional(),
    skills: z.array(z.string().trim().min(2).max(40)).max(20, "يمكن إضافة ٢٠ مهارة كحد أقصى"),
  }),
} as const;

/** Saves one onboarding step (answers are persisted after every step — "تُحفظ إجاباتك تلقائيًا"). */
export async function saveOnboardingStep(_: FormState, formData: FormData): Promise<FormState> {
  const step = Number(formData.get("step"));
  if (!(step >= 1 && step <= 6)) return { status: "error", message: "خطوة غير صالحة." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login?next=/onboarding");

  const raw = {
    fields: formData.getAll("fields").map(String),
    goal: formData.get("goal") ?? undefined,
    level: formData.get("level") ?? undefined,
    mode: formData.get("mode") ?? undefined,
    hours: formData.get("hours") ?? undefined,
    jobTitle: String(formData.get("jobTitle") ?? ""),
    experienceYears: String(formData.get("experienceYears") ?? ""),
    skills: formData.getAll("skills").map(String).filter(Boolean),
  };
  const parsed = stepSchemas[step as keyof typeof stepSchemas].safeParse(raw);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "تحقق من اختيارك." };

  const patch: PrefsInsert = { user_id: userId, step: step + 1, updated_at: new Date().toISOString() };
  const d = parsed.data as Record<string, unknown>;
  if (step === 1) {
    const { data: known } = await supabase.from("learning_fields").select("slug").in("slug", d.fields as string[]);
    const slugs = (known ?? []).map((f) => f.slug);
    if (slugs.length === 0) return { status: "error", message: "اختر مجالًا واحدًا على الأقل" };
    patch.field_slugs = slugs;
    // Keep category preferences in sync for recommendations.
    const { data: cats } = await supabase.from("categories").select("id").in("field_slug", slugs);
    patch.category_ids = (cats ?? []).map((c) => c.id);
  }
  if (step === 2) patch.goal = d.goal as string;
  if (step === 3) {
    patch.experience_level = d.level as string;
    patch.level = LEVEL_TO_COURSE_LEVEL[d.level as string];
  }
  if (step === 4) patch.modes = MODE_TO_COURSE_MODES[d.mode as string];
  if (step === 5) patch.weekly_hours = d.hours as string;
  if (step === 6) {
    patch.job_title = (d.jobTitle as string) || null;
    patch.experience_years = (d.experienceYears as string) || null;
    patch.skills = [...new Set(d.skills as string[])];
    patch.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("trainee_preferences").upsert(patch, { onConflict: "user_id" });
  if (error) return { status: "error", message: toArabicError(error) };
  revalidatePath("/trainee");
  redirect(step === 6 ? "/onboarding/done" : `/onboarding/${step + 1}`);
}
