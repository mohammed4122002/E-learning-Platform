"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { acceptInvitation, cancelAffiliationEnd, declineInvitation, openOrgConversation } from "@/app/(trainer)/trainer/affiliations/actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { initialFormState, type FormState } from "@/lib/validation/auth";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const ACTIONS: Record<"accept" | "decline" | "conversation" | "keep", Action> = {
  accept: acceptInvitation,
  decline: declineInvitation,
  conversation: openOrgConversation,
  keep: cancelAffiliationEnd,
};

/** Error of a server action → toast (success redirects). */
function useErrorToast(state: FormState) {
  const toast = useToast();
  useEffect(() => {
    if (state.status === "error" && state.message) toast("error", state.message);
  }, [state, toast]);
}

/**
 * One-click form around a server action (accept an invitation, open a conversation with the organization,
 * withdraw a notice). `fields` become hidden inputs; the button shows its pending state.
 */
export function ActionButton({
  kind,
  fields,
  children,
  className,
  pendingLabel,
}: {
  kind: keyof typeof ACTIONS;
  fields: Record<string, string>;
  children: ReactNode;
  className: string;
  pendingLabel?: string;
}) {
  const [state, action, pending] = useActionState(ACTIONS[kind], initialFormState);
  useErrorToast(state);
  return (
    <form action={action} className="contents">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" disabled={pending} aria-busy={pending} className={`${className} disabled:cursor-wait disabled:opacity-70`}>
        {pending && pendingLabel ? pendingLabel : children}
      </button>
    </form>
  );
}

/** «ارفض» / «ارفض الدعوة»: confirmation dialog (BR-U2) — the organization is told without a reason. */
export function DeclineButton({ invitationId, orgName, className, children }: { invitationId: string; orgName: string; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(ACTIONS.decline, initialFormState);
  useErrorToast(state);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="ترفض دعوة الارتباط؟"
        destructive
        footer={
          <form action={action} className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <input type="hidden" name="invitationId" value={invitationId} />
            <Button variant="outline" size="s" onClick={() => setOpen(false)}>
              تراجع
            </Button>
            <Button type="submit" variant="danger" size="s" loading={pending}>
              ارفض الدعوة
            </Button>
          </form>
        }
      >
        <p className="type-body text-text-secondary">يُبلَّغ {orgName} برفضك بلا سبب، ولا يمكن التراجع عن الرفض. يمكن للجهة دعوتك مجددًا لاحقًا.</p>
      </Modal>
    </>
  );
}
