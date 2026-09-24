import { notFound, redirect } from "next/navigation";
import { Info, Lightbulb } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { TrainerWizardBar } from "@/components/trainer/TrainerWizardBar";
import { TrainerStepForm, type StepOption } from "@/components/trainer/TrainerStepForm";
import { requireTrainer } from "@/lib/auth";
import { getTrainerProfile } from "@/lib/data/trainer";
import { AUDIENCES, DELIVERY_MODES, EXPERIENCE_BANDS, TRAINER_FIELDS, TRAINER_GOALS, TRAINER_ONBOARDING_STEPS, type TrainerOption } from "@/lib/trainer";

const render = (opts: TrainerOption[]): StepOption[] => opts.map((o) => ({ value: o.value, title: o.title, hint: o.hint, icon: <Glyph icon={o.icon} size={20} /> }));

/** Copy of TRR-ONB-01 (255:706 · 255:813 · 255:881 · 255:949 · 255:1010). */
const COPY: Record<number, { title: string; subtitle: string }> = {
  1: { title: "ما مجالات تدريبك؟", subtitle: "اختر مجالًا أو أكثر — عليها تُبنى مطابقتك مع طلبات الجهات وظهورك في نتائج البحث." },
  2: { title: "كم سنة خبرة تدريبية لديك؟", subtitle: "تظهر في ملفك العام وتؤثر في ترتيبك لدى الجهات — كن دقيقًا، فالادعاءات تُراجَع عند التوثيق." },
  3: { title: "ما أنماط التدريب التي تقدّمها؟", subtitle: "يحدّد نوع البرامج التي تستطيع نشرها والطلبات التي تصلك." },
  4: { title: "مع من تفضّل العمل؟", subtitle: "يحدّد ما يظهر لك: طلبات الجهات أم بيع مباشر للأفراد — أو كليهما." },
  5: { title: "ما أهم هدف لك من المنصة؟", subtitle: "نرتّب لك لوحة التحكم ومسار الاعتماد حسب هدفك." },
};

export default async function TrainerOnboardingStepPage(props: PageProps<"/trainer/onboarding/[step]">) {
  const { step: raw } = await props.params;
  const step = Number(raw);
  if (!Number.isInteger(step) || step < 1 || step > TRAINER_ONBOARDING_STEPS) notFound();
  const user = await requireTrainer(`/trainer/onboarding/${step}`);
  const profile = await getTrainerProfile(user.id);
  // Steps unlock in order; answers already given stay editable.
  const reached = profile?.onboarding_completed_at ? TRAINER_ONBOARDING_STEPS : Math.min(profile?.onboarding_step ?? 1, TRAINER_ONBOARDING_STEPS);
  if (step > reached) redirect(`/trainer/onboarding/${reached}`);
  const copy = COPY[step];

  let form: React.ReactNode;
  if (step === 1) {
    form = (
      <TrainerStepForm
        step={1}
        total={TRAINER_ONBOARDING_STEPS}
        multiple
        columns={4}
        countNoun={["مجالًا واحدًا", "مجالين", "مجالات", "مجالًا"]}
        options={render(TRAINER_FIELDS)}
        initial={profile?.specialties ?? []}
      />
    );
  } else if (step === 2) {
    form = <TrainerStepForm step={2} total={TRAINER_ONBOARDING_STEPS} columns={4} options={render(EXPERIENCE_BANDS)} initial={profile?.experience_band ? [profile.experience_band] : []} />;
  } else if (step === 3) {
    form = (
      <TrainerStepForm
        step={3}
        total={TRAINER_ONBOARDING_STEPS}
        multiple
        columns={3}
        options={render(DELIVERY_MODES)}
        initial={profile?.delivery_modes ?? []}
        notice={
          <p className="flex w-full max-w-[1030px] items-center gap-3 rounded-12 bg-state-info-bg px-[18px] py-3.5 type-body text-state-info">
            <Glyph icon={Info} size={20} />
            <span className="flex-1">المنصة لا توفّر أدوات تصوير أو بث أو تحرير فيديو. الكورس المسجَّل تُنتجه خارج المنصة ثم ترفعه هنا للمراجعة والبيع.</span>
          </p>
        }
      />
    );
  } else if (step === 4) {
    form = <TrainerStepForm step={4} total={TRAINER_ONBOARDING_STEPS} columns={3} options={render(AUDIENCES)} initial={profile?.audience ? [profile.audience] : []} />;
  } else {
    form = <TrainerStepForm step={5} total={TRAINER_ONBOARDING_STEPS} columns={4} options={render(TRAINER_GOALS)} initial={profile?.goal ? [profile.goal] : []} />;
  }

  return (
    <>
      <TrainerWizardBar step={step} total={TRAINER_ONBOARDING_STEPS} />
      <main id="main" className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-[52px] sm:px-8 lg:px-[120px]">
        <div className="flex w-full max-w-[1200px] flex-col items-center gap-2.5 text-center">
          {step === 1 && (
            <p className="flex items-center gap-1.5 rounded-full bg-bg-brand-tint px-2.5 py-[5px] type-caption text-text-brand">
              <Glyph icon={Lightbulb} size={16} />
              أهلًا بك يا مدرب 👋
            </p>
          )}
          <h1 className="text-[32px] leading-[1.15] font-bold text-text-primary md:type-display">{copy.title}</h1>
          <p className="type-body-lg text-text-secondary">{copy.subtitle}</p>
        </div>
        {form}
      </main>
    </>
  );
}
