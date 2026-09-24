"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { AUDIENCES, DELIVERY_MODES, EXPERIENCE_BANDS, TRAINER_FIELDS, TRAINER_GOALS, TRAINER_ONBOARDING_STEPS } from "@/lib/trainer";
import type { FormState } from "@/lib/validation/auth";
import type { Database } from "@/types/database";

type Patch = Database["public"]["Tables"]["trainer_profiles"]["Insert"];
const values = (list: { value: string }[]) => list.map((o) => o.value) as [string, ...string[]];

const schemas = {
  1: z.object({ values: z.array(z.enum(values(TRAINER_FIELDS))).min(1, "اختر مجالًا واحدًا على الأقل").max(8) }),
  2: z.object({ values: z.array(z.enum(values(EXPERIENCE_BANDS))).length(1, "اختر سنوات خبرتك التدريبية") }),
  3: z.object({ values: z.array(z.enum(values(DELIVERY_MODES))).min(1, "اختر نمطًا واحدًا على الأقل").max(3) }),
  4: z.object({ values: z.array(z.enum(values(AUDIENCES))).length(1, "اختر مع من تفضّل العمل") }),
  5: z.object({ values: z.array(z.enum(values(TRAINER_GOALS))).length(1, "اختر أهم هدف لك من المنصة") }),
} as const;

/** TRR-ONB-01: saves one step («تُحفظ إجاباتك تلقائيًا») and moves on; step 5 completes the setup (TRR-ONB-02). */
export async function saveTrainerOnboardingStep(_: FormState, formData: FormData): Promise<FormState> {
  const step = Number(formData.get("step"));
  if (!Number.isInteger(step) || step < 1 || step > TRAINER_ONBOARDING_STEPS) return { status: "error", message: "خطوة غير صالحة." };
  const parsed = schemas[step as keyof typeof schemas].safeParse({ values: formData.getAll("choice").map(String) });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "تحقق من اختيارك." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login?next=/trainer/onboarding");

  const { data: current } = await supabase.from("trainer_profiles").select("onboarding_step, onboarding_completed_at").eq("user_id", userId).maybeSingle();
  const v = parsed.data.values;
  const patch: Patch = { user_id: userId, onboarding_step: Math.max(current?.onboarding_step ?? 1, Math.min(step + 1, 6)) };
  if (step === 1) patch.specialties = [...new Set(v)];
  if (step === 2) patch.experience_band = v[0];
  if (step === 3) patch.delivery_modes = [...new Set(v)] as Patch["delivery_modes"];
  if (step === 4) patch.audience = v[0];
  if (step === 5) {
    patch.goal = v[0];
    patch.onboarding_completed_at = current?.onboarding_completed_at ?? new Date().toISOString();
  }

  const { error } = await supabase.from("trainer_profiles").upsert(patch, { onConflict: "user_id" });
  if (error) return { status: "error", message: toArabicError(error) };
  revalidatePath("/trainer", "layout");
  redirect(step === TRAINER_ONBOARDING_STEPS ? "/trainer/onboarding/done" : `/trainer/onboarding/${step + 1}`);
}
