"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { Award, CircleCheck, CircleX, Hourglass, Info, MapPin, RefreshCw, Timer } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { formatDayMonth, formatPercent, formatPrice } from "@/lib/format";
import { WITHDRAW_REASONS } from "@/lib/trainings";
import { initialFormState } from "@/lib/validation/trainings";
import { withdrawEnrollment } from "@/app/(workspace)/trainee/trainings/actions";
import { ChoiceChips, SectionCard, SummaryRow } from "./ui";

export type WithdrawData = {
  enrollmentId: string;
  courseTitle: string;
  courseSlug: string;
  startsAt: string | null;
  pendingProvider: boolean;
  paid: number;
  currency: string;
  percent: number;
  amount: number;
  tier: string;
  backHref: string;
};

function TierRow({ title, text, icon, current }: { title: string; text: string; icon: typeof CircleCheck; current: boolean }) {
  return (
    <li
      aria-current={current ? "true" : undefined}
      className={`flex flex-wrap items-center gap-3 rounded-12 px-4 py-3.5 ${current ? "border-2 border-state-warning bg-state-warning-bg" : "bg-bg-page"}`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <Glyph icon={icon} size={20} className={current ? "text-state-warning" : "text-text-muted"} />
        <span className={`flex-1 type-body ${current ? "text-text-primary" : "text-text-secondary"}`}>{text}</span>
      </span>
      <span className={`whitespace-nowrap type-title ${current ? "text-state-warning" : "text-text-primary"}`}>{title}</span>
      {current && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-warning">
          <Glyph icon={MapPin} size={16} />
          أنت هنا اليوم
        </span>
      )}
    </li>
  );
}

function Consequence({ icon, title, text }: { icon: typeof CircleCheck; title: string; text: ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="type-subtitle text-text-primary">{title}</span>
        <span className="type-caption text-text-muted">{text}</span>
      </span>
    </li>
  );
}

