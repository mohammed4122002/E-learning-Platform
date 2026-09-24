import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Ban, CircleAlert, CircleCheck, CircleX, Clock, Hourglass, Timer } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { Countdown } from "@/components/ui/Countdown";
import { HmsCountdown } from "./HmsCountdown";
import { formatPercent, toArabicDigits } from "@/lib/format";
import type { ChipIcon } from "@/lib/data/money";

/*
 * Building blocks shared by the trainings / money / waitlist screens (TRN-QUE, TRN-MYE, TRN-RFD, TRN-DSP, TRN-WTL).
 * All values come from the Figma frames; colours are semantic tokens only.
 */

export type ChipTone = "brand" | "info" | "success" | "warning" | "error" | "neutral" | "surface";

const chipTones: Record<ChipTone, string> = {
  brand: "bg-bg-brand-tint text-text-brand",
  info: "bg-state-info-bg text-state-info",
  success: "bg-state-success-bg text-state-success",
  warning: "bg-state-warning-bg text-state-warning",
  error: "bg-state-error-bg text-state-error",
  neutral: "bg-bg-disabled text-text-muted",
  surface: "bg-bg-surface text-text-secondary",
};

export const CHIP_ICONS: Record<ChipIcon, LucideIcon> = {
  timer: Timer,
  clock: Clock,
  check: CircleCheck,
  alert: CircleAlert,
  ban: Ban,
  hourglass: Hourglass,
  x: CircleX,
};

/** Status pill used inside cards (px 10 · py 5 · gap 6 · 14 Regular · 16px icon). */
export function Chip({ tone = "neutral", icon, children, className }: { tone?: ChipTone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[5px] type-caption ${chipTones[tone]} ${className ?? ""}`}>
      {icon && <Glyph icon={icon} size={16} className="shrink-0" />}
      <span className="min-w-0 whitespace-normal">{children}</span>
    </span>
  );
}

/** Countdown pill ("يتبقى ١٢:٠٤") — hold timers and invite deadlines. */
export function CountdownChip({ until, label, tone = "error", mono = false }: { until: string; label?: string; tone?: ChipTone; mono?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[5px] type-caption ${chipTones[tone]} ${mono ? "font-semibold" : ""}`}>
      <Glyph icon={Timer} size={16} />
      {label && <span>{label}</span>}
      {mono ? <HmsCountdown until={until} /> : <Countdown until={until} />}
    </span>
  );
}

/** Figma "Data / Chip" as a filter link: 36px pill; active = brand-tint + 1.5px action/primary. */
export function FilterChip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`inline-flex h-9 min-w-[64px] shrink-0 items-center justify-center rounded-full px-3.5 type-small focus-ring ${
        active ? "border-[1.5px] border-action-primary bg-bg-brand-tint text-text-brand" : "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-brand-tint"
      }`}
    >
      {children}
    </Link>
  );
}

