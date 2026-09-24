import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ModeStep } from "@/components/trainer-courses/wizard/ModeStep";
import { WizardShell } from "@/components/trainer-courses/wizard/WizardShell";
import { requireTrainer } from "@/lib/auth";
import { getProgramForNewCourse, latestPublishedProgramId, versionLabel } from "@/lib/data/trainer-courses";

export const metadata: Metadata = { title: "دورة جديدة", description: "أنشئ دورة من برنامج منشور" };

/** TRR-CRS-02 · ٢ نمط التقديم before the draft exists (/trainer/courses/new?program=<id>). */
export default async function NewCoursePage({ searchParams }: PageProps<"/trainer/courses/new">) {
  const user = await requireTrainer("/trainer/courses/new");
  const sp = await searchParams;
  const programId = typeof sp.program === "string" ? sp.program : "";
  if (!programId) {
    const latest = await latestPublishedProgramId(user.id);
    redirect(latest ? `/trainer/courses/new?program=${latest}` : "/trainer/programs");
  }
  const program = await getProgramForNewCourse(programId);
  if (!program) notFound();
  return (
    <>
      <TopBar title="دورة جديدة" subtitle={program.title} />
      <PageBody className="gap-0 lg:px-14">
        <WizardShell
          courseId={null}
          heading="نمط تقديم الدورة"
          description="اختر كيف سيحصل المتدرب على هذا البرنامج."
          breadcrumb="دورة جديدة"
          step={2}
          program={{ title: program.title, version: versionLabel(program.version), latest: program.version === program.currentVersion, changeHref: "/trainer/programs" }}
        >
          <ModeStep programVersionId={program.versionId} initialMode={null} />
        </WizardShell>
      </PageBody>
    </>
  );
}
