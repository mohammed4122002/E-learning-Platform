"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/*
 * Figma "Feedback / Modal · Dialog" (59:130): surface, r22, p 26/28/24/28, gap 20, shadow 0 8 40 @10%.
 * Title 20 Medium (state/error for Destructive), body 17 Regular text/secondary, footer buttons 44px.
 * Sizes: S 420 · M 560 · L 720. Uses the native <dialog> for focus trapping and Esc handling.
 */
const widths = { s: "max-w-[420px]", m: "max-w-[560px]", l: "max-w-[720px]" } as const;

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof widths;
  destructive?: boolean;
};

export function Modal({ open, onClose, title, children, footer, size = "m", destructive }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-32px)] ${widths[size]} rounded-22 bg-bg-surface p-0 text-text-primary shadow-float backdrop:bg-scrim`}
    >
      <div className="flex flex-col gap-5 px-7 pb-6 pt-[26px]">
        <div className="flex items-start gap-3">
          <h2 id={titleId} className={`flex-1 type-h3 ${destructive ? "text-state-error" : "text-text-primary"}`}>
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="mt-1.5 cursor-pointer rounded-8 text-text-secondary focus-ring">
            <X aria-hidden size={16} strokeWidth={1.25} absoluteStrokeWidth />
          </button>
        </div>
        {children && <div className="type-body text-text-secondary">{children}</div>}
        {footer && <div className="flex flex-wrap items-center gap-3">{footer}</div>}
      </div>
    </dialog>
  );
}
