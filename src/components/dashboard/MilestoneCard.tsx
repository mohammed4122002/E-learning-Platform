import type { Milestone } from "@/types/dashboard";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";

const tones: Record<Milestone["tone"], string> = {
  brand: "bg-bg-brand-tint",
  success: "bg-state-success-bg",
  info: "bg-state-info-bg",
};

/** Figma "Platform / Milestone" (101:1239) — Progress · Certificates · Hours. */
export function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const { value, label, description, icon, tone, progress } = milestone;
  return (
    <article
      className={`flex w-full flex-col items-start gap-3.5 rounded-16 bg-bg-card px-[22px] pt-5 pb-[22px] drop-shadow-milestone inner-stroke ${
        progress === undefined ? "md:h-[159px]" : ""
      }`}
    >
      <div className="flex w-full items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="type-h2 text-text-primary">{value}</p>
          <p className="type-small text-text-secondary">{label}</p>
        </div>
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 ${tones[tone]}`}>
          <Icon src={icon} size={20} />
        </span>
      </div>
      {progress !== undefined && <ProgressBar percent={progress} width={280} label={label} />}
      <p className="w-full type-caption text-text-muted">{description}</p>
    </article>
  );
}
