import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramPageBar } from "@/components/trainer-programs/ProgramPageBar";
import { ProgramPublicPage } from "@/components/trainer-programs/ProgramPublicPage";
import { requireTrainer } from "@/lib/auth";
import { getTrainerProgram, programCoursesAndRatings } from "@/lib/data/trainer-programs";
import { MISSING_FIELDS } from "@/lib/trainer-programs";

export async function generateMetadata({ params }: PageProps<"/trainer/programs/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/programs/${id}`);
  const p = await getTrainerProgram(id, user.id);
  return { title: p ? `${p.title} · حالة النشر` : "البرنامج" };
}

/** TRR-PRG-06 · حالة نشر البرنامج (447:23369 · 447:23751 · 447:24061 / 4207:652 · 447:24400). */
export default async function ProgramStatusPage({ params }: PageProps<"/trainer/programs/[id]">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/programs/${id}`);
  const p = await getTrainerProgram(id, user.id);
  if (!p) notFound();
  const { courses, ratings } = await programCoursesAndRatings(p.id);
  const published = p.phase === "published" || p.phase === "suspended";
  const incomplete = !published && p.phase !== "under_review" && p.missing.length > 0;
  return (
    <>
      <ProgramPageBar
        editHref={published ? `/trainer/programs/${p.id}/new-version` : incomplete ? `/trainer/programs/${p.id}/edit/${MISSING_FIELDS[p.missing[0]].step}` : `/trainer/programs/${p.id}/edit/basics`}
        editLabel="حرّر البرنامج"
        editDisabled={p.phase === "under_review"}
      />
      <ProgramPublicPage p={p} mode="status" courses={courses} ratings={ratings} />
    </>
  );
}
