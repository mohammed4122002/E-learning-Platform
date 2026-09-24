import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleX, FileText, X } from "lucide-react";
import { BasicsForm } from "@/components/trainer-programs/BasicsForm";
import { EditorFrame } from "@/components/trainer-programs/EditorFrame";
import { GoalsForm, type Criterion } from "@/components/trainer-programs/GoalsForm";
import { MaterialsInfo, MaterialsManager, UploadLimits } from "@/components/trainer-programs/MaterialsManager";
import { PricingForm } from "@/components/trainer-programs/PricingForm";
import { SavedIndicator } from "@/components/trainer-programs/SavedIndicator";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { requireTrainer } from "@/lib/auth";
import { categoryPriceBand, commissionPercent, getTrainerProgram, listCategories, type ProgramDetail } from "@/lib/data/trainer-programs";
import { formatPrice, pluralAr } from "@/lib/format";
import { hoursWord, isEditStep, sessionsWord, versionLabelAr, type EditStep } from "@/lib/trainer-programs";

const STEP_TITLE: Record<EditStep, string> = { basics: "الأساسيات والغلاف", goals: "الأهداف والمحتوى", materials: "المواد", pricing: "التسعير" };

export async function generateMetadata({ params }: PageProps<"/trainer/programs/[id]/edit/[step]">): Promise<Metadata> {
  const { step } = await params;
  return { title: `محرّر البرنامج · ${isEditStep(step) ? STEP_TITLE[step] : ""}` };
}

function flaggedFields(p: ProgramDetail): Record<string, string> {
  if (p.phase !== "needs_changes" || !p.request) return {};
  return Object.fromEntries(p.request.findings.map((f) => [f.field, f.note || f.label]));
}

