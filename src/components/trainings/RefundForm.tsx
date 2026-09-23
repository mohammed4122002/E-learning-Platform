"use client";

import { useActionState, useState } from "react";
import { Award, BookOpen, CalendarDays, CircleCheck, Clock, FileText, Hourglass, Info, Lock, Route, TrendingDown, Wallet } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { formatDate, formatPercent, formatPrice, toArabicDigits } from "@/lib/format";
import { RECORDED_REFUND_REASONS } from "@/lib/trainings";
import { initialFormState } from "@/lib/validation/trainings";
import { requestRefund } from "@/app/(workspace)/trainee/trainings/actions";
import { ChoiceChips, SectionCard, SummaryRow, numberWord } from "./ui";

export type RefundDraft = {
  enrollmentId: string;
  ref: string;
  mode: "scheduled" | "recorded";
  courseTitle: string;
  courseMeta: string;
  paid: number;
  currency: string;
  percent: number;
  amount: number;
  tier: string;
  referenceAt: string;
  startsAt: string | null;
  daysBefore: number | null;
  windowEndsAt: string | null;
  purchasedAt: string;
  paymentMethod: string;
  lessonsDone: number;
  defaultReason: string;
  backHref: string;
};

const TIER_LABEL: Record<string, string> = {
  full: "٧ أيام أو أكثر قبل البدء → ١٠٠٪",
  half: "من ٣ إلى ٦ أيام → ٥٠٪",
  none: "أقل من ٣ أيام أو بعد البدء → ٠٪",
  course_cancelled: "دورة ألغتها الجهة → ١٠٠٪",
  pending_provider: "قبل تأكيد الجهة للمقعد → ١٠٠٪",
};

function Destination({ method }: { method: string }) {
  return (
    <>
      <div className="flex items-center gap-3 rounded-12 border-[1.5px] border-action-primary bg-bg-brand-tint px-4 py-3.5">
        <span aria-hidden className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-action-primary">
          <span className="size-2.5 rounded-full bg-action-primary" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="type-title text-text-primary">{method} نفسها</span>
          <span className="type-caption text-text-muted">يُعاد المبلغ إلى وسيلة الدفع الأصلية إلزاميًا</span>
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-action-primary text-text-on-brand">
          <Glyph icon={Wallet} size={20} />
        </span>
      </div>
      <p className="flex items-center gap-2.5 rounded-8 bg-state-info-bg px-3 py-2.5 type-caption text-state-info">
        <Glyph icon={Info} size={16} />
        <span className="flex-1">لأسباب أمنية لا يمكن تحويل الاسترداد إلى وسيلة دفع مختلفة عن التي دفعت بها.</span>
      </p>
    </>
  );
}

