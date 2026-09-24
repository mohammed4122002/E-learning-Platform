import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Tabs } from "@/components/ui/Navigation";
import { Glyph } from "@/components/ui/Icon";

/*
 * Shared blocks of TRR-FIN-01…04 (Figma 279:5729 · 313:10503 · 328:12108 · 301:8728 · 310:10328 · 301:9016 · 279:6036).
 * Tokens only. Glyphs follow what the TG components draw (verified with getMainComponentAsync + exported SVG):
 * «banknote» / «scale» = TG/Finance|Status/Pending → hourglass, «file-check» = badge-check, «monitor-play» = tv,
 * «building-2» = landmark, «circle-check» = circle-check-big.
 */

export const FINANCE_TABS = [
  { href: "/trainer/finance", label: "الرصيد" },
  { href: "/trainer/finance?tab=operations", label: "العمليات" },
  { href: "/trainer/finance/withdraw", label: "طلبات السحب" },
  { href: "/trainer/finance/bank", label: "بيانات التحويل" },
];

/** «الرصيد · العمليات · طلبات السحب · بيانات التحويل» (Nav / Tab Item, underline), in RTL reading order (T24). */
export function FinanceTabs({ active }: { active: string }) {
  return <Tabs tabs={FINANCE_TABS} active={active} label="أقسام المالية" />;
}

/** Card: bg/card, 1px border/default, card shadow; r16 p24 gap16 (FIN-01/04) or r22 p26 gap18 (FIN-02/03, 328). */
export function FinCard({
  children,
  size = "m",
  className,
  labelledBy,
}: {
  children: ReactNode;
  size?: "m" | "l";
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`flex w-full min-w-0 flex-col border border-border-default bg-bg-card shadow-card ${
        size === "l" ? "gap-[18px] rounded-22 p-5 sm:p-[26px]" : "gap-4 rounded-16 p-5 sm:p-6"
      } ${className ?? ""}`}
    >
      {children}
    </section>
  );
}

/** Card title: 20 Medium (m) or 26 Bold (l). */
export function FinTitle({ id, children, size = "m" }: { id?: string; children: ReactNode; size?: "m" | "l" }) {
  return (
    <h2 id={id} className={size === "l" ? "type-h2 text-text-primary" : "type-h3 text-text-primary"}>
      {children}
    </h2>
  );
}

/** White square/disc holding a glyph (40/44/48/56/68/96). */
export function IconBox({
  icon,
  size = 40,
  glyph = 20,
  radius = "rounded-12",
  bg = "bg-bg-surface",
  className,
}: {
  icon: LucideIcon;
  size?: 40 | 44 | 48 | 56 | 68 | 96;
  glyph?: 16 | 20 | 24 | 32;
  radius?: string;
  bg?: string;
  className?: string;
}) {
  const box = { 40: "size-10", 44: "size-11", 48: "size-12", 56: "size-14", 68: "size-[68px]", 96: "size-24" }[size];
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center ${box} ${radius} ${bg} ${className ?? ""}`}>
      <Glyph icon={icon} size={glyph} />
    </span>
  );
}

/** FIN-01 KPI tile: icon (40, brand tint) + 14 muted label, 26 Bold amount, 14 note. */
export function KpiTile({ icon, label, value, note, noteClass }: { icon: LucideIcon; label: string; value: string; note?: string | null; noteClass?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-16 border border-border-default bg-bg-card px-5 pt-5 pb-[22px] shadow-card">
      <div className="flex items-center gap-2.5">
        <IconBox icon={icon} bg="bg-bg-brand-tint" className="text-text-brand" />
        <p className="min-w-0 flex-1 type-caption text-text-muted">{label}</p>
      </div>
      <p className="type-h2 whitespace-nowrap text-text-primary">{value}</p>
      {note ? <p className={`type-caption ${noteClass ?? "text-text-muted"}`}>{note}</p> : <p className="type-caption text-text-muted">&nbsp;</p>}
    </div>
  );
}

/** Label/value row used by «كيف يُحسب إيرادك؟», «ملخّص التحويل» and «الإجمالي». */
export function AmountRow({ label, value, labelClass, valueClass }: { label: ReactNode; value: ReactNode; labelClass?: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className={`min-w-0 flex-1 ${labelClass ?? "type-body text-text-secondary"}`}>{label}</p>
      <p className={`shrink-0 whitespace-nowrap ${valueClass ?? "type-subtitle text-text-primary"}`}>{value}</p>
    </div>
  );
}

/** Timeline / info tile: bg-page r12, 40px white disc glyph at the start, 16 Medium title + 14 caption. */
export function StepTile({
  icon,
  title,
  caption,
  tone = "page",
  iconClass,
  titleClass,
  captionClass,
}: {
  icon: LucideIcon;
  title: string;
  caption: string;
  tone?: "page" | "success" | "current";
  iconClass?: string;
  titleClass?: string;
  captionClass?: string;
}) {
  const bg = tone === "success" ? "bg-state-success-bg" : tone === "current" ? "bg-state-warning-bg inner-stroke istroke-w-[1.5px] istroke-c-state-warning" : "bg-bg-page";
  return (
    <li className={`flex items-center gap-3 rounded-12 px-3.5 py-[13px] ${bg}`}>
      <IconBox icon={icon} radius="rounded-full" className={iconClass ?? "text-text-primary"} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={`type-subtitle ${titleClass ?? "text-text-primary"}`}>{title}</p>
        <p className={`type-caption ${captionClass ?? "text-text-muted"}`}>{caption}</p>
      </div>
    </li>
  );
}

/** Two-column content: main column first in the DOM (inline start), side column 380–400px. */
export function FinColumns({ main, side, sideWidth = 400 }: { main: ReactNode; side: ReactNode; sideWidth?: 380 | 400 }) {
  return (
    <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
      <div className="flex w-full min-w-0 flex-1 flex-col gap-6">{main}</div>
      <div className={`flex w-full shrink-0 flex-col gap-5 ${sideWidth === 380 ? "lg:w-[380px]" : "lg:w-[400px]"}`}>{side}</div>
    </div>
  );
}

export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`rounded-8 text-text-brand hover:underline focus-ring ${className ?? ""}`}>
      {children}
    </Link>
  );
}
