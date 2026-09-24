import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { formatPercent } from "@/lib/format";

/*
 * Building blocks of the trainer course-operation frames (TRR-CRS-03/04/05, TRR-ATT, TRR-RES, TRR-CRT, TRR-RTG).
 * Measurements come from the Figma frames (get_design_context); colours are semantic tokens only.
 */

export type OpsTone = "brand" | "success" | "warning" | "error" | "info" | "neutral";

const tint: Record<OpsTone, string> = {
  brand: "bg-bg-brand-tint",
  success: "bg-state-success-bg",
  warning: "bg-state-warning-bg",
  error: "bg-state-error-bg",
  info: "bg-state-info-bg",
  neutral: "bg-bg-disabled",
};
const border: Record<OpsTone, string> = {
  brand: "border-action-primary",
  success: "border-state-success",
  warning: "border-state-warning",
  error: "border-state-error",
  info: "border-state-info",
  neutral: "border-border-default",
};
export const toneText: Record<OpsTone, string> = {
  brand: "text-text-brand",
  success: "text-state-success",
  warning: "text-state-warning",
  error: "text-state-error",
  info: "text-state-info",
  neutral: "text-text-muted",
};

/** Stat card (436:20095): r16, 1px border, card shadow, pt20 pb22 px20, 40px bg/brand-tint icon tile (icon in the tone), 36 Bold value, 14 caption. */
export function StatCard({
  icon,
  label,
  value,
  caption,
  captionTone = "brand",
  iconTone = "brand",
  valueSize = "h1",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  captionTone?: OpsTone | "muted";
  iconTone?: OpsTone;
  /** 36 Bold (TRR-CRS-05 tabs) or 26 Bold (TRR-CRS-03 272:4689 / 327:11847). */
  valueSize?: "h1" | "h2";
}) {
  return (
    <li className="flex min-w-0 flex-col gap-2.5 rounded-16 border border-border-default bg-bg-card px-5 pt-5 pb-[22px] shadow-card">
      <div className="flex items-center gap-2.5">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-brand-tint ${toneText[iconTone]}`}>
          <Glyph icon={icon} size={20} />
        </span>
        <span className="min-w-0 flex-1 type-caption text-text-muted">{label}</span>
      </div>
      <span className={valueSize === "h1" ? "text-[36px] leading-[1.2] font-bold text-text-primary" : "type-h2 text-text-primary"}>{value}</span>
      {caption && <span className={`type-caption ${captionTone === "muted" ? "text-text-muted" : toneText[captionTone]}`}>{caption}</span>}
    </li>
  );
}

export function StatGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {children}
    </ul>
  );
}

/** Content card (436:20237): r22, 1px border, card shadow, p28, gap20; H3 (20 Medium) or H2 (26 Bold) title. */
export function OpsCard({
  title,
  titleId,
  titleSize = "h3",
  titleClass,
  aside,
  description,
  tone,
  children,
  className,
  as: Tag = "section",
}: {
  title?: ReactNode;
  titleId?: string;
  titleSize?: "h3" | "h2";
  titleClass?: string;
  aside?: ReactNode;
  description?: ReactNode;
  /** Tinted card with a 2px tone border (e.g. «متدربان معرّضان للرسوب»). */
  tone?: OpsTone;
  children?: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
}) {
  const box = tone ? `${tint[tone]} border-2 ${border[tone]}` : "border border-border-default bg-bg-card shadow-card";
  return (
    <Tag aria-labelledby={title && titleId ? titleId : undefined} className={`flex w-full min-w-0 flex-col gap-5 rounded-22 p-5 sm:p-7 ${box} ${className ?? ""}`}>
      {(title || aside) && (
        <div className="flex flex-wrap items-center gap-3">
          {title && (
            <h2 id={titleId} className={`min-w-0 flex-1 ${titleSize === "h2" ? "type-h2" : "type-h3"} ${titleClass ?? (tone && tone !== "neutral" ? toneText[tone] : "text-text-primary")}`}>
              {title}
            </h2>
          )}
          {aside}
        </div>
      )}
      {description && <div className={`type-body ${tone ? "text-text-secondary" : "text-text-muted"}`}>{description}</div>}
      {children}
    </Tag>
  );
}

/** Small card of the side columns (272:5331): r16, p24, gap16, H3 title. */
export function SideCard({ title, titleId, description, children, className }: { title: ReactNode; titleId?: string; description?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={titleId} className={`flex w-full min-w-0 flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6 ${className ?? ""}`}>
      <h2 id={titleId} className="type-h3 text-text-primary">
        {title}
      </h2>
      {description && <p className="type-caption text-text-muted">{description}</p>}
      {children}
    </section>
  );
}

/**
 * Status hero (272:5082 «رصد حضور جلسة اليوم»): tone tint + 2px tone border, r22, px28 py24, gap24,
 * 64px white r16 icon tile at the start, chips row, 36 Bold title, 18 body, action at the end.
 */
export function OpsHero({
  tone,
  icon,
  chips,
  title,
  titleTone,
  children,
  action,
  compact,
  tight,
}: {
  tone: OpsTone;
  icon: LucideIcon;
  chips?: ReactNode;
  title: ReactNode;
  titleTone?: OpsTone;
  children?: ReactNode;
  action?: ReactNode;
  /** 26 Bold title (e.g. «١٧ متدربًا يستحقون الشهادة»). */
  compact?: boolean;
  /** 20px gaps and 26px padding + 2px border = Figma's 28px inside-stroke padding (463:35152 «صدرت ١٧ شهادة»). */
  tight?: boolean;
}) {
  return (
    <section className={`flex w-full flex-col items-start gap-4 rounded-22 border-2 px-5 py-6 sm:flex-row sm:items-center ${tight ? "sm:gap-5 sm:px-[26px]" : "sm:gap-6 sm:px-7"} ${tint[tone]} ${border[tone]}`}>
      <span className={`flex size-16 shrink-0 items-center justify-center rounded-16 bg-bg-surface ${toneText[tone === "neutral" ? "neutral" : tone]}`}>
        <Glyph icon={icon} size={32} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {chips && <div className="flex flex-wrap items-center gap-2">{chips}</div>}
        <h2 className={`${compact ? "text-[26px] leading-[1.3]" : "text-[28px] leading-[1.2] sm:text-[36px]"} font-bold ${titleTone ? toneText[titleTone] : "text-text-primary"}`}>{title}</h2>
        {children && <div className="type-body-lg text-text-secondary">{children}</div>}
      </div>
      {action && <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto">{action}</div>}
    </section>
  );
}

/** Pill with a 20px icon (436:20044 «جارية الآن», 436:20158 «٢٠ متدربًا»): px14 py9, 16 Medium. */
export function TagPill({ icon, tone = "brand", children, surface }: { icon?: LucideIcon; tone?: OpsTone; children: ReactNode; surface?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full px-3.5 py-[9px] type-subtitle ${surface ? "bg-bg-surface" : tint[tone]} ${toneText[tone]}`}>
      {icon && <Glyph icon={icon} size={20} />}
      {children}
    </span>
  );
}

