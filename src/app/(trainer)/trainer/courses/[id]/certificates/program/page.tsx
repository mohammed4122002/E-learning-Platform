import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Breadcrumb } from "@/components/ui/Navigation";
import { IssueBody, StaticIssueHero, trainees } from "@/components/trainer-ops/Certificates";
import { SingleIssue } from "@/components/trainer-ops/SingleIssue";
import { DataPanel, type OpsTone } from "@/components/trainer-ops/parts";
import { requireTrainer } from "@/lib/auth";
import { getCertificatesView, getProgramView } from "@/lib/data/trainer-certificates";
import { getManagedCourse, runLabel } from "@/lib/data/trainer-course";
import { pluralAr, toArabicDigits } from "@/lib/format";

type Props = PageProps<"/trainer/courses/[id]/certificates/program">;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `شهادات إتمام البرنامج · ${course.title}` };
}

const n = toArabicDigits;
const STATUS: Record<string, { label: string; tone: OpsTone }> = {
  completed: { label: "مكتملة", tone: "success" },
  in_progress: { label: "لم تكتمل", tone: "error" },
  not_started: { label: "لم تبدأ", tone: "neutral" },
};

/** TRR-CRT-02 · شهادات إتمام البرنامج (4256:2) → جارٍ (4256:419) → صدرت (4256:724). */
export default async function ProgramCertificatesPage(props: Props) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  await requireTrainer(`/trainer/courses/${id}/certificates/program`);
  const course = await getManagedCourse(id);
  const tab = `/trainer/courses/${course.id}/certificates`;
  const [p, v] = await Promise.all([getProgramView(course), getCertificatesView(course)]);
  const programLine = `${p.programTitle ?? course.programTitle}${p.version ? ` · v${p.version}` : ""}`;
  const eligible = p.trainees.filter((t) => t.eligible);
  const toIssue = eligible.filter((t) => !t.issued);
  const partial = p.trainees.length - eligible.length;
  // 4256:2 shows every eligible trainee and one ineligible example.
  const firstOut = p.trainees.find((t) => !t.eligible);
  const shownTrainees = [...eligible, ...(firstOut ? [firstOut] : [])];
  const hiddenOut = Math.max(0, partial - 1);
  const done = p.certificates.length > 0 && (sp.issued !== undefined || toIssue.length === 0);

  return (
    <>
      <TopBar title="إصدار الشهادات" subtitle={`${course.programTitle} · ${runLabel(course)}`} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel(course), href: tab }, { label: "الشهادات" }]} />
        {!course.programId || p.courseCount === 0 ? (
          <EmptyState icon={GraduationCap} title="الدورة غير مرتبطة ببرنامج" description="شهادات إتمام البرنامج تخص الدورات التابعة لبرنامج متعدد الدورات." action={<ButtonLink href={tab}>عد إلى الشهادات</ButtonLink>} />
        ) : done ? (
          <div className="flex flex-col gap-5">
            <DataPanel
              tone="success"
              title="صدرت شهادات إتمام البرنامج"
              intro={`صدرت ل${trainees(p.certificates.length)} أكملوا جميع دورات البرنامج.`}
              rows={[
                { label: "البرنامج", value: programLine },
                { label: "نوع الشهادة", value: "شهادة إتمام برنامج", tone: "brand" },
                { label: "الصادرة", value: pluralAr(p.certificates.length, ["شهادة واحدة", "شهادتان", "شهادات", "شهادة"]), tone: "success" },
                ...(partial ? [{ label: "لم تصدر لهم", value: `${trainees(partial)} – لم يكملوا كل الدورات`, tone: "warning" as const }] : []),
              ]}
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
              <ButtonLink href={`/trainer/courses/${course.id}/certificates/print?kind=program`} variant="secondary" size="m" prefetch={false}>
                نزّل الشهادات PDF
              </ButtonLink>
              <ButtonLink href="/trainer/programs" size="m" className="sm:min-w-[152px]">
                عد إلى برامجي
              </ButtonLink>
            </div>
          </div>
        ) : (
          <SingleIssue
            kind="program"
            courseId={course.id}
            eligible={toIssue.length > 0}
            backHref={`${tab}/issue`}
            doneHref={`${tab}/program?issued=1`}
            label="أصدر شهادات البرنامج للمستحقين"
            disabledLabel="لا مستحقين لشهادة البرنامج"
            issuing={{
              title: "جارٍ إصدار شهادات البرنامج",
              intro: "النظام يتحقق من اكتمال دورات كل متدرب ثم يُصدر الشهادة.",
              rows: [
                { label: "البرنامج", value: programLine },
                { label: "التحقق من اكتمال الدورات", value: "جارٍ", tone: "warning" },
                { label: "توليد الشهادات", value: "بانتظار", tone: "neutral" },
                { label: "ربط روابط التحقق", value: "بانتظار", tone: "neutral" },
              ],
            }}
            idle={
              <div className="flex flex-col gap-5">
                <DataPanel
                  tone="brand"
                  title="شهادات إتمام البرنامج"
                  intro={
                    <>
                      تُصدر شهادة إتمام البرنامج فقط لمن أكمل جميع دورات البرنامج.
                      <br />
                      الأهلية يحسبها النظام من اكتمال الدورات – لا تُعدّل يدويًا.
                    </>
                  }
                  rows={[
                    { label: "البرنامج", value: programLine },
                    { label: "دورات البرنامج", value: pluralAr(p.courseCount, ["دورة واحدة", "دورتان", "دورات", "دورة"]) },
                    { label: "المستحقون لشهادة البرنامج", value: eligible.length ? trainees(eligible.length) : "لا أحد بعد", tone: "success" },
                    ...(partial ? [{ label: "أكملوا جزءًا فقط", value: `${trainees(partial)} – لهم شهادات دورات فقط`, tone: "warning" as const }] : []),
                  ]}
                />
                {shownTrainees.map((t) => (
                  <DataPanel
                    key={t.traineeId}
                    tone={t.eligible ? "success" : "error"}
                    title={`حالة دورات المتدرب · ${t.name}`}
                    rows={[
                      ...t.courses.map((c, i) => ({ label: `الدورة ${n(i + 1)} · ${c.title}`, value: STATUS[c.status].label, tone: STATUS[c.status].tone })),
                      {
                        label: "الأهلية",
                        value: t.issued ? "صدرت شهادة البرنامج" : t.eligible ? "مستحق لشهادة البرنامج" : "غير مستحق – شهادات الدورات المكتملة فقط",
                        tone: t.eligible ? ("success" as const) : ("error" as const),
                      },
                    ]}
                  />
                ))}
                {hiddenOut > 0 && <p className="type-caption text-text-muted">{`و${trainees(hiddenOut)} آخرين لم يكملوا كل دورات البرنامج.`}</p>}
              </div>
            }
          />
        )}
        {v.approved && (
          <>
            <StaticIssueHero v={v} courseId={course.id} />
            <IssueBody v={v} course={course} />
          </>
        )}
      </PageBody>
    </>
  );
}
