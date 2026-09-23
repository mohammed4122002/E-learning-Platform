import { Check } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";

/* Figma "Nav / Stepper Step" (90:710): 48px marker (Complete = success + check · Current = brand + number ·
   Upcoming = white + 1.5px border), 16 Medium title, 14 Regular status. Connectors 1px border/divider. */
export function Stepper({ steps, current, itemWidth = 170 }: { steps: string[]; current: number; itemWidth?: number }) {
  return (
    <ol className="flex w-full items-start justify-center">
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "complete" : n === current ? "current" : "upcoming";
        return (
          <li key={label} className={`flex items-start ${i > 0 ? "flex-1" : ""}`} aria-current={state === "current" ? "step" : undefined}>
            {i > 0 && <span aria-hidden className="mt-6 h-px w-4 flex-1 bg-border-divider sm:min-w-[25px]" />}
            <div className="flex w-[92px] flex-col items-center gap-2.5 text-center sm:w-[var(--step-w)]" style={{ "--step-w": `${itemWidth}px` } as React.CSSProperties}>
              <span
                className={`flex size-12 items-center justify-center rounded-full ${
                  state === "complete"
                    ? "bg-state-success text-text-on-brand"
                    : state === "current"
                      ? "bg-action-primary text-text-on-brand"
                      : "border-[1.5px] border-border-default bg-bg-surface text-text-muted"
                }`}
              >
                {state === "complete" ? <Glyph icon={Check} size={20} /> : <span className="type-title">{toArabicDigits(n)}</span>}
              </span>
              <span className={`type-subtitle ${state === "upcoming" ? "text-text-muted" : "text-text-primary"}`}>{label}</span>
              <span className={`type-caption ${state === "complete" ? "text-state-success" : state === "current" ? "text-text-brand" : "text-text-muted"}`}>
                {state === "complete" ? "مكتمل" : state === "current" ? "جارٍ التنفيذ" : "لم يبدأ"}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
