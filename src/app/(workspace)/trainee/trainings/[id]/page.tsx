import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Hourglass, Route, User } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Chip, DataCard, Notice, StatusItemCard } from "@/components/trainings/ui";
import { DismissButton } from "@/components/trainings/DismissButton";
import { PendingProviderHero, RequestPathCard, WhatIfProviderCard } from "@/components/trainings/EnrollmentSections";
import { RecordedLayout, ScheduledLayout } from "@/components/trainings/EnrollmentLayouts";
import { getEnrollmentDetail, type EnrollmentDetail } from "@/lib/data/trainings";
import { getCurrentUser, requireTrainee } from "@/lib/auth";
import { formatDayMonth, formatRelative, formatSessionTime, toArabicDigits } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/trainee/trainings/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const d = user ? await getEnrollmentDetail(user.id, id) : null;
  return { title: d ? `تفاصيل تسجيلي · ${d.course.title}` : "تفاصيل تسجيلي" };
}

function subtitleOf(d: EnrollmentDetail) {
  if (d.status === "pending_provider") return "بانتظار تأكيد الجهة التدريبية";
  return d.course.startsAt ? `${d.course.title} · دورة ${formatDayMonth(d.course.startsAt)}` : d.course.title;
}

function PendingProvider({ d }: { d: EnrollmentDetail }) {
  return (
    <>
      <StatusItemCard
        tone="warning"
        icon={Hourglass}
        title="بانتظار تأكيد الجهة التدريبية"
        badge={
          <Chip tone="warning" icon={Hourglass}>
            مقعدك في «{d.course.title}»{d.course.startsAt ? ` — دورة ${formatDayMonth(d.course.startsAt)}` : ""}
          </Chip>
        }
        description="الخطوة ٢ من ٣ · تأكيد المقعد"
        facts={[
          { icon: Route, label: "المسؤول:", value: d.course.provider ?? d.course.trainer },
          { icon: Clock, label: "التحديث المتوقع:", value: "خلال ٢٤ ساعة عمل" },
          { icon: User, label: "قُدّم:", value: formatRelative(d.createdAt) },
        ]}
        refCode={d.ref}
        footerChip={
          <Chip tone="warning" icon={Clock}>
            قُدّم {formatRelative(d.createdAt)}
          </Chip>
        }
        actions={
          <>
            <ButtonLink href="/trainee/queue" variant="outline" className="min-w-[120px]">
              تتبّع الطلب
            </ButtonLink>
            <DismissButton itemKey={`provider:${d.id}`} mode="snooze" />
          </>
        }
      />
      <PendingProviderHero d={d} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <RequestPathCard d={d} />
        <WhatIfProviderCard d={d}>
          <ButtonLink href={`/trainee/trainings/${d.id}/withdraw`} variant="outline" fullWidth>
            {d.isPaid ? "إلغاء الطلب واسترداد المبلغ" : "إلغاء الطلب"}
          </ButtonLink>
        </WhatIfProviderCard>
      </div>
    </>
  );
}

/** Live delivery summary above the hero (4173:667 · مباشر · مؤكَّدة قبل موعد الجلسة). */
function LiveDelivery({ d }: { d: EnrollmentDetail }) {
  const s = d.liveSession;
  const minutes = s ? Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000) : null;
  return (
    <>
      <Notice tone="brand" title="دورة مباشرة · مقعدك مؤكَّد">
        <p>تُقدَّم هذه الدورة في جلسات مباشرة مجدولة.</p>
        <p>ستجد تفاصيل الجلسة القادمة وزر الدخول في وقت الجلسة.</p>
      </Notice>
      <DataCard
        title="نمط التقديم"
        rows={[
          { label: "النمط", value: "مباشر", tone: "brand" },
          ...(s ? [{ label: "الجلسة القادمة", value: formatSessionTime(s.startsAt) }] : []),
          ...(d.course.trainer ? [{ label: "المدرب", value: d.course.trainer }] : []),
          ...(minutes ? [{ label: "المدة", value: `${toArabicDigits(minutes)} دقيقة` }] : []),
          { label: "حالة الحضور", value: "يُسجَّل تلقائيًا عند الدخول" },
        ]}
      />
      {s && (
        <div className="flex justify-end">
          <ButtonLink href={`/trainee/trainings/${d.id}/session?session=${s.id}`}>تفاصيل الجلسة القادمة</ButtonLink>
        </div>
      )}
    </>
  );
}

