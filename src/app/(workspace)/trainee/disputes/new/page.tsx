import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Notice, PageHeading } from "@/components/trainings/ui";
import { DisputeForm } from "@/components/trainings/DisputeForm";
import { DisputeFairness, DisputeSubjectCard, DisputeWhatHappens, FreezeBanner } from "@/components/trainings/DisputeParts";
import { NotFoundView } from "@/components/trainings/NotFoundView";
import { requireTrainee } from "@/lib/auth";
import { getDisputeDraft } from "@/lib/data/money";

export const metadata: Metadata = { title: "فتح نزاع مالي", description: "مراجعة مستقلة لقرار الاسترداد" };

/** TRN-DSP-01 · فتح نزاع مالي (183:9286) — /trainee/disputes/new?payment=<payment id> → open_dispute. */
export default async function NewDisputePage(props: PageProps<"/trainee/disputes/new">) {
  const sp = await props.searchParams;
  const paymentId = typeof sp.payment === "string" ? sp.payment : "";
  const user = await requireTrainee(`/trainee/disputes/new?payment=${encodeURIComponent(paymentId)}`);
  const draft = paymentId ? await getDisputeDraft(user.id, paymentId) : null;
  if (!draft) {
    return (
      <NotFoundView
        title="فتح نزاع مالي"
        heading="لم نعثر على العملية المالية"
        description="افتح النزاع من صفحة طلب الاسترداد أو تفاصيل التسجيل حتى نربطه بالعملية الصحيحة."
        href="/trainee/queue"
        cta="بانتظار إجرائي"
      />
    );
  }
  if (draft.openDisputeId) redirect(`/trainee/disputes/${draft.openDisputeId}`);

  const amount = draft.refund?.amount ?? draft.amount;
  const back = draft.refund ? `/trainee/refunds/${draft.refund.id}` : draft.enrollmentId ? `/trainee/trainings/${draft.enrollmentId}` : "/trainee/queue";

  return (
    <>
      <TopBar title="فتح نزاع مالي" subtitle="مراجعة مستقلة لقرار الاسترداد" />
      <PageBody className="gap-6">
        <div className="flex justify-end">
          <ButtonLink href="#evidence">إرفاق دليل</ButtonLink>
        </div>
        <PageHeading title="فتح نزاع مالي" description="ترى أن قرار رفض استردادك غير صحيح؟ اشرح وجهة نظرك وسنراجعها بمراجع مستقل. المبلغ يُجمَّد فور فتح النزاع." />
        {!draft.eligible ? (
          <>
            <Notice tone="warning" title="لا يمكن فتح نزاع على هذه العملية">
              <p>النزاع متاح للعمليات المدفوعة أو المستردّة فقط.</p>
            </Notice>
            <div className="flex justify-end">
              <ButtonLink href={back}>رجوع</ButtonLink>
            </div>
          </>
        ) : (
          <>
            <FreezeBanner amount={amount} currency={draft.currency} frozen={false} />
            <DisputeForm
              paymentId={draft.paymentId}
              backHref={back}
              defaultReason={draft.refund?.status === "rejected" ? "withdrawal_date" : "other"}
              subject={<DisputeSubjectCard subject={draft} />}
              fairness={<DisputeFairness />}
              happens={<DisputeWhatHappens />}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
