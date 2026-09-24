import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, CircleCheck, CircleX, Info, Mail, QrCode, TriangleAlert } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Data";
import { EmptyState } from "@/components/ui/Feedback";
import { Breadcrumb } from "@/components/ui/Navigation";
import { DismissibleAlert } from "@/components/trainings/DismissibleAlert";
import { BEFORE_ISSUE, IneligibleCard, IssueBody, IssueHeroChips, IssuedPill, RuleList, certs } from "@/components/trainer-ops/Certificates";
import { IssueFlow } from "@/components/trainer-ops/IssueFlow";
import { MiniPill, OpsCard, OpsHero } from "@/components/trainer-ops/parts";
import { requireTrainer } from "@/lib/auth";
import { getCertificatesView } from "@/lib/data/trainer-certificates";
import { getManagedCourse, runLabel } from "@/lib/data/trainer-course";
import { pluralAr, toArabicDigits } from "@/lib/format";

type Props = PageProps<"/trainer/courses/[id]/certificates/issue">;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `إصدار الشهادات · ${course.title}` };
}

const n = toArabicDigits;

/** TRR-CRT-01 · إصدار الشهادات (276:5358) → جارٍ (463:34780) → صدرت (463:34994). */
export default async function IssueCertificatesPage(props: Props) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  await requireTrainer(`/trainer/courses/${id}/certificates/issue`);
  const course = await getManagedCourse(id);
  const v = await getCertificatesView(course);
  const tab = `/trainer/courses/${course.id}/certificates`;
  if (!v.approved) redirect(tab);

  const done = v.eligible.length > 0 && v.pendingIssue.length === 0;
  const justIssued = typeof sp.issued === "string" ? Number(sp.issued) : null;
  const firstOut = v.ineligible[0];

  return (
    <>
      <TopBar title="إصدار الشهادات" subtitle={done ? `صدرت ${certs(v.issued.length)}` : `${course.programTitle} · ${runLabel(course)}`} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel(course), href: tab }, { label: "الشهادات" }]} />

        {v.eligible.length === 0 ? (
          <>
            <EmptyState icon={Award} title="لا مستحقين للشهادة" description="لم يجتز أحد في النتائج المعتمدة، فلا توجد شهادات لإصدارها." action={<ButtonLink href={`/trainer/courses/${course.id}/results/record`}>اعرض النتائج</ButtonLink>} />
            <IneligibleCard v={v} />
          </>
        ) : done ? (
          <>
            {justIssued !== null && (
              <DismissibleAlert tone="success" title={`صدرت ${certs(justIssued || v.issued.length)} بنجاح`}>
                {`وصلت إشعارات المتدربين وأصبحت شهاداتهم قابلة للتنزيل والتحقق.${v.ineligible.length ? ` ${v.ineligible.length === 1 ? "متدرب واحد لم تصدر شهادته" : `${pluralAr(v.ineligible.length, ["متدرب", "متدربان", "متدربين", "متدربًا"])} لم تصدر شهاداتهم`} – راجع السبب أدناه.` : ""}`}
              </DismissibleAlert>
            )}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-6">
                <OpsHero
                  tone="success"
                  tight
                  icon={CircleCheck}
                  title={`صدرت ${certs(v.issued.length)}`}
                  action={
                    <ButtonLink href={`/trainer/courses/${course.id}/certificates/print`} variant="outline" size="l" className="bg-bg-surface sm:min-w-[200px]" prefetch={false}>
                      نزّل الشهادات PDF
                    </ButtonLink>
                  }
                >
                  {`من ${pluralAr(v.eligible.length, ["ناجح واحد", "ناجحَين", "ناجحين", "ناجحًا"])}${v.ineligible.length ? ` · ${v.ineligible.length === 1 ? "واحد لم تصدر شهادته" : `${n(v.ineligible.length)} لم تصدر شهاداتهم`}` : ""}`}
                </OpsHero>
                <OpsCard title="الشهادات الصادرة" titleId="issued-title" titleSize="h2" aside={<IssuedPill issued={v.issued.length} failed={0} />}>
                  <ul className="flex flex-col gap-4">
                    {v.issued.map((t) => (
                      <li key={t.enrollmentId} className="flex flex-wrap items-center gap-3 rounded-16 bg-bg-page px-4 py-4">
                        <Avatar name={t.name} size="m" />
                        <Link href={`/trainer/courses/${course.id}/certificates/issue/${t.enrollmentId}`} className="min-w-[150px] flex-1 type-title text-text-primary hover:text-text-brand focus-ring">
                          {t.name}
                        </Link>
                        <div className="ms-auto flex items-center gap-3">
                          <span dir="ltr" className="font-mono text-[14px] text-text-secondary">
                            {t.certificate?.code}
                          </span>
                          <MiniPill icon={CircleCheck} tone="success">
                            صادرة
                          </MiniPill>
                        </div>
                      </li>
                    ))}
                    {v.ineligible.map((t) => (
                      <li key={t.enrollmentId} className="flex flex-wrap items-center gap-3 rounded-16 bg-state-error-bg px-4 py-4">
                        <Avatar name={t.name} size="m" />
                        <span className="min-w-[150px] flex-1 type-title text-text-primary">{t.name}</span>
                        <div className="ms-auto flex items-center gap-3">
                          <span className="text-text-muted">—</span>
                          <MiniPill icon={CircleX} tone="error">
                            {`لم تصدر – ${t.reason.split(" – ")[0]}`}
                          </MiniPill>
                        </div>
                      </li>
                    ))}
                  </ul>
                </OpsCard>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
                <RuleList
                  large
                  title="ما بعد الإصدار"
                  titleId="after-title"
                  items={[
                    { icon: Mail, text: "وصلت إشعارات المتدربين" },
                    { icon: QrCode, tone: "success", text: "روابط التحقق فُعّلت" },
                    ...(firstOut ? [{ icon: TriangleAlert, tone: "warning" as const, text: `${firstOut.name.split(" ")[0]} لم تصدر شهادته – ${firstOut.reason.split(" – ")[0]}` }] : []),
                    { icon: Info, text: "الشهادة الصادرة لا تُسحب إلا باسترداد" },
                  ]}
                />
                {firstOut && (
                  <OpsCard title="المستثنى" titleId="excluded-title" description={`${firstOut.name} · ${firstOut.reason}. لا يمكن إصدار شهادته إلا بقرار استثناء من الجهة.`}>
                    {course.organizationId && (
                      <ButtonLink href="/help" variant="outline" size="l" fullWidth>
                        اطلب استثناءً من الجهة
                      </ButtonLink>
                    )}
                  </OpsCard>
                )}
                {course.programId && (
                  <ButtonLink href={`/trainer/courses/${course.id}/certificates/program`} variant="secondary" size="l" fullWidth>
                    شهادات إتمام البرنامج
                  </ButtonLink>
                )}
              </div>
            </div>
          </>
        ) : (
          <IssueFlow
            courseId={course.id}
            pendingIds={v.pendingIssue.map((t) => t.enrollmentId)}
            eligibleCount={v.eligible.length}
            hero={<IssueHeroChips v={v} />}
            sideIssuing={<RuleList large title="قبل الإصدار" titleId="before-title" items={BEFORE_ISSUE(v.ineligible, course.organizationName)} />}
          >
            <IssueBody v={v} course={course} all={sp.all === "1"} />
          </IssueFlow>
        )}
      </PageBody>
    </>
  );
}
