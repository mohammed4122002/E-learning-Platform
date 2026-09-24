import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramPageBar } from "@/components/trainer-programs/ProgramPageBar";
import { ProgramPublicPage } from "@/components/trainer-programs/ProgramPublicPage";
import { requireTrainer } from "@/lib/auth";
import { getTrainerProgram, programCoursesAndRatings } from "@/lib/data/trainer-programs";
import { env } from "@/lib/env";
import { MISSING_FIELDS } from "@/lib/trainer-programs";

export const metadata: Metadata = { title: "معاينة ظهور البرنامج" };

/** معاينة ظهور البرنامج (450:23832 published · 450:24285 draft · 450:24600 incomplete · 450:24960 under review). */
export default async function ProgramVisibilityPage({ params }: PageProps<"/trainer/programs/[id]/visibility">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/programs/${id}/visibility`);
  const p = await getTrainerProgram(id, user.id);
  if (!p) notFound();
  const { courses, ratings } = await programCoursesAndRatings(p.id);
  const published = p.phase === "published" || p.phase === "suspended";
  const incomplete = !published && p.phase !== "under_review" && p.missing.length > 0;
  return (
    <>
      <ProgramPageBar
        editHref={published ? `/trainer/programs/${p.id}/new-version` : incomplete ? `/trainer/programs/${p.id}/edit/${MISSING_FIELDS[p.missing[0]].step}` : `/trainer/programs/${p.id}/edit/basics`}
        editLabel={incomplete ? "أكمل النواقص" : "حرّر البرنامج"}
        editDisabled={p.phase === "under_review"}
        shareUrl={published ? `${env.siteUrl}/trainee/programs/${p.slug}` : undefined}
        exitHref={`/trainer/programs/${p.id}`}
      />
      <ProgramPublicPage p={p} mode="visibility" courses={courses} ratings={ratings} />
    </>
  );
}
