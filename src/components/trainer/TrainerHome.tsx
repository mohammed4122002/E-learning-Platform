import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck, Banknote, BookOpen, Briefcase, Building2, CalendarDays, CircleAlert, CircleUser, FileText, GraduationCap, Route, Star, Users,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { LabeledProgress, ProgressRing } from "@/components/trainings/ui";
import { ActionRow, DashCard, DashSectionHeader, FaqCard, HeroPill, MiniRow, ProgramRow, StagePill, money2 } from "@/components/trainer/DashboardParts";
import { QUEUE_ICONS, itemsWord } from "@/components/trainer/QueueParts";
import { formatDayMonth, formatNumber, formatRating, formatRelative, pluralAr, toArabicDigits } from "@/lib/format";
import type { DaySession, Stage, TrainerOverview } from "@/lib/data/trainer";
import type { TrainerQueueItem } from "@/lib/data/trainer-queue";

type Journey = { stages: Stage[]; doneCount: number; percent: number; current: Stage | null };

const FAQ = [
  { q: "هل التوثيق إلزامي؟", a: "نعم للنشر. بلا توثيق لا تُصدر شهادات قابلة للتحقق لمتدربيك." },
  { q: "ما الفرق بين البرنامج والدورة؟", a: "البرنامج هو المحتوى المعتمد. الدورة تنفيذ مجدول له بتاريخ ومكان ومقاعد." },
  { q: "كم أستطيع أن أربح؟", a: "تحتفظ بحصتك من سعر الدورة بعد عمولة المنصة ١٠٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة." },
  { q: "هل أستطيع رفع كورس مسجَّل؟", a: "نعم — تُنتجه خارج المنصة وترفعه هنا للمراجعة والبيع." },
];

const COMING_SOON: { icon: LucideIcon; label: string }[] = [
  { icon: CalendarDays, label: "جدول دوراتك اليومي" },
  { icon: Users, label: "متدربوك النشطون" },
  { icon: Briefcase, label: "عروض الجهات المطابقة" },
  { icon: Banknote, label: "رصيدك ومستحقاتك" },
  { icon: Star, label: "تقييمات متدربيك" },
  { icon: CircleAlert, label: "ما يحتاج إجراءك" },
];

/** Copy of the "current step" card per journey stage (296:8300 new trainer · 296:8603 partial accreditation). */
function stageCopy(stage: Stage | null, o: TrainerOverview) {
  const review = o.programs.find((p) => !["draft", "published", "archived"].includes(p.status));
  const draft = o.programs.find((p) => p.status === "draft");
  switch (stage?.key) {
    case "identity":
      return {
        title: "ابدأ بتوثيق هويتك",
        body: "التوثيق يفتح لك: نشر البرامج · شهادات قابلة للتحقق لمتدربيك · شارة «مدرب معتمد» في ملفك.",
        cta: { label: o.identityPendingSince ? "تتبّع حالة التوثيق" : "وثّق هويتي الآن", href: "/account" },
      };
    case "profile":
      return { title: "أكمل ملفك المهني", body: "النبذة والتخصصات واللغات — أول ما تراه الجهات قبل أن ترسل لك عرضًا.", cta: { label: "أكمل ملفي", href: "/trainer/profile/edit" } };
    case "qualifications":
      return { title: "أضف مؤهلاتك", body: "أضف مؤهلين على الأقل ليكتمل ملفك ويُفتح إنشاء البرنامج.", cta: { label: "أضف مؤهلاتي الآن", href: "/trainer/profile/edit#qualifications" } };
    case "program":
      return draft
        ? { title: "أكمل برنامجك الأول", body: `مسودة «${draft.title}» محفوظة ${formatRelative(draft.updatedAt)}. أكملها وأرسلها للمراجعة.`, cta: { label: "أكمل المسودة", href: `/trainer/programs/${draft.id}` } }
        : { title: "أنشئ برنامجك الأول", body: "المحتوى المعتمد الذي تبيعه — ثم تنشئ منه دورات.", cta: { label: "ابدأ برنامجك الأول", href: "/trainer/programs" } };
    case "review": {
      const since = review ? Math.floor((Date.now() - new Date(review.updatedAt).getTime()) / 86_400_000) : 0;
      const left = Math.max(1, 3 - since);
      return {
        title: "برنامجك الأول قيد المراجعة",
        body: review
          ? `أرسلت «${review.title}» ${formatRelative(review.updatedAt)}. يتبقى ${left === 1 ? "يوم عمل واحد" : left === 2 ? "يوما عمل" : "٣ أيام عمل"} على القرار — ويصلك إشعار فور صدوره.`
          : "تراجعه المنصة خلال ٣ أيام عمل — ويصلك إشعار فور صدوره.",
        cta: { label: "تتبّع حالة الطلب", href: review ? `/trainer/programs/${review.id}` : "/trainer/programs" },
      };
    }
    case "course":
      return { title: "أنشئ أول دورة", body: "برنامجك معتمد. جدول أول تنفيذ له: تاريخ ومكان ومقاعد.", cta: { label: "أنشئ دورة", href: "/trainer/courses" } };
    default:
      return { title: stage?.title ?? "", body: stage?.description ?? "", cta: { label: "اعرض المسار", href: "/trainer/journey" } };
  }
}

