import type { ReactNode } from "react";

/*
 * Figma component "Button" (56:349) — the four variants that appear on the dashboard.
 * Width is fixed at 120px in the design; labels are centred and may exceed the padding.
 */
const variants = {
  primary:
    "h-12 px-6 type-button bg-action-primary text-text-on-brand drop-shadow-button",
  secondary:
    "h-12 px-6 type-button bg-action-secondary-bg text-text-brand inner-stroke istroke-w-[1.5px] istroke-c-action-primary",
  accent: "h-14 px-8 type-body-lg bg-action-accent text-text-on-accent",
  "ghost-on-brand": "h-14 px-8 type-body-lg text-bg-brand-tint",
} as const;

type ButtonProps = {
  variant: keyof typeof variants;
  children: ReactNode;
  className?: string;
};

export function Button({ variant, children, className }: ButtonProps) {
  return (
    <button
      type="button"
      className={`flex w-[120px] shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-12 ${variants[variant]} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
