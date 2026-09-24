import type { Metadata } from "next";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { ResultsSheet } from "@/components/trainer-ops/ResultsSheet";
import { requireTrainer } from "@/lib/auth";
import { getManagedCourse, runLabel } from "@/lib/data/trainer-course";
import { getResults } from "@/lib/data/trainer-results";
import { formatRelative } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/trainer/courses/[id]/results/record">): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `رصد النتائج · ${course.title}` };
}

/** TRR-RES-01 · رصد النتائج (276:5002). */
export default async function RecordResultsPage(props: PageProps<"/trainer/courses/[id]/results/record">) {
  const { id } = await props.params;
  await requireTrainer(`/trainer/courses/${id}/results/record`);
  const course = await getManagedCourse(id);
  const v = await getResults(course);
  const ended = course.endsAt && new Date(course.endsAt).getTime() <= new Date().getTime();
  const heroBody = v.approval
    ? "اعتُمدت النتائج نهائيًا — تظهر في ملف كل متدرب ولا يمكن تعديلها إلا بطلب من الإدارة."
    : `${ended && course.endsAt ? `انتهت الدورة ${formatRelative(course.endsAt)}. ` : ""}ارصد نتيجة كل متدرب ثم اعتمدها — الاعتماد نهائي ويفتح إصدار الشهادات للمجتازين ولا يمكن التراجع عنه.`;
  return (
    <>
      <TopBar title="رصد النتائج" subtitle={`${course.programTitle} · ${runLabel(course)}`} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel(course), href: `/trainer/courses/${course.id}/results` }, { label: "رصد النتائج" }]} />
        <ResultsSheet
          courseId={course.id}
          rows={v.rows}
          blockers={v.blockers}
          approved={Boolean(v.approval)}
          heroBody={heroBody}
          passRules={{ attendance: v.sessions.total > 0, passScore: v.assignments.passScore, maxScore: v.assignments.maxScore }}
          names={Object.fromEntries(v.names)}
        />
      </PageBody>
    </>
  );
}