/** "Current step" card: brand tint + 2px primary border, r22, ring at the inline end (296:8300). */
function CurrentStepCard({ o, journey, pills }: { o: TrainerOverview; journey: Journey; pills: { label: string; key: Stage["key"] }[] }) {
  const copy = stageCopy(journey.current, o);
  const n = journey.current?.n ?? 9;
  return (
    <section aria-labelledby="step-title" className="flex w-full flex-col-reverse items-center gap-[26px] rounded-22 border-2 border-action-primary bg-bg-brand-tint px-5 py-7 sm:flex-row sm:px-[30px]">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
        <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-surface px-3.5 py-[9px] type-subtitle text-text-brand">
          <Glyph icon={Route} size={20} />
          الخطوة {toArabicDigits(n)} من ٩
        </span>
        <h2 id="step-title" className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">
          {copy.title}
        </h2>
        <p className="type-body-lg text-text-secondary">{copy.body}</p>
        <ul className="flex flex-wrap gap-x-2.5 gap-y-2" aria-label="مراحل الاعتماد">
          {[...pills].reverse().map((p) => {
            const s = journey.stages.find((x) => x.key === p.key)!;
            // «أول برنامج» is done once approved; while it waits for review it shows the hourglass (296:8638).
            const review = journey.stages.find((x) => x.key === "review")!;
            const done = p.key === "program" ? review.done : s.done;
            const waiting = (p.key === "program" && s.done && !review.done) || (p.key === "identity" && !s.done && Boolean(o.identityPendingSince));
            return <StagePill key={p.key} label={p.label} state={done ? "done" : waiting ? "current" : "todo"} />;
          })}
        </ul>
        <div className="flex w-full flex-col gap-3.5 pt-0 sm:w-auto sm:flex-row sm:items-center">
          <ButtonLink href={copy.cta.href} size="l" className="w-full font-bold sm:w-auto">
            {copy.cta.label}
          </ButtonLink>
          <ButtonLink href="/trainer/journey" variant="text" size="l" className="w-full sm:w-auto">
            اعرض المسار كاملًا
          </ButtonLink>
        </div>
      </div>
      <ProgressRing percent={journey.percent} label="نسبة إكمال مسار الاعتماد" />
    </section>
  );
}

/* ─── New trainer (296:8159) ─────────────────────────────────────────────────────────────────────────── */