/** Choice chip for radio-like selections inside forms (withdraw / refund / dispute reasons). */
export function ChoiceChips({ name, options, value, onChange, label }: { name: string; options: readonly { value: string; label: string }[]; value: string; onChange?: (v: string) => void; label: string }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={`relative inline-flex h-9 cursor-pointer items-center rounded-full px-3.5 type-small has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-border-focus ${
              value === o.value ? "border-[1.5px] border-action-primary bg-bg-brand-tint text-text-brand" : "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-brand-tint"
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange?.(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const cardTones: Record<"error" | "warning" | "success" | "neutral" | "brand" | "info", { tile: string; border: string }> = {
  error: { tile: "bg-state-error-bg text-state-error", border: "border-2 border-state-error" },
  warning: { tile: "bg-state-warning-bg text-state-warning", border: "border-2 border-state-warning" },
  success: { tile: "bg-state-success-bg text-state-success", border: "border-2 border-state-success" },
  neutral: { tile: "bg-bg-disabled text-text-muted", border: "border-2 border-border-default" },
  brand: { tile: "bg-bg-brand-tint text-text-brand", border: "border-2 border-action-primary" },
  info: { tile: "bg-state-info-bg text-state-info", border: "border-2 border-state-info" },
};
export type ItemTone = keyof typeof cardTones;

export type Fact = { icon: LucideIcon; label: string; value: ReactNode; valueClass?: string };

/**
 * Figma "Platform / Queue Item" (153:2089) and "Platform / Waitlist Entry": status tile · title + badge · description ·
 * facts strip (bg/page, r8) · ref/meta row · actions column (primary 48px + muted secondary).
 */
export function StatusItemCard({
  tone,
  icon,
  highlight = false,
  title,
  badge,
  description,
  facts,
  refCode,
  meta,
  footerChip,
  actions,
  headingLevel: H = "h2",
  refFirst = false,
}: {
  tone: ItemTone;
  icon: LucideIcon;
  highlight?: boolean;
  title: string;
  badge?: ReactNode;
  description: ReactNode;
  facts: Fact[];
  refCode: string;
  meta?: ReactNode;
  footerChip?: ReactNode;
  actions: ReactNode;
  headingLevel?: "h2" | "h3";
  /** Reference code at the inline start of the footer row (TRR-QUE-01 order). */
  refFirst?: boolean;
}) {
  const t = cardTones[tone];
  const ref = (
    <span dir="ltr" className="font-mono text-[14px] leading-normal text-text-muted">
      {refCode}
    </span>
  );
  return (
    <article
      className={`flex w-full flex-col gap-4 rounded-16 bg-bg-card px-[22px] py-5 drop-shadow-milestone sm:flex-row sm:items-start sm:gap-5 ${highlight ? t.border : "border border-border-default"}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-5">
        <div className={`flex size-14 shrink-0 items-center justify-center rounded-12 ${t.tile}`}>
          <Glyph icon={icon} size={20} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex w-full flex-wrap items-center gap-2.5">
            <H className="min-w-0 flex-1 type-title text-text-primary">{title}</H>
            {badge}
          </div>
          <p className="type-body text-text-secondary">{description}</p>
          {facts.length > 0 && (
            <dl className="flex w-full flex-wrap items-center gap-x-[18px] gap-y-2 rounded-8 bg-bg-page px-3 py-2.5">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center gap-1.5">
                  <Glyph icon={f.icon} size={16} className="text-text-muted" />
                  <dt className="whitespace-nowrap type-caption text-text-muted">{f.label}</dt>
                  <dd className={`type-caption ${f.valueClass ?? "text-text-primary"}`}>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex w-full flex-wrap items-center gap-2.5">
            {refFirst && ref}
            {footerChip}
            {meta && <span className="type-caption text-text-muted">{meta}</span>}
            {!refFirst && ref}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-row flex-wrap items-center gap-2.5 sm:flex-col sm:flex-nowrap">{actions}</div>
    </article>
  );
}

const noticeTones = {
  brand: "bg-bg-brand-tint border-action-primary text-text-brand",
  success: "bg-state-success-bg border-state-success text-state-success",
  warning: "bg-state-warning-bg border-state-warning text-state-warning",
  error: "bg-state-error-bg border-state-error text-state-error",
  neutral: "bg-bg-page border-border-default text-text-primary",
  info: "bg-state-info-bg border-state-info text-state-info",
} as const;
export type NoticeTone = keyof typeof noticeTones;

/** Status banner of the TRN-MYE-02 sub-states: tint + 1.5px tone border, r14, px 24 / py 22, title 22 Bold. */
export function Notice({ tone, title, children, action }: { tone: NoticeTone; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <section
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={`flex w-full flex-col gap-2 rounded-[14px] border-[1.5px] px-6 py-[22px] ${noticeTones[tone]}`}
    >
      <div className="flex items-start gap-3">
        <h2 className="flex-1 text-[22px] font-bold leading-snug">{title}</h2>
        {action}
      </div>
      {children && <div className="flex flex-col gap-2 type-small text-text-secondary">{children}</div>}
    </section>
  );
}

/** "Data Card": white card, 1px border, r14, p24; rows = bg/page pills with muted label + bold value. */
export function DataCard({ title, rows }: { title: string; rows: { label: string; value: ReactNode; tone?: "brand" | "success" | "error" | "warning" }[] }) {
  const toneClass = { brand: "text-text-brand", success: "text-state-success", error: "text-state-error", warning: "text-state-warning" };
  return (
    <section className="flex w-full flex-col gap-2.5 rounded-[14px] border border-border-default bg-bg-card p-6">
      <h2 className="type-title text-text-primary">{title}</h2>
      <dl className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px]">
            <dt className="text-[13.5px] leading-normal text-text-secondary">{r.label}</dt>
            <dd className={`text-[15px] font-bold leading-normal ${r.tone ? toneClass[r.tone] : "text-text-primary"}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Content card: surface, 1px border, r16, card shadow, p24, gap16 with a 20 Medium title. */
export function SectionCard({ title, aside, children, className, id }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section aria-labelledby={id} className={`flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card ${className ?? ""}`}>
      <div className="flex items-center gap-3">
        <h2 id={id} className="min-w-0 flex-1 type-h3 text-text-primary">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Label/value row of "معلومات التسجيل": icon + label (17 secondary, flex-1) · value (16 Medium). */
export function InfoRow({ icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <dt className="flex min-w-0 flex-1 items-center gap-2 text-text-secondary">
        <Glyph icon={icon} size={16} />
        <span className="type-body">{label}</span>
      </dt>
      <dd className="text-end type-subtitle text-text-primary">{value}</dd>
    </div>
  );
}

/** Amount/line rows of the refund summaries ("المبلغ المدفوع · ٢٢٠ ر.س"). */
export function SummaryRow({ label, value, valueClass }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="min-w-0 flex-1 type-body text-text-secondary">{label}</dt>
      <dd className={`whitespace-nowrap type-subtitle ${valueClass ?? "text-text-primary"}`}>{value}</dd>
    </div>
  );
}

/** Figma "Data / Progress" ring (110 box, 88px ring): accent value over a border/default track. */
export function ProgressRing({ percent, label }: { percent: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(percent)));
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="relative flex size-[110px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 88 88" className="size-[88px] -rotate-90" aria-hidden>
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-border-default)" strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-action-accent)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} />
      </svg>
      <span className="absolute type-body text-text-primary">{formatPercent(v)}</span>
    </div>
  );
}

/** Linear "Data / Progress" with a caption row (label start · percent end) on a 10px accent bar. */
export function LabeledProgress({ label, percent }: { label: string; percent: number }) {
  const v = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 type-caption text-text-secondary">
        <span>{label}</span>
        <span>{formatPercent(v)}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-2.5 w-full overflow-hidden rounded-full bg-border-default">
        <div className="h-full rounded-full bg-action-accent" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

/** Step row of "مسار طلبك": 40px round white icon, title 16 Medium + caption; current = warning tint + 1.5px border. */
export function PathStep({ icon, title, caption, state }: { icon: LucideIcon; title: string; caption: ReactNode; state: "done" | "current" | "current-success" | "todo" | "failed" }) {
  const box =
    state === "current"
      ? "bg-state-warning-bg border-[1.5px] border-state-warning"
      : state === "current-success"
        ? "bg-state-success-bg border-[1.5px] border-state-success"
        : state === "failed"
          ? "bg-state-error-bg border-[1.5px] border-state-error"
          : "bg-bg-page";
  const iconTone =
    state === "done" || state === "current-success" ? "text-state-success" : state === "current" ? "text-state-warning" : state === "failed" ? "text-state-error" : "text-text-muted";
  return (
    <li aria-current={state.startsWith("current") ? "step" : undefined} className={`flex w-full items-start gap-3 rounded-12 px-3.5 py-[13px] ${box}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface ${iconTone}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className={`flex min-w-0 flex-1 flex-col gap-[3px] ${state === "todo" ? "text-text-muted" : ""}`}>
        <span className={`type-subtitle ${state === "todo" ? "" : "text-text-primary"}`}>{title}</span>
        <span className={`type-caption ${state === "todo" ? "" : "text-text-muted"}`}>{caption}</span>
      </span>
    </li>
  );
}

/** "كيف تعمل…" tiles: bg/page r12, 44px brand-tint icon, 16 Medium title, 14 muted text. */
export function HowItWorks({ title, items, id }: { title: string; id: string; items: { icon: LucideIcon; title: string; text: string }[] }) {
  return (
    <section aria-labelledby={id} className="flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
      <h2 id={id} className="type-h3 text-text-primary">
        {title}
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((i) => (
          <li key={i.title} className="flex flex-col items-center gap-2 rounded-12 bg-bg-page px-4 py-[18px] text-center">
            <span className="flex size-11 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
              <Glyph icon={i.icon} size={20} />
            </span>
            <span className="type-subtitle text-text-primary">{i.title}</span>
            <span className="type-caption text-text-muted">{i.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Page heading block used by TRN-QUE-01 / TRN-WTL-01 / TRN-MYE-03 / TRN-RFD-01 (36 Bold + 18 secondary + count badge). */
export function PageHeading({ title, description, count }: { title: string; description: ReactNode; count?: string }) {
  return (
    <div className="flex w-full items-start gap-5">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="text-[28px] font-bold leading-[1.2] text-text-primary sm:text-[36px]">{title}</h2>
        <p className="type-body-lg text-text-secondary">{description}</p>
      </div>
      {count && <span className="inline-flex shrink-0 items-center rounded-full bg-text-on-accent px-3 py-[5px] type-caption text-text-on-brand">{count}</span>}
    </div>
  );
}

export function numberWord(n: number, [zero, one, two, few, many]: [string, string, string, string, string]) {
  if (n === 0) return zero;
  if (n === 1) return one;
  if (n === 2) return two;
  return `${toArabicDigits(n)} ${n <= 10 ? few : many}`;
}
