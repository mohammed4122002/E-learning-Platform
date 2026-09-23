import type { LucideIcon } from "lucide-react";
import { Award, Clock, Gauge } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AccentProgress } from "@/components/course/CourseCard";
import type { MilestoneView } from "@/lib/data/dashboard";

const TONES: Record<MilestoneView["tone"], string> = {
  brand: "bg-bg-brand-tint text-text-brand",
  success: "bg-state-success-bg text-state-success",
  info: "bg-state-info-bg text-state-info",
};
const ICONS: Record<string, LucideIcon> = { hours: Clock, certificates: Award, plan: Gauge };

/** Figma "Platform / Milestone" (101:1239) — Progress · Certificates · Hours. */
function MilestoneCard({ milestone }: { milestone: MilestoneView }) {
  const { id, value, label, description, tone, progress } = milestone;
  return (
    <article className={`flex w-full flex-col items-start gap-3.5 rounded-16 bg-bg-card px-[22px] pt-5 pb-[22px] drop-shadow-milestone inner-stroke ${progress === undefined ? "md:h-[159px]" : ""}`}>
      <div className="flex w-full items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="type-h2 text-text-primary">{value}</p>
          <p className="type-small text-text-secondary">{label}</p>
        </div>
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 ${TONES[tone]}`}>
          <Glyph icon={ICONS[id] ?? Gauge} size={20} />
        </span>
      </div>
      {progress !== undefined && <AccentProgress percent={progress} label={label} />}
      <p className="w-full type-caption text-text-muted">{description}</p>
    </article>
  );
}

export function LearningProgressSection({ milestones }: { milestones: MilestoneView[] }) {
  return (
    <section aria-labelledby="progress-title" className="flex flex-col gap-[18px]">
      <SectionHeader id="progress-title" title="رحلتك التعليمية" link={{ label: "التفاصيل", href: "/trainee/learning-record" }} />
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3">
        {milestones.map((m) => (
          <MilestoneCard key={m.id} milestone={m} />
        ))}
      </div>
    </section>
  );
}
