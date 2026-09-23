import { notFound } from "next/navigation";
import { Info, Lightbulb } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { WizardBar } from "@/components/onboarding/WizardBar";
import { ChoiceStep, ProfessionalStep } from "@/components/onboarding/StepForm";
import { requireTrainee } from "@/lib/auth";
import { getLearningFields, getOnboarding } from "@/lib/data/onboarding";
import { EXPERIENCE_YEARS, FIELD_ICONS, GOALS, HOURS, LEVELS, MODES, STEPS, SUGGESTED_SKILLS, modeValueFrom } from "@/lib/onboarding";
import { LayoutGrid, type LucideIcon } from "lucide-react";

const withIcons = (opts: { value: string; title: string; hint?: string; icon: LucideIcon }[]) =>
  opts.map((o) => ({ ...o, icon: <Glyph icon={o.icon} size={20} /> }));

const COPY: Record<number, { title: string; subtitle: string }> = {
  1: { title: "ماذا تريد أن تطوّر؟", subtitle: "اختر مجالًا أو أكثر — سنبني عليها مقترحاتك. يمكنك تغييرها لاحقًا من صفحة المتابعات في ملفك" },
  2: { title: "ما هدفك من التعلم؟", subtitle: "اختر الأقرب لك — يحدّد نوع البرامج التي نقترحها ومستواها." },
  3: { title: "ما مستواك الحالي؟", subtitle: "نستخدمه لاستبعاد البرامج الأسهل أو الأصعب مما تحتاج." },
  4: { title: "ما نوع التدريب الذي تفضّله؟", subtitle: "يحدّد ما يظهر أولًا في «اكتشف دورة» — يمكنك رؤية الكل دائمًا." },
  5: { title: "كم وقتًا تستطيع تخصيصه أسبوعيًا؟", subtitle: "نقترح برامج تناسب وقتك فعلًا — لا برامج تتركها في منتصفها." },
  6: { title: "بيانات مهنية — اختيارية تمامًا", subtitle: "تظهر في ملفك المهني وتحسّن دقة المقترحات. يمكنك تخطّيها الآن وإكمالها لاحقًا." },
};

/** TRN-ONB-01 · التخصيص — steps ١..٦ (224:13313 … 224:13696). */
export default async function OnboardingStepPage(props: PageProps<"/onboarding/[step]">) {
  const { step: raw } = await props.params;
  const step = Number(raw);
  if (!Number.isInteger(step) || step < 1 || step > STEPS) notFound();
  const user = await requireTrainee(`/onboarding/${step}`);
  const state = await getOnboarding(user.id);
  const copy = COPY[step];

  let body: React.ReactNode;
  if (step === 1) {
    const fields = await getLearningFields();
    body = (
      <ChoiceStep
        step={1}
        name="fields"
        multiple
        columns={4}
        countNoun={["مجالًا واحدًا", "مجالين", "مجالات", "مجالًا"]}
        initial={state.fieldSlugs}
        options={withIcons(fields.map((f) => ({ value: f.slug, title: f.name, icon: FIELD_ICONS[f.icon] ?? LayoutGrid })))}
      />
    );
  } else if (step === 2) {
    body = <ChoiceStep step={2} name="goal" columns={3} options={withIcons(GOALS)} initial={state.goal ? [state.goal] : []} />;
  } else if (step === 3) {
    body = <ChoiceStep step={3} name="level" columns={4} options={withIcons(LEVELS)} initial={state.experienceLevel ? [state.experienceLevel] : []} />;
  } else if (step === 4) {
    const current = modeValueFrom(state.modes);
    body = <ChoiceStep step={4} name="mode" columns={3} options={withIcons(MODES)} initial={current ? [current] : []} />;
  } else if (step === 5) {
    body = <ChoiceStep step={5} name="hours" columns={4} options={withIcons(HOURS)} initial={state.weeklyHours ? [state.weeklyHours] : []} />;
  } else {
    body = (
      <ProfessionalStep
        initial={{ jobTitle: state.jobTitle ?? "", experienceYears: state.experienceYears ?? "", skills: state.skills }}
        years={EXPERIENCE_YEARS}
        suggested={SUGGESTED_SKILLS}
        notice={
          <p className="flex items-start gap-2.5 rounded-12 bg-state-info-bg px-3.5 py-3 type-body text-state-info">
            <Glyph icon={Info} size={24} className="mt-0.5" />
            هذه البيانات خاصة افتراضيًا. تتحكم بما يظهر منها في ملفك العام من إعدادات الخصوصية.
          </p>
        }
      />
    );
  }

  return (
    <>
      <WizardBar step={step} total={STEPS} />
      <main id="main" className="flex flex-1 flex-col items-center gap-[34px] px-4 pt-14 pb-14 sm:px-8 lg:px-[120px]">
        {step === 1 && (
          <p className="flex items-center gap-1.5 rounded-full bg-bg-brand-tint px-2.5 py-[5px] type-caption text-text-brand">
            <Glyph icon={Lightbulb} size={16} />
            مرحبًا بك في بوابة التدريب 👋
          </p>
        )}
        <div className="flex max-w-[1200px] flex-col items-center gap-2.5 text-center">
          <h1 className="text-[32px] leading-[1.15] font-bold text-text-primary md:type-display">{copy.title}</h1>
          <p className="type-body-lg text-text-secondary">{copy.subtitle}</p>
        </div>
        {body}
      </main>
    </>
  );
}
