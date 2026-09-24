import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";

/*
 * Building blocks shared by TRR-AFL-01/02/03, TRR-CTR-01/02/03 and TRR-RPT-01/02.
 * Sizes come from get_design_context of the frames; colours are semantic tokens only.
 */

export type Tone = "brand" | "success" | "warning" | "error" | "info" | "neutral";

const tint: Record<Tone, string> = {
  brand: "bg-bg-brand-tint border-action-primary",
  success: "bg-state-success-bg border-state-success",
  warning: "bg-state-warning-bg border-state-warning",
  error: "bg-state-error-bg border-state-error",
  info: "bg-state-info-bg border-state-info",
  neutral: "bg-bg-page border-border-default",
};
export const toneText: Record<Tone | "primary" | "muted", string> = {
  brand: "text-text-brand",
  success: "text-state-success",
  warning: "text-state-warning",
  error: "text-state-error",
  info: "text-state-info",
  neutral: "text-text-secondary",
  primary: "text-text-primary",
  muted: "text-text-secondary",
};

export type ResultRow = { label: string; value: ReactNode; tone?: keyof typeof toneText };

/**
 * Result card with key/value rows (4266:2 «تم إنشاء الارتباط», 4266:363 «أُنهي الارتباط», 4265:2 «مراجعة العقد قبل التوقيع» …):
 * 2px tone border on its tint, r14, p24, gap10, 20 Bold title, 15 intro; rows bg/page + 1px border, r10, px16 py13,
 * 13.5 label + 15 Bold value.
 */
export function ResultPanel({ tone, title, intro, rows, children, surface }: { tone: Tone; title: ReactNode; intro?: ReactNode; rows: ResultRow[]; children?: ReactNode; surface?: boolean }) {
  return (
    <section className={`flex w-full flex-col gap-2.5 rounded-[14px] border-2 p-5 sm:p-6 ${surface ? "border-border-default bg-bg-surface" : tint[tone]}`}>
      <h2 className={`text-[20px] leading-[1.4] font-bold ${tone === "neutral" ? "text-text-primary" : toneText[tone]}`}>{title}</h2>
      {intro && <div className="text-[15px] leading-normal text-text-secondary">{intro}</div>}
      <dl className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px]">
            <dt className="text-[13.5px] leading-normal text-text-secondary">{r.label}</dt>
            <dd className={`text-[15px] leading-normal font-bold ${r.tone ? toneText[r.tone] : "text-text-primary"}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}

/** «Action Row» button of the result cards: r10, px28 py15, 16 Bold (primary filled / outline brand). */
export function ActionRowLink({ href, children, outline }: { href: string; children: ReactNode; outline?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-[10px] px-7 py-[15px] text-[16px] leading-normal font-bold focus-ring ${
        outline ? "border-[1.5px] border-action-primary bg-bg-surface text-text-brand hover:bg-bg-brand-tint" : "bg-action-primary text-text-on-brand hover:bg-action-primary-hover"
      }`}
    >
      {children}
    </Link>
  );
}

export const actionRowButtonClass = (outline?: boolean) =>
  `inline-flex cursor-pointer items-center justify-center rounded-[10px] px-7 py-[15px] text-[16px] leading-normal font-bold focus-ring disabled:cursor-not-allowed disabled:opacity-60 ${
    outline ? "border-[1.5px] border-action-primary bg-bg-surface text-text-brand hover:bg-bg-brand-tint" : "bg-action-primary text-text-on-brand hover:bg-action-primary-hover"
  }`;

