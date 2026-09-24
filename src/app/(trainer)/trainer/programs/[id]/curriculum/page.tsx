import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { CurriculumEditor } from "@/components/trainer-programs/CurriculumEditor";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getTrainerProgram } from "@/lib/data/trainer-programs";
import { isEditable } from "@/lib/trainer-programs";

export const metadata: Metadata = { title: "محاور البرنامج" };

const ADD = ["unit", "chapter", "lesson", "assignment"] as const;

/** TRR-PRG-07 · إضافة/تعديل/حذف عنصر — the program curriculum editor (452:24487 … 452:28104). */
export default async function CurriculumPage({ params, searchParams }: PageProps<"/trainer/programs/[id]/curriculum">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireTrainer(`/trainer/programs/${id}/curriculum`);
  const program = await getTrainerProgram(id, user.id);
  if (!program) notFound();
  const locked = !isEditable(program.phase);
  const add = typeof sp.add === "string" && (ADD as readonly string[]).includes(sp.add) && sp.add !== "lesson" && sp.add !== "assignment" ? (sp.add as "unit" | "chapter") : null;

  return (
    <>
      <TopBar title="محرّر البرنامج" subtitle={program.title} />
      <PageBody className="!gap-6">
        <Breadcrumb items={[{ label: "برامجي", href: "/trainer/programs" }, { label: program.title, href: `/trainer/programs/${program.id}` }]} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">محاور البرنامج</h2>
            <p className="type-body-lg text-text-secondary">رتّب المحاور بالسحب — الترتيب هو ما يراه المتدرب.</p>
          </div>
        </div>
        <CurriculumEditor
          programId={program.id}
          locked={locked}
          initialAdd={add}
          initialEdit={typeof sp.edit === "string" ? sp.edit : null}
          units={program.units.map((u) => ({
            id: u.id,
            kind: u.kind,
            title: u.title,
            summary: u.summary,
            minutes: u.minutes,
            lessons: u.lessons,
            items: u.items.map((i) => ({ id: i.id, kind: i.kind, title: i.title, summary: i.summary, minutes: i.minutes, maxScore: i.maxScore, weight: i.weight, dueNote: i.dueNote })),
          }))}
        />
      </PageBody>
    </>
  );
}