/** TRN-RFD-01 · طلب استرداد — scheduled course after withdrawal/cancellation (180:8631) and recorded (409:16552). */
export function RefundForm({ draft }: { draft: RefundDraft }) {
  const [state, action, pending] = useActionState(requestRefund, initialFormState);
  const [reason, setReason] = useState(state.values?.reason || draft.defaultReason);
  const [ack, setAck] = useState(draft.mode === "scheduled");
  const money = (n: number) => formatPrice(n, draft.currency);

  if (draft.mode === "scheduled") {
    return (
      <form action={action} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <input type="hidden" name="enrollmentId" value={draft.enrollmentId} />
        <input type="hidden" name="reason" value={reason} />
        <input type="hidden" name="acknowledge" value="on" />
        <div className="flex min-w-0 flex-col gap-6">
          {state.message && (
            <Alert tone="error" title="تعذّر إرسال الطلب">
              {state.message}
            </Alert>
          )}
          <SectionCard title="التسجيل المطلوب استرداده" id="enrollment-title">
            <div className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
                <Glyph icon={BookOpen} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="type-subtitle text-text-primary">{draft.courseTitle}</span>
                <span className="type-caption text-text-muted">{draft.courseMeta}</span>
              </span>
              <span dir="ltr" className="font-mono text-[14px] text-text-muted">
                {draft.ref}
              </span>
            </div>
          </SectionCard>
          <SectionCard title="كيف حُسب المبلغ؟" id="calc-title">
            <dl className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <dt className="flex flex-1 items-center gap-2 type-body text-text-secondary">
                  <Glyph icon={CalendarDays} size={16} />
                  {draft.tier === "course_cancelled" ? "تاريخ الإلغاء" : "تاريخ الانسحاب"}
                </dt>
                <dd className="type-subtitle text-text-primary">{formatDate(draft.referenceAt)}</dd>
              </div>
              {draft.startsAt && (
                <div className="flex items-center gap-2.5">
                  <dt className="flex flex-1 items-center gap-2 type-body text-text-secondary">
                    <Glyph icon={CalendarDays} size={16} />
                    تاريخ بدء الدورة
                  </dt>
                  <dd className="type-subtitle text-text-primary">{formatDate(draft.startsAt)}</dd>
                </div>
              )}
              {draft.daysBefore !== null && (
                <div className="flex items-center gap-2.5">
                  <dt className="flex flex-1 items-center gap-2 type-body text-text-secondary">
                    <Glyph icon={Hourglass} size={16} />
                    الفارق
                  </dt>
                  <dd className="type-subtitle text-text-primary">
                    {draft.daysBefore >= 0 ? `${numberWord(draft.daysBefore, ["أقل من يوم", "يوم واحد", "يومان", "أيام", "يومًا"])} قبل البدء` : "بعد بدء الدورة"}
                  </dd>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <dt className="flex flex-1 items-center gap-2 type-body text-text-secondary">
                  <Glyph icon={Route} size={16} />
                  الشريحة المطبّقة
                </dt>
                <dd className="type-subtitle text-text-primary">{TIER_LABEL[draft.tier] ?? formatPercent(draft.percent)}</dd>
              </div>
            </dl>
            <div className="h-px w-full bg-border-divider" />
            <div className="flex items-center gap-3 rounded-8 bg-bg-page px-4 py-3">
              <span className="flex-1 type-caption text-text-muted">المعادلة</span>
              <span className="type-subtitle text-text-primary">
                {money(draft.paid)} × {formatPercent(draft.percent)} = {money(draft.amount)}
              </span>
            </div>
          </SectionCard>
          <SectionCard title="وجهة الاسترداد" id="destination-title">
            <Destination method={draft.paymentMethod} />
          </SectionCard>
        </div>
        <aside aria-label="ملخّص الطلب" className="flex flex-col gap-5">
          <SectionCard title="ملخّص الطلب" id="summary-title">
            <dl className="flex flex-col gap-4">
              <SummaryRow label="المبلغ المدفوع" value={money(draft.paid)} />
              <SummaryRow label="نسبة الاسترداد" value={formatPercent(draft.percent)} valueClass="text-state-warning" />
            </dl>
            <div className="h-px w-full bg-border-divider" />
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 type-title text-text-secondary">المبلغ المسترد</span>
              <span className="whitespace-nowrap type-h3 text-state-success">{money(draft.amount)}</span>
            </div>
            <p className="flex items-center gap-2 type-caption text-text-muted">
              <Glyph icon={Clock} size={16} />
              <span className="flex-1">المراجعة خلال ٢٤–٤٨ ساعة عمل، ثم التحويل خلال ٣–٧ أيام.</span>
            </p>
          </SectionCard>
          <Button type="submit" size="l" fullWidth loading={pending}>
            أرسل طلب الاسترداد
          </Button>
          <ButtonLink href={draft.backHref} variant="text" fullWidth>
            رجوع
          </ButtonLink>
        </aside>
      </form>
    );
  }

  // Recorded course (409:16552)
  const inWindow = draft.percent > 0;
  const elapsed = Math.max(0, Math.floor((new Date(draft.referenceAt).getTime() - new Date(draft.purchasedAt).getTime()) / 864e5));
  const left = Math.max(0, 14 - elapsed);
  return (
    <form action={action} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <input type="hidden" name="enrollmentId" value={draft.enrollmentId} />
      <div className="flex min-w-0 flex-col gap-6">
        {state.message && (
          <Alert tone="error" title="تعذّر إرسال الطلب">
            {state.message}
          </Alert>
        )}
        <section aria-labelledby="window-title" className={`flex flex-col gap-4 rounded-16 border-[1.5px] p-6 ${inWindow ? "border-state-success bg-state-success-bg" : "border-state-error bg-state-error-bg"}`}>
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 id="window-title" className={`text-[22px] font-bold leading-snug ${inWindow ? "text-state-success" : "text-state-error"}`}>
                {inWindow ? "أنت ضمن مهلة الاسترداد" : "انتهت مهلة الاسترداد"}
              </h2>
              <p className="type-body text-text-secondary">
                اشتريت في {formatDate(draft.purchasedAt)} · مضى {numberWord(elapsed, ["أقل من يوم", "يوم واحد", "يومان", "أيام", "يومًا"])} من ١٤
                {inWindow ? ` — يتبقى ${numberWord(left, ["أقل من يوم", "يوم واحد", "يومان", "أيام", "يومًا"])}. الاسترداد كامل ١٠٠٪.` : " — لم يعد الاسترداد متاحًا لهذه الدورة."}
              </p>
            </div>
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface ${inWindow ? "text-state-success" : "text-state-error"}`}>
              <Glyph icon={CircleCheck} size={20} />
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-surface px-4 py-3">
            <span className="flex-1 type-title text-text-secondary">المبلغ المسترد — {inWindow ? "كامل ما دفعته" : "لا شيء"}</span>
            <span className={`text-[22px] font-bold ${inWindow ? "text-state-success" : "text-text-muted"}`}>{money(draft.amount)}</span>
          </div>
        </section>
        <section aria-labelledby="after-title" className="flex flex-col gap-4 rounded-16 border-[1.5px] border-state-error bg-state-error-bg p-6">
          <div className="flex flex-col gap-1">
            <h2 id="after-title" className="text-[22px] font-bold leading-snug text-state-error">
              ماذا يحدث بعد الاسترداد؟
            </h2>
            <p className="type-caption text-text-secondary">اقرأ هذه النقاط قبل التأكيد — الاسترداد لا يُلغى بعد قبوله.</p>
          </div>
          <ul className="flex flex-col gap-3">
            {[
              { icon: Lock, title: "ينتهي وصولك للمحتوى فورًا", text: "لن تتمكن من مشاهدة الدروس ولا تنزيل الملفات بعد قبول الطلب." },
              { icon: Award, title: "لا تصدر لك شهادة", text: "لم تكمل الدورة — ولو أكملتها وصدرت شهادتك لسُحبت وعُلّم رابط التحقق «مسحوبة»." },
              {
                icon: TrendingDown,
                title: "يفقد تقدّمك حفظه",
                text: draft.lessonsDone ? `${numberWord(draft.lessonsDone, ["", "درس واحد أكملته", "درسان أكملتهما", "دروس أكملتها", "درسًا أكملته"])} لن تُستعاد إن اشتريت الدورة مجددًا.` : "لن يُستعاد أي تقدّم إن اشتريت الدورة مجددًا.",
              },
              { icon: FileText, title: "إيصالاتك محفوظة", text: "إيصال الشراء وإيصال الاسترداد يبقيان في سجلّك المالي." },
            ].map((i) => (
              <li key={i.title} className="flex items-start gap-3 rounded-12 bg-bg-surface px-4 py-3.5">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="type-title text-text-primary">{i.title}</span>
                  <span className="type-body text-text-secondary">{i.text}</span>
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-state-error-bg text-state-error">
                  <Glyph icon={i.icon} size={20} />
                </span>
              </li>
            ))}
          </ul>
        </section>
        <SectionCard title="سبب طلبك" id="reason-title">
          <p className="type-caption text-text-muted">يساعدنا على تحسين المنصة — ولا يؤثّر على قبول طلبك.</p>
          <ChoiceChips name="reason" label="سبب طلب الاسترداد" options={RECORDED_REFUND_REASONS} value={reason} onChange={setReason} />
          {state.fieldErrors?.reason && (
            <p role="alert" className="type-caption text-state-error">
              {state.fieldErrors.reason}
            </p>
          )}
          <Textarea name="details" label="تفاصيل إضافية (اختياري)" placeholder="ما الذي كنت تتوقعه ولم تجده؟" rows={3} defaultValue={state.values?.details} error={state.fieldErrors?.details} maxLength={2000} />
        </SectionCard>
      </div>
      <aside aria-label="تأكيد الطلب" className="flex flex-col gap-5">
        <SectionCard title="وجهة الاسترداد" id="destination-title">
          <Destination method={draft.paymentMethod} />
        </SectionCard>
        <SectionCard title="المدة المتوقعة" id="eta-title">
          <ul className="flex flex-col gap-3">
            {[
              { icon: FileText, title: "تقديم الطلب", text: "الآن" },
              { icon: Hourglass, title: "مراجعة مالية", text: "خلال يوم عمل" },
              { icon: Hourglass, title: "وصول المبلغ", text: "٥ إلى ١٠ أيام حسب البنك" },
            ].map((s) => (
              <li key={s.title} className="flex items-center gap-2.5 rounded-12 bg-bg-page px-3.5 py-3">
                <Glyph icon={s.icon} size={16} className="text-text-secondary" />
                <span className="flex-1 type-subtitle text-text-primary">{s.title}</span>
                <span className="type-caption text-text-muted">{s.text}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="تأكيد الطلب" id="confirm-title">
          <div className="flex flex-col gap-1">
            <Checkbox name="acknowledge" checked={ack} onChange={(e) => setAck(e.target.checked)} disabled={!inWindow}>
              أفهم أن وصولي للمحتوى ينتهي فور قبول الطلب
            </Checkbox>
            {state.fieldErrors?.acknowledge && (
              <p role="alert" className="type-caption text-state-error">
                {state.fieldErrors.acknowledge}
              </p>
            )}
          </div>
          <Button type="submit" size="l" fullWidth loading={pending} disabled={!ack || !inWindow}>
            أرسل طلب الاسترداد
          </Button>
          <ButtonLink href={draft.backHref} variant="text" fullWidth>
            تراجع — أكمل الدورة
          </ButtonLink>
          {!inWindow && <p className="type-caption text-text-muted">مضت أكثر من {toArabicDigits(14)} يومًا على الشراء. إن واجهت مشكلة في الدفع يمكنك فتح نزاع مالي.</p>}
        </SectionCard>
      </aside>
    </form>
  );
}
