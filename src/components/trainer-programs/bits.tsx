import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck, CircleX, FileText, Hourglass, Layers, MapPin, MonitorPlay, Pause, Video } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { Stepper } from "@/components/ui/Stepper";
import { PHASE_LABEL, WIZARD_STEPS, type ProgramModeKey, type ProgramPhase } from "@/lib/trainer-programs";

/* Shared visual bits of the TRR-PRG screens (Figma 262:2211 and the program status frames). */

export const PHASE_STYLE: Record<ProgramPhase, { icon: LucideIcon; text: string; pill: string; tile: string; card: string }> = {
  draft: { icon: FileText, text: "text-text-muted", pill: "bg-bg-disabled text-text-muted", tile: "bg-bg-disabled text-text-muted", card: "border border-border-default bg-bg-card" },
  under_review: {
    icon: Hourglass,
    text: "text-state-warning",
    pill: "bg-bg-surface text-state-warning",
    tile: "bg-state-warning-bg text-state-warning",
    card: "border-2 border-state-warning bg-state-warning-bg",
  },
  needs_changes: {
    icon: CircleAlert,
    text: "text-state-error",
    pill: "bg-bg-surface text-state-error",
    tile: "bg-state-error-bg text-state-error",
    card: "border-2 border-state-error bg-state-error-bg",
  },
  rejected: { icon: CircleX, text: "text-state-error", pill: "bg-bg-surface text-state-error", tile: "bg-state-error-bg text-state-error", card: "border-2 border-state-error bg-state-error-bg" },
  published: { icon: CircleCheck, text: "text-state-success", pill: "bg-state-success-bg text-state-success", tile: "bg-state-success-bg text-state-success", card: "border border-border-default bg-bg-card" },
  suspended: { icon: Pause, text: "text-state-info", pill: "bg-state-info-bg text-state-info", tile: "bg-state-info-bg text-state-info", card: "border border-border-default bg-bg-card" },
};

export function PhasePill({ phase, label, className }: { phase: ProgramPhase; label?: string; className?: string }) {
  const s = PHASE_STYLE[phase];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[5px] type-caption ${s.pill} ${className ?? ""}`}>
      <Glyph icon={s.icon} size={16} />
      {label ?? PHASE_LABEL[phase]}
    </span>
  );
}

/** Figma "Data / Course Mode" (162:1934) incl. «مدمجة» for programs run in several modes. */
const MODE_STYLE: Record<ProgramModeKey, { label: string; icon: LucideIcon; className: string }> = {
  in_person: { label: "حضورية", icon: MapPin, className: "bg-state-success-bg text-state-success" },
  live_remote: { label: "عن بُعد مباشرة", icon: Video, className: "bg-state-info-bg text-state-info" },
  recorded: { label: "مسجَّلة", icon: MonitorPlay, className: "bg-bg-brand-tint text-text-brand" },
  blended: { label: "مدمجة", icon: Layers, className: "bg-state-warning-bg text-state-warning" },
};

export function ProgramModePill({ mode }: { mode: ProgramModeKey }) {
  const m = MODE_STYLE[mode];
  return (
    <span className={`inline-flex shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full px-[9px] py-1 type-caption ${m.className}`}>
      <Glyph icon={m.icon} size={16} />
      {m.label}
    </span>
  );
}

/** Meta line item: 16px icon + muted label + value (list cards). */
export function Meta({ icon, label, value, valueClass }: { icon: LucideIcon; label?: ReactNode; value: ReactNode; valueClass?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 type-caption">
      <Glyph icon={icon} size={16} className="text-text-muted" />
      {label && <span className="text-text-muted">{label}</span>}
      <span className={valueClass ?? "text-text-primary"}>{value}</span>
    </span>
  );
}

/** White card used across the TRR-PRG screens: surface, 1px border/default, r16, card shadow, p 24. */
export function Panel({ title, action, children, className, tone, id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; tone?: "error" | "warning"; id?: string }) {
  const toneCls = tone === "error" ? "border-2 border-state-error" : tone === "warning" ? "border-2 border-state-warning bg-state-warning-bg" : "border border-border-default";
  return (
    <section id={id} className={`flex w-full flex-col gap-4 rounded-16 bg-bg-card p-5 shadow-card sm:p-6 ${toneCls} ${className ?? ""}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center gap-3">
          {title && <h2 className="min-w-0 flex-1 text-[22px] leading-[1.3] font-bold text-text-primary">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Wizard stepper (TRR-PRG-02): step 1 uses the long labels, later steps the short ones (as in Figma). */
export function WizardStepper({ current }: { current: number }) {
  const labels = WIZARD_STEPS.map((s) => (current === 1 ? s.label : s.short));
  return (
    <div className="w-full overflow-x-auto rounded-16 border border-border-default bg-bg-card px-3 py-5 shadow-card sm:px-6">
      <div className="min-w-[520px]">
        <Stepper steps={labels} current={current} itemWidth={150} />
      </div>
    </div>
  );
}

/** Key/value row on page tint (بيانات الطلب, حالة البرنامج). */
export function InfoRow({ label, value, valueClass, mono }: { label: ReactNode; value: ReactNode; valueClass?: string; mono?: boolean }) {
  return (
    <div className="flex w-full items-center gap-3 rounded-12 bg-bg-page px-4 py-3">
      <dt className="min-w-0 flex-1 type-small text-text-secondary">{label}</dt>
      <dd dir={mono ? "ltr" : undefined} className={`shrink-0 type-subtitle ${mono ? "font-mono text-[14px]" : ""} ${valueClass ?? "text-text-primary"}`}>
        {value}
      </dd>
    </div>
  );
}

/** Row with a white 36px icon tile on page tint (ماذا يحدث بعد الإرسال, أثناء المراجعة…). */
export function TileRow({ icon, title, description, tone = "brand", children, className }: { icon: LucideIcon; title: ReactNode; description?: ReactNode; tone?: "brand" | "success" | "warning" | "error" | "info" | "muted"; children?: ReactNode; className?: string }) {
  const ic = { brand: "text-text-brand", success: "text-state-success", warning: "text-state-warning", error: "text-state-error", info: "text-state-info", muted: "text-text-muted" }[tone];
  return (
    <li className={`flex w-full items-start gap-3 rounded-12 bg-bg-page px-3.5 py-3 ${className ?? ""}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${ic}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-subtitle text-text-primary">{title}</span>
        {description && <span className="type-caption text-text-muted">{description}</span>}
      </span>
      {children}
    </li>
  );
}
