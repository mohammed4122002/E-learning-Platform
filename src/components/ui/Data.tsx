import Image from "next/image";
import type { ReactNode } from "react";

/*
 * Figma "Data / Badge" (60:38): pill, px 12 py 5, gap 6, 14 Regular. Soft = tint bg + tone text; Solid = tone bg + white.
 */
const badgeSoft = {
  neutral: "bg-bg-disabled text-text-secondary",
  brand: "bg-bg-brand-tint text-text-brand",
  accent: "bg-action-accent/25 text-text-primary",
  success: "bg-state-success-bg text-state-success",
  warning: "bg-state-warning-bg text-state-warning",
  error: "bg-state-error-bg text-state-error",
  info: "bg-state-info-bg text-state-info",
} as const;
const badgeSolid = {
  neutral: "bg-text-secondary text-text-on-brand",
  brand: "bg-action-primary text-text-on-brand",
  accent: "bg-action-accent text-text-on-accent",
  success: "bg-state-success text-text-on-brand",
  warning: "bg-state-warning text-text-on-brand",
  error: "bg-state-error text-text-on-brand",
  info: "bg-state-info text-text-on-brand",
} as const;

export type BadgeTone = keyof typeof badgeSoft;

export function Badge({
  tone = "neutral",
  solid = false,
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  solid?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-[5px] type-caption ${
        solid ? badgeSolid[tone] : badgeSoft[tone]
      } ${className ?? ""}`}
    >
      {icon}
      {children}
    </span>
  );
}

/* Figma "Data / Avatar" (60:73): S 32 · M 40 · L 56; initials 15 Regular white on action/primary. */
const avatarSizes = { s: "size-8 text-[13px]", m: "size-10 text-[15px]", l: "size-14 text-[19px]", xl: "size-24 text-[28px]" } as const;

export function initialsOf(name: string): string {
  // Parenthesised notes («(QA)», «(مساعد)») and tokens that don't start with a letter are not part of the name.
  const parts = name
    .replace(/^(م\.|د\.|أ\.)\s*/, "")
    .replace(/\([^)]*\)?/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w));
  if (parts.length === 0) return "؟";
  // Figma: «سالم الحارثي» → «س ح» — the definite article is not an initial.
  const first = (w: string) => (w.length > 2 && w.startsWith("ال") ? w.slice(2, 3) : w.slice(0, 1));
  return parts.length === 1 ? first(parts[0]) : `${first(parts[0])} ${first(parts[parts.length - 1])}`;
}

export function Avatar({ name, src, size = "m", className }: { name: string; src?: string | null; size?: keyof typeof avatarSizes; className?: string }) {
  const px = { s: 32, m: 40, l: 56, xl: 96 }[size];
  if (src) {
    return <Image src={src} alt={name} width={px} height={px} className={`shrink-0 rounded-full object-cover ${avatarSizes[size]} ${className ?? ""}`} />;
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-action-primary text-text-on-brand ${avatarSizes[size]} ${className ?? ""}`}
    >
      {initialsOf(name)}
    </span>
  );
}

/* Figma "Data / Progress" (60:92): 8px track border/divider, brand fill, rounded. */
export function Progress({ value, label, className }: { value: number; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`h-2 w-full overflow-hidden rounded-full bg-border-divider ${className ?? ""}`}
    >
      <div className="h-full rounded-full bg-action-primary" style={{ width: `${v}%` }} />
    </div>
  );
}

/* Card container used across screens: surface, 1px border/default, r16, card shadow. */
export function Card({ children, className, as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" | "aside" }) {
  return <Tag className={`rounded-16 border border-border-default bg-bg-card shadow-card ${className ?? ""}`}>{children}</Tag>;
}
