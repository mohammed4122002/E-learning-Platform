import type { ReactNode } from "react";
import type { Tone } from "@/types/dashboard";

const tones: Record<Tone, string> = {
  brand: "bg-bg-brand-tint text-text-brand",
  info: "bg-state-info-bg text-state-info",
  accent: "bg-action-accent text-text-on-accent",
  success: "bg-state-success-bg text-state-success",
  warning: "bg-state-warning-bg text-state-warning",
};

type PillProps = {
  tone: Tone;
  children: ReactNode;
  /** Vertical padding differs between the course tags (4px) and certificate statuses (3px). */
  className?: string;
};

export function Pill({ tone, children, className = "py-1" }: PillProps) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 type-caption ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
