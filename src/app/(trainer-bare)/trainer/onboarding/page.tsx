import { redirect } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { getTrainerProfile } from "@/lib/data/trainer";
import { TRAINER_ONBOARDING_STEPS } from "@/lib/trainer";

/** Resumes the trainer setup at the last saved step. */
export default async function TrainerOnboardingIndex() {
  const user = await requireTrainer("/trainer/onboarding");
  const profile = await getTrainerProfile(user.id);
  if (profile?.onboarding_completed_at) redirect("/trainer/onboarding/done");
  redirect(`/trainer/onboarding/${Math.min(Math.max(profile?.onboarding_step ?? 1, 1), TRAINER_ONBOARDING_STEPS)}`);
}
