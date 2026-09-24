"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { Button, type ButtonSize, type ButtonType } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { broadcastToTrainees } from "@/lib/actions/trainer-ops";
import { toArabicDigits } from "@/lib/format";

/**
 * «راسل الجميع» / «راسل المحددين» / «راسل قائمة الانتظار» / «نبّههما الآن»: the message reaches each trainee as a
 * notification that links to their training page (BR-U2: the dialog says who receives it before sending).
 */
export function BroadcastDialog({
  courseId,
  audience,
  trainees,
  recipientsLabel,
  title,
  defaultBody = "",
  label,
  variant = "outline",
  size = "m",
  fullWidth,
  className,
  iconOnly,
  disabled,
}: {
  courseId: string;
  audience: "enrolled" | "waitlist" | "selected";
  trainees?: string[];
  recipientsLabel: string;
  title: string;
  defaultBody?: string;
  label: ReactNode;
  variant?: ButtonType;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  /** 40px white square with a message icon (roster rows). */
  iconOnly?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(defaultBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const send = () =>
    start(async () => {
      setError(null);
      const res = await broadcastToTrainees({ courseId, audience, body, trainees });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setOpen(false);
      setBody(defaultBody);
      toast("success", `أُرسلت الرسالة إلى ${toArabicDigits(res.data ?? 0)} ${res.data === 1 ? "متدرب" : "متدربين"}.`);
      router.refresh();
    });

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          aria-label={typeof label === "string" ? label : "راسل"}
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-surface text-text-muted focus-ring hover:bg-bg-brand-tint hover:text-text-brand disabled:cursor-not-allowed disabled:text-text-disabled"
        >
          <Glyph icon={MessagesSquare} size={20} />
        </button>
      ) : (
        <Button variant={variant} size={size} fullWidth={fullWidth} className={className} disabled={disabled} onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <>
            <Button onClick={send} loading={pending} disabled={body.trim().length < 5}>
              أرسل الرسالة
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="type-small text-text-secondary">تصل الرسالة كإشعار إلى: {recipientsLabel}.</p>
          {error && <Alert tone="error" title={error} />}
          <Textarea label="نص الرسالة" rows={4} maxLength={1000} value={body} onChange={(e) => setBody(e.currentTarget.value)} />
        </div>
      </Modal>
    </>
  );
}
