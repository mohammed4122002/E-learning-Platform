import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Ban,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Clock,
  Compass,
  Contact,
  FileText,
  Hourglass,
  Info,
  Landmark,
  Lightbulb,
  LoaderCircle,
  Lock,
  MapPin,
  MessageCircle,
  MessagesSquare,
  OctagonX,
  Percent,
  Reply,
  Shield,
  SquarePen,
  Star,
  Tags,
  TrendingUp,
  TriangleAlert,
  Upload,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Glyph } from "@/components/ui/Icon";

/*
 * Building blocks of the TRR-BID frames (280:6393 … 458:31553). Measurements come from the Figma frames; colours
 * are semantic tokens only. Icons are passed by key so server pages can hand them to client components.
 * TG icon instances are mapped to the glyph they actually draw (e.g. «banknote» draws an hourglass,
 * «building-2» a landmark, «briefcase» a compass, «circle-x» an octagon).
 */
export const BID_ICONS = {
  award: Award,
  ban: Ban,
  calendar: CalendarDays,
  alert: CircleAlert,
  check: CircleCheck,
  clock: Clock,
  compass: Compass,
  contact: Contact,
  file: FileText,
  hourglass: Hourglass,
  info: Info,
  landmark: Landmark,
  lightbulb: Lightbulb,
  loader: LoaderCircle,
  lock: Lock,
  pin: MapPin,
  comment: MessageCircle,
  messages: MessagesSquare,
  octagonX: OctagonX,
  percent: Percent,
  reply: Reply,
  shield: Shield,
  edit: SquarePen,
  star: Star,
  tags: Tags,
  growth: TrendingUp,
  warning: TriangleAlert,
  upload: Upload,
  users: Users,
  wallet: Wallet,
  x: X,
} satisfies Record<string, LucideIcon>;
export type BidIconKey = keyof typeof BID_ICONS;

export type BidTone = "brand" | "success" | "warning" | "error" | "info" | "neutral";

export const TONE_TEXT: Record<BidTone, string> = {
  brand: "text-text-brand",
  success: "text-state-success",
  warning: "text-state-warning",
  error: "text-state-error",
  info: "text-state-info",
  neutral: "text-text-muted",
};
export const TONE_BG: Record<BidTone, string> = {
  brand: "bg-bg-brand-tint",
  success: "bg-state-success-bg",
  warning: "bg-state-warning-bg",
  error: "bg-state-error-bg",
  info: "bg-state-info-bg",
  neutral: "bg-bg-disabled",
};
export const TONE_BORDER: Record<BidTone, string> = {
  brand: "border-action-primary",
  success: "border-state-success",
  warning: "border-state-warning",
  error: "border-state-error",
  info: "border-state-info",
  neutral: "border-text-muted",
};

export function BidIcon({ name, size = 20, className }: { name: BidIconKey; size?: 16 | 20 | 24 | 32; className?: string }) {
  return <Glyph icon={BID_ICONS[name]} size={size} className={className} />;
}

/** White card (r22, 1px border, card shadow). Figma uses p26 + gap18 on TRR-BID-02 and p28 + gap20 elsewhere. */
export function BidCard({
  children,
  className,
  pad = 28,
  tone,
  labelledBy,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  pad?: 26 | 28;
  /** 2px tone stroke (TRR-BID-04 «لماذا…» cards). */
  tone?: BidTone;
  labelledBy?: string;
  as?: "section" | "div" | "aside";
}) {
  return (
    <Tag
      aria-labelledby={labelledBy}
      className={`flex w-full min-w-0 flex-col rounded-22 bg-bg-card p-5 shadow-card ${pad === 26 ? "gap-[18px] sm:p-[26px]" : "gap-5 sm:p-7"} ${
        tone ? `border-2 ${TONE_BORDER[tone]}` : "border border-border-default"
      } ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
}

/** Small status pill (280:6767 «قيد المراجعة»): px10 py5, 14 Regular, 16px icon, tone tint. */
export function StatusPill({ icon, tone, children, surface, size = "s" }: { icon?: BidIconKey; tone: BidTone; children: ReactNode; surface?: boolean; size?: "s" | "m" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full ${
        size === "m" ? "gap-[7px] px-[11px] py-1.5 type-small" : "gap-1.5 px-2.5 py-[5px] type-caption"
      } ${surface ? "bg-bg-surface" : TONE_BG[tone]} ${TONE_TEXT[tone]}`}
    >
      {icon && <BidIcon name={icon} size={16} />}
      {children}
    </span>
  );
}