/** Card (r16 p24 gap16 · or r22 p26 gap18 for the larger frames), 1px border, card shadow. */
export function Card({ children, big, className, as: Tag = "section", labelledBy }: { children: ReactNode; big?: boolean; className?: string; as?: "section" | "div"; labelledBy?: string }) {
  return (
    <Tag
      aria-labelledby={labelledBy}
      className={`flex w-full flex-col items-start border border-border-default bg-bg-card shadow-card ${big ? "gap-[18px] rounded-22 p-5 sm:p-[26px]" : "gap-4 rounded-16 p-5 sm:p-6"} ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
}

/** Tinted card with a 2px tone border (warning invitation, «ماذا يحدث بعد القبول؟», «ما الذي يتوقف» …). */
export function ToneCard({ tone, children, big, className }: { tone: Exclude<Tone, "neutral">; children: ReactNode; big?: boolean; className?: string }) {
  return <section className={`flex w-full flex-col items-start gap-4 border-2 px-5 pt-6 pb-[26px] sm:px-6 ${big ? "rounded-22" : "rounded-16"} ${tint[tone]} ${className ?? ""}`}>{children}</section>;
}

/** Hero (293:8661 / 293:9014 / 282:6533 / 310:10596): tint + 2px border, r22, px30 py28, 72px white tile, pills, 36 Bold title, 18 body. */
export function Hero({ tone, icon, pills, title, children, tile = 72, compact }: { tone: Exclude<Tone, "neutral">; icon: LucideIcon; pills?: ReactNode; title: ReactNode; children?: ReactNode; tile?: 64 | 68 | 72; compact?: boolean }) {
  const tileCls = tile === 64 ? "size-16" : tile === 68 ? "size-[68px]" : "size-[72px]";
  return (
    <section className={`flex w-full flex-col items-start gap-5 rounded-22 border-2 px-5 py-6 sm:flex-row sm:items-center ${compact ? "sm:gap-6 sm:px-7 sm:py-6" : "sm:gap-[26px] sm:px-[30px] sm:py-7"} ${tint[tone]}`}>
      <span className={`flex shrink-0 items-center justify-center rounded-16 bg-bg-surface ${tileCls} ${toneText[tone]}`}>
        <Glyph icon={icon} size={32} />
      </span>
      <div className={`flex min-w-0 flex-1 flex-col ${compact ? "gap-2" : "gap-2.5"}`}>
        {pills && <div className="flex flex-wrap items-center gap-2">{pills}</div>}
        <h1 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{title}</h1>
        {children && <div className="type-body-lg text-text-secondary">{children}</div>}
      </div>
    </section>
  );
}

/** White pill with icon (hero chips): px14 py9, 16 Medium. */
export function HeroPill({ icon, tone, children }: { icon: LucideIcon; tone: keyof typeof toneText; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-[7px] rounded-full bg-bg-surface px-3.5 py-[9px] type-subtitle ${toneText[tone]}`}>
      <Glyph icon={icon} size={20} />
      {children}
    </span>
  );
}

/** Small pill (px10 py5, 14 Regular) on a surface or tint. */
export function SmallPill({ icon, tone, bg = "surface", children }: { icon?: LucideIcon; tone: keyof typeof toneText; bg?: "surface" | "success" | "brand" | "page"; children: ReactNode }) {
  const b = { surface: "bg-bg-surface", success: "bg-state-success-bg", brand: "bg-bg-brand-tint", page: "bg-bg-page" }[bg];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[5px] type-caption ${b} ${toneText[tone]}`}>
      {icon && <Glyph icon={icon} size={16} />}
      {children}
    </span>
  );
}

/** Row with a 44px page-tinted tile, 19 Bold title + 17 body (293:8998 «ماذا يحدث بعد القبول؟», 293:9051 …). */
export function TileRow({ icon, title, body, iconTone = "brand", tileBg = "page" }: { icon: LucideIcon; title: ReactNode; body: ReactNode; iconTone?: keyof typeof toneText; tileBg?: "page" | "surface" }) {
  return (
    <li className="flex w-full items-start gap-3.5 rounded-16 bg-bg-surface px-[18px] py-4">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-12 ${tileBg === "page" ? "bg-bg-page" : "bg-bg-surface"} ${toneText[iconTone]}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="type-title text-text-primary">{title}</span>
        <span className="type-body text-text-secondary">{body}</span>
      </span>
    </li>
  );
}

/** Compact info row on bg/page: 36–40px white tile, 15–16 title + 14 muted (282:7038 «بيع مباشر», 293:9027 …). */
export function InfoTile({
  icon,
  title,
  body,
  titleTone = "primary",
  iconTone = "brand",
  tile = 36,
  titleSize = "small",
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  titleTone?: keyof typeof toneText;
  iconTone?: keyof typeof toneText;
  tile?: 36 | 40;
  titleSize?: "small" | "subtitle";
  className?: string;
}) {
  return (
    <div className={`flex w-full items-start gap-2.5 rounded-12 bg-bg-page px-3 py-[11px] ${className ?? ""}`}>
      <span className={`flex shrink-0 items-center justify-center rounded-8 bg-bg-surface ${tile === 40 ? "size-10" : "size-9"} ${toneText[iconTone]}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`${titleSize === "small" ? "type-small" : "type-subtitle"} ${toneText[titleTone]}`}>{title}</span>
        {body && <span className="type-caption text-text-muted">{body}</span>}
      </span>
    </div>
  );
}

/** Two-column page body: main column (inline-start) + fixed aside (380/400/420px), stacked below lg. */
export function Columns({ main, aside, asideWidth = 380, gap = 24 }: { main: ReactNode; aside: ReactNode; asideWidth?: 380 | 400 | 420; gap?: 24 | 26 }) {
  const w = asideWidth === 380 ? "lg:w-[380px]" : asideWidth === 400 ? "lg:w-[400px]" : "lg:w-[420px]";
  return (
    <div className={`flex w-full flex-col items-start lg:flex-row ${gap === 26 ? "gap-6 lg:gap-[26px]" : "gap-6"}`}>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-6">{main}</div>
      <aside className={`flex w-full shrink-0 flex-col gap-5 ${w}`}>{aside}</aside>
    </div>
  );
}