/** Small white pill inside tinted heroes (272:5092): px10 py5, 14 Regular, 16px icon. */
export function MiniPill({ icon, tone = "neutral", children, onTint = true }: { icon?: LucideIcon; tone?: OpsTone | "secondary"; children: ReactNode; onTint?: boolean }) {
  const text = tone === "secondary" ? "text-text-secondary" : toneText[tone];
  const bg = onTint ? "bg-bg-surface" : tone === "secondary" ? "bg-bg-page" : tint[tone];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[5px] type-caption ${bg} ${text}`}>
      {icon && <Glyph icon={icon} size={16} />}
      {children}
    </span>
  );
}

/** Rule row (272:5361): bg/page r8, px12 py10, 14 Regular text + 16px tone icon. */
export function RuleRow({ icon, tone = "brand", children }: { icon: LucideIcon; tone?: OpsTone; children: ReactNode }) {
  return (
    <li className="flex w-full items-start gap-2.5 rounded-8 bg-bg-page px-3 py-2.5">
      <Glyph icon={icon} size={16} className={`mt-0.5 ${toneText[tone]}`} />
      <span className="min-w-0 flex-1 type-caption text-text-primary">{children}</span>
    </li>
  );
}

/** Larger rule row (20px icon, 17 body — 276:5002 «قاعدة الاجتياز», 438:20929 «عن الشهادة»): bg/page r12 px14 pt12 pb13 gap10. */
export function RuleItem({ icon, tone = "brand", children, value, valueTone }: { icon: LucideIcon; tone?: OpsTone; children: ReactNode; value?: ReactNode; valueTone?: OpsTone }) {
  return (
    <li className="flex w-full items-center gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px]">
      <Glyph icon={icon} size={20} className={toneText[tone]} />
      <span className="min-w-0 flex-1 type-body text-text-primary">{children}</span>
      {value !== undefined && <span className={`shrink-0 type-subtitle ${valueTone ? toneText[valueTone] : "text-text-primary"}`}>{value}</span>}
    </li>
  );
}

/** Session/person row of the side lists (272:5334): tint r12 px12 py10, 15 title + 14 caption, trailing 14 status. */
export function SideRow({
  title,
  caption,
  status,
  statusTone = "success",
  tone,
  href,
  current,
}: {
  title: ReactNode;
  caption?: ReactNode;
  status?: ReactNode;
  statusTone?: OpsTone;
  tone?: OpsTone;
  href?: string;
  current?: boolean;
}) {
  const cls = `flex w-full items-center gap-2.5 rounded-12 px-3 py-2.5 ${tone ? tint[tone] : "bg-bg-page"} ${current ? "outline-[1.5px] outline-action-primary outline" : ""}`;
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="type-small text-text-primary">{title}</span>
        {caption && <span className="type-caption text-text-muted">{caption}</span>}
      </span>
      {status && <span className={`shrink-0 type-caption whitespace-nowrap ${toneText[statusTone]}`}>{status}</span>}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} aria-current={current ? "page" : undefined} className={`${cls} focus-ring hover:brightness-[0.98]`}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}

/** Condition card row (438:20518 «شروط اعتماد النتائج»): tint r16 pt18 pb20 px20, 48px white tile, 19 Bold title + 17 caption, trailing action. */
export function ConditionRow({
  icon,
  title,
  caption,
  tone,
  action,
  titleTone,
  captionTone = "tone",
}: {
  icon: LucideIcon;
  title: ReactNode;
  caption?: ReactNode;
  tone: OpsTone;
  action?: ReactNode;
  /** Title in the tone colour (463:34304 «ما اكتمل», 438:20891 «من سيحصل عليها؟»); error rows always are. */
  titleTone?: boolean;
  /** Caption in the tone colour (438:20518) or text/secondary (463:34465, 438:20891). */
  captionTone?: "tone" | "secondary";
}) {
  return (
    <li className={`flex w-full flex-wrap items-center gap-4 rounded-16 px-4 pt-[18px] pb-5 sm:px-5 ${tint[tone]}`}>
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface ${toneText[tone]}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
        <span className={`type-title ${tone === "error" || titleTone ? toneText[tone] : "text-text-primary"}`}>{title}</span>
        {caption && <span className={`type-body ${captionTone === "secondary" ? "text-text-secondary" : tone === "neutral" ? "text-text-muted" : toneText[tone]}`}>{caption}</span>}
      </span>
      {action}
    </li>
  );
}

/** Key/value line of the data cards (4253:2 «حضور بالرمز»): bg/page r10 px16 py13, muted label + bold value. */
export function DataRows({ rows }: { rows: { label: string; value: ReactNode; tone?: OpsTone }[] }) {
  return (
    <dl className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px]">
          <dt className="text-[13.5px] leading-normal text-text-secondary">{r.label}</dt>
          <dd className={`text-[15px] leading-normal font-bold ${r.tone ? toneText[r.tone] : "text-text-primary"}`}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Data card with a tone border (4253:2 / 4254:2): tint + 1.5px tone border, r14, p24, 20 Bold tone title, 13.5 intro. */
export function DataPanel({ tone, title, intro, rows, children }: { tone: OpsTone; title: ReactNode; intro?: ReactNode; rows?: { label: string; value: ReactNode; tone?: OpsTone }[]; children?: ReactNode }) {
  return (
    <section className={`flex w-full flex-col gap-2.5 rounded-[14px] border-[1.5px] p-5 sm:p-6 ${tint[tone]} ${border[tone]}`}>
      <h2 className={`text-[20px] leading-[1.4] font-bold ${toneText[tone]}`}>{title}</h2>
      {intro && <div className="text-[13.5px] leading-normal text-text-secondary">{intro}</div>}
      {rows && <DataRows rows={rows} />}
      {children}
    </section>
  );
}

/** Dismissible-looking banner (436:20264 «جلسة اليوم بانتظار رصد الحضور»): tint + 1.5px border r12, 17 title + 15 body. */
export function Banner({ tone, icon, title, children, action }: { tone: OpsTone; icon: LucideIcon; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role={tone === "error" || tone === "warning" ? "alert" : "status"} className={`flex w-full items-start gap-3 rounded-12 border-[1.5px] px-4 py-3.5 ${tint[tone]} ${border[tone]}`}>
      <Glyph icon={icon} size={20} className={`mt-1 ${toneText[tone]}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={`type-body ${toneText[tone]}`}>{title}</p>
        {children && <div className="type-small text-text-secondary">{children}</div>}
      </div>
      {action}
    </div>
  );
}