/** TRN-MYE-03 · الانسحاب من دورة — default (179:8354) and the final confirmation (179:8586). */
export function WithdrawForm({ data }: { data: WithdrawData }) {
  const [state, action, pending] = useActionState(withdrawEnrollment, initialFormState);
  const [reason, setReason] = useState(state.values?.reason || "schedule");
  const [ack, setAck] = useState(false);
  const [ackError, setAckError] = useState<string | undefined>();
  const [confirm, setConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const hasPayment = data.paid > 0;
  const refunds = hasPayment && data.percent > 0;
  const tierText = data.percent === 100 ? "الاسترداد كامل" : data.percent > 0 ? `الاسترداد ${formatPercent(data.percent)} فقط` : "لا استرداد لهذا الانسحاب";
  const ackLabel = hasPayment ? `أفهم أن الانسحاب نهائي وأن ${tierText}` : "أفهم أن الانسحاب نهائي ولا يمكن التراجع عنه";
  const start = data.startsAt ? formatDayMonth(data.startsAt) : null;

  return (
    <form ref={formRef} action={action} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <input type="hidden" name="enrollmentId" value={data.enrollmentId} />
      <div className="flex min-w-0 flex-col gap-6">
        {state.message && (
          <Alert tone="error" title="تعذّر إتمام الانسحاب">
            {state.message}
          </Alert>
        )}
        {hasPayment && (
          <SectionCard title="شرائح الاسترداد — أين تقع اليوم؟" id="tiers-title">
            <p className="type-caption text-text-muted">
              {data.pendingProvider
                ? "لم تؤكّد الجهة مقعدك بعد، لذا يُسترد المبلغ كاملًا مهما كان التاريخ."
                : `تُحسب الشريحة آليًا من تاريخ اليوم مقارنة بتاريخ بدء الدورة${start ? ` (${start})` : ""}. لا تدخّل يدوي.`}
            </p>
            <ul className="flex flex-col gap-3">
              <TierRow title="استرداد كامل ١٠٠٪" text={data.pendingProvider ? "قبل تأكيد الجهة للمقعد" : "قبل ٧ أيام أو أكثر من البدء"} icon={CircleCheck} current={data.percent === 100} />
              {!data.pendingProvider && (
                <>
                  <TierRow title="استرداد ٥٠٪" text="من ٣ إلى ٦ أيام قبل البدء" icon={Timer} current={data.percent === 50} />
                  <TierRow title="لا استرداد" text="أقل من ٣ أيام أو بعد البدء" icon={CircleX} current={data.percent === 0} />
                </>
              )}
            </ul>
          </SectionCard>
        )}
        <SectionCard title="ماذا يحدث عند الانسحاب؟" id="effects-title">
          <ul className="flex flex-col gap-3">
            <Consequence icon={CircleX} title="يُلغى تسجيلك فورًا" text="يتحرر مقعدك ويُعرض على أول متدرب في قائمة الانتظار." />
            {refunds && <Consequence icon={Hourglass} title="يُفتح طلب استرداد تلقائيًا" text="لا تحتاج تقديم طلب منفصل — يُنشأ ويظهر في «بانتظار إجرائي»." />}
            <Consequence icon={Award} title="لا شهادة لهذه الدورة" text="تُلغى أهليتك للشهادة حتى لو حضرت جلسات سابقة." />
            <Consequence icon={RefreshCw} title="يمكنك التسجيل مجددًا" text="في دورة أخرى من البرنامج نفسه إن توفّرت مقاعد." />
          </ul>
        </SectionCard>
        <SectionCard title="سبب الانسحاب (اختياري)" id="reason-title">
          <ChoiceChips name="reason" label="سبب الانسحاب" options={WITHDRAW_REASONS} value={reason} onChange={setReason} />
          <Textarea name="details" label="تفاصيل إضافية" placeholder="اكتب أي ملاحظة تساعد الجهة على التحسين…" rows={3} defaultValue={state.values?.details} error={state.fieldErrors?.details} maxLength={2000} />
        </SectionCard>
      </div>

      <aside aria-label="ملخّص الانسحاب" className="flex flex-col gap-5">
        <SectionCard title="ملخّص الاسترداد" id="summary-title">
          {hasPayment ? (
            <>
              <dl className="flex flex-col gap-4">
                <SummaryRow label="المبلغ المدفوع" value={formatPrice(data.paid, data.currency)} />
                <SummaryRow label="شريحتك اليوم" value={formatPercent(data.percent)} valueClass="text-state-warning" />
                <SummaryRow label="رسوم المعالجة" value={formatPrice(0, data.currency)} valueClass="text-text-muted" />
              </dl>
              <div className="h-px w-full bg-border-divider" />
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 type-title text-text-secondary">المبلغ المسترد</span>
                <span className="whitespace-nowrap type-h3 text-state-success">{formatPrice(data.amount, data.currency)}</span>
              </div>
              <p className="flex items-center gap-2.5 rounded-8 bg-state-info-bg px-3 py-2.5 type-caption text-state-info">
                <Glyph icon={Info} size={16} />
                <span className="flex-1">يُحوَّل المبلغ إلى وسيلة الدفع نفسها خلال ٣ إلى ٧ أيام عمل.</span>
              </p>
            </>
          ) : (
            <p className="type-body text-text-secondary">الدورة مجانية — لا يوجد مبلغ للاسترداد. يُلغى تسجيلك فقط.</p>
          )}
        </SectionCard>
        <SectionCard title="هل تريد التأجيل بدل الانسحاب؟" id="postpone-title">
          <p className="type-body text-text-secondary">يمكنك التسجيل في دورة أخرى من البرنامج نفسه دون أي خصم — إن توفّرت مقاعد.</p>
          <ButtonLink href={`/courses/${data.courseSlug}`} variant="secondary" fullWidth>
            اعرض الدورات البديلة
          </ButtonLink>
        </SectionCard>
        <div className="flex flex-col gap-1">
          <Checkbox
            name="acknowledge"
            checked={ack}
            onChange={(e) => {
              setAck(e.target.checked);
              if (e.target.checked) setAckError(undefined);
            }}
            aria-invalid={ackError || state.fieldErrors?.acknowledge ? true : undefined}
          >
            {ackLabel}
          </Checkbox>
          {(ackError || state.fieldErrors?.acknowledge) && (
            <p role="alert" className="type-caption text-state-error">
              {ackError ?? state.fieldErrors?.acknowledge}
            </p>
          )}
        </div>
        <Button
          variant="danger"
          size="l"
          fullWidth
          loading={pending}
          onClick={() => {
            if (!ack) {
              setAckError("أكّد أنك تفهم أثر الانسحاب قبل المتابعة");
              return;
            }
            setConfirm(true);
          }}
        >
          {refunds ? "أكّد الانسحاب واطلب الاسترداد" : "أكّد الانسحاب"}
        </Button>
        <ButtonLink href={data.backHref} variant="text" size="l" fullWidth>
          تراجع — أبقِ تسجيلي
        </ButtonLink>
      </aside>

      <Modal
        open={confirm}
        onClose={() => !pending && setConfirm(false)}
        title="الانسحاب من الدورة نهائيًا؟"
        size="m"
        destructive
        footer={
          <>
            <Button
              size="s"
              variant="danger"
              loading={pending}
              onClick={() => {
                setConfirm(false);
                formRef.current?.requestSubmit();
              }}
            >
              نعم، أكّد الانسحاب
            </Button>
            <Button size="s" variant="outline" disabled={pending} onClick={() => setConfirm(false)}>
              تراجع
            </Button>
          </>
        }
      >
        <p>سيُلغى تسجيلك في «{data.courseTitle}» فورًا ويتحرر مقعدك لأول متدرب في قائمة الانتظار.</p>
        {refunds && (
          <p>
            سيُفتح طلب استرداد بقيمة {formatPrice(data.amount, data.currency)} ({formatPercent(data.percent)}) ويُحوَّل خلال ٣ إلى ٧ أيام عمل.
          </p>
        )}
        <p>لا يمكن التراجع.</p>
      </Modal>
    </form>
  );
}
