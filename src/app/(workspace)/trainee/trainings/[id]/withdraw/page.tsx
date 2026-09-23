import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Notice, PageHeading } from "@/components/trainings/ui";
import { WithdrawForm } from "@/components/trainings/WithdrawForm";
import { requireTrainee } from "@/lib/auth";
import { getEnrollmentDetail, getRefundQuote } from "@/lib/data/trainings";

export const metadata: Metadata = { title: "الانسحاب من دورة", description: "راجع أثر الانسحاب قبل التأكيد" };

/** TRN-MYE-03 · الانسحاب من دورة (179:8354 · confirmation 179:8586) → withdraw_enrollment (+ request_refund). */
export default async function WithdrawPage(props: PageProps<"/trainee/trainings/[id]/withdraw">) {
  const { id } = await props.params;
  const user = await requireTrainee(`/trainee/trainings/${id}/withdraw`);
  const d = await getEnrollmentDetail(user.id, id);
  if (!d) notFound();
  // Recorded courses have no seat to free — they go straight to the refund request (TRN-RFD-01 · مسجَّلة).
  if (d.course.mode === "recorded") redirect(`/trainee/trainings/${id}/refund`);

  const back = `/trainee/trainings/${d.id}`;
  if (!d.canWithdraw) {
    return (
      <>
        <TopBar title="الانسحاب من دورة" subtitle="راجع أثر الانسحاب قبل التأكيد" />
        <PageBody className="gap-6">
          <Notice tone="neutral" title="الانسحاب غير متاح لهذا التسجيل">
            <p>حالة تسجيلك في «{d.course.title}» الآن: {d.statusLabel}. يمكن الانسحاب من التسجيلات النشطة فقط.</p>
          </Notice>
          <div className="flex justify-end">
            <ButtonLink href={back}>عد إلى تفاصيل التسجيل</ButtonLink>
          </div>
        </PageBody>
      </>
    );
  }

  const quote = await getRefundQuote(d.id);
  return (
    <>
      <TopBar title="الانسحاب من دورة" subtitle="راجع أثر الانسحاب قبل التأكيد" />
      <PageBody className="gap-6">
        <PageHeading
          title={`الانسحاب من «${d.course.title}»`}
          description={d.isPaid ? "قبل أن تؤكد — هذه قيمة الاسترداد المستحقة لك اليوم، وأثر الانسحاب على تسجيلك." : "قبل أن تؤكد — راجع أثر الانسحاب على تسجيلك."}
        />
        <WithdrawForm
          data={{
            enrollmentId: d.id,
            courseTitle: d.course.title,
            courseSlug: d.course.slug,
            startsAt: quote?.startsAt ?? d.course.startsAt,
            pendingProvider: d.status === "pending_provider",
            paid: d.isPaid ? (quote?.paid ?? d.pricePaid) : 0,
            currency: d.currency,
            percent: quote?.percent ?? 0,
            amount: quote?.amount ?? 0,
            tier: quote?.tier ?? "nothing_paid",
            backHref: back,
          }}
        />
      </PageBody>
    </>
  );
}
