"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signContract } from "@/app/(trainer)/trainer/contracts/actions";
import { actionRowButtonClass, ResultPanel } from "@/components/trainer-affiliations/parts";
import { Alert } from "@/components/ui/Feedback";
import { initialFormState } from "@/lib/validation/auth";

/**
 * TRR-CTR-02 · توقيع عقد المدرب إلكترونياً — signing 4265:479 and «جارٍ التوقيع» 4265:859 (while the server records
 * the signature). The two Figma rows «التوقيع» and «إقرار المراجعة» become the typed-name field and the consent box.
 */
export function SignFlow({
  contractId,
  version,
  refLabel,
  sourceRef,
  valueText,
  trainerName,
  orgName,
  backHref,
}: {
  contractId: string;
  version: number;
  refLabel: string;
  sourceRef: string | null;
  valueText: string;
  trainerName: string;
  orgName: string;
  backHref: string;
}) {
  const [state, action, pending] = useActionState(signContract, initialFormState);
  const [name, setName] = useState(state.values?.typedName ?? "");
  const [consent, setConsent] = useState(false);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="flex w-full flex-col gap-[26px]">
      <input type="hidden" name="contractId" value={contractId} />
      <input type="hidden" name="version" value={version} />
      {pending ? (
        <div role="status" aria-live="polite" className="w-full">
          <ResultPanel
            tone="warning"
            title="جارٍ التوقيع"
            intro="لا تغلق الصفحة حتى تكتمل العملية."
            rows={[
              { label: "توثيق التوقيع", value: "جارٍ", tone: "warning" },
              { label: "ختم زمني", value: "بانتظار", tone: "muted" },
              { label: "إشعار الطرف الآخر", value: "بانتظار", tone: "muted" },
            ]}
          />
          {/* Keep the entered values in the submitted form while the pending card is shown. */}
          <input type="hidden" name="typedName" value={name} />
          {consent && <input type="hidden" name="consent" value="on" />}
        </div>
      ) : (
        <>
          {state.status === "error" && state.message && (
            <Alert tone="error" title="تعذّر التوقيع">
              {state.message}
            </Alert>
          )}
          <section className="flex w-full flex-col gap-2.5 rounded-[14px] border-2 border-border-default bg-bg-surface p-5 sm:p-6">
            <h2 className="text-[20px] leading-[1.4] font-bold text-text-primary">التوقيع الإلكتروني</h2>
            <p className="text-[15px] leading-normal text-text-secondary">بالتوقيع تُقرّ بأنك راجعت العقد ووافقت على شروطه.</p>
            <div className="flex flex-col gap-2.5">
              {sourceRef && (
                <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px]">
                  <span className="text-[13.5px] leading-normal text-text-secondary">{refLabel}</span>
                  <span className="text-[15px] leading-normal font-bold text-text-primary" dir="ltr">
                    {sourceRef}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px]">
                <span className="text-[13.5px] leading-normal text-text-secondary">قيمة العقد</span>
                <span className="text-[15px] leading-normal font-bold text-text-primary">{valueText}</span>
              </div>
              <div className="flex flex-col gap-1 rounded-[10px] border border-border-default bg-bg-page px-4 py-[9px]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <label htmlFor="typed-name" className="text-[13.5px] leading-normal text-text-secondary">
                    التوقيع
                  </label>
                  <input
                    id="typed-name"
                    name="typedName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={trainerName}
                    autoComplete="name"
                    required
                    aria-invalid={Boolean(fe.typedName)}
                    aria-describedby="typed-name-hint"
                    className="min-w-0 flex-1 rounded-8 border-[1.5px] border-border-default bg-bg-surface px-3 py-1 text-[15px] leading-normal font-bold text-text-primary placeholder:font-normal placeholder:text-text-muted focus-ring aria-[invalid=true]:border-state-error"
                  />
                </div>
                <p id="typed-name-hint" className={`text-[13.5px] leading-normal ${fe.typedName ? "text-state-error" : "text-text-muted"}`}>
                  {fe.typedName ?? "اكتب اسمك الكامل كما في ملفك — يُسجَّل مع وقت التوقيع."}
                </p>
              </div>
              <label className="flex cursor-pointer flex-wrap items-center gap-2.5 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px]">
                <span className="text-[13.5px] leading-normal text-text-secondary">إقرار المراجعة</span>
                <input
                  type="checkbox"
                  name="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  aria-invalid={Boolean(fe.consent)}
                  className="size-[18px] shrink-0 cursor-pointer accent-[var(--color-action-primary)] focus-ring"
                />
                <span className="text-[15px] leading-normal font-bold text-text-brand">راجعتُ العقد وأوافق على شروطه</span>
                {fe.consent && <span className="w-full text-[13.5px] text-state-error">{fe.consent}</span>}
              </label>
              <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px]">
                <span className="text-[13.5px] leading-normal text-text-secondary">الطرف الآخر</span>
                <span className="text-[15px] leading-normal font-bold text-state-warning">بانتظار توقيع {orgName}</span>
              </div>
            </div>
          </section>
          <div className="flex w-full flex-row-reverse flex-wrap justify-end gap-3">
            <button type="submit" disabled={!consent || name.trim().length < 2} className={actionRowButtonClass()}>
              وقّع وأرسل
            </button>
            <Link href={backHref} className={actionRowButtonClass(true)}>
              عودة
            </Link>
          </div>
        </>
      )}
    </form>
  );
}
