"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Alert } from "@/components/ui/Feedback";
import { Button, type ButtonSize, type ButtonType } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export type ActionResult = { ok: boolean; message: string };

/**
 * A state-changing button that explains its outcome in a confirmation Modal first (BR-U2).
 * `action` is a bound Server Action; it may redirect (navigation) or return { ok, message } (toast / inline error).
 */
export function ConfirmAction({
  label,
  title,
  body,
  confirmLabel,
  action,
  variant = "outline",
  size = "m",
  destructive = false,
  fullWidth = false,
  className,
  trigger = "button",
}: {
  label: ReactNode;
  title: ReactNode;
  body: ReactNode;
  confirmLabel: string;
  action: () => Promise<ActionResult | void>;
  variant?: ButtonType;
  size?: ButtonSize;
  destructive?: boolean;
  fullWidth?: boolean;
  className?: string;
  trigger?: "button" | "link";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  const run = () =>
    start(async () => {
      setError(null);
      const res = await action();
      if (res && !res.ok) {
        setError(res.message);
        return;
      }
      setOpen(false);
      if (res?.message) toast("success", res.message);
    });

  return (
    <>
      {trigger === "link" ? (
        <button type="button" onClick={() => setOpen(true)} className={`cursor-pointer whitespace-nowrap rounded-8 type-caption text-text-muted hover:text-text-primary hover:underline focus-ring ${className ?? ""}`}>
          {label}
        </button>
      ) : (
        <Button variant={variant} size={size} fullWidth={fullWidth} className={className} onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={title}
        size="s"
        destructive={destructive}
        footer={
          <>
            <Button size="s" variant={destructive ? "danger" : "primary"} loading={pending} onClick={run}>
              {confirmLabel}
            </Button>
            <Button size="s" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              تراجع
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div>{body}</div>
          {error && (
            <Alert tone="error" title="تعذّر إتمام العملية">
              {error}
            </Alert>
          )}
        </div>
      </Modal>
    </>
  );
}
