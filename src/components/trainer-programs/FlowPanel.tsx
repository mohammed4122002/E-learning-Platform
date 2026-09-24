import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Circle, CircleCheck, LoaderCircle } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";

/*
 * Dialog panel of the TRR-PRG-08 / 09 flows (454:27489 …): 2px tone border, r22, float shadow,
 * tinted header (56px white tile, 26 Bold title, 17 body) and a white body, beside the page summary.
 */
const TONES = {
  warning: { border: "border-state-warning", head: "bg-state-warning-bg", icon: "text-state-warning" },
  info: { border: "border-state-info", head: "bg-state-info-bg", icon: "text-state-info" },
  success: { border: "border-state-success", head: "bg-state-success-bg", icon: "text-state-success" },
  error: { border: "border-state-error", head: "bg-state-error-bg", icon: "text-state-error" },
  brand: { border: "border-action-primary", head: "bg-action-primary", icon: "text-text-brand" },
} as const;

export function FlowPanel({
  tone,
  icon,
  spinning,
  title,
  subtitle,
  children,
}: {
  tone: keyof typeof TONES;
  icon: LucideIcon;
  spinning?: boolean;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const t = TONES[tone];
  const onBrand = tone === "brand";
  return (
    <div className="flex w-full flex-col gap-3.5">
      <section role="dialog" aria-labelledby="flow-title" className={`flex w-full flex-col overflow-hidden rounded-22 border-2 bg-bg-surface shadow-float ${t.border}`}>
        <div className={`flex flex-col items-center gap-3 px-6 pt-6 pb-7 text-center ${t.head}`}>
          <span className={`flex size-14 items-center justify-center rounded-12 bg-bg-surface ${t.icon}`}>
            {spinning ? <LoaderCircle aria-hidden size={24} strokeWidth={1.5} absoluteStrokeWidth className="animate-[tg-spin_0.9s_linear_infinite]" /> : <Glyph icon={icon} size={24} />}
          </span>
          <h2 id="flow-title" className={`text-[22px] leading-[1.3] font-bold sm:text-[26px] ${onBrand ? "text-text-on-brand" : "text-text-primary"}`}>
            {title}
          </h2>
          <p className={`type-body ${onBrand ? "text-bg-brand-tint" : "text-text-secondary"}`}>{subtitle}</p>
        </div>
        <div className="flex flex-col gap-3.5 px-5 pt-5 pb-6 sm:px-6">{children}</div>
      </section>
    </div>
  );
}

export function FlowRow({ icon, title, body, tone = "page" }: { icon: LucideIcon; title: string; body: string; tone?: "page" | "warning" | "success" | "info" }) {
  const cls = { page: "bg-bg-page", warning: "bg-state-warning-bg", success: "bg-state-success-bg", info: "bg-state-info-bg" }[tone];
  const txt = { page: "text-text-brand", warning: "text-state-warning", success: "text-state-success", info: "text-state-info" }[tone];
  return (
    <li className={`flex items-start gap-3 rounded-12 px-3.5 py-3.5 ${cls}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${txt}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`type-small ${txt}`}>{title}</span>
        <span className="type-caption text-text-secondary">{body}</span>
      </span>
    </li>
  );
}

export type FlowStep = { title: string; state: "done" | "current" | "todo"; detail?: string };

/**
 * Step progress of 454:27755 / 454:28838: «n من N» + percentage, a bar and one row per real server step
 * (done = success tint + check · current = info tint + spinner · todo = page tint).
 */
export function FlowSteps({ steps, label, percent }: { steps: FlowStep[]; label: string; percent: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <>
      <div className="flex items-center justify-between gap-3 type-caption text-text-secondary">
        <span>{label}</span>
        <span>{toArabicDigits(pct)}٪</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2.5 w-full overflow-hidden rounded-full bg-border-default">
        <div className="h-full rounded-full bg-action-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <ul className="flex flex-col gap-3">
        {steps.map((s) => {
          const tone = s.state === "done" ? "bg-state-success-bg text-state-success" : s.state === "current" ? "bg-state-info-bg text-state-info" : "bg-bg-page text-text-muted";
          return (
            <li key={s.title} className={`flex items-start gap-3 rounded-12 px-3.5 py-3.5 ${tone}`}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface">
                {s.state === "current" ? (
                  <LoaderCircle aria-hidden size={20} strokeWidth={1.4} absoluteStrokeWidth className="animate-[tg-spin_0.9s_linear_infinite]" />
                ) : (
                  <Glyph icon={s.state === "done" ? CircleCheck : Circle} size={20} />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="type-small">{s.title}</span>
                <span className="type-caption">{s.detail ??(s.state === "done" ? "تم" : s.state === "current" ? "جارٍ" : "بالانتظار")}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Left summary card of the program (tone tint, 2px border, title 32 Bold, status pill + reference). */
export function ProgramSummaryCard({ tone, icon, pill, reference, title, meta }: { tone: "info" | "success" | "brand" | "warning" | "error"; icon: LucideIcon; pill: ReactNode; reference: string; title: string; meta: string }) {
  const box = {
    info: "border-state-info bg-state-info-bg",
    success: "border-state-success bg-state-success-bg",
    brand: "border-action-primary bg-action-primary",
    warning: "border-state-warning bg-state-warning-bg",
    error: "border-state-error bg-state-error-bg",
  }[tone];
  const ic = { info: "text-state-info", success: "text-state-success", brand: "text-text-brand", warning: "text-state-warning", error: "text-state-error" }[tone];
  const onBrand = tone === "brand";
  return (
    <section className={`flex items-start gap-4 rounded-22 border-2 px-5 py-6 ${box}`}>
      <span className={`mt-14 flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface ${ic}`}>
        <Glyph icon={icon} size={24} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {pill}
          <span dir="ltr" className={`font-mono text-[13px] ${onBrand ? "text-bg-brand-tint" : "text-text-muted"}`}>
            {reference}
          </span>
        </div>
        <h2 className={`text-[26px] leading-[1.25] font-bold sm:text-[32px] ${onBrand ? "text-text-on-brand" : "text-text-primary"}`}>{title}</h2>
        <p className={`type-body ${onBrand ? "text-bg-brand-tint" : "text-text-secondary"}`}>{meta}</p>
      </div>
    </section>
  );
}
