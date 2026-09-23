"use client";

import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Checkbox } from "@/components/ui/Choice";
import { proceedToPayment } from "@/app/(workspace)/checkout/actions";
import { initialFormState } from "@/lib/validation/auth";

/** Wraps the review layout: side column (summary + CTA) and primary column (content + agreement). */
export function ProceedForm({
  courseId,
  slug,
  code,
  cta,
  side,
  children,
  agreementLabel,
}: {
  courseId: string;
  slug: string;
  code: string | null;
  cta: string;
  side: ReactNode;
  children: ReactNode;
  agreementLabel: string;
}) {
  const [state, action, pending] = useActionState(proceedToPayment, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="code" value={code ?? ""} />
      <div className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
        {side}
        <Button type="submit" size="l" fullWidth loading={pending}>
          {cta}
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {state.message && (
          <Alert tone="error" title="تعذّر إتمام العملية">
            {state.message}
          </Alert>
        )}
        {children}
        <div className="-mt-2 flex flex-col gap-1 rounded-16 border border-border-default bg-bg-surface px-6 pb-4 pt-2">
          <Checkbox name="agree" required aria-invalid={state.fieldErrors?.agree ? true : undefined}>
            {agreementLabel}
          </Checkbox>
          {state.fieldErrors?.agree && (
            <p role="alert" className="type-caption text-state-error">
              {state.fieldErrors.agree}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
