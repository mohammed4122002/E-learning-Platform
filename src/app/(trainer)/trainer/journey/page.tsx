import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, BookOpen, CircleCheck, CircleDot, Hourglass, Lightbulb, Play, Route, Scale } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { ProgressRing } from "@/components/trainings/ui";
import { CompactFaq, SideCard, StageCard, stageAction } from "@/components/trainer/JourneyParts";
import { requireTrainer } from "@/lib/auth";
import { computeJourney, getTrainerOverview, qualificationChecklist } from "@/lib/data/trainer";
import { toArabicDigits } from "@/lib/format";
import { joinArabic } from "@/lib/trainer";

export const metadata: Metadata = { title: "مسار الاعتماد", description: "رحلتك من إنشاء الحساب إلى أول إيراد" };

const DURATIONS = [
  { title: "المراحل ١–٣", text: "١٠ دقائق · تسجيل وتوثيق وملف", cls: "text-state-success" },
  { title: "المرحلة ٤", text: "٥ دقائق · مؤهلاتك وخبراتك", cls: "text-state-success" },
  { title: "المراحل ٥–٦", text: "يعتمد عليك · ثم ٣ أيام مراجعة", cls: "text-state-warning" },
  { title: "المراحل ٧–٩", text: "بعد اعتماد برنامجك", cls: "text-text-muted" },
];
const NEW_FAQ = [
  { q: "هل التوثيق إلزامي؟", a: "نعم للنشر. بلا توثيق لا تُصدر شهادات قابلة للتحقق لمتدربيك." },
  { q: "ما الفرق بين البرنامج والدورة؟", a: "البرنامج هو المحتوى المعتمد. الدورة تنفيذ مجدول له بتاريخ ومكان ومقاعد." },
  { q: "كم تستغرق المراجعة؟", a: "٣ أيام عمل. إن طُلب تعديل يصلك السبب المصنَّف والحقل المعني." },
  { q: "متى أستلم أرباحي؟", a: "بعد انتهاء الدورة وانقضاء مهلة الاسترداد، تُضاف للرصيد المتاح للسحب." },
];
const WHY: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: BadgeCheck, title: "التوثيق أولًا", text: "بلا هوية موثّقة لا تُصدر شهادات قابلة للتحقق لمتدربيك." },
  { icon: BookOpen, title: "البرنامج قبل الدورة", text: "البرنامج هو المحتوى المعتمد. الدورة تنفيذ مجدول له — ولا تُنشأ قبل اعتماده." },
  { icon: Scale, title: "المراجعة تحمي الطرفين", text: "برنامج مراجَع يعني متدربين يثقون ومنصة تحميك من البلاغات." },
];

