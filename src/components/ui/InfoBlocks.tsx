import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";

/*
 * Recurring Figma blocks of the TRN-CRT / RTG / HLP / INQ / RPT screens.
 */

type Tone = "brand" | "success" | "warning" | "error" | "info";

const heroTones: Record<Tone, string> = {
  brand: "bg-bg-brand-tint border-transparent",
  success: "bg-state-success-bg border-state-success",
  warning: "bg-state-warning-bg border-state-warning",
  error: "bg-state-error-bg border-state-error",
  info: "bg-state-info-bg border-state-info",
};
const iconTones: Record<Tone, string> = {
  brand: "text-text-brand",
  success: "text-state-success",
  warning: "text-state-warning",
  error: "text-state-error",
  info: "text-state-info",
};

/**
 * Status hero (e.g. 205:11620 «مبروك — شهادتك صادرة», 4146:661 «قيد المراجعة», 227:13838 «استلمنا بلاغك»):
 * tone tint + 2px tone border, r22, p 24/28, gap 22, 36 Bold title + 18 body, white icon disc (64px) at the start.
 */
export function StatusHero({
  tone,
  icon,
  title,
  titleTone,
  children,
  eyebrow,
  footer,
  lead,
  square,
}: {
  tone: Tone;
  icon?: LucideIcon;
  title: ReactNode;
  /** Title colour (defaults to text/primary). */
  titleTone?: Tone;
  children?: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  /** Replaces the icon disc (e.g. a progress ring). */
  lead?: ReactNode;
  /** 60px r16 tile instead of the round disc (206:11868). */
  square?: boolean;
}) {
  return (
    <section className={`flex w-full flex-col items-start gap-4 rounded-22 border-2 px-5 py-6 sm:flex-row sm:items-center sm:gap-[22px] sm:px-7 ${heroTones[tone]}`}>
      {lead ??
        (icon && (
          <span className={`flex shrink-0 items-center justify-center bg-bg-surface ${square ? "size-[60px] rounded-16" : "size-16 rounded-full"} ${iconTones[tone]}`}>
            <Glyph icon={icon} size={32} />
          </span>
        ))}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {eyebrow && <div className="flex flex-wrap items-center gap-2">{eyebrow}</div>}
        <h2 className={`text-[28px] leading-[1.2] font-bold sm:text-[36px] ${titleTone ? iconTones[titleTone] : "text-text-primary"}`}>{title}</h2>
        {children && <div className="type-body-lg text-text-secondary">{children}</div>}
        {footer}
      </div>
    </section>
  );
}

/** Notice box (Figma "Notice" 4136:1398 / 4146:263): tone tint, 1.5px tone border, r14, p 22/24, 22 Bold tone title, 15 body lines. */
export function Notice({ tone, title, children }: { tone: Exclude<Tone, "brand">; title: ReactNode; children?: ReactNode }) {
  return (
    <div role={tone === "error" || tone === "warning" ? "alert" : "status"} className={`flex w-full flex-col gap-2 rounded-[14px] border-[1.5px] px-6 py-[22px] ${heroTones[tone]}`}>
      <p className={`text-[22px] leading-[1.3] font-bold ${iconTones[tone]}`}>{title}</p>
      {children && <div className="flex flex-col gap-2 type-small text-text-secondary">{children}</div>}
    </div>
  );
}

/** Tip strip (219:12801 / 205:11914): tint bg, r12, px 20 py 16, 17 Regular, 20px icon at the start. */
export function TipStrip({ icon, tone = "brand", children }: { icon: LucideIcon; tone?: "brand" | "page" | "info" | "warning"; children: ReactNode }) {
  const cls = {
    brand: "bg-bg-brand-tint text-text-brand",
    page: "bg-bg-page text-text-secondary",
    info: "bg-state-info-bg text-state-info",
    warning: "bg-state-warning-bg text-state-warning",
  }[tone];
  return (
    <div className={`flex w-full items-start gap-3 rounded-12 px-4 py-3 sm:items-center sm:px-5 sm:py-4 ${cls}`}>
      <Glyph icon={icon} size={20} className="mt-1 sm:mt-0" />
      <p className="min-w-0 flex-1 type-body">{children}</p>
    </div>
  );
}

