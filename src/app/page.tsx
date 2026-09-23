import { AppShell } from "@/components/layout/AppShell";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { AiAssistantCard } from "@/components/dashboard/AiAssistantCard";
import { WaitlistCard } from "@/components/dashboard/WaitlistCard";
import { CourseSection } from "@/components/dashboard/CourseSection";
import { ActivitySection } from "@/components/dashboard/ActivitySection";
import { LearningProgressSection } from "@/components/dashboard/LearningProgressSection";
import { CertificatesSection } from "@/components/dashboard/CertificatesSection";
import { continueSection, recommendedSection } from "@/lib/dashboard-data";

/** Trainee dashboard — Figma frame "TRN-DSH-01 · لوحة المتدرب · الإصدار ٢" (node 102:529). */
export default function DashboardPage() {
  return (
    <AppShell title="الرئيسية" subtitle="نظرة عامة على مسارك ودوراتك">
      <main className="flex flex-col gap-9 px-4 pt-8 pb-14 sm:px-6 lg:px-12">
        <HeroCard />
        <AiAssistantCard />
        <WaitlistCard />
        <CourseSection id="continue-title" {...continueSection} />
        <CourseSection id="recommended-title" {...recommendedSection} />
        <ActivitySection />
        <LearningProgressSection />
        <CertificatesSection />
      </main>
    </AppShell>
  );
}
