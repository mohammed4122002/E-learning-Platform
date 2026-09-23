import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Ban, BellRing, CircleCheck, CircleHelp, CircleX, Clock, FileText, Hourglass, MessagesSquare, Route, User } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Chip, PathStep, SectionCard, StatusItemCard, SummaryRow } from "@/components/trainings/ui";
import { DismissButton } from "@/components/trainings/DismissButton";
import { ConfirmAction } from "@/components/trainings/ConfirmAction";
import { PrintButton } from "@/components/trainings/PrintButton";
import { requireTrainee } from "@/lib/auth";
import { getRefund, type RefundDetail } from "@/lib/data/money";
import { formatDate, formatDayMonth, formatPrice, formatRelative, formatTime } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, REFUND_REASON_LABEL } from "@/lib/trainings";
import { cancelRefundRequest } from "../actions";

export const metadata: Metadata = { title: "متابعة طلب الاسترداد", description: "حالة طلب الاسترداد والخطوة التالية" };

const DAY = 864e5;
const at = (iso: string) => `${formatDayMonth(iso)} · ${formatTime(iso)}`;

function FaqItem({ q, a, icon = CircleHelp }: { q: string; a: string; icon?: typeof CircleHelp }) {
  return (
    <li className="flex items-start gap-3 rounded-12 bg-bg-page px-3.5 py-3">
      <Glyph icon={icon} size={16} className="mt-1 text-text-brand" />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="type-subtitle text-text-primary">{q}</span>
        <span className="type-caption text-text-muted">{a}</span>
      </span>
    </li>
  );
}

function TopCard({ r }: { r: RefundDetail }) {
  const money = formatPrice(r.amount, r.currency);
  if (r.cancelled) {
    return (
      <StatusItemCard
        tone="neutral"
        icon={Ban}
        title="ألغيت طلب الاسترداد"
        badge={<Chip tone="neutral">{`${r.courseTitle} · ${money}`}</Chip>}
        description="أُغلق الطلب بطلبك قبل المراجعة المالية."
        facts={[{ icon: Clock, label: "أُلغي:", value: r.decidedAt ? formatRelative(r.decidedAt) : "—" }]}
        refCode={r.ref}
        actions={<ButtonLink href={`/trainee/trainings/${r.enrollmentId}`} variant="outline">تفاصيل التسجيل</ButtonLink>}
      />
    );
  }
  if (r.status === "under_review") {
    return (
      <StatusItemCard
        tone="warning"
        icon={Hourglass}
        title="طلب استردادك قيد المراجعة"
        badge={<Chip tone="warning" icon={Hourglass}>{`${r.courseTitle} · ${money}`}</Chip>}
        description="الخطوة ٢ من ٤ · المراجعة المالية"
        facts={[
          { icon: Route, label: "المسؤول:", value: "إدارة المنصة" },
          { icon: Clock, label: "التحديث المتوقع:", value: r.requiresAdmin ? "خلال ٣ أيام عمل (مراجعة إدارية)" : "خلال ٢٤–٤٨ ساعة عمل" },
          { icon: User, label: "قُدّم:", value: formatRelative(r.createdAt) },
        ]}
        refCode={r.ref}
        footerChip={<Chip tone="warning" icon={Clock}>{`قُدّم ${formatRelative(r.createdAt)}`}</Chip>}
        actions={
          <>
            <ButtonLink href="/trainee/queue" variant="outline" className="min-w-[120px]">
              تتبّع الطلب
            </ButtonLink>
            <DismissButton itemKey={`refund:${r.id}`} mode="snooze" />
          </>
        }
      />
    );
  }
  if (r.status === "approved") {
    return (
      <StatusItemCard
        tone="success"
        icon={CircleCheck}
        title="تمت الموافقة على استردادك"
        badge={<Chip tone="success" icon={CircleCheck}>{`${r.courseTitle} · ${money}`}</Chip>}
        description="الخطوة ٣ من ٤ · اعتُمد الصرف"
        facts={[
          { icon: Route, label: "المسؤول:", value: "—" },
          { icon: Clock, label: "التحديث المتوقع:", value: "يصل خلال ٣–٧ أيام عمل" },
          { icon: User, label: "اعتُمد:", value: r.decidedAt ? formatRelative(r.decidedAt) : "—" },
        ]}
        refCode={r.ref}
        footerChip={<Chip tone="success" icon={CircleCheck}>{`تم التحديث ${formatRelative(r.decidedAt ?? r.createdAt)}`}</Chip>}
        actions={
          <>
            <ButtonLink href="#refund-details" variant="secondary" className="min-w-[120px]">
              اعرض التفاصيل
            </ButtonLink>
            <DismissButton itemKey={`refund:${r.id}`} mode="hide" />
          </>
        }
      />
    );
  }
  return (
    <StatusItemCard
      tone="error"
      icon={CircleX}
      title="رُفض طلب الاسترداد"
      badge={<Chip tone="error" icon={CircleX}>{`سبب الرفض: ${r.decisionNote ?? "لم يستوفِ الطلب شروط السياسة"}`}</Chip>}
      description="الخطوة ٣ من ٣ · قرار"
      facts={[
        { icon: Route, label: "المسؤول:", value: "أنت — يمكنك التظلّم", valueClass: "text-state-error" },
        { icon: Clock, label: "التحديث المتوقع:", value: "مهلة فتح النزاع ٧ أيام" },
        { icon: User, label: "رُفض:", value: r.decidedAt ? formatRelative(r.decidedAt) : "—" },
      ]}
      refCode={r.ref}
      footerChip={<Chip tone="error" icon={CircleX}>{`رُفض ${formatRelative(r.decidedAt ?? r.createdAt)}`}</Chip>}
      actions={
        <>
          {r.paymentId && !r.disputeId ? (
            <ButtonLink href={`/trainee/disputes/new?payment=${r.paymentId}`} className="min-w-[120px]">
              قدّم تظلّمًا
            </ButtonLink>
          ) : r.disputeId ? (
            <ButtonLink href={`/trainee/disputes/${r.disputeId}`} variant="outline" className="min-w-[120px]">
              تتبّع النزاع
            </ButtonLink>
          ) : null}
          <DismissButton itemKey={`refund:${r.id}`} mode="snooze" />
        </>
      }
    />
  );
}

