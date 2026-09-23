"use client";

import { useEffect, useState, useTransition } from "react";
import { formatClock } from "@/lib/format";
import type { FormState } from "@/lib/validation/auth";

/** "لم يصلك الرمز؟ إعادة الإرسال بعد ٠٠:٤٥" with a 60-second cooldown. */
export function ResendCode({ onResend, cooldown = 60 }: { onResend: () => Promise<FormState>; cooldown?: number }) {
  const [left, setLeft] = useState(cooldown);
  const [message, setMessage] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="type-body text-text-secondary">لم يصلك الرمز؟</span>
        {left > 0 ? (
          <span className="type-subtitle text-text-muted" aria-live="polite">
            إعادة الإرسال بعد {formatClock(left)}
          </span>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await onResend();
                setMessage(res);
                if (res.status === "success") setLeft(cooldown);
              })
            }
            className="cursor-pointer rounded-8 type-subtitle text-text-brand hover:underline focus-ring disabled:text-text-disabled"
          >
            {pending ? "جارٍ الإرسال…" : "أعد إرسال الرمز"}
          </button>
        )}
      </div>
      {message?.message && (
        <p role="status" className={`type-caption ${message.status === "error" ? "text-state-error" : "text-state-success"}`}>
          {message.message}
        </p>
      )}
    </div>
  );
}
