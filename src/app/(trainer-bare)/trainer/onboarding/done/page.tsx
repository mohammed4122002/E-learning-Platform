import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Banknote, CircleCheck, Gauge, Tag } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { TrainerWizardBar } from "@/components/trainer/TrainerWizardBar";
import { requireTrainer } from "@/lib/auth";
import { getTrainerProfile } from "@/lib/data/trainer";
import { toArabicDigits } from "@/lib/format";
import { EXPERIENCE_BANDS, GOAL_SUMMARY, MODE_SHORT, TRAINER_ONBOARDING_STEPS, fieldTitle, joinArabic } from "@/lib/trainer";

export const metadata: Metadata = { title: "مساحتك جاهزة" };

function SummaryCard({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col items-start gap-2.5 rounded-16 border border-border-default bg-bg-surface px-5 pt-5 pb-[22px] shadow-card">
      <span className="flex size-11 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
        <Glyph icon={icon} size={20} />
      </span>
      <p className="type-caption text-text-muted">{label}</p>
      <p className="type-subtitle text-text-primary">{value}</p>
    </div>
  );
}

const NEXT_STEPS = [
  { title: "وثّق هويتك", detail: "٣ دقائق · يفتح الشهادات القابلة للتحقق", href: "/account" },
  { title: "أضف مؤهلاتك", detail: "٥ دقائق · تظهر في ملفك العام", href: "/trainer/profile/edit#qualifications" },
  { title: "أنشئ برنامجك الأول", detail: "ثم ٣ أيام مراجعة قبل النشر", href: "/trainer/programs" },
];

/** TRR-ONB-02 · جاهز للبدء (255:1074). */
export default async function TrainerOnboardingDonePage() {
  const user = await requireTrainer("/trainer/onboarding/done");
  const profile = await getTrainerProfile(user.id);
  if (!profile?.onboarding_completed_at) redirect(`/trainer/onboarding/${Math.min(Math.max(profile?.onboarding_step ?? 1, 1), TRAINER_ONBOARDING_STEPS)}`);

  const band = EXPERIENCE_BANDS.find((b) => b.value === profile.experience_band)?.title;
  const modes = (["in_person", "live_remote", "recorded"] as const).filter((m) => profile.delivery_modes.includes(m)).map((m) => MODE_SHORT[m]);
  const experience = [band, modes.length ? joinArabic(modes).replace(/،\s/g, " و") : null].filter(Boolean).join(" · ");

  return (
    <>
      <TrainerWizardBar step={TRAINER_ONBOARDING_STEPS} total={TRAINER_ONBOARDING_STEPS} />
      <main id="main" className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-[52px] sm:px-8 lg:px-[120px]">
        <div className="flex w-full max-w-[1200px] flex-col items-center gap-4 text-center">
          <span className="flex size-[88px] items-center justify-center rounded-full bg-state-success-bg text-state-success">
            <Glyph icon={CircleCheck} size={32} />
          </span>
          <h1 className="text-[32px] leading-[1.15] font-bold text-text-primary md:type-display">مساحتك جاهزة 🎯</h1>
          <p className="type-body-lg text-text-secondary">رتّبنا لك مسار الاعتماد حسب إجاباتك. تسع مراحل تفصلك عن أول إيراد — وأول ثلاث منها تستغرق عشر دقائق.</p>
        </div>
        <div className="flex w-full max-w-[1030px] flex-col gap-5 md:flex-row">
          <SummaryCard icon={Banknote} label="هدفك" value={GOAL_SUMMARY[profile.goal ?? ""] ?? "—"} />
          <SummaryCard icon={Gauge} label="خبرتك" value={experience || "—"} />
          <SummaryCard icon={Tag} label="مجالاتك" value={profile.specialties.map(fieldTitle).join(" · ") || "—"} />
        </div>
        <section aria-labelledby="next-title" className="flex w-full max-w-[1030px] flex-col gap-4 rounded-22 bg-bg-brand-tint px-5 pt-6 pb-[26px] sm:px-7">
          <h2 id="next-title" className="type-h3 text-text-primary">
            خطواتك الثلاث القادمة
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {NEXT_STEPS.map((s, i) => (
              <li key={s.title}>
                <Link href={s.href} className="flex h-full items-start gap-3 rounded-12 bg-bg-surface px-4 py-3.5 hover:ring-1 hover:ring-action-primary focus-ring">
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-action-primary type-caption text-text-on-brand">{toArabicDigits(i + 1)}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="type-subtitle text-text-primary">{s.title}</span>
                    <span className="type-caption text-text-muted">{s.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
        <div className="flex w-full flex-col items-center justify-center gap-3.5 sm:flex-row">
          <ButtonLink href="/trainer/journey" size="l" className="w-full sm:w-[320px]">
            ابدأ مسار الاعتماد
          </ButtonLink>
          <ButtonLink href="/trainer" variant="text" size="l" className="w-full sm:w-[220px]">
            اذهب للوحة التحكم
          </ButtonLink>
        </div>
      </main>
    </>
  );
}
