"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { withdrawBid } from "@/app/(trainer)/trainer/bids/actions";
import { Button } from "@/components/ui/Button";
import { Radio } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { WITHDRAW_REASONS } from "@/lib/trainer-bids";
import type { ButtonSize, ButtonType } from "@/components/ui/Button";

/**
 * «اسحب العرض» (309:10424) and «اعتذر عن العرض» (458:31482). Figma has no dialog for the reason, so the design-system
 * Modal asks for it and states the outcome before confirming (BR-U2).
 */
export function WithdrawBidButton({
  bidId,
  title,
  afterAccept = false,
  label = "اسحب العرض",
  variant = "outline",
  size = "m",
  className,
  fullWidth,
}: {
  bidId: string;
  title: string;
  afterAccept?: boolean;
  label?: string;
  variant?: ButtonType;
  size?: ButtonSize;
  className?: string;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const confirm = () =>
    start(async () => {
      const res = await withdrawBid(bidId, reason, note);
      if (!res.ok) return setError(res.message);
      setOpen(false);
      toast("success", res.message);
      router.push("/trainer/bids");
      router.refresh();
    });

  return (
    <>
      <Button variant={variant} size={size} className={className} fullWidth={fullWidth} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={afterAccept ? "الاعتذار عن العرض المقبول" : "سحب العرض"}
        destructive
        footer={
          <>
            <Button variant="danger" size="s" onClick={confirm} disabled={!reason} loading={pending}>
              {label}
            </Button>
            <Button variant="outline" size="s" onClick={() => setOpen(false)} disabled={pending}>
              تراجع
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="type-body text-text-secondary">
            {afterAccept
              ? `ستعتذر عن عرضك المقبول على «${title}». يُسجَّل انسحابًا بعد القبول ويؤثر على سجل التزامك، ويُعاد الطلب للجهة.`
              : `سيُسحب عرضك على «${title}» ولا يمكنك التقديم على الطلب نفسه مجددًا. تصل الجهة إشارة بالسحب مع السبب.`}
          </p>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 type-small text-text-secondary">سبب السحب</legend>
            {WITHDRAW_REASONS.map((r) => (
              <Radio key={r.value} name={`withdraw-${bidId}`} value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)}>
                {r.label}
              </Radio>
            ))}
          </fieldset>
          <Textarea label="ملاحظة للجهة (اختياري)" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.currentTarget.value)} />
          {error && <Alert tone="error" title={error} />}
        </div>
      </Modal>
    </>
  );
}
