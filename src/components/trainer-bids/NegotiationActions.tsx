"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { messageOrganization, respondToCounter, withdrawProposal } from "@/app/(trainer)/trainer/bids/actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { NegotiationComposer } from "@/components/trainer-bids/NegotiationComposer";
import { ActionCaption, ActionCard } from "@/components/trainer-bids/NegotiationParts";
import type { ButtonType } from "@/components/ui/Button";
import type { BidTerms, TermChanges } from "@/lib/trainer-bids";

/** «راسل الجهة»: opens (or reuses) the bid's conversation and goes to it. */
export function MessageOrgButton({ bidId, variant = "ghost" }: { bidId: string; variant?: ButtonType }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        variant={variant}
        size="l"
        fullWidth
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await messageOrganization(bidId);
            if (res && !res.ok) setError(res.message);
          })
        }
      >
        راسل الجهة
      </Button>
      {error && <Alert tone="error" title={error} />}
    </>
  );
}

/** «نزّل سجل التفاوض PDF»: the browser's print dialog saves the page (with the full history) as PDF. */
export function PrintRecordButton() {
  return (
    <Button variant="outline" size="l" fullWidth onClick={() => window.print()}>
      نزّل سجل التفاوض PDF
    </Button>
  );
}

/** «اسحب الاقتراح» (457:30255) with a confirmation that states the outcome. */
export function WithdrawProposalButton({ negotiationId }: { negotiationId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <Button variant="outline" size="l" fullWidth onClick={() => setOpen(true)}>
        اسحب الاقتراح
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="سحب الاقتراح"
        footer={
          <>
            <Button
              size="s"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await withdrawProposal(negotiationId);
                  if (!res.ok) return setError(res.message);
                  setOpen(false);
                  toast("success", res.message);
                  router.refresh();
                })
              }
            >
              اسحب الاقتراح
            </Button>
            <Button variant="outline" size="s" onClick={() => setOpen(false)} disabled={pending}>
              تراجع
            </Button>
          </>
        }
      >
        <p className="type-body text-text-secondary">يعيد الشروط الأصلية ويستأنف مهلة التعاقد. تصل الجهة إشارة بأنك سحبت الاقتراح.</p>
        {error && <Alert tone="error" title={error} />}
      </Modal>
    </>
  );
}

/**
 * «قرارك» (458:31124) — accept the counter-proposal, send a final proposal (switches this page to the composer for
 * round 2) or reject and return to the original terms.
 */
export function CounterDecision({
  negotiationId,
  bidId,
  canPropose,
  acceptCaption,
  rejectCaption,
  hero,
  termsCard,
  timeline,
  side,
  composer,
}: {
  negotiationId: string;
  bidId: string;
  canPropose: boolean;
  acceptCaption: string;
  rejectCaption: string;
  hero: ReactNode;
  termsCard: ReactNode;
  timeline: ReactNode;
  side: ReactNode;
  composer: {
    current: BidTerms;
    draft: TermChanges;
    draftMessage: string;
    reference: string;
    title: string;
    organizationName: string;
    contractUrl: string;
  };
}) {
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  if (composing)
    return <NegotiationComposer bidId={bidId} negotiationId={negotiationId} phase="final" timeline={timeline} onBack={() => setComposing(false)} {...composer} />;

  const respond = (accept: boolean) => {
    setError(null);
    setBusy(accept ? "accept" : "reject");
    start(async () => {
      const res = await respondToCounter(negotiationId, accept);
      setBusy(null);
      if (!res.ok) return setError(res.message);
      toast("success", res.message);
      router.refresh();
    });
  };

  return (
    <>
      {hero}
      <div className="grid w-full grid-cols-1 items-start gap-[26px] lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          {termsCard}
          <ActionCard title="قرارك" intro="ثلاثة خيارات — وكل واحد يعلن نتيجته قبل الضغط.">
            {error && <Alert tone="error" title={error} />}
            <Button size="l" fullWidth loading={busy === "accept"} disabled={pending} onClick={() => respond(true)}>
              اقبل الشروط المقابلة
            </Button>
            <ActionCaption>{acceptCaption}</ActionCaption>
            {canPropose && (
              <>
                <Button variant="outline" size="l" fullWidth disabled={pending} onClick={() => setComposing(true)}>
                  أرسل اقتراحًا أخيرًا
                </Button>
                <ActionCaption>جولتك الأخيرة — يعود المسار لـ«بانتظار رد الجهة»</ActionCaption>
              </>
            )}
            <Button variant="ghost" size="l" fullWidth loading={busy === "reject"} disabled={pending} onClick={() => respond(false)}>
              ارفض وعُد للشروط الأصلية
            </Button>
            <ActionCaption>{rejectCaption}</ActionCaption>
          </ActionCard>
        </div>
        <aside className="flex min-w-0 flex-col gap-[22px]">
          {timeline}
          {side}
        </aside>
      </div>
    </>
  );
}
