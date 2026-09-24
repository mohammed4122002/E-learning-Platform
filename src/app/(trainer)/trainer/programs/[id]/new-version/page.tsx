import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Copy, Send } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { InfoRow, PHASE_STYLE, PhasePill } from "@/components/trainer-programs/bits";
import { ProgramSummaryCard } from "@/components/trainer-programs/FlowPanel";
import { NewVersionFlow } from "@/components/trainer-programs/NewVersionFlow";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getTrainerProgram } from "@/lib/data/trainer-programs";
import { formatNumber, pluralAr, toArabicDigits } from "@/lib/format";
import { PHASE_LABEL, filesWord, formatBytes, lessonsWord, unitsWord, versionLabel } from "@/lib/trainer-programs";

export const metadata: Metadata = { title: "نسخة جديدة" };

const nth = (n: number) => ["", "", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"][n] ?? toArabicDigits(n);

/** TRR-PRG-09 · نسخة جديدة (454:28500 · 454:28838 · 454:29078 · 454:29314). */
export default async function NewVersionPage({ params, searchParams }: PageProps<"/trainer/programs/[id]/new-version">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireTrainer(`/trainer/programs/${id}/new-version`);
  const p = await getTrainerProgram(id, user.id);
  if (!p) notFound();

  const createdId = typeof sp.created === "string" ? sp.created : null;
  const created = createdId ? await getTrainerProgram(createdId, user.id) : null;
  const running = p.courses.running + p.courses.open;
  const versionLine = `النسخة ${versionLabel(p.revision)} · ${PHASE_LABEL[p.phase]}${running ? ` · ${pluralAr(running, ["دورة جارية", "دورتان جاريتان", "دورات جارية", "دورة جارية"])}` : ""}`;
  const assignments = p.totals.assignments;

  return (
    <>
      <TopBar title="نسخة جديدة" subtitle={created ? "أُنشئت" : "اختر ما يُنسخ"} />
      <PageBody className="!gap-6">
        <Breadcrumb items={[{ label: "برامجي", href: "/trainer/programs" }, { label: p.title, href: `/trainer/programs/${p.id}` }]} />
        <div className="flex flex-col-reverse gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 justify-center">
            <div className="w-full max-w-[480px]">
              <NewVersionFlow
                source={{
                  id: p.id,
                  title: p.title,
                  reference: p.reference,
                  versionLine,
                  counts: {
                    objectives: p.objectives.length ? pluralAr(p.objectives.length, ["هدف واحد", "هدفان", "أهداف", "هدفًا"]) : "لا أهداف",
                    units: `${unitsWord(p.units.length)} · ${lessonsWord(p.totals.lessons)}`,
                    assignments: assignments ? pluralAr(assignments, ["واجب واحد", "واجبان", "واجبات", "واجبًا"]) : "لا واجبات",
                    materials: `${filesWord(p.totals.files)} · ${formatBytes(p.totals.bytes)}`,
                  },
                  has: { objectives: p.objectives.length > 0, units: p.units.length > 0, assignments: assignments > 0, materials: p.totals.files > 0 },
                }}
                defaultTitle={`${p.title} — نسخة ${nth(2)}`}
                done={created ? { id: created.id, title: created.title } : null}
              />
            </div>
          </div>
          <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[340px]">
            {created ? (
              <ProgramSummaryCard
                tone="success"
                icon={Copy}
                pill={
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-success">
                    <Glyph icon={Copy} size={16} />
                    مسودة · نسخة جديدة
                  </span>
                }
                reference={created.reference}
                title={created.title}
                meta={`أُنشئت من ${versionLabel(p.revision)} · مستقلة تمامًا`}
              />
            ) : (
              <ProgramSummaryCard
                tone={p.phase === "published" ? "success" : p.phase === "rejected" ? "error" : "info"}
                icon={Send}
                pill={<PhasePill phase={p.phase} />}
                reference={p.reference}
                title={p.title}
                meta={`النسخة ${versionLabel(p.revision)}${running ? ` · ${pluralAr(running, ["دورة جارية", "دورتان جاريتان", "دورات جارية", "دورة جارية"])}` : ""} · ${formatNumber(p.courses.learners)} متدربًا`}
              />
            )}
            <section className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-6 shadow-card">
              <h2 className="type-h2 text-text-primary">{created ? "النسخة الجديدة" : "البرنامج الأصلي"}</h2>
              <dl className="flex flex-col gap-3">
                {created ? (
                  <>
                    <InfoRow label="رقم البرنامج" value={created.reference} mono valueClass="text-text-brand" />
                    <InfoRow label="النسخة" value="v1.0" mono />
                    <InfoRow label="الحالة" value="مسودة" />
                    <InfoRow label="ما نُسخ" value={`${pluralAr(created.objectives.length, ["هدف", "هدفان", "أهداف", "هدفًا"])} · ${unitsWord(created.units.length)} · ${lessonsWord(created.totals.lessons)}`} valueClass="text-state-success" />
                    <InfoRow label="ما لم يُنسخ" value="التقييمات والإحصاءات" />
                    <InfoRow label="أثر على الأصل" value="لا شيء" valueClass="text-state-success" />
                  </>
                ) : (
                  <>
                    <InfoRow label="النسخة" value={versionLabel(p.revision)} mono />
                    <InfoRow label="الحالة" value={PHASE_LABEL[p.phase]} valueClass={PHASE_STYLE[p.phase].text} />
                    <InfoRow label="الدورات الجارية" value={toArabicDigits(running)} />
                    <InfoRow label="المتدربون النشطون" value={formatNumber(p.courses.learners)} valueClass="text-state-info" />
                    <InfoRow label="التعديل المباشر" value={p.phase === "draft" || p.phase === "needs_changes" ? "متاح" : "غير متاح"} valueClass="text-state-warning" />
                  </>
                )}
              </dl>
            </section>
            <section className="flex flex-col gap-3 rounded-22 border border-border-default bg-bg-card p-6 shadow-card">
              <h2 className="type-h2 text-text-primary">إجراءات</h2>
              {created ? (
                <>
                  <ButtonLink href={`/trainer/programs/${created.id}/edit/basics`} fullWidth>
                    افتح النسخة في المحرّر
                  </ButtonLink>
                  <ButtonLink href="/trainer/programs" variant="outline" fullWidth>
                    عُد لبرامجي
                  </ButtonLink>
                  <p className="type-caption text-text-muted">تجدها في القائمة بحالة مسودة</p>
                </>
              ) : (
                <>
                  <p className="type-caption text-text-muted">نسخة مستقلة لا تمس الأصل ولا دوراته</p>
                  <ButtonLink href={`/trainer/courses?program=${p.id}`} variant="outline" fullWidth>
                    اعرض الدورات المرتبطة
                  </ButtonLink>
                </>
              )}
            </section>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
