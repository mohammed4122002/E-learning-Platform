import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/*
 * Figma "Data / Chip" (60:40): 36px pill, px 14, 15 Regular.
 * Default: surface + 1px border/default + text/primary · Selected: brand-tint + 1.5px action/primary + text/brand.
 */
export function chipClass(selected: boolean, className?: string) {
  return [
    "inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full px-3.5 type-small transition-colors focus-ring",
    selected
      ? "border-[1.5px] border-action-primary bg-bg-brand-tint text-text-brand"
      : "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-brand-tint",
    className ?? "",
  ].join(" ");
}

/** Filter chip that navigates (URL state). */
export function ChipLink({ href, selected, children, className }: { href: string; selected: boolean; children: ReactNode; className?: string }) {
  return (
    <Link href={href} aria-current={selected ? "true" : undefined} scroll={false} className={chipClass(selected, className)}>
      {children}
    </Link>
  );
}

/** Toggle chip (multi-select tags). */
export function ChipButton({
  selected,
  children,
  className,
  ...rest
}: { selected: boolean; children: ReactNode; className?: string } & Omit<ComponentPropsWithoutRef<"button">, "className" | "children">) {
  return (
    <button type="button" aria-pressed={selected} className={chipClass(selected, className)} {...rest}>
      {children}
    </button>
  );
}

/** Single-choice chip backed by a native radio input (works inside forms, keyboard arrows included). */
export function ChipRadio({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & Omit<ComponentPropsWithoutRef<"input">, "type" | "className" | "children">) {
  return (
    <label className="relative inline-flex">
      <input type="radio" className="peer sr-only" {...rest} />
      <span
        className={`inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border border-border-default bg-bg-surface px-3.5 type-small text-text-primary transition-colors hover:bg-bg-brand-tint peer-checked:border-[1.5px] peer-checked:border-action-primary peer-checked:bg-bg-brand-tint peer-checked:text-text-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-border-focus ${className ?? ""}`}
      >
        {children}
      </span>
    </label>
  );
}