/** Hero pill on tinted heroes (457:29343): surface, px14 py9, 16 Medium, 20px icon. */
export function HeroPill({ icon, tone, children }: { icon: BidIconKey; tone: BidTone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full bg-bg-surface px-3.5 py-[9px] type-subtitle ${TONE_TEXT[tone]}`}>
      <BidIcon name={icon} size={20} />
      {children}
    </span>
  );
}

/** Pill on a card surface with a tone tint (439:21621 «لم يُقبل هذا العرض»). */
export function TintPill({ icon, tone, children }: { icon: BidIconKey; tone: BidTone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full px-3.5 py-[9px] type-subtitle ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}>
      <BidIcon name={icon} size={20} />
      {children}
    </span>
  );
}

/** «OFR-2026-000412» (Type/Mono 14, text/muted). */
export function Reference({ children }: { children: ReactNode }) {
  return (
    <span dir="ltr" className="shrink-0 font-mono text-[14px] leading-[1.5] text-text-muted">
      {children}
    </span>
  );
}

/**
 * Status hero of TRR-BID-04/05 (439:21858, 457:29329): tint + 2–3px stroke, r22, 68–72px surface icon tile at the
 * start, pill + reference row, H1 title, 18 body; actions at the end.
 */
export function BidHero({
  tone,
  stroke,
  strokeWidth = 2,
  icon,
  iconTone,
  pill,
  reference,
  title,
  children,
  actions,
  size = "m",
  iconAtEnd,
}: {
  /** Background tint; "card" = white card with the default border (rejected decision). */
  tone: BidTone | "card";
  /** Stroke colour when it differs from the tint (preparing: brand, expired: muted). */
  stroke?: BidTone | "brand-text";
  strokeWidth?: 2 | 3;
  icon: BidIconKey;
  iconTone: BidTone;
  pill: ReactNode;
  reference: string;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** l: TRR-BID-04 (72px tile, gap26, p28/30) · m: TRR-BID-05 (68px tile, gap24, p26/28). */
  size?: "l" | "m";
  /** 439:21614 puts the (close) tile at the end of the row. */
  iconAtEnd?: boolean;
}) {
  const box =
    tone === "card"
      ? "border border-border-default bg-bg-card shadow-card"
      : `${TONE_BG[tone]} ${strokeWidth === 3 ? "border-[3px]" : "border-2"} ${
          stroke === "brand-text" ? "border-text-brand" : TONE_BORDER[stroke ?? tone]
        } ${size === "l" ? "shadow-card" : ""}`;
  const tile = (
    <span className={`flex shrink-0 items-center justify-center rounded-16 bg-bg-surface ${size === "l" ? "size-[72px]" : "size-[68px]"} ${TONE_TEXT[iconTone]}`}>
      <BidIcon name={icon} size={32} />
    </span>
  );
  return (
    <section
      className={`flex w-full flex-col items-start gap-4 rounded-22 px-5 py-6 sm:flex-row sm:items-center ${
        size === "l" ? "sm:gap-[26px] sm:px-[30px] sm:pt-7 sm:pb-[30px]" : "sm:gap-6 sm:px-7 sm:pt-[26px] sm:pb-7"
      } ${box}`}
    >
      {!iconAtEnd && tile}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {pill}
          <Reference>{reference}</Reference>
        </div>
        <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{title}</h2>
        {children && <p className="type-body-lg text-text-secondary">{children}</p>}
      </div>
      {actions && <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto">{actions}</div>}
      {iconAtEnd && <span className="hidden sm:flex">{tile}</span>}
    </section>
  );
}

/** Tinted line with a 20px icon (303:9649 «اربط خبرتك…»): r12, p12/14, 17 body. */
export function ToneLine({ icon, tone, children, textTone }: { icon: BidIconKey; tone: BidTone; children: ReactNode; textTone?: boolean }) {
  return (
    <li className={`flex w-full items-start gap-2.5 rounded-12 px-3.5 py-3 ${TONE_BG[tone]}`}>
      <BidIcon name={icon} size={20} className={`mt-[5px] ${TONE_TEXT[tone]}`} />
      <span className={`min-w-0 flex-1 type-body ${textTone ? TONE_TEXT[tone] : "text-text-primary"}`}>{children}</span>
    </li>
  );
}

/** Muted row with a 20px tone icon (457:29555 «التفاوض يوقف مهلة التعاقد…»): bg/page r12 pt12 pb13 px14. */
export function NoteRow({ icon, tone, children }: { icon: BidIconKey; tone: BidTone; children: ReactNode }) {
  return (
    <li className="flex w-full items-start gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px]">
      <BidIcon name={icon} size={20} className={`mt-[5px] ${TONE_TEXT[tone]}`} />
      <span className="min-w-0 flex-1 type-body text-text-primary">{children}</span>
    </li>
  );
}

/** Label / value line (439:21689 «السعر»): bg/page r12 p13/14, 17 secondary label + 15 primary value at the end. */
export function DetailRow({ label, value, valueTone }: { label: ReactNode; value: ReactNode; valueTone?: BidTone }) {
  return (
    <div className="flex w-full items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
      <dt className="min-w-0 flex-1 type-body text-text-secondary">{label}</dt>
      <dd className={`shrink-0 type-small ${valueTone ? TONE_TEXT[valueTone] : "text-text-primary"}`}>{value}</dd>
    </div>
  );
}

/** Feedback row (439:21653): tint r16 pt16 pb18 px18, 48px surface tile, 19 Bold tone title + 17 secondary. */
export function FeedbackRow({ icon, tone, title, children }: { icon: BidIconKey; tone: BidTone; title: ReactNode; children?: ReactNode }) {
  return (
    <li className={`flex w-full items-center gap-3.5 rounded-16 px-4 pt-4 pb-[18px] sm:px-[18px] ${TONE_BG[tone]}`}>
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface ${TONE_TEXT[tone]}`}>
        <BidIcon name={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`type-title ${TONE_TEXT[tone]}`}>{title}</span>
        {children && <span className="type-body text-text-secondary">{children}</span>}
      </span>
    </li>
  );
}

/** Section heading of the cards: H2 (26 Bold) or H3 (20 Medium). */
export function CardTitle({ id, children, size = "h2" }: { id?: string; children: ReactNode; size?: "h2" | "h3" }) {
  return (
    <h2 id={id} className={`${size === "h2" ? "type-h2" : "type-h3"} text-text-primary`}>
      {children}
    </h2>
  );
}
