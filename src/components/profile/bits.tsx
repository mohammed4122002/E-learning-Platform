import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Building2, Globe, Lock } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";

/*
 * Small building blocks shared by the profile, verification and account screens
 * (TRN-PRF-*, TRN-VER-*, GEN-ACC-01). All colours come from the semantic tokens.
 */

const pillTones = {
  info: "bg-state-info-bg text-state-info",
  warning: "bg-state-warning-bg text-state-warning",
  success: "bg-state-success-bg text-state-success",
  error: "bg-state-error-bg text-state-error",
  brand: "bg-bg-brand-tint text-text-brand",
  neutral: "bg-bg-surface text-text-secondary",
  "surface-warning": "bg-bg-surface text-state-warning",
  "surface-success": "bg-bg-surface text-state-success",
  "surface-info": "bg-bg-surface text-state-info",
  "surface-error": "bg-bg-surface text-state-error",
  "surface-brand": "bg-bg-surface text-text-brand",
} as const;

export type PillTone = keyof typeof pillTones;

/** Rounded status pill: px 10 · py 5 · gap 6 · 16px icon · 14 Regular. */
export function IconPill({ tone, icon, children, className }: { tone: PillTone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[5px] type-caption ${pillTones[tone]} ${className ?? ""}`}>
      {icon && <Glyph icon={icon} size={16} />}
      {children}
    </span>
  );
}

export type Visibility = "public" | "providers" | "private";

const visibility: Record<Visibility, { tone: PillTone; icon: LucideIcon; label: string }> = {
  public: { tone: "info", icon: Globe, label: "عام" },
  providers: { tone: "warning", icon: Building2, label: "الجهات" },
  private: { tone: "success", icon: Lock, label: "خاص" },
};

/** "عام / الجهات / خاص" visibility tag used on every profile section (TRN-PRF-01). */
export function VisibilityPill({ value, label }: { value: Visibility; label?: string }) {
  const v = visibility[value];
  return (
    <IconPill tone={v.tone} icon={v.icon}>
      {label ?? v.label}
    </IconPill>
  );
}

/** White card: 1px border/default · r16 · p24 · gap16 · card shadow. */
export function SectionCard({
  title,
  titleId,
  aside,
  children,
  className,
  tone = "default",
}: {
  title?: ReactNode;
  titleId?: string;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
  tone?: "default" | "warning" | "success" | "error";
}) {
  const toneCls = {
    default: "border border-border-default bg-bg-card shadow-card",
    warning: "border-[1.5px] border-state-warning bg-state-warning-bg",
    success: "border border-state-success/30 bg-state-success-bg",
    error: "border-[1.5px] border-state-error bg-state-error-bg",
  }[tone];
  const titleCls = { default: "text-text-primary", warning: "text-state-warning", success: "text-state-success", error: "text-state-error" }[tone];
  return (
    <section aria-labelledby={titleId} className={`flex w-full min-w-0 flex-col gap-4 rounded-16 p-5 sm:p-6 ${toneCls} ${className ?? ""}`}>
      {(title || aside) && (
        <div className="flex flex-wrap items-center gap-3">
          {title && (
            <h2 id={titleId} className={`min-w-0 flex-1 type-h3 ${titleCls}`}>
              {title}
            </h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/** Row with a 36px white icon tile, a title and a caption (explainer lists on the side cards). */
export function TileRow({
  icon,
  title,
  caption,
  tone = "page",
  iconClass = "text-text-brand",
  titleClass = "text-text-primary",
  action,
}: {
  icon: LucideIcon;
  title: ReactNode;
  caption?: ReactNode;
  tone?: "page" | "success" | "warning" | "info" | "error" | "surface";
  iconClass?: string;
  titleClass?: string;
  action?: ReactNode;
}) {
  const bg = {
    page: "bg-bg-page",
    success: "bg-state-success-bg",
    warning: "bg-state-warning-bg",
    info: "bg-state-info-bg",
    error: "bg-state-error-bg",
    surface: "bg-bg-surface",
  }[tone];
  return (
    <div className={`flex items-start gap-3 rounded-12 px-3 py-[11px] ${bg}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${iconClass}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={`type-small ${titleClass}`}>{title}</p>
        {caption && <p className="type-caption text-text-muted">{caption}</p>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

/*
 * Flow panels of TRN-PRF-03 / TRN-PRF-04: a coloured notice, a "data card" of label/value rows,
 * an action row and an optional dashed dropzone.
 */
const noticeTones = {
  brand: "border-action-primary bg-bg-brand-tint text-text-brand",
  success: "border-state-success bg-state-success-bg text-state-success",
  error: "border-state-error bg-state-error-bg text-state-error",
  warning: "border-state-warning bg-state-warning-bg text-state-warning",
  neutral: "border-border-default bg-bg-page text-text-primary",
} as const;

export type NoticeTone = keyof typeof noticeTones;

export function FlowNotice({ tone, title, children }: { tone: NoticeTone; title: string; children?: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex w-full flex-col gap-2 rounded-16 border-[1.5px] px-6 py-[22px] ${noticeTones[tone]}`}
    >
      <p className="text-[22px] font-bold leading-snug">{title}</p>
      {children && <p className="type-small text-text-secondary">{children}</p>}
    </div>
  );
}

export function DataCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-16 border border-border-default bg-bg-surface p-5 sm:p-6">
      <h2 className="type-title text-text-primary">{title}</h2>
      {children}
    </div>
  );
}

const valueTones = {
  default: "text-text-primary",
  muted: "text-text-secondary",
  brand: "text-text-brand",
  success: "text-state-success",
  error: "text-state-error",
  warning: "text-state-warning",
} as const;

export function DataRow({
  label,
  value,
  tone = "default",
  action,
  tag,
}: {
  label: string;
  value: ReactNode;
  tone?: keyof typeof valueTones;
  action?: ReactNode;
  tag?: ReactNode;
}) {
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-12 border border-border-default bg-bg-page px-4 py-[11px]">
      <span className="type-caption text-text-secondary">{label}</span>
      <span className={`type-small font-bold ${valueTones[tone]}`}>{value}</span>
      {tag}
      {action && <span className="ms-auto">{action}</span>}
    </div>
  );
}

/** "إلزامي / اختياري / معطّل" field tags of the experience form (TRN-PRF-04 · إضافة). */
export function FieldTag({ kind }: { kind: "required" | "optional" | "disabled" }) {
  const map = {
    required: { cls: "border-state-error text-state-error", label: "إلزامي" },
    optional: { cls: "border-border-default text-text-secondary", label: "اختياري" },
    disabled: { cls: "border-border-default text-text-disabled", label: "معطّل" },
  }[kind];
  return <span className={`rounded-full border bg-bg-surface px-2 py-px text-[12px] leading-5 ${map.cls}`}>{map.label}</span>;
}

/** Lucide icon tile used as the leading visual of list rows (40px, r8, surface). */
export function IconTile({ icon, className, size = "m" }: { icon: LucideIcon; className?: string; size?: "s" | "m" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-8 bg-bg-surface ${size === "m" ? "size-10" : "size-9"} ${className ?? "text-text-brand"}`}
    >
      <Glyph icon={icon} size={20} />
    </span>
  );
}

/** Page heading used by the edit/settings screens (h1 36 Bold + body description). */
export function PageHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-[30px] font-bold leading-[1.2] text-text-primary sm:text-[36px]">{title}</h2>
      {description && <p className="type-body text-text-secondary">{description}</p>}
    </div>
  );
}
