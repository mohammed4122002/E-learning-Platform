import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Breadcrumb } from "@/components/ui/Navigation";
import { WizardStepper } from "@/components/trainer-programs/bits";
import { PHASE_LABEL, isEditable, type ProgramPhase } from "@/lib/trainer-programs";

/*
 * Shared frame of the program editor (TRR-PRG-02 · 351:13417 / 360:13893 / 314:11174 / 314:11489):
 * top bar «محرّر البرنامج», breadcrumb, autosave line, 5-step stepper, then the step body.
 */
export function EditorFrame({
  program,
  step,
  subtitle,
  saved,
  header,
  children,
}: {
  program: { id: string; title: string; phase: ProgramPhase } | null;
  step: 1 | 2 | 3 | 4;
  subtitle?: string;
  saved?: ReactNode;
  header?: ReactNode;
  children: ReactNode;
}) {
  const title = program?.title ?? "برنامج جديد";
  const locked = program && !isEditable(program.phase);
  return (
    <>
      <TopBar title="محرّر البرنامج" subtitle={subtitle ?? `${title} · ${program ? PHASE_LABEL[program.phase] : "مسودة"}`} />
      <PageBody className="!gap-6">
        <div className="flex flex-col gap-4">
          <Breadcrumb items={[{ label: "برامجي", href: "/trainer/programs" }, { label: title }]} />
          {header}
          {!locked && saved}
        </div>
        {locked ? (
          <EmptyState
            icon={Lock}
            title="البرنامج مقفل للتعديل"
            description={
              program.phase === "under_review"
                ? "البرنامج قيد مراجعة المنصة ولا يمكن تعديله الآن. اسحب الطلب أولًا إن أردت التعديل."
                : "البرامج المنشورة أو المرفوضة لا تُعدَّل مباشرة — أنشئ نسخة جديدة مستقلة وعدّلها بحرية."
            }
            action={
              <>
                {program.phase === "under_review" ? (
                  <ButtonLink href={`/trainer/programs/${program.id}/withdraw`}>اسحب الطلب للتعديل</ButtonLink>
                ) : (
                  <ButtonLink href={`/trainer/programs/${program.id}/new-version`}>أنشئ نسخة جديدة</ButtonLink>
                )}
                <ButtonLink href={`/trainer/programs/${program.id}`} variant="outline">
                  افتح البرنامج
                </ButtonLink>
              </>
            }
          />
        ) : (
          <>
            <WizardStepper current={step} />
            {children}
          </>
        )}
      </PageBody>
    </>
  );
}

/** Figma card: surface, 1px border/default, r22, p 26, gap 18, 26px Bold title (Type/H2). */
export function EditorCard({ title, badge, children, className, tone, id }: { title?: ReactNode; badge?: ReactNode; children: ReactNode; className?: string; tone?: "error"; id?: string }) {
  return (
    <section
      id={id}
      className={`flex w-full flex-col gap-[18px] rounded-22 bg-bg-card p-5 shadow-card sm:p-[26px] ${tone === "error" ? "border-2 border-state-error" : "border border-border-default"} ${className ?? ""}`}
    >
      {(title || badge) && (
        <div className="flex flex-wrap items-center gap-3">
          {title && <h2 className="min-w-0 flex-1 type-h2 text-text-primary">{title}</h2>}
          {badge}
        </div>
      )}
      {children}
    </section>
  );
}
