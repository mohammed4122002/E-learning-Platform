import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CircleCheck, Info, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Stepper } from "@/components/ui/Stepper";
import { Alert } from "@/components/ui/Feedback";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { HoldTimer } from "@/components/checkout/HoldTimer";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { CourseDetailsCard, refundNoteFor } from "@/components/checkout/CourseDetailsCard";
import { ProceedForm } from "@/components/checkout/ProceedForm";
import { MODES } from "@/components/course/CourseCover";
import { requireTrainee } from "@/lib/auth";
import { getActiveEnrollment, getBuyer, getCheckoutCourse, getOrder, getQuote } from "@/lib/data/checkout";
import { createClient } from "@/lib/supabase/server";
import { formatDayMonth, formatPrice, formatSessionTime, pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "مراجعة التسجيل", robots: { index: false } };

const STEPS = ["مراجعة التسجيل", "الدفع", "التأكيد"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function courseSubtitle(c: { mode: keyof typeof MODES; startsAt: string | null; firstSession: { startsAt: string } | null; city: string | null; venue: string | null }) {
  if (c.mode === "recorded") return "دورة مسجَّلة · وصول دائم";
  const when = c.firstSession ? formatSessionTime(c.firstSession.startsAt).split(" · ")[0] : c.startsAt ? formatDayMonth(c.startsAt) : "";
  return [when, c.mode === "in_person" ? [c.city, c.venue].filter(Boolean).join(" · ") : "مباشرة عن بُعد"].filter(Boolean).join(" · ");
}

async function vatRate() {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "vat_rate_percent").maybeSingle();
  return Number(data?.value ?? 15);
}

/**
 * /checkout/<course-slug> → TRN-ENR-01/02 review + discount code (free variant 4137:2, already enrolled 408:15963).
 * /checkout/<enrollment-id> → TRN-ENR-05 ملخص الحجز المؤقت (active / near expiry / expired / payment in progress).
 */
