import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/trainings/ui";
import { ScheduledLayout } from "@/components/trainings/EnrollmentLayouts";
import { CheckInScanner } from "@/components/trainings/CheckInScanner";
import { requireTrainee } from "@/lib/auth";
import { getEnrollmentDetail } from "@/lib/data/trainings";
import { formatDayMonth, formatSessionTime, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "تسجيل الحضور", description: "امسح رمز الجلسة لتسجيل حضورك" };

/** TRN-MYE-02 · تسجيل الحضور (QR): 4142:2 · 4142:560 · 4142:1077 · 4142:1602 · 4142:2119 · 4142:2636. */
export default async function CheckInPage(props: PageProps<"/trainee/trainings/[id]/check-in">) {
  const { id } = await props.params;
  const user = await requireTrainee(`/trainee/trainings/${id}/check-in`);
  const d = await getEnrollmentDetail(user.id, id);
  if (!d) notFound();
  if (d.course.mode === "recorded") redirect(`/trainee/trainings/${id}`);
  if (d.course.mode === "live_remote") redirect(`/trainee/trainings/${id}/session`);

  const back = `/trainee/trainings/${d.id}`;
  const active = ["confirmed", "in_progress"].includes(d.status);
  const s = d.todaySession;

  const top = !active ? (
    <>
      <Notice tone="neutral" title="تسجيل الحضور غير متاح">
        <p>يمكن تسجيل الحضور للتسجيلات المؤكَّدة فقط. حالة تسجيلك الآن: {d.statusLabel}.</p>
      </Notice>
      <div className="flex justify-end">
        <ButtonLink href={back}>عد إلى تفاصيل التسجيل</ButtonLink>
      </div>
    </>
  ) : !s ? (
    <>
      <Notice tone="brand" title="لا جلسة اليوم">
        <p>{d.nextSession ? `جلستك القادمة ${formatSessionTime(d.nextSession.startsAt)}. يُفتح تسجيل الحضور في يوم الجلسة.` : "لا جلسات قادمة في جدول هذه الدورة."}</p>
      </Notice>
      <div className="flex justify-end">
        <ButtonLink href={back}>عد إلى تفاصيل التسجيل</ButtonLink>
      </div>
    </>
  ) : (
    <CheckInScanner enrollmentId={d.id} courseTitle={d.course.title} sessionLabel={`الجلسة ${toArabicDigits(s.position)} · ${s.title}`} backHref={back} />
  );

  return (
    <>
      <TopBar title="تفاصيل تسجيلي" subtitle={d.course.startsAt ? `${d.course.title} · دورة ${formatDayMonth(d.course.startsAt)}` : d.course.title} />
      <PageBody className="gap-6">
        <ScheduledLayout d={d} top={top} />
      </PageBody>
    </>
  );
}
