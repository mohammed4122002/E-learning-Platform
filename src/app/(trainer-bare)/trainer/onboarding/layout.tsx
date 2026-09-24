import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "تجهيز مساحة المدرب", template: "%s · بوابة التدريب" }, robots: { index: false } };

export default function TrainerOnboardingLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-bg-page">{children}</div>;
}