/** TRN-RFD-02 · متابعة طلب الاسترداد — قيد المراجعة (180:8846) · معتمدة (181:8951) · مرفوضة (181:9196). */
export default async function RefundStatusPage(props: PageProps<"/trainee/refunds/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await requireTrainee(`/trainee/refunds/${id}`);
  const r = await getRefund(user.id, id);
  if (!r) notFound();

  const money = formatPrice(r.amount, r.currency);
  const method = r.paymentMethod ? (PAYMENT_METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod) : "وسيلة الدفع الأصلية";
  const arrivalFrom = r.decidedAt ? new Date(new Date(r.decidedAt).getTime() + 3 * DAY) : null;
  const arrivalTo = r.decidedAt ? new Date(new Date(r.decidedAt).getTime() + 7 * DAY) : null;
  const disputeDeadline = r.decidedAt ? new Date(new Date(r.decidedAt).getTime() + 7 * DAY) : null;
  const statusLabel = r.cancelled ? "ملغى بطلبك" : r.status === "under_review" ? "قيد المراجعة" : r.status === "approved" ? "اعتُمد الصرف" : "مرفوض";
  const statusClass = r.cancelled ? "text-text-muted" : r.status === "under_review" ? "text-state-warning" : r.status === "approved" ? "text-state-success" : "text-state-error";
  const subtitle = r.cancelled ? "ملغى" : r.status === "under_review" ? "قيد المراجعة" : r.status === "approved" ? "تمت الموافقة" : "رُفض الطلب";

  return (
    <>
      <TopBar title="متابعة طلب الاسترداد" subtitle={subtitle} />
      <PageBody className="gap-6">
        {sp.submitted === "1" && (
          <Alert tone="success" title="أُرسل طلب الاسترداد">
            وصل طلبك إلى المراجعة المالية. ستجده أيضًا في «بانتظار إجرائي» مع الخطوة الحالية والمسؤول عنها.
          </Alert>
        )}
        <TopCard r={r} />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            {r.status === "rejected" && !r.cancelled && (
              <SectionCard title="لماذا رُفض الطلب؟" id="why-title">
                <div className="flex items-start gap-3 rounded-12 bg-state-error-bg px-4 py-3.5">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="type-subtitle text-state-error">السبب المصنّف: {REFUND_REASON_LABEL[r.reason] ?? "سياسة الاسترداد"}</span>
                    <span className="type-body text-text-secondary">{r.decisionNote ?? "لم يستوفِ الطلب شروط سياسة الاسترداد المطبّقة على هذا البرنامج."}</span>
                  </span>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-error">
                    <Glyph icon={CircleX} size={20} />
                  </span>
                </div>
                <p className="flex items-center gap-2 rounded-12 bg-bg-page px-4 py-3 type-caption text-text-brand">
                  <Glyph icon={FileText} size={16} />
                  شرائح الاسترداد: ١٠٠٪ قبل ٧ أيام من البدء · ٥٠٪ من ٣ إلى ٦ أيام · لا استرداد بعد ذلك.
                </p>
              </SectionCard>
            )}
            <SectionCard title="مسار طلبك" id="path-title">
              <ol className="flex flex-col gap-4">
                <PathStep icon={CircleCheck} state="done" title="قُدّم الطلب" caption={at(r.createdAt)} />
                {r.cancelled ? (
                  <PathStep icon={Ban} state="failed" title="أُلغي الطلب بطلبك" caption={r.decidedAt ? at(r.decidedAt) : "—"} />
                ) : r.status === "under_review" ? (
                  <>
                    <PathStep icon={Hourglass} state="current" title="المراجعة المالية" caption="إدارة المنصة · متوقع خلال ٢٤–٤٨ ساعة عمل" />
                    <PathStep icon={Hourglass} state="todo" title="اعتماد الصرف" caption="بعد الموافقة يُدرج المبلغ في دفعة التحويل" />
                    <PathStep icon={CircleCheck} state="todo" title="وصول المبلغ" caption="٣–٧ أيام عمل حسب البنك المُصدر للبطاقة" />
                  </>
                ) : r.status === "approved" ? (
                  <>
                    <PathStep icon={CircleCheck} state="done" title="المراجعة المالية" caption={`${r.decidedAt ? at(r.decidedAt) : ""} — روجع واعتُمد`} />
                    <PathStep icon={Hourglass} state="current-success" title="اعتُمد الصرف" caption="أُدرج في دفعة التحويل" />
                    <PathStep
                      icon={Clock}
                      state="todo"
                      title="وصول المبلغ لبطاقتك"
                      caption={arrivalFrom && arrivalTo ? `متوقع بين ${formatDayMonth(arrivalFrom)} و${formatDayMonth(arrivalTo)} حسب البنك المُصدر` : "٣–٧ أيام عمل"}
                    />
                  </>
                ) : (
                  <>
                    <PathStep icon={CircleCheck} state="done" title="المراجعة المالية" caption="روجع الطلب" />
                    <PathStep icon={CircleX} state="failed" title="رُفض الطلب" caption={r.decidedAt ? at(r.decidedAt) : "—"} />
                  </>
                )}
              </ol>
            </SectionCard>
            {r.status === "under_review" && !r.cancelled && (
              <SectionCard title="أسئلة شائعة أثناء الانتظار" id="faq-title">
                <ul className="flex flex-col gap-3">
                  <FaqItem q="هل يمكنني إلغاء الطلب؟" a="نعم، ما دام قيد المراجعة. بعد الاعتماد لا يمكن التراجع." />
                  <FaqItem q="هل تغيّر المبلغ؟" a="لا. المبلغ مثبّت لحظة تقديم الطلب ولا يتأثر بمرور الوقت." />
                  <FaqItem q="ماذا لو رُفض الطلب؟" a="ستصلك رسالة بالسبب المصنّف، ويمكنك فتح نزاع مالي خلال ٧ أيام." />
                  <FaqItem q="هل يمكنني التسجيل في دورة أخرى الآن؟" a="نعم، لا علاقة لطلب الاسترداد بتسجيلاتك الأخرى." />
                </ul>
              </SectionCard>
            )}
            {r.status === "approved" && (
              <SectionCard title="ماذا يحدث الآن؟" id="next-title">
                <ul className="flex flex-col gap-3">
                  <FaqItem icon={Hourglass} q="المبلغ في طريقه إليك" a={`لا إجراء مطلوب منك. سيصل ${money} إلى ${method}.`} />
                  <FaqItem icon={Clock} q="لماذا ٣ إلى ٧ أيام؟" a="المدة يحددها البنك المُصدر لبطاقتك لا المنصة. أغلب البنوك المحلية تُنجزها خلال ٣ أيام." />
                  <FaqItem icon={BellRing} q="ستُشعرك عند الوصول" a="يصلك إشعار فور تأكيد البنك استلام المبلغ." />
                  <FaqItem icon={CircleHelp} q="لم يصل بعد ٧ أيام؟" a="افتح نزاعًا ماليًا من هذه الصفحة وسنتابعه مع مزوّد الدفع نيابة عنك." />
                </ul>
              </SectionCard>
            )}
            {r.status === "rejected" && !r.cancelled && (
              <SectionCard title="خياراتك الآن" id="options-title">
                <ul className="grid gap-4 md:grid-cols-3">
                  <li className="flex flex-col items-center gap-2 rounded-12 bg-state-warning-bg px-4 py-[18px] text-center">
                    <span className="flex size-11 items-center justify-center rounded-8 bg-bg-surface text-state-warning">
                      <Glyph icon={Hourglass} size={20} />
                    </span>
                    <span className="type-subtitle text-text-primary">افتح نزاعًا ماليًا</span>
                    <span className="type-caption text-text-muted">إن كنت ترى أن القرار غير صحيح — يراجعه مسؤول نزاعات مختلف عن المراجع الأول. المهلة ٧ أيام.</span>
                    {r.paymentId && !r.disputeId && (
                      <ButtonLink href={`/trainee/disputes/new?payment=${r.paymentId}`} fullWidth>
                        افتح نزاعًا
                      </ButtonLink>
                    )}
                  </li>
                  <li className="flex flex-col items-center gap-2 rounded-12 bg-state-info-bg px-4 py-[18px] text-center">
                    <span className="flex size-11 items-center justify-center rounded-8 bg-bg-surface text-state-info">
                      <Glyph icon={MessagesSquare} size={20} />
                    </span>
                    <span className="type-subtitle text-text-primary">تواصل مع الجهة</span>
                    <span className="type-caption text-text-muted">قد توافق الجهة التدريبية على تسوية ودّية مثل نقلك لدورة أخرى.</span>
                    <ButtonLink href="/messages" variant="outline" fullWidth>
                      راسل الجهة
                    </ButtonLink>
                  </li>
                  <li className="flex flex-col items-center gap-2 rounded-12 bg-bg-page px-4 py-[18px] text-center">
                    <span className="flex size-11 items-center justify-center rounded-8 bg-bg-surface text-text-muted">
                      <Glyph icon={CircleCheck} size={20} />
                    </span>
                    <span className="type-subtitle text-text-primary">اقبل القرار</span>
                    <span className="type-caption text-text-muted">يُغلق الطلب نهائيًا ويختفي من «بانتظار إجرائي».</span>
                    <DismissButton itemKey={`refund:${r.id}`} mode="hide" />
                  </li>
                </ul>
              </SectionCard>
            )}
          </div>

          <aside aria-label="تفاصيل الطلب" className="flex flex-col gap-5">
            <SectionCard title="تفاصيل الطلب" id="refund-details">
              <dl className="flex flex-col gap-4">
                <SummaryRow label="رقم الطلب" value={<span dir="ltr" className="font-mono text-[14px]">{r.ref}</span>} />
                <SummaryRow label="الحالة" value={statusLabel} valueClass={statusClass} />
                <div className="flex items-center gap-3">
                  <dt className="min-w-0 flex-1 type-title text-text-secondary">المبلغ</dt>
                  <dd className="whitespace-nowrap type-h3 text-state-success">{money}</dd>
                </div>
                <SummaryRow label="الوجهة" value={method} />
                {r.status === "approved" && arrivalFrom && arrivalTo && (
                  <SummaryRow label="الوصول المتوقع" value={`${formatDayMonth(arrivalFrom)} – ${formatDayMonth(arrivalTo)}`} valueClass="text-state-info" />
                )}
                {r.status === "rejected" && !r.cancelled && r.decidedAt && (
                  <>
                    <SummaryRow label="تاريخ القرار" value={formatDate(r.decidedAt)} />
                    {disputeDeadline && <SummaryRow label="مهلة فتح النزاع" value={`٧ أيام · تنتهي ${formatDayMonth(disputeDeadline)}`} valueClass="text-state-warning" />}
                  </>
                )}
              </dl>
            </SectionCard>
            {r.status === "under_review" && !r.cancelled && (
              <ConfirmAction
                label="إلغاء طلب الاسترداد"
                variant="outline"
                size="l"
                fullWidth
                title="إلغاء طلب الاسترداد؟"
                body="سيُغلق الطلب ولن يُحوَّل أي مبلغ. يمكنك تقديم طلب جديد لاحقًا إن بقيت مستحقًا وفق الشرائح."
                confirmLabel="نعم، ألغِ الطلب"
                destructive
                action={cancelRefundRequest.bind(null, r.id)}
              />
            )}
            {r.status === "approved" && (
              <>
                <PrintButton>نزّل إشعار الاسترداد</PrintButton>
                <ButtonLink href="/trainee/discover" variant="outline" size="l" fullWidth>
                  استكشف دورة بديلة
                </ButtonLink>
              </>
            )}
            {r.status === "rejected" && !r.cancelled && r.paymentId && !r.disputeId && (
              <ButtonLink href={`/trainee/disputes/new?payment=${r.paymentId}`} size="l" fullWidth>
                افتح نزاعًا ماليًا
              </ButtonLink>
            )}
            {r.status !== "approved" && (
              <ButtonLink href="/trainee/help" variant="text" fullWidth>
                تواصل مع الدعم
              </ButtonLink>
            )}
          </aside>
        </div>
        {r.status === "approved" && (
          <div className="flex justify-end">
            <ButtonLink href="/trainee/trainings" variant="secondary">
              العودة إلى دوراتي
            </ButtonLink>
          </div>
        )}
      </PageBody>
    </>
  );
}