/**
 * Icon row (205:11921 «٤٠ سؤالًا», 4146:679 «مشفّرة من لحظة الرفع», 227:13695 «هويتك لا تُكشف»):
 * page or success tint, r12, p 11/12, gap 10, 36px white tile (r8) with a 20px icon, 16 Medium/15 + 14 muted.
 */
export function IconRow({
  icon,
  title,
  description,
  tone = "page",
  titleSize = "subtitle",
}: {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  tone?: "page" | "success";
  titleSize?: "subtitle" | "small";
}) {
  return (
    <li className={`flex w-full items-start gap-2.5 rounded-12 px-3 py-[11px] ${tone === "success" ? "bg-state-success-bg" : "bg-bg-page"}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${tone === "success" ? "text-state-success" : "text-text-brand"}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={titleSize === "subtitle" ? "type-subtitle text-text-primary" : "type-small text-text-primary"}>{title}</span>
        {description && <span className="type-caption text-text-muted">{description}</span>}
      </span>
    </li>
  );
}

/**
 * Condition / step row (205:11665, 205:11876, 4146:711): r12 p 13/14, gap 12, 16 Medium + 14 muted,
 * white disc (36–40px) with the state icon. `state`: done (success check), current (warning tint + border), todo (muted).
 */
export function StepRow({
  title,
  description,
  state,
  icon,
  disc = 36,
}: {
  title: ReactNode;
  description?: ReactNode;
  state: "done" | "current" | "todo" | "alert";
  icon?: LucideIcon;
  disc?: 36 | 40;
}) {
  const box =
    state === "current" || state === "alert"
      ? "bg-state-warning-bg border-[1.5px] border-state-warning"
      : "bg-bg-page";
  const iconCls = state === "done" ? "text-state-success" : state === "current" || state === "alert" ? "text-state-warning" : "text-text-muted";
  const Icon = icon ?? (state === "done" ? CircleCheck : CircleAlert);
  return (
    <li className={`flex w-full items-start gap-3 rounded-12 px-3.5 py-[13px] ${box}`}>
      <span className={`flex shrink-0 items-center justify-center rounded-full bg-bg-surface ${disc === 40 ? "size-10" : "size-9"} ${iconCls}`}>
        <Glyph icon={Icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className={`type-subtitle ${state === "alert" ? "text-state-warning" : state === "todo" ? "text-text-muted" : "text-text-primary"}`}>{title}</span>
        {description && <span className="type-caption text-text-muted">{description}</span>}
      </span>
      <span className="sr-only">{state === "done" ? "مكتمل" : state === "current" ? "جارٍ الآن" : state === "alert" ? "لم يُستوفَ بعد" : "لاحقًا"}</span>
    </li>
  );
}

/** Key/value line (206:11959 ملخّص تقييمك, 227:13906 تفاصيل البلاغ). */
export function KeyValue({ label, value, valueClass }: { label: ReactNode; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex w-full items-center gap-3">
      <dt className="min-w-0 flex-1 type-body text-text-secondary">{label}</dt>
      <dd className={`shrink-0 type-subtitle ${valueClass ?? "text-text-primary"}`}>{value}</dd>
    </div>
  );
}

/** Pill with an icon on a white/tinted background (e.g. «يتبقى ٤ أيام», «منشور باسمك», «٣ جديدة»). */
export function IconPill({ icon, children, tone = "surface-warning" }: { icon?: LucideIcon; children: ReactNode; tone?: "surface-warning" | "surface-brand" | "surface-success" | "success" | "warning" | "brand" | "page" | "error" }) {
  const cls = {
    "surface-warning": "bg-bg-surface text-state-warning",
    "surface-brand": "bg-bg-surface text-text-brand",
    "surface-success": "bg-bg-surface text-state-success",
    success: "bg-state-success-bg text-state-success",
    warning: "bg-state-warning-bg text-state-warning",
    brand: "bg-bg-brand-tint text-text-brand",
    page: "bg-bg-page text-text-secondary",
    error: "bg-state-error-bg text-state-error",
  }[tone];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[5px] type-caption whitespace-nowrap ${cls}`}>
      {icon && <Glyph icon={icon} size={16} />}
      {children}
    </span>
  );
}