export function NewTrainerHome({ o, journey, firstName }: { o: TrainerOverview; journey: Journey; firstName: string }) {
  const steps = [
    { key: "identity" as const, icon: BadgeCheck, title: "وثّق هويتك", caption: "٣ دقائق · ارفع صورة هويتك ونراجعها خلال يومين", href: "/account" },
    { key: "profile" as const, icon: CircleUser, title: "أكمل ملفك المهني", caption: "٥ دقائق · صورة ونبذة ومؤهل واحد يكفي للبداية", href: "/trainer/profile/edit" },
    { key: "program" as const, icon: BookOpen, title: "أنشئ برنامجك الأول", caption: "المحتوى المعتمد الذي تبيعه — ثم تنشئ منه دورات", href: "/trainer/programs" },
  ];
  const stageOf = (k: Stage["key"]) => journey.stages.find((s) => s.key === k)!;
  const firstOpen = steps.find((s) => !stageOf(s.key).done)?.key;
  return (
    <>
      <section className="flex w-full items-center gap-7 rounded-22 bg-bg-brand-tint p-6 sm:p-8">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h2 className="text-[32px] leading-[1.15] font-bold text-text-primary md:type-display">أهلًا بك يا {firstName} 👋</h2>
          <p className="type-body-lg text-text-secondary">حسابك جاهز. تفصلك ثلاث خطوات قصيرة عن استقبال أول عرض تدريب — تستغرق عشر دقائق مجتمعة.</p>
        </div>
        <span className="hidden size-[88px] shrink-0 items-center justify-center rounded-22 bg-action-primary text-text-on-brand sm:flex">
          <Glyph icon={GraduationCap} size={32} />
        </span>
      </section>
      <CurrentStepCard
        o={o}
        journey={journey}
        pills={[
          { key: "account", label: "إنشاء الحساب" },
          { key: "identity", label: "توثيق الهوية" },
          { key: "profile", label: "الملف المهني" },
          { key: "program", label: "أول برنامج" },
        ]}
      />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <DashCard radius={22} labelledBy="steps-title" className="gap-[18px]">
            <h2 id="steps-title" className="type-h2 text-text-primary">
              ثلاث خطوات لتبدأ
            </h2>
            <ul className="flex flex-col gap-[18px]">
              {steps.map((s) => {
                const done = stageOf(s.key).done;
                const current = s.key === firstOpen;
                return (
                  <ActionRow
                    key={s.key}
                    size="l"
                    icon={s.icon}
                    tileTone={current ? "brand" : "surface"}
                    highlight={current}
                    titleClass="type-h3"
                    title={s.title}
                    caption={<span className="text-text-secondary">{s.caption}</span>}
                    action={
                      done ? (
                        <span className="inline-flex w-[120px] items-center justify-center gap-1.5 type-subtitle text-state-success">
                          <Glyph icon={BadgeCheck} size={16} />
                          مكتمل
                        </span>
                      ) : current ? (
                        <ButtonLink href={s.href} className="w-full sm:w-[120px]">
                          ابدأ
                        </ButtonLink>
                      ) : (
                        <ButtonLink href={s.href} variant="ghost" className="w-full sm:w-[120px]">
                          لاحقًا
                        </ButtonLink>
                      )
                    }
                  />
                );
              })}
            </ul>
          </DashCard>
          <DashCard radius={22} labelledBy="soon-title" className="gap-[18px]">
            <h2 id="soon-title" className="type-h2 text-text-primary">
              ما سيظهر هنا قريبًا
            </h2>
            <p className="type-body text-text-muted">بعد إكمال خطواتك تتحول هذه الصفحة إلى مركز عملك اليومي.</p>
            <ul className="flex flex-col gap-4">
              {COMING_SOON.map((c) => (
                <li key={c.label} className="flex items-center gap-3 rounded-16 bg-bg-page px-[18px] py-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
                    <Glyph icon={c.icon} size={20} />
                  </span>
                  <span className="flex-1 type-subtitle text-text-muted">{c.label}</span>
                </li>
              ))}
            </ul>
          </DashCard>
        </div>
        <aside className="flex w-full flex-col gap-6 lg:w-[400px] lg:shrink-0">
          <FaqCard
            title="أسئلة البداية"
            items={FAQ}
            action={
              <ButtonLink href="/trainer/help" variant="outline" size="l" fullWidth>
                تواصل مع دعم المدربين
              </ButtonLink>
            }
          />
        </aside>
      </div>
    </>
  );
}

/* ─── Partial accreditation (296:8468) ───────────────────────────────────────────────────────────────── */

