import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Navigation";
import { IssueBody, StaticIssueHero } from "@/components/trainer-ops/Certificates";
import { SingleIssue } from "@/components/trainer-ops/SingleIssue";
import { DataPanel } from "@/components/trainer-ops/parts";
import { requireTrainer } from "@/lib/auth";
import { getCertificatesView } from "@/lib/data/trainer-certificates";
import { getManagedCourse, isUuid, runLabel } from "@/lib/data/trainer-course";
import { toArabicDigits } from "@/lib/format";

type Props = PageProps<"/trainer/courses/[id]/certificates/issue/[enrollmentId]">;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `إصدار شهادة لمتدرب · ${course.title}` };
}

const n = toArabicDigits;

/** TRR-CRT-01 · إصدار شهادة دورة لمتدرب واحد (4254:2) → جارٍ (4254:394) → صدرت (4254:703). */
export default async function SingleCertificatePage(props: Props) {
  const { id, enrollmentId } = await props.params;
  await requireTrainer(`/trainer/courses/${id}/certificates/issue/${enrollmentId}`);
  if (!isUuid(enrollmentId)) notFound();
  const course = await getManagedCourse(id);
  const v = await getCertificatesView(course);
  const tab = `/trainer/courses/${course.id}/certificates`;
  if (!v.approved) redirect(tab);
  const t = v.eligible.find((x) => x.enrollmentId === enrollmentId) ?? v.ineligible.find((x) => x.enrollmentId === enrollmentId);
  if (!t) notFound();
  const eligible = v.eligible.some((x) => x.enrollmentId === enrollmentId);
  const courseLine = `${course.programTitle} · ${runLabel(course)}`;
  const att = t.attendance;
  const issued = t.certificate?.status === "issued";
  const kind = course.mode === "recorded" ? "شهادة إتمام" : "شهادة دورة";

  return (
    <>
      <TopBar title="إصدار الشهادات" subtitle={courseLine} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel(course), href: tab }, { label: "الشهادات" }]} />
        {issued ? (
          <div className="flex flex-col gap-5">
            <DataPanel
              tone="success"
              title="صدرت الشهادة"
              intro="وصل إشعار المتدرب وفُعّل رابط التحقق. الإصدار نهائي."
              rows={[
                { label: "المتدرب", value: t.name },
                { label: "الدورة", value: courseLine },
                { label: "نوع الشهادة", value: kind, tone: "brand" },
                { label: "الحالة", value: "صادرة", tone: "success" },
                { label: "رقم الشهادة", value: <bdi dir="ltr" className="font-mono">{t.certificate?.code}</bdi> },
              ]}
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
              <ButtonLink href={`/trainer/courses/${course.id}/certificates/print?enrollment=${t.enrollmentId}`} variant="secondary" size="m" prefetch={false}>
                نزّل الشهادة PDF
              </ButtonLink>
              <ButtonLink href={`${tab}/issue`} size="m" className="sm:min-w-[152px]">
                عد إلى الشهادات
              </ButtonLink>
            </div>
          </div>
        ) : (
          <SingleIssue
            kind="course"
            courseId={course.id}
            enrollmentId={t.enrollmentId}
            eligible={eligible}
            backHref={`${tab}/issue`}
            doneHref={`${tab}/issue/${t.enrollmentId}?issued=1`}
            label="أصدر الشهادة"
            disabledLabel="أصدر الشهادة · غير مستحق"
            issuing={{
              title: "جارٍ إصدار الشهادة",
              intro: "لا تغلق الصفحة حتى تكتمل العملية.",
              rows: [
                { label: "المتدرب", value: t.name },
                { label: "الدورة", value: courseLine },
                { label: "توليد الشهادة", value: "جارٍ", tone: "warning" },
                { label: "ربط رابط التحقق", value: "بانتظار", tone: "neutral" },
                { label: "إرسال الإشعار", value: "بانتظار", tone: "neutral" },
              ],
            }}
            idle={
              eligible ? (
                <DataPanel
                  tone="success"
                  title={`إصدار ${kind} لمتدرب واحد`}
                  rows={[
                    { label: "المتدرب", value: t.name },
                    { label: "الدورة", value: courseLine },
                    ...(att !== null ? [{ label: "الحضور", value: `${n(att)}٪ – ${att >= 75 ? "فوق" : "دون"} حد ٧٥٪`, tone: att >= 75 ? ("success" as const) : ("error" as const) }] : []),
                    { label: "الدرجة", value: `${n(t.final)} من ١٠٠` },
                    { label: "الأهلية", value: "مستحق للشهادة – حسبها النظام", tone: "success" },
                  ]}
                />
              ) : (
                <DataPanel
                  tone="error"
                  title="متدرب غير مستحق"
                  intro="لا يمكن إصدار الشهادة – الأهلية يحسبها النظام ولا تُعدّل يدويًا."
                  rows={[
                    { label: "المتدرب", value: t.name },
                    ...(att !== null ? [{ label: "الحضور", value: `${n(att)}٪ – ${att >= 75 ? "فوق" : "دون"} حد ٧٥٪`, tone: att >= 75 ? ("success" as const) : ("error" as const) }] : []),
                    { label: "الأهلية", value: "غير مستحق", tone: "error" },
                  ]}
                />
              )
            }
          />
        )}
        <StaticIssueHero v={v} courseId={course.id} />
        <IssueBody v={v} course={course} />
      </PageBody>
    </>
  );
}
