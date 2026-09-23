import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Breadcrumb } from "@/components/ui/Navigation";
import { Notice, PageHeading } from "@/components/trainings/ui";
import { RefundForm } from "@/components/trainings/RefundForm";
import { requireTrainee } from "@/lib/auth";
import { getEnrollmentDetail, getRefundQuote } from "@/lib/data/trainings";
import { formatDate, formatDayMonth } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, REFUND_REASONS } from "@/lib/trainings";

export const metadata: Metadata = { title: "طلب استرداد", description: "راجع المبلغ المحسوب آليًا ثم أرسل الطلب" };

/** TRN-RFD-01 · طلب استرداد — scheduled course (180:8631) and recorded course (409:16552) → request_refund. */
export default async function RefundRequestPage(props: PageProps<"/trainee/trainings/[id]/refund">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await requireTrainee(`/trainee/trainings/${id}/refund`);
  const d = await getEnrollmentDetail(user.id, id);
  if (!d) notFound();
  if (d.openRefund) redirect(`/trainee/refunds/${d.openRefund.id}`);

  const recorded = d.course.mode === "recorded";
  const back = `/trainee/trainings/${d.id}`;
  const courseCancelled = d.course.status === "cancelled" || (d.status === "cancelled" && d.endReason !== "hold_expired");
  // Scheduled courses are refunded after the withdrawal (the tier is measured at that moment).
  if (!recorded && !courseCancelled && ["confirmed", "in_progress", "pending_provider"].includes(d.status)) redirect(`/trainee/trainings/${id}/withdraw`);

  const approved = d.refunds.find((r) => r.status === "approved");
  const quote = d.isPaid ? await getRefundQuote(d.id) : null;
  const blocked = !d.isPaid ? "nothing" : approved ? "approved" : !quote || quote.percent <= 0 ? (recorded ? null : "ineligible") : null;

  const header = (
    <>
      {recorded && <Breadcrumb items={[{ label: "تسجيلاتي", href: "/trainee/trainings" }, { label: d.course.title, href: back }, { label: "استرداد" }]} />}
      <PageHeading
        title="طلب استرداد"
        description={recorded ? "دورة مسجَّلة — المهلة تُحسب من تاريخ الشراء لا من بدء الدورة." : "المبلغ محسوب آليًا من شريحة الاسترداد — لا يمكن تعديله يدويًا من أي طرف."}
      />
      {sp.withdrawn === "1" && (
        <Alert tone="success" title="تم تسجيل انسحابك">
          بقي تأكيد طلب الاسترداد — راجع المبلغ المحسوب ثم أرسل الطلب.
        </Alert>
      )}
    </>
  );

  if (blocked) {
    const copy = {
      nothing: { title: "لا يوجد مبلغ للاسترداد", text: "لم يُدفع أي مبلغ لهذا التسجيل، فلا حاجة لطلب استرداد." },
      approved: { title: "اعتُمد استرداد هذا التسجيل مسبقًا", text: "تجد تفاصيل التحويل في صفحة متابعة الطلب." },
      ineligible: {
        title: "لا يستحق هذا التسجيل استردادًا",
        text: "وقع انسحابك في شريحة «لا استرداد» (أقل من ٣ أيام قبل البدء أو بعده). إن رأيت أن الحساب غير صحيح يمكنك فتح نزاع مالي يراجعه مسؤول مستقل.",
      },
    }[blocked];
    return (
      <>
        <TopBar title="طلب استرداد" subtitle="راجع المبلغ المحسوب آليًا ثم أرسل الطلب" />
        <PageBody className="gap-6">
          {header}
          <Notice tone={blocked === "ineligible" ? "warning" : "neutral"} title={copy.title}>
            <p>{copy.text}</p>
          </Notice>
          <div className="flex flex-wrap justify-end gap-3">
            {approved && <ButtonLink href={`/trainee/refunds/${approved.id}`}>تابع الطلب</ButtonLink>}
            {blocked === "ineligible" && d.payment && <ButtonLink href={`/trainee/disputes/new?payment=${d.payment.id}`}>افتح نزاعًا ماليًا</ButtonLink>}
            <ButtonLink href={back} variant="secondary">
              عد إلى تفاصيل التسجيل
            </ButtonLink>
          </div>
        </PageBody>
      </>
    );
  }

  const endReason = REFUND_REASONS.some((r) => r.value === d.endReason) ? d.endReason! : "other";
  const metaParts = [d.course.provider ?? d.course.trainer, d.course.city].filter(Boolean);
  if (d.status === "withdrawn" && d.endedAt) metaParts.push(`انسحبت في ${formatDayMonth(d.endedAt)}`);
  if (courseCancelled) metaParts.push("ألغتها الجهة");

  return (
    <>
      <TopBar title="طلب استرداد" subtitle={recorded ? d.course.title : "راجع المبلغ المحسوب آليًا ثم أرسل الطلب"} />
      <PageBody className="gap-6">
        {header}
        <RefundForm
          draft={{
            enrollmentId: d.id,
            ref: d.ref,
            mode: recorded ? "recorded" : "scheduled",
            courseTitle: d.course.startsAt ? `${d.course.title} · دورة ${formatDayMonth(d.course.startsAt)}` : d.course.title,
            courseMeta: metaParts.join(" · "),
            paid: quote?.paid ?? d.pricePaid,
            currency: d.currency,
            percent: quote?.percent ?? 0,
            amount: quote?.amount ?? 0,
            tier: quote?.tier ?? "none",
            referenceAt: quote?.referenceAt ?? new Date().toISOString(),
            startsAt: quote?.startsAt ?? d.course.startsAt,
            daysBefore: quote?.daysBefore ?? null,
            windowEndsAt: quote?.windowEndsAt ?? null,
            purchasedAt: d.confirmedAt ?? d.createdAt,
            paymentMethod: d.payment ? (PAYMENT_METHOD_LABEL[d.payment.method] ?? "وسيلة الدفع") : "وسيلة الدفع",
            lessonsDone: d.lessonsDone,
            defaultReason: recorded ? "personal" : endReason,
            backHref: back,
          }}
        />
        {recorded && quote?.windowEndsAt && <p className="sr-only">تنتهي مهلة الاسترداد في {formatDate(quote.windowEndsAt)}.</p>}
      </PageBody>
    </>
  );
}
