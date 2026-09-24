"use client";

import { useActionState, useState, type ReactNode } from "react";
import { cancelAffiliationEnd, endAffiliation } from "@/app/(trainer)/trainer/affiliations/actions";
import { Columns } from "@/components/trainer-affiliations/parts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChipRadio } from "@/components/ui/Chip";
import { Checkbox } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { END_REASONS, type EndReason } from "@/lib/trainer-affiliations";
import { initialFormState } from "@/lib/validation/auth";

/**
 * TRR-AFL-03 · إنهاء ارتباط (293:9013) — reason chips + message (main column) and the confirmation card (aside)
 * belong to one form (`form="end-form"`), so the «قبل الإنهاء — جرّب هذا» actions can stay separate forms.
 * While the notice period runs (status ending), the aside offers «تراجع — أبقِ الارتباط».
 */
export function EndAffiliationFlow({
  affiliationId,
  noticeText,
  ending,
  endingNote,
  mainTop,
  tryCard,
}: {
  affiliationId: string;
  noticeText: string;
  ending: boolean;
  endingNote: string | null;
  mainTop: ReactNode;
  tryCard: ReactNode;
}) {
  const [state, action, pending] = useActionState(endAffiliation, initialFormState);
  const [keepState, keepAction, keeping] = useActionState(cancelAffiliationEnd, initialFormState);
  const [ack, setAck] = useState(false);
  const fe = state.fieldErrors ?? {};
  const reason = state.values?.reason as EndReason | undefined;

  const confirmCard = (
    <section aria-labelledby="confirm-title" className="flex w-full flex-col items-stretch gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <h2 id="confirm-title" className="type-h2 text-text-primary">
        تأكيد الإنهاء
      </h2>
      {ending ? (
        <form action={keepAction} className="flex flex-col gap-[18px]">
          <input type="hidden" name="affiliationId" value={affiliationId} />
          {endingNote && <p className="type-body text-text-primary">{endingNote}</p>}
          {keepState.status === "error" && keepState.message && (
            <Alert tone="error" title="تعذّر التراجع">
              {keepState.message}
            </Alert>
          )}
          <Button type="submit" variant="ghost" size="l" fullWidth loading={keeping}>
            تراجع — أبقِ الارتباط
          </Button>
          <p className="type-caption text-state-success">يمكنك التراجع خلال الثلاثين يومًا قبل سريان الإنهاء.</p>
        </form>
      ) : (
        <form id="end-form" action={action} noValidate className="flex flex-col gap-[18px]">
          <input type="hidden" name="affiliationId" value={affiliationId} />
          {state.status === "error" && state.message && (
            <Alert tone="error" title="تعذّر إنهاء الارتباط">
              {state.message}
            </Alert>
          )}
          <div className="flex flex-col gap-1">
            <Checkbox name="ack" checked={ack} onChange={(e) => setAck(e.target.checked)} aria-invalid={Boolean(fe.ack)}>
              {noticeText}
            </Checkbox>
            {fe.ack && (
              <p role="alert" className="type-caption text-state-error">
                {fe.ack}
              </p>
            )}
          </div>
          <Button type="submit" size="l" fullWidth disabled={!ack} loading={pending}>
            أنهِ الارتباط
          </Button>
          <ButtonLink href="/trainer/affiliations" variant="ghost" size="l" fullWidth>
            تراجع — أبقِ الارتباط
          </ButtonLink>
          <p className="type-caption text-state-success">يمكنك التراجع خلال الثلاثين يومًا قبل سريان الإنهاء.</p>
        </form>
      )}
    </section>
  );

  return (
    <Columns
      asideWidth={400}
      main={
        <>
          {mainTop}
          {!ending && (
            <section aria-labelledby="reason-title" className="flex w-full flex-col items-start gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
              <h2 id="reason-title" className="type-h2 text-text-primary">
                سبب الإنهاء
              </h2>
              <p className="type-body text-text-muted">يصل السبب للمعهد. اختيارك يساعد المنصة على تحسين جودة الجهات.</p>
              <fieldset className="flex w-full flex-col gap-1">
                <legend className="sr-only">سبب الإنهاء</legend>
                <div className="flex flex-wrap gap-3">
                  {(Object.keys(END_REASONS) as EndReason[]).map((r) => (
                    <ChipRadio key={r} name="reason" value={r} form="end-form" defaultChecked={reason === r}>
                      {END_REASONS[r]}
                    </ChipRadio>
                  ))}
                </div>
                {fe.reason && (
                  <p role="alert" className="type-caption text-state-error">
                    {fe.reason}
                  </p>
                )}
              </fieldset>
              <Textarea
                name="message"
                form="end-form"
                label="رسالتك للمعهد (اختيارية)"
                rows={3}
                maxLength={2000}
                defaultValue={state.values?.message}
                error={fe.message}
                placeholder="تُرسل كما كتبتها. إنهاء العلاقة باحترام يبقي الباب مفتوحًا مستقبلًا."
                className="w-full"
              />
            </section>
          )}
        </>
      }
      aside={
        <>
          {tryCard}
          {confirmCard}
        </>
      }
    />
  );
}
