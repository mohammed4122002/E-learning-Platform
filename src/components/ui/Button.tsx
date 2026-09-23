import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

/*
 * Figma "Button" (56:349): Type × Size × State.
 * Sizes: S 44px / 15 Regular / px 18 · M 48px / 16 Medium / px 24 · L 56px / 18 Regular / px 32. Radius 12.
 * Hover = action/primary-hover or brand-tint · Disabled = bg/disabled + text/disabled · Loading = 85% opacity.
 */
const types = {
  primary:
    "bg-action-primary text-text-on-brand shadow-[0_6px_18px_0_rgba(91,60,196,0.28)] hover:bg-action-primary-hover active:bg-action-primary-pressed",
  accent: "bg-action-accent text-text-on-accent hover:shadow-[0_6px_18px_0_rgba(91,60,196,0.28)]",
  secondary:
    "bg-action-secondary-bg text-text-brand inner-stroke istroke-w-[1.5px] istroke-c-action-primary hover:bg-bg-brand-tint",
  outline: "text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-brand-tint",
  ghost: "text-text-brand hover:bg-bg-brand-tint",
  text: "text-text-brand hover:underline underline-offset-4",
  danger: "bg-state-error text-text-on-brand hover:opacity-90",
  "ghost-on-brand": "text-bg-brand-tint hover:bg-white/10",
} as const;

const sizes = {
  s: "h-11 px-[18px] text-[15px] leading-none font-normal",
  m: "h-12 px-6 type-button",
  l: "h-14 px-8 type-body-lg",
} as const;

export type ButtonType = keyof typeof types;
export type ButtonSize = keyof typeof sizes;

type CommonProps = {
  variant?: ButtonType;
  size?: ButtonSize;
  loading?: boolean;
  /** Leading/trailing icon nodes (use <Glyph />). */
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

function classes({ variant = "primary", size = "m", fullWidth, className }: CommonProps, disabled?: boolean) {
  const state = disabled
    ? "bg-bg-disabled text-text-disabled shadow-none pointer-events-none [&.inner-stroke]:after:hidden"
    : types[variant];
  return [
    "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-12 transition-colors focus-ring",
    sizes[size],
    state,
    fullWidth ? "w-full" : "",
    className ?? "",
  ].join(" ");
}

type ButtonProps = CommonProps & Omit<ComponentPropsWithoutRef<"button">, "children" | "className">;

export function Button({ variant, size, loading, icon, fullWidth, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${classes({ variant, size, fullWidth, className, children }, disabled)} ${loading ? "opacity-85 cursor-progress" : ""}`}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden className="size-5 animate-[tg-spin_0.9s_linear_infinite]" /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = CommonProps & { href: string; disabled?: boolean } & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    "children" | "className" | "href"
  >;

/** Same visuals as <Button>, rendered as a navigation link. */
export function ButtonLink({ variant, size, icon, fullWidth, className, children, href, disabled, ...rest }: ButtonLinkProps) {
  if (disabled) {
    return (
      <span aria-disabled className={classes({ variant, size, fullWidth, className, children }, true)}>
        {icon}
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={classes({ variant, size, fullWidth, className, children })} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
