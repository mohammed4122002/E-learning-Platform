import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheckBig, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";

/*
 * Figma "Feedback / Alert" (59:46) — icons TG/Information · Status/Success · Warning · Notifications/Error (octagon-x): tint bg + 1.5px tone border, r12, p 14/16, gap 12, icon 20,
 * title 17 Regular tone, body 15 Regular text/secondary.
 */
const tones = {
  info: { box: "bg-state-info-bg border-state-info text-state-info", icon: Info },
  success: { box: "bg-state-success-bg border-state-success text-state-success", icon: CircleCheckBig },
  warning: { box: "bg-state-warning-bg border-state-warning text-state-warning", icon: TriangleAlert },
  error: { box: "bg-state-error-bg border-state-error text-state-error", icon: OctagonX },
} as const;

export type Tone = keyof typeof tones;

type AlertProps = {
  tone?: Tone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function Alert({ tone = "info", title, children, action, className }: AlertProps) {
  const t = tones[tone];
  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={`flex w-full items-start gap-3 rounded-12 border-[1.5px] px-4 py-3.5 ${t.box} ${className ?? ""}`}
    >
      <Glyph icon={t.icon} size={20} className="mt-1" />
      <div className="flex flex-1 flex-col gap-1">
        <p className="type-body">{title}</p>
        {children && <div className="type-small text-text-secondary">{children}</div>}
      </div>
      {action}
    </div>
  );
}

/*
 * Figma "Feedback / Empty State" (59:168): bg/page, 1.5px border/divider, r16, p 40/32, gap 12,
 * 56px brand-tint tile (r16) with a 20px icon, title 19 Bold, body 15 Regular text/secondary.
 */
type EmptyStateProps = {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: "brand" | "error";
  className?: string;
};

export function EmptyState({ icon = CircleAlert, title, description, action, tone = "brand", className }: EmptyStateProps) {
  return (
    <div
      className={`flex w-full flex-col items-center gap-3 rounded-16 border-[1.5px] border-border-divider bg-bg-page px-8 py-10 text-center ${className ?? ""}`}
    >
      <div className={`flex size-14 items-center justify-center rounded-16 ${tone === "error" ? "bg-state-error-bg text-state-error" : "bg-bg-brand-tint text-text-brand"}`}>
        <Glyph icon={icon} size={20} />
      </div>
      <h2 className="type-title text-text-primary">{title}</h2>
      {description && <p className="max-w-md type-small text-text-secondary">{description}</p>}
      {action && <div className="mt-1 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}

/* Figma "Feedback / Loading State" (59:178): 20px loader + 15 Regular text/muted. */
export function Spinner({ label = "جارٍ التحميل", inline = false, className }: { label?: string; inline?: boolean; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center justify-center gap-3 px-6 py-4 text-text-muted ${inline ? "flex-row" : "flex-col"} ${className ?? ""}`}>
      <LoaderCircle aria-hidden size={20} strokeWidth={1.4} absoluteStrokeWidth className="animate-[tg-spin_0.9s_linear_infinite] text-text-brand" />
      <span className="type-small">{label}</span>
    </div>
  );
}

/* Figma "Feedback / Skeleton" (59:196). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={`animate-shimmer rounded-12 ${className ?? ""}`} />;
}
