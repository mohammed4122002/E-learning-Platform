import "server-only";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = {
  fieldSlugs: string[];
  goal: string | null;
  experienceLevel: string | null;
  modes: string[];
  weeklyHours: string | null;
  jobTitle: string | null;
  experienceYears: string | null;
  skills: string[];
  step: number;
  completedAt: string | null;
};

export async function getOnboarding(userId: string): Promise<OnboardingState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trainee_preferences")
    .select("field_slugs, goal, experience_level, modes, weekly_hours, job_title, experience_years, skills, step, completed_at")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    fieldSlugs: data?.field_slugs ?? [],
    goal: data?.goal ?? null,
    experienceLevel: data?.experience_level ?? null,
    modes: data?.modes ?? [],
    weeklyHours: data?.weekly_hours ?? null,
    jobTitle: data?.job_title ?? null,
    experienceYears: data?.experience_years ?? null,
    skills: data?.skills ?? [],
    step: data?.step ?? 1,
    completedAt: data?.completed_at ?? null,
  };
}

export async function getLearningFields() {
  const supabase = await createClient();
  const { data } = await supabase.from("learning_fields").select("slug, name, icon").order("position");
  return data ?? [];
}
