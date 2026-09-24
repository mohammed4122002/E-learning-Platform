"use client";

import { useActionState, useState, type ReactNode } from "react";
import { CircleAlert, FileText, Hourglass } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { acceptDecision, submitAppeal } from "@/app/(trainer)/trainer/reports/actions";
import { Columns } from "@/components/trainer-affiliations/parts";
import { EvidenceUpload } from "@/components/trainer-reports/EvidenceUpload";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { APPEAL_BASES, type AppealBasis } from "@/lib/trainer-reports";
import { initialFormState } from "@/lib/validation/auth";

const BASIS_ICON: Record<AppealBasis, LucideIcon> = { new_evidence: FileText, fact_error: CircleAlert, disproportionate: Hourglass };

/**
 * TRR-RPT-02 · التظلّم على قرار (310:10595). The basis + evidence (main column) and the confirmation (aside) are one
 * form (`form="appeal-form"`); «أقبل القرار وأعدّل الوصف» is its own form.
 */
export function AppealFlow({
  reportId,
  userId,
  fixHref,
  mainTop,
  asideTop,
}: {
  reportId: string;
  userId: string;
  fixHref: string;
  mainTop: ReactNode;
  asideTop: ReactNode;
}) {
  const [state, action, pending] = useActionState(submitAppeal, initialFormState);
  const [acceptState, acceptAction, accepting] = useActionState(acceptDecision, initialFormState);
  const [basis, setBasis] = useState<AppealBasis | "">((state.values?.basis as AppealBasis) ?? "");
  const [ack, setAck] = useState(false);
  const fe = state.fieldErrors ?? {};

  return (
    <Columns
      asideWidth={400}
      main={
        <>
          {mainTop}
          <section aria-labelledby="basis-title" className="flex w-full flex-col items-start gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
            <h2 id="basis-title" className="type-h2 text-text-primary">
              أساس تظلّمك
            </h2>
            <p className="type-body text-text-muted">اختر الأساس الذي ينطبق. التظلّم مراجعة للقرار لا إعادة للنقاش.</p>
            <fieldset className="flex w-full flex-col gap-4">
              <legend className="sr-only">أساس التظلّم</legend>
              {(Object.keys(APPEAL_BASES) as AppealBasis[]).map((k) => {
                const selected = basis === k;
                return (
                  <label
                    key={k}
                    className={`flex w-full cursor-pointer items-center gap-3.5 rounded-16 px-[18px] py-4 focus-within:outline-2 focus-within:outline-border-focus ${
                      selected ? "border-2 border-action-primary bg-bg-brand-tint" : "border-[1.5px] border-border-default bg-bg-page"
                    }`}
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
                      <Glyph icon={BASIS_ICON[k]} size={20} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className={`type-title ${selected ? "text-text-brand" : "text-text-primary"}`}>{APPEAL_BASES[k].title}</span>
                      <span className="type-body text-text-muted">{APPEAL_BASES[k].body}</span>
                    </span>
                    <input
                      type="radio"
                      name="basis"
                      value={k}
                      form="appeal-form"
                      checked={selected}
                      onChange={() => setBasis(k)}
                      className="size-[22px] shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-border-default bg-bg-surface checked:border-[7px] checked:border-action-primary"
                    />
                  </label>
                );
              })}
              {fe.basis && (
                <p role="alert" className="type-caption text-state-error">
                  {fe.basis}
                </p>
              )}
            </fieldset>
          </section>
          <section aria-labelledby="evidence-title" className="flex w-full flex-col items-start gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
            <h2 id="evidence-title" className="type-h2 text-text-primary">
              دليلك
            </h2>
            <div className="flex w-full flex-col gap-2">
              <label htmlFor="appeal-body" className="type-small text-text-secondary">
                اشرح دليلك
              </label>
              <textarea
                id="appeal-body"
                name="body"
                form="appeal-form"
                rows={2}
                maxLength={4000}
                defaultValue={state.values?.body}
                aria-invalid={Boolean(fe.body)}
                className="min-h-24 w-full resize-y rounded-12 border-[1.5px] border-border-default bg-bg-surface px-4 py-3.5 type-body text-text-primary placeholder:text-text-muted focus-ring aria-[invalid=true]:border-state-error"
              />
              {fe.body && (
                <p role="alert" className="type-caption text-state-error">
                  {fe.body}
                </p>
              )}
            </div>
            <EvidenceUpload userId={userId} form="appeal-form" title="أرفق دليلك" hint="كشف الحضور · ملفات التمرين · لقطات الشاشة · حتى ١٠ م.ب" />
          </section>
        </>
      }
      aside={
        <>
          {asideTop}
          <section aria-labelledby="send-title" className="flex w-full flex-col items-stretch gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
            <h2 id="send-title" className="type-h2 text-text-primary">
              إرسال التظلّم
            </h2>
            <form id="appeal-form" action={action} noValidate className="flex flex-col gap-[18px]">
              <input type="hidden" name="reportId" value={reportId} />
              {state.status === "error" && state.message && (
                <Alert tone="error" title="تعذّر إرسال التظلّم">
                  {state.message}
                </Alert>
              )}
              <div className="flex flex-col gap-1">
                <Checkbox name="ack" checked={ack} onChange={(e) => setAck(e.target.checked)}>
                  أفهم أن قرار المراجعة نهائي ولا يقبل تظلّمًا ثانيًا
                </Checkbox>
                {fe.ack && (
                  <p role="alert" className="type-caption text-state-error">
                    {fe.ack}
                  </p>
                )}
              </div>
              <Button type="submit" size="l" fullWidth disabled={!ack} loading={pending}>
                أرسل التظلّم
              </Button>
            </form>
            <form action={acceptAction} className="flex flex-col gap-2">
              <input type="hidden" name="reportId" value={reportId} />
              <input type="hidden" name="fixHref" value={fixHref} />
              {acceptState.status === "error" && acceptState.message && (
                <p role="alert" className="type-caption text-state-error">
                  {acceptState.message}
                </p>
              )}
              <Button type="submit" variant="ghost" size="l" fullWidth loading={accepting}>
                أقبل القرار وأعدّل الوصف
              </Button>
            </form>
          </section>
        </>
      }
    />
  );
}
