import type { Metadata } from "next";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { AiAssistantCard } from "@/components/dashboard/AiAssistantCard";
import { WaitlistCard } from "@/components/dashboard/WaitlistCard";
import { ActivitySection } from "@/components/dashboard/ActivitySection";
import { LearningProgressSection } from "@/components/dashboard/LearningProgressSection";
import { CertificatesSection } from "@/components/dashboard/CertificatesSection";
import { CourseCard } from "@/components/course/CourseCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/Feedback";
import { ButtonLink } from "@/components/ui/Button";
import { requireTrainee } from "@/lib/auth";
import { getDashboard } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";
import { formatRelative, pluralAr } from "@/lib/format";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "الرئيسية", description: "نظرة عامة على مسارك ودوراتك" };

/** Trainee dashboard — Figma frame "TRN-DSH-01 · لوحة المتدرب · الإصدار ٢" (node 102:529). */
export default async function DashboardPage() {
  const user = await requireTrainee("/trainee");
  const [view, prefs] = await Promise.all([
    getDashboard(user.id, user.fullName),
    (await createClient()).from("trainee_preferences").select("level").eq("user_id", user.id).maybeSingle(),
  ]);

  const continueSubtitle =
    view.activeCount === 0
      ? "لا دورات جارية حاليًا"
      : `${pluralAr(view.activeCount, ["دورة جارية", "دورتان جاريتان", "دورات جارية", "دورة جارية"])}${view.nextSessionAt ? ` · أقرب جلسة ${formatRelative(view.nextSessionAt)}` : ""}`;

  return (
    <>
      <TopBar title="الرئيسية" subtitle="نظرة عامة على مسارك ودوراتك" />
      <PageBody>
        <HeroCard hero={view.hero} />
        <AiAssistantCard continueHref={view.hero.primaryHref} level={prefs.data?.level ?? null} />
        {view.waitlistInvite && <WaitlistCard invite={view.waitlistInvite} />}

        <section aria-labelledby="continue-title" className="flex flex-col gap-[18px]">
          <SectionHeader id="continue-title" title="أكمل دوراتك" subtitle={continueSubtitle} link={{ label: "ملف التدريب", href: "/trainee/trainings" }} />
          {view.continueCourses.length > 0 ? (
            <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {view.continueCourses.map((c, i) => (
                <CourseCard key={c.id} course={c} priority={i < 3} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="لا دورات جارية"
              description="ابدأ رحلتك بالتسجيل في دورة تناسب مسارك — ستظهر هنا مع حضورك وتقدّمك."
              action={<ButtonLink href="/trainee/discover">اكتشف دورة</ButtonLink>}
            />
          )}
        </section>

        {view.recommended.length > 0 && (
          <section aria-labelledby="recommended-title" className="flex flex-col gap-[18px]">
            <SectionHeader id="recommended-title" title="مقترحة لك" subtitle="بناءً على تخصصاتك المتابَعة ومستواك الحالي" link={{ label: "اكتشف المزيد", href: "/trainee/discover" }} />
            <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {view.recommended.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </section>
        )}

        <ActivitySection items={view.activity} />
        <LearningProgressSection milestones={view.milestones} />
        <CertificatesSection certificates={view.certificates} achievements={view.achievements} />
      </PageBody>
    </>
  );
}