/**
 * TRN-MYE-02 · تفاصيل تسجيلي — حضورية·مؤكَّدة (166:6102), بانتظار الجهة (167:6779), مباشر·مؤكَّدة (4173:667),
 * مسجَّلة·جارية (188:9698), أُلغيت الدورة (4136:2).
 */
export default async function EnrollmentPage(props: PageProps<"/trainee/trainings/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await requireTrainee(`/trainee/trainings/${id}`);
  const d = await getEnrollmentDetail(user.id, id);
  if (!d) notFound();

  const active = ["confirmed", "in_progress"].includes(d.status);
  const courseCancelled = d.course.status === "cancelled" || (d.status === "cancelled" && d.endReason !== "hold_expired");
  const withdrawnNotice =
    sp.withdrawn === "1" ? (
      <Alert tone="success" title="تم تسجيل انسحابك">
        أُلغي تسجيلك في «{d.course.title}» وتحرر مقعدك لأول متدرب في قائمة الانتظار.
      </Alert>
    ) : null;

  let body;
  if (d.status === "pending_provider") {
    body = <PendingProvider d={d} />;
  } else if (d.course.mode === "recorded") {
    body = (
      <RecordedLayout
        d={d}
        top={
          <>
            {withdrawnNotice}
            {d.status === "access_revoked" && (
              <Notice tone="neutral" title="سُحب الوصول إلى هذه الدورة">
                <p>انتهى وصولك إلى المحتوى بعد اعتماد استرداد المبلغ. تبقى إيصالاتك محفوظة في سجلّك المالي.</p>
              </Notice>
            )}
          </>
        }
      />
    );
  } else {
    const top = (
      <>
        {withdrawnNotice}
        {courseCancelled && (
          <Notice tone="error" title="أُلغيت الدورة">
            <p>السبب: لم يكتمل الحد الأدنى للمتدربين قبل موعد البدء، فألغت الجهة التدريبية الدورة.</p>
            <p>{d.isPaid ? "وفق القاعدة المعتمدة، الاسترداد كامل ويُعالج تلقائيًا — لا إجراء مطلوب منك سوى تأكيد الطلب." : "لم يُخصم أي مبلغ من حسابك."}</p>
            <p>تختلف مدة وصول المبلغ حسب وسيلة الدفع والبنك.</p>
          </Notice>
        )}
        {d.status === "withdrawn" && sp.withdrawn !== "1" && (
          <Notice tone="neutral" title="انسحبت من هذه الدورة">
            <p>انسحبت {d.endedAt ? formatRelative(d.endedAt) : ""}. تبقى تفاصيل التسجيل والجدول للاطّلاع فقط.</p>
          </Notice>
        )}
        {d.course.mode === "live_remote" && active && <LiveDelivery d={d} />}
        {d.course.mode === "in_person" && active && d.todaySession && (
          <div className="flex justify-end">
            <ButtonLink href={`/trainee/trainings/${d.id}/check-in`}>تسجيل الحضور</ButtonLink>
          </div>
        )}
      </>
    );
    const afterHero =
      courseCancelled || d.status === "withdrawn" ? (
        <div className="flex flex-wrap justify-end gap-3">
          {d.openRefund || d.refunds.some((r) => !r.cancelled) ? (
            <ButtonLink href={`/trainee/refunds/${(d.openRefund ?? d.refunds.find((r) => !r.cancelled))!.id}`}>عرض حالة الاسترداد</ButtonLink>
          ) : (
            d.isPaid && <ButtonLink href={`/trainee/trainings/${d.id}/refund`}>اطلب الاسترداد</ButtonLink>
          )}
          <ButtonLink href="/trainee/trainings" variant="secondary">
            العودة إلى دوراتي
          </ButtonLink>
        </div>
      ) : null;
    body = <ScheduledLayout d={d} top={top} afterHero={afterHero} cancelled={courseCancelled} />;
  }

  return (
    <>
      <TopBar title="تفاصيل تسجيلي" subtitle={subtitleOf(d)} />
      <PageBody className="gap-6">{body}</PageBody>
    </>
  );
}