export default async function CheckoutRefPage(props: PageProps<"/checkout/[ref]">) {
  const { ref } = await props.params;
  const sp = await props.searchParams;
  const user = await requireTrainee(`/checkout/${ref}`);
  const rate = await vatRate();

  if (UUID.test(ref)) {
    const order = await getOrder(ref);
    if (!order) notFound();
    if (order.status !== "pending_payment") redirect(`/checkout/${order.id}/done`);
    const expired = !order.holdExpiresAt || new Date(order.holdExpiresAt) <= new Date();
    const inProgress = order.payment?.status === "processing";
    const subtotal = order.pricePaid - order.vat;
    return (
      <>
        <TopBar title="ملخص الحجز المؤقت" subtitle={order.course.title} />
        <PageBody className="gap-6">
          {!expired && <HoldTimer expiresAt={order.holdExpiresAt!} message="مقعدك محجوز — تابع إلى الدفع قبل انتهاء المهلة" />}
          {expired ? (
            <Alert tone="error" title="انتهت مهلة الحجز وتحرر المقعد">
              يمكنك طلب حجز جديد إن ظل المقعد متاحًا.
            </Alert>
          ) : inProgress ? (
            <Alert tone="info" title="عملية دفع قائمة">
              لديك عملية دفع قيد التنفيذ لهذا الحجز — انتظر نتيجتها قبل المحاولة مجددًا. لا تُخصم المبالغ مرتين.
            </Alert>
          ) : (
            <section className="flex flex-col gap-2 rounded-[14px] border-[1.5px] border-action-primary bg-bg-brand-tint px-6 py-[22px]">
              <h2 className="text-[22px] leading-[1.2] font-bold text-text-brand">مقعدك محجوز مؤقتاً</h2>
              <p className="type-small text-text-secondary">راجع تفاصيل حجزك ثم تابع إلى الدفع لتأكيد مقعدك.</p>
              <p className="type-small text-text-secondary">إن انتهت المهلة يتحرر المقعد ويمكنك طلب حجز جديد إن ظل متاحاً.</p>
            </section>
          )}
          <div className="rounded-16 border border-border-default bg-bg-surface px-6 py-[22px]">
            <Stepper steps={STEPS} current={1} itemWidth={180} />
          </div>
          <div className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start">
            <div className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
              <OrderSummary
                title={order.course.title}
                subtitle={courseSubtitle(order.course)}
                listPrice={order.listPrice}
                discount={Math.max(0, order.listPrice - subtotal)}
                discountCode={order.discountCode}
                vat={order.vat}
                vatRate={rate}
                total={order.pricePaid}
                currency={order.currency}
                refundNote={refundNoteFor({ mode: order.course.mode, price: order.listPrice })}
              />
              {expired ? (
                <ButtonLink href={`/checkout/${order.course.slug}`} size="l" fullWidth>
                  اطلب حجزًا جديدًا
                </ButtonLink>
              ) : (
                <ButtonLink href={`/checkout/${order.id}/pay`} size="l" fullWidth disabled={inProgress}>
                  متابعة إلى الدفع
                </ButtonLink>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <CourseDetailsCard course={order.course} />
            </div>
          </div>
        </PageBody>
      </>
    );
  }

  // Course review.
  const course = await getCheckoutCourse(ref);
  if (!course) notFound();
  const active = await getActiveEnrollment(course.id, user.id);
  if (active?.status === "pending_payment") redirect(`/checkout/${active.id}`);
  const code = typeof sp.code === "string" && sp.code.trim() ? sp.code.trim().toUpperCase().slice(0, 32) : null;
  const quote = await getQuote(course.id, code);
  const buyer = await getBuyer(user.id, user.email);
  const isFree = course.price === 0;

  if (active || sp.state === "enrolled") {
    return (
      <>
        <TopBar title="مراجعة التسجيل" subtitle={course.title} />
        <PageBody className="gap-6">
          <Alert tone="info" title="أنت مسجّل في هذه الدورة مسبقًا">
            لا حاجة لتسجيل جديد — يمكنك متابعة الدورة من ملف التدريب.
          </Alert>
          <div className="flex flex-wrap gap-3">
            {active && <ButtonLink href={`/trainee/trainings/${active.id}`}>انتقل إلى الدورة</ButtonLink>}
            <ButtonLink href="/trainee/discover" variant="outline">
              اكتشف دورات أخرى
            </ButtonLink>
          </div>
          <CourseDetailsCard course={course} />
        </PageBody>
      </>
    );
  }

  if (!quote) {
    return (
      <>
        <TopBar title="مراجعة التسجيل" subtitle={course.title} />
        <PageBody>
          <Alert tone="warning" title="التسجيل في هذه الدورة غير متاح حاليًا">
            ربما بدأت الدورة أو أُغلق التسجيل. تصفّح الدورات المفتوحة للتسجيل.
          </Alert>
          <ButtonLink href="/trainee/discover" className="self-start">
            اكتشف دورة
          </ButtonLink>
        </PageBody>
      </>
    );
  }

  const full = course.seatsLeft === 0;
  const checklist = [
    course.requirements.length ? `المتطلبات: ${course.requirements.join("، ")}.` : "لا توجد اشتراطات مسبقة لهذه الدورة.",
    course.capacity !== null && course.seatsLeft !== null
      ? full
        ? "اكتملت المقاعد — يمكنك الانضمام إلى قائمة الانتظار من صفحة الدورة."
        : `المقاعد متاحة — ${toArabicDigits(course.capacity - course.seatsLeft)} من ${toArabicDigits(course.capacity)} محجوزة.`
      : "وصول فوري بعد إتمام التسجيل.",
    ...(course.requiresProviderApproval ? [`يُؤكَّد التسجيل بعد موافقة ${course.organizationName ?? "الجهة التدريبية"}.`] : []),
  ];

  return (
    <>
      <TopBar title={quote.codeStatus === "none" ? "مراجعة التسجيل" : "رمز الخصم"} subtitle={isFree ? "راجع تفاصيل الدورة ثم أكّد تسجيلك" : "طبّق رمزًا إن كان لديك قبل الدفع"} />
      <PageBody className="gap-6">
        <div className="rounded-16 border border-border-default bg-bg-surface px-6 py-[22px]">
          <Stepper steps={STEPS} current={1} itemWidth={180} />
        </div>
        {full ? (
          <>
            <Alert tone="warning" title="اكتملت المقاعد في هذه الدورة">
              يمكنك الانضمام إلى قائمة الانتظار — نرسل لك دعوة عند شغور مقعد.
            </Alert>
            <ButtonLink href={`/courses/${course.slug}`} className="self-start">
              العودة إلى صفحة الدورة
            </ButtonLink>
          </>
        ) : (
          <>
            <form id="discount-form" method="get" action={`/checkout/${course.slug}`} />
            <ProceedForm
              courseId={course.id}
              slug={course.slug}
              code={quote.codeStatus === "applied" ? code : null}
              cta={isFree ? "تأكيد التسجيل المجاني" : quote.total === 0 ? "تأكيد التسجيل" : "متابعة إلى الدفع"}
              agreementLabel={isFree ? "أوافق على شروط التسجيل" : "قرأت سياسة الاسترداد وأوافق على شروط التسجيل"}
              side={
                <OrderSummary
                  title={course.title}
                  subtitle={courseSubtitle(course)}
                  listPrice={quote.listPrice}
                  discount={quote.discount}
                  discountCode={quote.codeStatus === "applied" ? code : null}
                  vat={quote.vat}
                  vatRate={rate}
                  total={quote.total}
                  currency={quote.currency}
                  refundNote={refundNoteFor(course)}
                />
              }
            >
              {!isFree && (
                <section aria-labelledby="discount-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-surface p-6">
                  <h2 id="discount-title" className="type-h3 text-text-primary">
                    رمز الخصم
                  </h2>
                  <p className="type-body text-text-secondary">إن كان لديك رمز خصم من جهة التدريب أو من حملة ترويجية، أدخله هنا قبل المتابعة للدفع.</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex flex-1 flex-col gap-2">
                      <span className="type-small text-text-secondary">رمز الخصم</span>
                      <input
                        form="discount-form"
                        name="code"
                        dir="ltr"
                        defaultValue={code ?? ""}
                        maxLength={32}
                        placeholder="STUDENT20"
                        aria-invalid={quote.codeStatus === "invalid" ? true : undefined}
                        className={`h-12 w-full rounded-12 bg-bg-surface px-4 type-body uppercase text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary ${
                          quote.codeStatus === "invalid" ? "border-2 border-state-error" : "border-[1.5px] border-border-default"
                        }`}
                      />
                    </label>
                    {quote.codeStatus === "applied" ? (
                      <Link href={`/checkout/${course.slug}`} className="flex h-14 items-center justify-center rounded-12 px-8 type-body-lg text-text-primary inner-stroke istroke-w-[1.5px] focus-ring">
                        إزالة الرمز
                      </Link>
                    ) : (
                      <button form="discount-form" type="submit" className="h-14 cursor-pointer rounded-12 px-8 type-body-lg text-text-primary inner-stroke istroke-w-[1.5px] hover:bg-bg-brand-tint focus-ring">
                        تطبيق
                      </button>
                    )}
                  </div>
                  {quote.codeStatus === "applied" && (
                    <p role="status" className="flex items-center gap-2.5 rounded-12 bg-state-success-bg px-3.5 py-3 type-subtitle text-state-success">
                      <Glyph icon={CircleCheck} size={20} />
                      تم تطبيق الخصم — وفّرت {formatPrice(quote.discount, quote.currency)}
                    </p>
                  )}
                  {quote.codeStatus === "invalid" && (
                    <p role="alert" className="type-caption text-state-error">
                      رمز الخصم غير صالح أو منتهي الصلاحية. تحقق من الرمز أو تابع بدون خصم.
                    </p>
                  )}
                </section>
              )}
              <CourseDetailsCard course={course} />
              <section aria-labelledby="buyer-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-surface p-6">
                <div className="flex items-center gap-3">
                  <h2 id="buyer-title" className="flex-1 type-h3 text-text-primary">
                    بياناتك
                  </h2>
                  <Link href="/trainee/profile/edit" className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
                    تعديل
                  </Link>
                </div>
                <dl className="flex flex-col gap-4">
                  {[
                    { icon: User, label: "الاسم", value: buyer.fullName || "—" },
                    { icon: Mail, label: "البريد الإلكتروني", value: buyer.email },
                    { icon: Phone, label: "رقم الهاتف", value: buyer.phone ?? "—" },
                  ].map((r) => (
                    <div key={r.label} className="flex flex-wrap items-center gap-3">
                      <dt className="flex flex-1 items-center gap-2 type-body text-text-secondary">
                        <Glyph icon={r.icon} size={16} />
                        {r.label}
                      </dt>
                      <dd dir={r.icon === User ? undefined : "ltr"} className="min-w-0 break-all type-subtitle text-text-primary">
                        {r.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {buyer.verified ? (
                  <p className="flex items-center gap-2.5 rounded-8 bg-state-success-bg px-3 py-2.5 type-caption text-state-success">
                    <Glyph icon={ShieldCheck} size={16} />
                    هويتك موثَّقة — لن يُطلب منك رفع مستندات إضافية.
                  </p>
                ) : (
                  <p className="flex items-center gap-2.5 rounded-8 bg-state-info-bg px-3 py-2.5 type-caption text-state-info">
                    <Glyph icon={Info} size={16} className="shrink-0" />
                    <span>
                      توثيق الهوية اختياري للتسجيل — <Link href="/trainee/verification" className="underline">وثّق هويتك</Link> لتظهر شهاداتك موثَّقة.
                    </span>
                  </p>
                )}
              </section>
              <section aria-labelledby="before-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-surface p-6">
                <h2 id="before-title" className="type-h3 text-text-primary">
                  قبل المتابعة
                </h2>
                <ul className="flex flex-col gap-3">
                  {checklist.map((c) => (
                    <li key={c} className="flex items-center gap-2.5 type-body text-text-secondary">
                      <Glyph icon={CircleCheck} size={20} className="text-state-success" />
                      {c}
                    </li>
                  ))}
                  {!isFree && (
                    <li className="flex items-center gap-2.5 type-body text-text-secondary">
                      <Glyph icon={Info} size={20} className="text-state-info" />
                      عند المتابعة يُحجز مقعدك {pluralAr(15, ["دقيقة", "دقيقتين", "دقائق", "دقيقة"])} لإتمام الدفع.
                    </li>
                  )}
                </ul>
              </section>
            </ProceedForm>
          </>
        )}
      </PageBody>
    </>
  );
}
