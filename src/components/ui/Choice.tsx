import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Check } from "lucide-react";

/*
 * Figma "Form / Checkbox" (58:46), "Form / Radio" (58:75), "Form / Toggle" (58:92).
 * Row 44px, gap 10–12, label 17 Regular text/primary. Box 22px r8 · dot 22px (inner 10px) · track 48×28, knob 22.
 * Native inputs are kept (visually hidden) so keyboard, forms and screen readers work unchanged.
 */
type BaseProps = Omit<ComponentPropsWithoutRef<"input">, "type" | "className" | "children"> & {
  children: ReactNode;
  description?: ReactNode;
  className?: string;
};

export function Checkbox({ children, description, className, disabled, ...rest }: BaseProps) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-2.5 ${disabled ? "cursor-not-allowed text-text-disabled" : "text-text-primary"} ${className ?? ""}`}>
      <span className="relative flex size-[22px] shrink-0 items-center justify-center">
        <input type="checkbox" disabled={disabled} className="peer absolute inset-0 cursor-pointer appearance-none rounded-8 border-[1.5px] border-border-default bg-bg-surface checked:border-0 checked:bg-action-primary focus-ring disabled:bg-bg-disabled" {...rest} />
        <Check aria-hidden size={16} strokeWidth={1.75} absoluteStrokeWidth className="pointer-events-none relative text-text-on-brand opacity-0 peer-checked:opacity-100" />
      </span>
      <span className="flex flex-col">
        <span className="type-body">{children}</span>
        {description && <span className="type-caption text-text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function Radio({ children, description, className, disabled, ...rest }: BaseProps) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-2.5 ${disabled ? "cursor-not-allowed text-text-disabled" : "text-text-primary"} ${className ?? ""}`}>
      <span className="relative flex size-[22px] shrink-0 items-center justify-center">
        <input type="radio" disabled={disabled} className="peer absolute inset-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-border-default bg-bg-surface checked:border-2 checked:border-action-primary focus-ring" {...rest} />
        <span aria-hidden className="pointer-events-none relative size-2.5 rounded-full bg-action-primary opacity-0 peer-checked:opacity-100" />
      </span>
      <span className="flex flex-col">
        <span className="type-body">{children}</span>
        {description && <span className="type-caption text-text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function Toggle({ children, description, className, disabled, ...rest }: BaseProps) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-3 ${disabled ? "cursor-not-allowed text-text-disabled" : "text-text-primary"} ${className ?? ""}`}>
      <span className="flex flex-1 flex-col">
        <span className="type-body">{children}</span>
        {description && <span className="type-caption text-text-muted">{description}</span>}
      </span>
      <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
        <input type="checkbox" role="switch" disabled={disabled} className="peer absolute inset-0 cursor-pointer appearance-none rounded-full bg-border-default transition-colors checked:bg-action-primary focus-ring disabled:opacity-60" {...rest} />
        {/* RTL: the knob rests at the inline start (right) and moves to the end when on. */}
        <span aria-hidden className="pointer-events-none absolute start-[3px] size-[22px] rounded-full bg-white shadow-knob transition-transform peer-checked:-translate-x-5" />
      </span>
    </label>
  );
}
