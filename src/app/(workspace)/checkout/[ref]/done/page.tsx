import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CircleCheck, Clock, CircleX } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Stepper } from "@/components/ui/Stepper";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { CourseDetailsCard } from "@/components/checkout/CourseDetailsCard";
import { requireTrainee } from "@/lib/auth";
import { getOrder } from "@/lib/data/checkout";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "تأكيد التسجيل", robots: { index: false } };

const STEPS = ["مراجعة التسجيل", "الدفع", "التأكيد"];

/** TRN-ENR-04 · تأكيد التسجيل — confirmed (paid / free), pending provider approval, or closed. */
export default async function DonePage(props: PageProps<"/checkout/[ref]/done">) {
  const { ref } = await props.params;
  await requireTrainee(`/checkout/${ref}/done`);
  if (!/^[0-9a-f-]{36}$/i.test(ref)) notFound();
  const order = await getOrder(ref);
  if (!order) notFound();
  if (order.status === "pending_payment") redirect(`/checkout/${order.id}`);

  const c = order.course;
  const paid = order.pricePaid > 0 && order.payment?.status === "succeeded";
  const view =
    order.status === "pending_provider"
      ? {
          tone: "info" as const,
          icon: Clock,
          title: "استلمنا طلب تسجيلك",
          text: `يُؤكَّد مقعدك بعد موافقة ${c.organizationName ?? "الجهة التدريبية"} — نرسل لك إشعارًا فور البت في الطلب.${paid ? " إن رُفض الطلب يُسترد المبلغ كاملًا." : ""}`,
        }
      : ["confirmed", "in_progress", "completed"].includes(order.status)
        ? {
            tone: "success" as const,
            icon: CircleCheck,
            title: paid ? "تم الدفع وتأكيد تسجيلك" : "تم تأكيد تسجيلك",
            text:
              c.mode === "recorded"
                ? "الدورة متاحة لك الآن — ابدأ التعلم متى شئت."
                : "أضفنا الدورة إلى تدريباتي، وسنذكّرك قبل موعد الجلسة الأولى.",
          }
        : { tone: "error" as const, icon: CircleX, title: "هذا التسجيل لم يعد نشطًا", text: "أُلغي التسجيل أو انسحبت منه. يمكنك التسجيل من جديد إن ظلت الدورة متاحة." };

  const toneCls = {
    success: "bg-state-success-bg text-state-success",
    info: "bg-state-info-bg text-state-info",
    error: "bg-state-error-bg text-state-error",
  }[view.tone];

  return (
    <>
      <TopBar title="تأكيد التسجيل" subtitle={c.title} />
      <PageBody className="gap-6">
        <div className="rounded-16 border border-border-default bg-bg-surface px-6 py-[22px]">
          <Stepper steps={STEPS} current={view.tone === "success" ? 4 : 3} itemWidth={180} />
        </div>
        <section role="status" className="flex flex-col items-center gap-4 rounded-16 border border-border-default bg-bg-surface px-6 py-10 text-center">
          <span className={`flex size-16 items-center justify-center rounded-full ${toneCls}`}>
            <Glyph icon={view.icon} size={32} />
          </span>
          <h2 className="type-h2 text-text-primary">{view.title}</h2>
          <p className="max-w-[560px] type-body text-text-secondary">{view.text}</p>
          {paid && (
            <p className="type-subtitle text-text-primary">
              المبلغ المدفوع: {formatPrice(order.pricePaid, order.currency)}
              {order.receipt && <span className="text-text-muted"> · إيصال رقم <span dir="ltr">{order.receipt.number}</span></span>}
            </p>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {view.tone === "error" ? (
              <ButtonLink href={`/courses/${c.slug}`}>العودة إلى صفحة الدورة</ButtonLink>
            ) : (
              <ButtonLink href={`/trainee/trainings/${order.id}`}>{c.mode === "recorded" && view.tone === "success" ? "ابدأ التعلم" : "انتقل إلى تدريباتي"}</ButtonLink>
            )}
            {order.receipt && (
              <ButtonLink href={`/trainee/receipts/${order.receipt.id}`} variant="outline">
                عرض الإيصال
              </ButtonLink>
            )}
            <ButtonLink href="/trainee/discover" variant="ghost">
              اكتشف دورات أخرى
            </ButtonLink>
          </div>
        </section>
        <CourseDetailsCard course={c} />
      </PageBody>
    </>
  );
}