export function PartialHome({
  o,
  journey,
  greetingLine,
  queue,
  strength,
}: {
  o: TrainerOverview;
  journey: Journey;
  greetingLine: string;
  queue: TrainerQueueItem[];
  strength: { done: number; total: number; percent: number };
}) {
  const actions = queue.filter((i) => i.kind === "action");
  const verified = o.identityStatus === "verified";
  const setupDone = journey.stages.filter((s) => ["identity", "profile"].includes(s.key)).every((s) => s.done);
  const before = journey.stages.filter((s) => ["program", "review", "course"].includes(s.key) && !s.done).length;
  const lead = [
    setupDone ? "هويتك موثّقة وملفك جاهز." : verified ? "هويتك موثّقة." : "",
    before === 0 ? "دورتك جاهزة لاستقبال التسجيلات." : `تبقّت ${before === 1 ? "خطوة واحدة" : before === 2 ? "خطوتان" : "ثلاث خطوات"} قبل أن تستقبل أول تسجيل.`,
  ]
    .filter(Boolean)
    .join(" ");
  const prep = [
    o.eventsCount === 0 && { icon: CalendarDays, title: "تقويمك فارغ", caption: "حدّد أيامك المتاحة ليظهر «أقرب موعد» للجهات", label: "افتح التقويم", href: "/trainer/calendar" },
    { icon: Banknote, title: "بيانات التحويل غير مكتملة", caption: "لن تستطيع سحب أرباحك بدونها", label: "أضف بياناتي", href: "/trainer/finance" },
    o.portfolioCount === 0 && { icon: CircleUser, title: "معرض أعمالك فارغ", caption: "أضف نموذج حقيبة تدريبية لرفع ثقة الجهات", label: "أضف عملًا", href: "/trainer/profile/portfolio" },
  ].filter(Boolean) as { icon: LucideIcon; title: string; caption: string; label: string; href: string }[];
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{greetingLine}</h2>
        <p className="type-body-lg text-text-secondary">{lead}</p>
      </div>
      <CurrentStepCard
        o={o}
        journey={journey}
        pills={[
          { key: "account", label: "الحساب" },
          { key: "identity", label: "التوثيق" },
          { key: "profile", label: "الملف المهني" },
          { key: "qualifications", label: "المؤهلات" },
          { key: "program", label: "أول برنامج" },
        ]}
      />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <DashCard radius={22} labelledBy="pending-title" className="gap-[18px]">
            <div className="flex w-full items-center gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-state-error-bg text-state-error">
                <Glyph icon={CircleAlert} size={20} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <h2 id="pending-title" className="type-h2 text-text-primary">
                  بانتظار إجرائك
                </h2>
                <p className="type-body text-text-muted">{actions.length ? `${itemsWord(actions.length)} ${actions.length === 1 ? "يحتاج" : "تحتاج"} قرارك أو إجراءك` : "لا شيء ينتظر إجراءك الآن"}</p>
              </div>
              <Link href="/trainer/queue" className="shrink-0 rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
                عرض كل الإجراءات
              </Link>
            </div>
            {actions.length > 0 && (
              <ul className="flex flex-col gap-[18px]">
                {actions.slice(0, 3).map((i) => (
                  <ActionRow
                    key={i.key}
                    icon={QUEUE_ICONS[i.icon]}
                    title={i.title}
                    caption={i.description}
                    action={
                      <ButtonLink href={i.primary.href} variant="outline" className="w-full sm:w-auto sm:min-w-[120px]">
                        {i.primary.label}
                      </ButtonLink>
                    }
                  />
                ))}
              </ul>
            )}
          </DashCard>
          {prep.length > 0 && (
            <DashCard radius={22} labelledBy="prep-title" className="gap-[18px]">
              <h2 id="prep-title" className="type-h2 text-text-primary">
                جهّز نفسك للنشر
              </h2>
              <p className="type-body text-text-muted">عند اعتماد برنامجك ستحتاج هذه — جهّزها الآن لتبدأ فورًا.</p>
              <ul className="flex flex-col gap-[18px]">
                {prep.map((p) => (
                  <ActionRow
                    key={p.title}
                    icon={p.icon}
                    title={p.title}
                    caption={p.caption}
                    action={
                      <ButtonLink href={p.href} variant="outline" className="w-full sm:w-[120px]">
                        {p.label}
                      </ButtonLink>
                    }
                  />
                ))}
              </ul>
            </DashCard>
          )}
        </div>
        <aside className="flex w-full flex-col gap-6 lg:w-[400px] lg:shrink-0">
          <DashCard radius={22} labelledBy="profile-title" className="gap-[18px]">
            <h2 id="profile-title" className="type-h2 text-text-primary">
              ملفك المهني
            </h2>
            {verified && (
              <div className="flex items-center gap-3 rounded-16 bg-state-success-bg px-4 py-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-success">
                  <Glyph icon={BadgeCheck} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="type-subtitle text-state-success">مدرب معتمد ⭐</p>
                  <p className="type-caption text-text-muted">
                    {o.identityVerifiedAt ? `منذ ${formatDayMonth(o.identityVerifiedAt)} · ` : ""}
                    {o.account.isPublic ? "ظاهر في ملفك" : "مخفي من ملفك العام"}
                  </p>
                </div>
              </div>
            )}
            <LabeledProgress label={`${toArabicDigits(strength.done)} من ${toArabicDigits(strength.total)} عناصر`} percent={strength.percent} />
            <ButtonLink href="/trainer/profile/edit" variant="outline" size="l" fullWidth>
              أكمل ملفي
            </ButtonLink>
          </DashCard>
        </aside>
      </div>
    </>
  );
}