/** TRR-PRG-02 · محرّر البرنامج — steps ١ to ٤ (the ٥th is the preview + declaration). */
export default async function EditProgramStepPage({ params, searchParams }: PageProps<"/trainer/programs/[id]/edit/[step]">) {
  const { id, step } = await params;
  const sp = await searchParams;
  const user = await requireTrainer(`/trainer/programs/${id}/edit/${step}`);
  if (!isEditStep(step)) notFound();
  const program = await getTrainerProgram(id, user.id);
  if (!program) notFound();

  const frame = { id: program.id, title: program.title, phase: program.phase };
  const saved = <SavedIndicator savedAt={program.updatedAt} />;
  const flagged = flaggedFields(program);

  if (step === "basics") {
    const categories = await listCategories();
    return (
      <EditorFrame program={frame} step={1} saved={saved}>
        <BasicsForm
          categories={categories}
          userId={user.id}
          trainerName={program.trainer.name}
          initial={{
            id: program.id,
            title: program.title,
            summary: program.summary ?? "",
            categoryId: program.category?.id ?? "",
            skills: program.skills,
            level: program.level,
            hours: program.hours === null ? "" : String(program.hours),
            language: program.language,
            prerequisites: program.prerequisites ?? "",
            coverPath: program.coverPath ?? "",
            price: program.price,
            updatedAt: program.updatedAt,
          }}
        />
      </EditorFrame>
    );
  }

  if (step === "goals") {
    const band = await categoryPriceBand(program.category?.id ?? null);
    const decided = program.phase === "needs_changes";
    const tone = (field: string[]): Criterion["tone"] => (field.some((f) => flagged[f]) ? "error" : decided ? "success" : "neutral");
    const reason = (field: string[], base: string) => (field.some((f) => flagged[f]) ? `${base} — هذا سبب الرد` : base);
    const criteria: Criterion[] = [
      { title: "وضوح الوصف", description: reason(["summary", "title"], "يطابق ما سيحصل عليه المتدرب فعلًا"), tone: tone(["summary", "title"]) },
      { title: "أهداف قابلة للقياس", description: reason(["objectives"], "فعل + نتيجة + مدة"), tone: tone(["objectives"]) },
      {
        title: "اتساق المدة مع المحتوى",
        description: reason(["units", "hours"], program.hours && program.units.length ? `${hoursWord(program.hours)} تناسب ${pluralAr(program.units.length, ["فصلًا واحدًا", "فصلين", "فصول", "فصلًا"])}` : "حدّد الساعات وأضف فصول المحتوى"),
        tone: tone(["units", "hours"]),
      },
      { title: "وضوح المتطلبات المسبقة", description: reason(["prerequisites"], program.prerequisites ? "مذكورة ومحددة" : "لم تُذكر بعد"), tone: tone(["prerequisites"]) },
      {
        title: "التسعير ضمن نطاق التخصص",
        description: reason(
          ["price"],
          program.price === null ? "لم يُحدَّد السعر بعد" : band && program.price >= band.min && program.price <= band.max ? `${formatPrice(program.price)} ضمن المتوسط` : formatPrice(program.price),
        ),
        tone: tone(["price"]),
      },
    ];
    const finding = program.request?.findings[0];
    const header = (
      <>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{program.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-disabled px-2.5 py-[5px] type-caption text-text-muted">
                <Glyph icon={FileText} size={16} />
                مسودة · النسخة {versionLabelAr(program.revision)}
              </span>
              <span className="type-caption text-text-muted">
                رقم البرنامج <span dir="ltr">{program.reference}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <SavedIndicator savedAt={program.updatedAt} small />
            <ButtonLink href={`/trainer/programs/${program.id}/preview`} variant="outline">
              عاين كما يراه المتدرب
            </ButtonLink>
          </div>
        </div>
        {program.phase === "needs_changes" && sp.hide !== "1" && (
          <div role="alert" className="flex items-start gap-3 rounded-12 border-[1.5px] border-state-error bg-state-error-bg px-4 py-3.5">
            <Glyph icon={CircleX} size={20} className="mt-1 text-state-error" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="type-body text-state-error">رُدّ البرنامج لتعديل — الحقل المطلوب مميّز أدناه</p>
              <p className="type-small text-text-secondary">
                السبب المصنَّف: {program.request?.reason ?? finding?.note ?? "—"}.
                {finding ? ` عدّل «${finding.label}» ثم أعد الإرسال — بقية الحقول معتمدة ولا تحتاج تغييرًا.` : ""}
              </p>
            </div>
            <a href="?hide=1" aria-label="إخفاء التنبيه" className="rounded-8 text-text-secondary focus-ring">
              <Glyph icon={X} size={16} />
            </a>
          </div>
        )}
      </>
    );
    const totalHours = program.units.reduce((a, u) => a + u.minutes, 0) / 60;
    return (
      <EditorFrame program={frame} step={2} header={header}>
        <GoalsForm
          programId={program.id}
          initial={{ objectives: program.objectives, audience: program.audience, prerequisites: program.prerequisites ?? "" }}
          units={program.units.map((u) => ({
            id: u.id,
            title: u.title,
            meta: [u.minutes ? hoursWord(Math.round((u.minutes / 60) * 10) / 10) : null, sessionsWord(u.lessons)].filter(Boolean).join(" · "),
          }))}
          unitsBadge={`${pluralAr(program.units.length, ["فصل واحد", "فصلان", "فصول", "فصلًا"])}${program.hours ? ` · ${hoursWord(program.hours)}` : totalHours ? ` · ${hoursWord(Math.round(totalHours))}` : ""}`}
          criteria={criteria}
          flagged={flagged}
          needsChanges={program.phase === "needs_changes"}
          canResubmit={program.phase === "needs_changes" && !!program.decidedAt && program.updatedAt > program.decidedAt}
        />
      </EditorFrame>
    );
  }

  if (step === "materials") {
    return (
      <EditorFrame program={frame} step={3} subtitle="رفع المواد الجاهزة" saved={saved}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <MaterialsInfo />
            <MaterialsManager programId={program.id} userId={user.id} units={program.units.map((u) => ({ id: u.id, title: u.title, files: u.files, bytes: u.bytes }))} />
          </div>
          <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
            <UploadLimits />
            <section className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
              <h2 className="type-h2 text-text-primary">متابعة</h2>
              <p className="type-body text-state-warning">يمكنك المتابعة والرفع مستمر — لكن لا يمكن الإرسال للمراجعة قبل اكتمال كل الملفات.</p>
              <ButtonLink href={`/trainer/programs/${program.id}/edit/pricing`} size="l" fullWidth>
                التالي · التسعير
              </ButtonLink>
              <ButtonLink href={`/trainer/programs/${program.id}/edit/goals`} variant="outline" size="l" fullWidth>
                السابق · الأهداف
              </ButtonLink>
            </section>
          </aside>
        </div>
      </EditorFrame>
    );
  }

  const [commission, band] = await Promise.all([commissionPercent(), categoryPriceBand(program.category?.id ?? null)]);
  return (
    <EditorFrame program={frame} step={4} subtitle="السعر وسياسة الاسترداد" saved={saved}>
      <PricingForm programId={program.id} initialPrice={program.price} commission={commission} band={band} categoryName={program.category?.name ?? null} />
    </EditorFrame>
  );
}
