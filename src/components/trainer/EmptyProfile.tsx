import type { LucideIcon } from "lucide-react";
import { BookOpen, Briefcase, CalendarDays, Compass, FileText, Info, LayoutGrid, SquareUser, Users } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { DashCard } from "@/components/trainer/DashboardParts";
import { toArabicDigits } from "@/lib/format";
import type { TrainerOverview } from "@/lib/data/trainer";

const WHY: { icon: LucideIcon; title: string; text: string; cls: string }[] = [
  { icon: Compass, title: "الجهات تختار منه", text: "تفتح ملفك قبل إرسال أي عرض تدريب.", cls: "text-text-brand" },
  { icon: LayoutGrid, title: "يرفع ترتيبك", text: "الملفات المكتملة تظهر أعلى في نتائج البحث.", cls: "text-state-info" },
  { icon: Users, title: "المتدربون يثقون به", text: "قبل شراء دورتك يقرؤون عنك.", cls: "text-state-success" },
];
const LATER: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: Briefcase, label: "الخبرات السابقة", href: "/trainer/profile/edit#experience" },
  { icon: FileText, label: "السيرة الذاتية", href: "/trainer/profile/edit#experience" },
  { icon: BookOpen, label: "دوراتك", href: "/trainer/courses" },
  { icon: CalendarDays, label: "تقويم توفّرك", href: "/trainer/calendar" },
];

/** TRR-PRF-01 · الملف المهني — empty state for a new trainer (290:8349). */
export function EmptyProfile({ o }: { o: TrainerOverview }) {
  const steps = [
    { title: "أضف صورتك", text: "دقيقة واحدة · الملفات ذات الصور تتلقّى عروضًا أكثر بمرتين", done: Boolean(o.account.avatarPath), href: "/trainer/profile/edit#photo" },
    { title: "اكتب نبذة قصيرة", text: "دقيقتان · ثلاثة أسطر تكفي: تخصصك وخبرتك وما يميّزك", done: Boolean(o.account.bio?.trim()), href: "/trainer/profile/edit#bio" },
    { title: "أضف مؤهلًا واحدًا", text: "دقيقتان · شهادتك الجامعية أو أي اعتماد مهني", done: o.qualifications.length > 0, href: "/trainer/profile/edit#qualifications" },
    { title: "وثّق هويتك", text: "٣ دقائق · تحصل على شارة «مدرب معتمد» ⭐", done: o.identityStatus === "verified", href: "/account" },
  ];
  const first = steps.find((s) => !s.done) ?? steps[0];
  return (
    <>
      <TopBar title="ملفي المهني" subtitle="ابدأ بناء ملفك" />
      <PageBody className="gap-6">
        <section className="flex w-full items-center gap-7 rounded-22 bg-bg-brand-tint p-6 sm:p-8">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
            <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-surface px-3.5 py-[9px] type-subtitle text-state-warning">
              <Glyph icon={Info} size={20} />
              ملفك فارغ الآن
            </span>
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">ملفك المهني هو ما تراه الجهات قبل أن ترسل لك عرضًا</h2>
            <p className="type-body-lg text-text-secondary">لا تحتاج إكماله دفعة واحدة. أربع خطوات قصيرة تكفي لتبدأ استقبال العروض — والباقي تضيفه متى شئت.</p>
            <ButtonLink href={first.href} size="l" className="w-full sm:w-[300px]">
              ابدأ بالخطوة الأولى
            </ButtonLink>
          </div>
          <span className="hidden size-[88px] shrink-0 items-center justify-center rounded-22 bg-action-primary text-text-on-brand sm:flex">
            <Glyph icon={SquareUser} size={32} />
          </span>
        </section>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <DashCard radius={22} labelledBy="four-title" className="gap-[18px]">
              <h2 id="four-title" className="type-h2 text-text-primary">
                أربع خطوات لملف جاهز
              </h2>
              <ol className="flex flex-col gap-[18px]">
                {steps.map((s, i) => {
                  const current = s === first;
                  return (
                    <li key={s.title} className={`flex flex-wrap items-center gap-[18px] rounded-16 p-5 sm:flex-nowrap ${current ? "border-2 border-action-primary bg-bg-brand-tint" : "bg-bg-page"}`}>
                      <span className={`flex size-16 shrink-0 items-center justify-center rounded-16 type-h2 ${current ? "bg-action-primary text-text-on-brand" : s.done ? "bg-state-success text-text-on-brand" : "bg-bg-surface text-text-primary"}`}>
                        {toArabicDigits(i + 1)}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="type-h3 text-text-primary">{s.title}</span>
                        <span className="type-body text-text-secondary">{s.text}</span>
                      </span>
                      <ButtonLink href={s.href} variant={current ? "primary" : "outline"} className="w-full sm:w-[120px]">
                        {s.done ? "عدّل" : "ابدأ"}
                      </ButtonLink>
                    </li>
                  );
                })}
              </ol>
            </DashCard>
            <DashCard radius={22} labelledBy="later-title" className="gap-[18px]">
              <h2 id="later-title" className="type-h2 text-text-primary">
                تضيفه لاحقًا — لا يمنعك من البدء
              </h2>
              <ul className="flex flex-col gap-4">
                {LATER.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="flex items-center gap-3 rounded-16 bg-bg-page px-4 py-3.5 hover:bg-bg-brand-tint focus-ring">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-secondary">
                        <Glyph icon={l.icon} size={20} />
                      </span>
                      <span className="flex-1 type-subtitle text-text-secondary">{l.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </DashCard>
          </div>
          <aside className="flex w-full flex-col gap-5 lg:w-[400px] lg:shrink-0">
            <DashCard radius={22} labelledBy="why-title" className="gap-[18px]">
              <h2 id="why-title" className="type-h2 text-text-primary">
                لماذا الملف مهم؟
              </h2>
              <ul className="flex flex-col gap-[18px]">
                {WHY.map((w) => (
                  <li key={w.title} className="flex items-start gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface ${w.cls}`}>
                      <Glyph icon={w.icon} size={20} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="type-subtitle text-text-primary">{w.title}</span>
                      <span className="type-caption text-text-muted">{w.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </DashCard>
            <DashCard radius={22} labelledBy="ai-title" className="gap-[18px]">
              <h2 id="ai-title" className="type-h2 text-text-primary">
                لست متأكدًا ماذا تكتب؟
              </h2>
              <p className="type-body text-text-secondary">المساعد الذكي يقترح نبذة من إجاباتك في التسجيل — تراجعها وتعدّلها قبل النشر.</p>
              <ButtonLink href="/trainer/profile/edit?suggest=bio#bio" variant="secondary" size="l" fullWidth>
                اقترح نبذة لي
              </ButtonLink>
            </DashCard>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