/* ─── Default (256:848) ──────────────────────────────────────────────────────────────────────────────── */

function Kpi({ icon, label, value, note, noteTone = "muted" }: { icon: LucideIcon; label: string; value: string; note: string; noteTone?: "muted" | "success" | "warning" }) {
  const tones = { muted: "text-text-muted", success: "text-state-success", warning: "text-state-warning" };
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-16 border border-border-default bg-bg-card px-5 pt-5 pb-[22px] shadow-card">
      <div className="flex items-center gap-2.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-brand-tint text-text-brand">
          <Glyph icon={icon} size={20} />
        </span>
        <p className="min-w-0 flex-1 type-caption text-text-muted">{label}</p>
      </div>
      <p className="truncate text-[40px] leading-[1.15] font-bold text-text-primary sm:type-display">{value}</p>
      <p className={`type-caption ${tones[noteTone]}`}>{note}</p>
    </div>
  );
}

const timeParts = (iso: string) => {
  const parts = new Intl.DateTimeFormat("ar-SA-u-nu-arab", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Riyadh" }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const period = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  return { clock: `${hour}:${minute}`, period };
};

export function DefaultHome({
  o,
  journey,
  greetingLine,
  queue,
  today,
  todayLabel,
}: {
  o: TrainerOverview;
  journey: Journey;
  greetingLine: string;
  queue: TrainerQueueItem[];
  today: DaySession[];
  todayLabel: string;
}) {
  const s = o.stats;
  const running = o.courses.filter((c) => c.status === "in_progress").length;
  const upcoming = o.courses.filter((c) => c.status === "open" && (!c.startsAt || new Date(c.startsAt).getTime() > new Date().getTime())).length;
  const remaining = 9 - journey.doneCount;
  const reviewCount = o.programs.filter((p) => !["draft", "published", "archived"].includes(p.status)).length;
  const actions = queue.filter((i) => i.kind === "action");
  const lead = [
    `لديك ${running === 0 ? "لا دورات جارية" : pluralAr(running, ["دورة جارية واحدة", "دورتان جاريتان", "دورات جارية", "دورة جارية"])} و${s.activeTrainees === 0 ? "لا متدربين نشطين بعد" : pluralAr(s.activeTrainees, ["متدرب نشط واحد", "متدربان نشطان", "متدربين نشطين", "متدربًا نشطًا"])}.`,
    remaining > 0 && journey.current ? `تبقّت ${remaining === 1 ? "مرحلة واحدة" : remaining === 2 ? "مرحلتان" : `${toArabicDigits(remaining)} مراحل`} لإكمال مسار اعتمادك — أقربها ${journey.current.title}.` : "أكملت مسار اعتمادك.",
  ].join(" ");

  return (
    <>
      <div className="flex w-full justify-end">
        <Link href="/trainer/profile/edit#organizations" className="rounded-[10px] bg-action-primary px-7 py-[15px] text-[16px] font-bold text-text-on-brand hover:bg-action-primary-hover focus-ring">
          ارتباطاتي
        </Link>
      </div>
      <section className="flex w-full flex-col-reverse items-center gap-7 rounded-22 bg-bg-brand-tint px-5 py-7 sm:flex-row sm:px-[30px]">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
          <div className="flex flex-wrap gap-2">
            <HeroPill icon={Route} tone="brand">
              {toArabicDigits(journey.doneCount)} من ٩ مراحل
            </HeroPill>
            {o.identityStatus === "verified" && (
              <HeroPill icon={BadgeCheck} tone="success">
                مدرب معتمد
              </HeroPill>
            )}
          </div>
          <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{greetingLine}</h2>
          <p className="type-body-lg text-text-secondary">{lead}</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="/trainer/programs" size="l" className="w-full sm:w-auto">
              أنشئ برنامجًا جديدًا
            </ButtonLink>
            <ButtonLink href="/trainer/journey" variant="outline" size="l" className="w-full sm:w-auto">
              اعرض مسار الاعتماد
            </ButtonLink>
          </div>
        </div>
        <ProgressRing percent={journey.percent} label="نسبة إكمال مسار الاعتماد" />
      </section>

      <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Banknote} label="ر.س رصيد متاح" value={formatNumber(Math.round(s.available))} note={`و${formatNumber(Math.round(s.pending))} معلّقة`} noteTone="warning" />
        <Kpi icon={CalendarDays} label="دورة جارية" value={toArabicDigits(running)} note={`و${toArabicDigits(upcoming)} قادمة`} />
        <Kpi icon={Users} label="متدرب نشط" value={toArabicDigits(s.activeTrainees)} note={`+${toArabicDigits(s.newTraineesMonth)} هذا الشهر`} noteTone="success" />
        <Kpi
          icon={Star}
          label="متوسط تقييمك"
          value={s.ratingTrainer === null ? "—" : formatRating(s.ratingTrainer)}
          note={s.ratingCount ? `من ${pluralAr(s.ratingCount, ["تقييم واحد", "تقييمين", "تقييمات", "تقييمًا"])}` : "لا تقييمات بعد"}
        />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section aria-labelledby="today-title" className="flex flex-col gap-[18px]">
            <DashSectionHeader id="today-title" title="جدول اليوم" subtitle={todayLabel} link={{ href: "/trainer/calendar", label: "التقويم الكامل" }} />
            <DashCard>
              {today.length === 0 ? (
                <p className="rounded-12 bg-bg-page px-4 py-6 text-center type-small text-text-muted">لا جلسات في جدولك اليوم.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {today.map((t) => {
                    const { clock, period } = timeParts(t.startsAt);
                    const recordNow = !t.attendanceRecorded && new Date(t.startsAt).getTime() <= new Date().getTime() && t.mode !== "recorded";
                    return (
                      <li key={t.id} className="flex flex-wrap items-center gap-4 rounded-12 bg-bg-page px-4 py-3.5 sm:flex-nowrap">
                        <span className="flex shrink-0 flex-col items-center gap-0.5 rounded-8 bg-state-success-bg px-3.5 py-2.5 type-caption">
                          <span className="font-mono font-semibold text-state-success">{clock}</span>
                          <span className="text-text-muted">{period}</span>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="type-subtitle text-text-primary">
                            {t.courseTitle} · {t.title}
                          </span>
                          <span className="type-caption text-text-muted">
                            {[t.organization, t.place, pluralAr(t.learners, ["متدرب واحد", "متدربان", "متدربين", "متدربًا"])].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <ButtonLink href={`/trainer/courses/${t.courseId}`} variant="outline" className="w-full sm:w-auto">
                          {recordNow ? "ابدأ رصد الحضور" : "اعرض التفاصيل"}
                        </ButtonLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DashCard>
          </section>
          <section aria-labelledby="programs-title" className="flex flex-col gap-[18px]">
            <DashSectionHeader
              id="programs-title"
              title="برامجي"
              subtitle={`${pluralAr(o.programs.length, ["برنامج واحد", "برنامجان", "برامج", "برنامجًا"])}${reviewCount ? ` · ${reviewCount === 1 ? "واحد" : toArabicDigits(reviewCount)} قيد المراجعة` : ""}`}
              link={{ href: "/trainer/programs", label: "كل البرامج" }}
            />
            <DashCard>
              {o.programs.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-12 bg-bg-page px-4 py-6 text-center">
                  <p className="type-small text-text-muted">لم تنشئ برامج بعد.</p>
                  <ButtonLink href="/trainer/programs">أنشئ برنامجًا جديدًا</ButtonLink>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {o.programs.slice(0, 4).map((p) => (
                    <ProgramRow key={p.id} program={p} />
                  ))}
                </ul>
              )}
            </DashCard>
          </section>
        </div>

        <aside className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
          <DashCard labelledBy="queue-title">
            <div className="flex items-center gap-3">
              <h2 id="queue-title" className="min-w-0 flex-1 type-h3 text-text-primary">
                بانتظار إجرائك
              </h2>
              {actions.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-state-error-bg px-2.5 py-[5px] type-caption text-state-error">
                  <Glyph icon={CircleAlert} size={16} />
                  {actions.length === 1 ? "بند واحد" : actions.length === 2 ? "بندان" : `${toArabicDigits(actions.length)} بنود`}
                </span>
              )}
            </div>
            {actions.length === 0 ? (
              <p className="rounded-12 bg-bg-page px-3 py-[11px] type-small text-text-muted">لا شيء ينتظر إجراءك الآن.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {actions.slice(0, 3).map((i) => (
                  <MiniRow key={i.key} icon={QUEUE_ICONS[i.icon] ?? FileText} iconClass={i.icon === "alert" ? "text-state-error" : "text-text-brand"} title={i.title} caption={i.summary} href={i.primary.href} />
                ))}
              </ul>
            )}
            <ButtonLink href="/trainer/queue" fullWidth>
              افتح الطابور
            </ButtonLink>
          </DashCard>

          <DashCard labelledBy="balance-title">
            <h2 id="balance-title" className="type-h3 text-text-primary">
              رصيدك
            </h2>
            <dl className="flex flex-col gap-4">
              {[
                { label: "متاح للسحب", value: s.available, cls: "text-state-success" },
                { label: "معلّق حتى انتهاء المهل", value: s.pending, cls: "text-state-warning" },
                { label: "إجمالي هذا الشهر", value: s.monthTotal, cls: "text-text-primary" },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <dt className="min-w-0 flex-1 type-body text-text-secondary">{r.label}</dt>
                  <dd className={`whitespace-nowrap type-subtitle ${r.cls}`}>{money2(r.value)}</dd>
                </div>
              ))}
            </dl>
            <p className="type-caption text-text-muted">يصبح المبلغ متاحًا بعد انتهاء الدورة وانقضاء مهلة استرداد المتدربين.</p>
            {s.available > 0 ? (
              <ButtonLink href="/trainer/finance" variant="secondary" fullWidth>
                اطلب سحبًا
              </ButtonLink>
            ) : (
              <Button variant="secondary" fullWidth disabled>
                اطلب سحبًا
              </Button>
            )}
          </DashCard>

          <DashCard labelledBy="opps-title">
            <h2 id="opps-title" className="type-h3 text-text-primary">
              فرص تناسبك
            </h2>
            <p className="type-caption text-text-muted">طلبات تدريب من جهات، مطابقة لمجالاتك وتوفّرك.</p>
            <ul className="flex flex-col gap-4">
              <MiniRow icon={Building2} title="لا توجد طلبات مطابقة الآن" caption="تظهر هنا طلبات الجهات فور نشرها." />
            </ul>
            <ButtonLink href="/trainer/opportunities" variant="outline" fullWidth>
              اعرض كل الفرص
            </ButtonLink>
          </DashCard>
        </aside>
      </div>
    </>
  );
}
