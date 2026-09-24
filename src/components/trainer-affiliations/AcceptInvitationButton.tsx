"use client";

import { useActionState } from "react";
import { acceptInvitation } from "@/app/(trainer)/trainer/affiliations/actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { initialFormState } from "@/lib/validation/auth";

/** «اقبل الارتباط» (293:8660) — accepts straight away («تبدأ العلاقة فورًا»), then AFL-01 shows 4266:2. */
export function AcceptInvitationButton({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState(acceptInvitation, initialFormState);
  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <input type="hidden" name="invitationId" value={invitationId} />
      {state.status === "error" && state.message && (
        <Alert tone="error" title="تعذّر قبول الدعوة">
          {state.message}
        </Alert>
      )}
      <Button type="submit" size="l" fullWidth loading={pending}>
        اقبل الارتباط
      </Button>
    </form>
  );
}