/** TRR-JRN-01 · مسار اعتماد المدرب — in progress (253:3) and new trainer (253:385). */
export default async function TrainerJourneyPage() {
  const user = await requireTrainer("/trainer/journey");
  const o = await getTrainerOverview(user.id);
  const journey = computeJourney(o);
  const current = journey.current;
  const isNew = journey.doneCount <= 1;
  const currentIndex = current ? journey.stages.indexOf(current) : -1;
  const doneTitles = journey.stages.filter((s) => s.done && s.key !== "account").map((s) => ({ identity: "التوثيق", profile: "ملفك المهني", qualifications: "المؤهلات", program: "البرنامج", review: "الاعتماد", course: "الدورة", trainees: "التسجيلات", revenue: "الإيرادات" })[s.key as "identity"]);
  const remaining = 9 - journey.doneCount;

  const stages = (
    <ol className="flex flex-col gap-3.5" aria-label="مراحل الاعتماد">
      {journey.stages.map((s, i) => (
        <StageCard key={s.key} stage={s} o={o} next={currentIndex >= 0 && i === currentIndex + 1} />
      ))}
    </ol>
  );

  if (isNew) {
    return (
      <>
        <TopBar title="مسار الاعتماد" subtitle="ابدأ من هنا" />
        <PageBody className="gap-6">
          <section className="flex w-full items-center gap-7 rounded-22 bg-bg-brand-tint p-6 sm:p-[30px]">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-text-brand">
                <Glyph icon={Lightbulb} size={16} />
                أهلًا بك 👋
              </span>
              <h2 className="text-[32px] leading-[1.15] font-bold text-text-primary md:type-display">تسع مراحل تفصلك عن أول إيراد</h2>
              <p className="type-body-lg text-text-secondary">لا تقلق من العدد — أول ثلاث مراحل تستغرق عشر دقائق، والباقي يعتمد على برنامجك. سنرافقك خطوة بخطوة ونخبرك دائمًا بما ينقصك.</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <ButtonLink href={current ? stageAction(current, o).href : "/trainer"} size="l" className="w-full sm:w-auto">
                  ابدأ المرحلة الأولى
                </ButtonLink>
                <ButtonLink href="/trainer/journey/income" variant="text" size="l" className="w-full sm:w-auto">
                  كم أستطيع أن أربح؟
                </ButtonLink>
              </div>
            </div>
            <span className="hidden size-20 shrink-0 items-center justify-center rounded-22 bg-action-primary text-text-on-brand sm:flex">
              <Glyph icon={Route} size={32} />
            </span>
          </section>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">{stages}</div>
            <aside className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
              <SideCard title="كم يستغرق كل شيء؟" id="durations-title">
                <ul className="flex flex-col gap-4">
                  {DURATIONS.map((d) => (
                    <li key={d.title} className="flex flex-col gap-0.5 rounded-12 bg-bg-page px-3 py-[11px]">
                      <span className="type-subtitle text-text-primary">{d.title}</span>
                      <span className={`type-caption ${d.cls}`}>{d.text}</span>
                    </li>
                  ))}
                </ul>
              </SideCard>
              <SideCard title="أسئلة المدرب الجديد" id="newfaq-title">
                <CompactFaq items={NEW_FAQ} />
              </SideCard>
            </aside>
          </div>
        </PageBody>
      </>
    );
  }

  const checklist = qualificationChecklist(o);
  const action = current ? stageAction(current, o) : { label: "اعرض لوحة التحكم", href: "/trainer" };
  return (
    <>
      <TopBar title="مسار الاعتماد" subtitle="رحلتك من إنشاء الحساب إلى أول إيراد" />
      <PageBody className="gap-6">
        <section className="flex w-full flex-col-reverse items-center gap-7 rounded-22 bg-bg-brand-tint px-5 py-7 sm:flex-row sm:px-[30px]">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
            <div className="flex flex-wrap gap-2">
              {current && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-warning">
                  <Glyph icon={Play} size={16} />
                  المرحلة الحالية: {current.title}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-text-brand">
                <Glyph icon={Route} size={16} />
                {toArabicDigits(journey.doneCount)} من ٩ مراحل
              </span>
            </div>
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">
              {!current ? "أكملت مسار الاعتماد 🎉" : current.n <= 7 ? "أنت في منتصف الطريق إلى أول دورة" : "أنت في منتصف الطريق إلى أول إيراد"}
            </h2>
            <p className="type-body-lg text-text-secondary">
              {doneTitles.length ? `أكملت التسجيل و${joinArabic(doneTitles)}. ` : "أكملت التسجيل. "}
              {current ? `تبقّت ${remaining === 1 ? "مرحلة واحدة" : remaining === 2 ? "مرحلتان" : `${toArabicDigits(remaining)} مراحل`} — أقربها ${current.title}.` : "كل المراحل مكتملة."}
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <ButtonLink href={action.href} size="l" className="w-full sm:w-auto">
                أكمل المرحلة الحالية
              </ButtonLink>
              <ButtonLink href="/trainer/help/trainer-what-do-i-need" variant="outline" size="l" className="w-full sm:w-auto">
                ما الذي يلزمني كله؟
              </ButtonLink>
            </div>
          </div>
          <ProgressRing percent={journey.percent} label="نسبة إكمال مسار الاعتماد" />
        </section>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">{stages}</div>
          <aside className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
            {current && (
              <SideCard title="مرحلتك الحالية" id="current-title">
                <p className="type-body text-text-secondary">
                  {current.key === "qualifications" ? "أضف مؤهلين على الأقل ليكتمل ملفك ويُفتح إنشاء البرنامج." : current.description}
                </p>
                {current.key === "qualifications" && (
                  <ul className="flex flex-col gap-4">
                    {checklist.map((c) => (
                      <li key={c.key} className={`flex items-center gap-2.5 rounded-12 px-3 py-[11px] type-small ${c.done ? "bg-state-success-bg text-state-success" : "bg-bg-page text-text-primary"}`}>
                        <Glyph icon={c.done ? CircleCheck : CircleDot} size={20} className={c.done ? "" : "text-text-muted"} />
                        <span className="flex-1">
                          {c.label} — {c.done ? "مضاف" : c.missingLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {current.key === "identity" && o.identityPendingSince && (
                  <p className="flex items-center gap-2.5 rounded-12 bg-state-warning-bg px-3 py-[11px] type-small text-state-warning">
                    <Glyph icon={Hourglass} size={20} />
                    <span className="flex-1">طلب التوثيق قيد المراجعة</span>
                  </p>
                )}
                <ButtonLink href={action.href} fullWidth>
                  {current.key === "qualifications" ? "أضف مؤهلاتي الآن" : action.label}
                </ButtonLink>
              </SideCard>
            )}
            <SideCard title="لماذا هذا الترتيب؟" id="why-title">
              <ul className="flex flex-col gap-4">
                {WHY.map((w) => (
                  <li key={w.title} className="flex items-start gap-2.5 rounded-12 bg-bg-page px-3 py-[11px]">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
                      <Glyph icon={w.icon} size={20} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="type-small text-text-primary">{w.title}</span>
                      <span className="type-caption text-text-muted">{w.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </SideCard>
            <SideCard title="تحتاج مساعدة؟" id="help-title">
              <p className="type-body text-text-secondary">فريق دعم المدربين يجيب خلال يوم عمل، ويمكنه مراجعة برنامجك قبل إرساله رسميًا.</p>
              <ButtonLink href="/trainer/help" variant="secondary" fullWidth>
                تواصل مع دعم المدربين
              </ButtonLink>
              <ButtonLink href="/trainer/help/trainer-successful-program" variant="ghost" fullWidth>
                دليل إنشاء برنامج ناجح
              </ButtonLink>
            </SideCard>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
