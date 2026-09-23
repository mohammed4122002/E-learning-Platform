import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Stepper } from "@/components/ui/Stepper";
import { Alert } from "@/components/ui/Feedback";
import { ButtonLink } from "@/components/ui/Button";
import { HoldTimer } from "@/components/checkout/HoldTimer";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PaymentForm } from "@/components/checkout/PaymentForm";
import { refundNoteFor } from "@/components/checkout/CourseDetailsCard";
import { requireTrainee } from "@/lib/auth";
import { getOrder } from "@/lib/data/checkout";
import { createClient } from "@/lib/supabase/server";
import { formatDayMonth } from "@/lib/format";

export const metadata: Metadata = { title: "الدفع", robots: { index: false } };

const STEPS = ["مراجعة التسجيل", "الدفع", "التأكيد"];

/** TRN-ENR-03 · الدفع — only for a live pending_payment hold of the signed-in trainee. */
export default async function PayPage(props: PageProps<"/checkout/[ref]/pay">) {
  const { ref } = await props.params;
  await requireTrainee(`/checkout/${ref}/pay`);
  if (!/^[0-9a-f-]{36}$/i.test(ref)) notFound();
  const order = await getOrder(ref);
  if (!order) notFound();
  if (order.status !== "pending_payment") redirect(`/checkout/${order.id}/done`);

  const supabase = await createClient();
  const { data: vat } = await supabase.from("app_settings").select("value").eq("key", "vat_rate_percent").maybeSingle();
  const expired = !order.holdExpiresAt || new Date(order.holdExpiresAt) <= new Date();
  const subtotal = order.pricePaid - order.vat;
  const c = order.course;
  const subtitle = c.mode === "recorded" ? "دورة مسجَّلة · وصول دائم" : [c.startsAt ? formatDayMonth(c.startsAt) : null, c.mode === "in_person" ? c.city : "مباشرة عن بُعد"].filter(Boolean).join(" · ");

  return (
    <>
      <TopBar title="الدفع" subtitle={c.title} />
      <PageBody className="gap-6">
        {expired ? (
          <>
            <Alert tone="error" title="انتهت مهلة الحجز وتحرر المقعد">
              لم يُخصم أي مبلغ. يمكنك طلب حجز جديد إن ظل المقعد متاحًا.
            </Alert>
            <ButtonLink href={`/checkout/${c.slug}`} className="self-start">
              اطلب حجزًا جديدًا
            </ButtonLink>
          </>
        ) : (
          <>
            <HoldTimer expiresAt={order.holdExpiresAt!} />
            <div className="rounded-16 border border-border-default bg-bg-surface px-6 py-[22px]">
              <Stepper steps={STEPS} current={2} itemWidth={180} />
            </div>
            <PaymentForm
              enrollmentId={order.id}
              total={order.pricePaid}
              currency={order.currency}
              summary={
                <OrderSummary
                  title={c.title}
                  subtitle={subtitle}
                  listPrice={order.listPrice}
                  discount={Math.max(0, order.listPrice - subtotal)}
                  discountCode={order.discountCode}
                  vat={order.vat}
                  vatRate={Number(vat?.value ?? 15)}
                  total={order.pricePaid}
                  currency={order.currency}
                  refundNote={refundNoteFor({ mode: c.mode, price: order.listPrice })}
                />
              }
            />
          </>
        )}
      </PageBody>
    </>
  );
}
