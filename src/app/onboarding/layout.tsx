import type { Metadata } from "next";
import { requireTrainee } from "@/lib/auth";

export const metadata: Metadata = { title: "تخصيص تجربتك", robots: { index: false } };

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireTrainee("/onboarding");
  return <div className="flex min-h-dvh flex-col bg-bg-page">{children}</div>;
}