/** 40px white square icon button of the roster rows (436:20166). */
export function IconSquare({ icon, label, href, onClick }: { icon: LucideIcon; label: string; href?: string; onClick?: () => void }) {
  const cls = "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-surface text-text-muted focus-ring hover:bg-bg-brand-tint hover:text-text-brand";
  if (href)
    return (
      <Link href={href} aria-label={label} className={cls}>
        <Glyph icon={icon} size={20} />
      </Link>
    );
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      <Glyph icon={icon} size={20} />
    </button>
  );
}

/** Round ring (436:20566 «٩٢٪»): accent arc, no track. */
export function RingGauge({ percent, size = 88, label }: { percent: number; size?: number; label: string }) {
  // Data / Progress · Type=Ring (60:87): an 88px arc with a 10px inside stroke, butt caps and no track, inset 11px
  // in a 110 frame; the value is Body 17 text/primary.
  const v = Math.max(0, Math.min(100, Math.round(percent)));
  const r = 39;
  const c = 2 * Math.PI * r;
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 110 110" className="size-full -rotate-90" aria-hidden>
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--color-action-accent)" strokeWidth="10" strokeDasharray={`${(c * v) / 100} ${c}`} />
      </svg>
      <span className="absolute type-body text-text-primary">{new Intl.NumberFormat("ar-SA-u-nu-arab").format(v)}٪</span>
    </div>
  );
}

/** Accent bar with a caption row (462:31676): 10px track, accent fill. */
export function AccentBar({ percent, start, end, label }: { percent: number; start?: ReactNode; end?: ReactNode; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="flex w-full flex-col gap-2.5">
      {(start || end) && (
        <div className="flex items-center justify-between gap-2 type-caption text-text-secondary">
          <span>{start}</span>
          <span>{end}</span>
        </div>
      )}
      <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-2.5 w-full overflow-hidden rounded-full bg-border-default">
        <div className="h-full rounded-full bg-action-accent" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

/** Standalone percentage as drawn in the frames («١٠٠٪» with the sign after the digits, LTR run). */
export function Pct({ value }: { value: number }) {
  return <bdi dir="ltr">{formatPercent(value)}</bdi>;
}
