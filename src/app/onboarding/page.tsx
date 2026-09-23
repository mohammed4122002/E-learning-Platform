import { redirect } from "next/navigation";
import { requireTrainee } from "@/lib/auth";
import { getOnboarding } from "@/lib/data/onboarding";

/** Resumes onboarding at the last saved step. */
export default async function OnboardingIndex() {
  const user = await requireTrainee("/onboarding");
  const state = await getOnboarding(user.id);
  redirect(state.completedAt ? "/onboarding/done" : `/onboarding/${Math.min(Math.max(state.step, 1), 6)}`);
}
