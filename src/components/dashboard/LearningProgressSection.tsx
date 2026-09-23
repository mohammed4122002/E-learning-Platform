import { progressSection } from "@/lib/dashboard-data";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MilestoneCard } from "./MilestoneCard";

export function LearningProgressSection() {
  return (
    <section aria-labelledby="progress-title" className="flex flex-col gap-[18px]">
      <SectionHeader id="progress-title" title={progressSection.title} linkLabel={progressSection.link} />
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3">
        {progressSection.milestones.map((milestone) => (
          <MilestoneCard key={milestone.id} milestone={milestone} />
        ))}
      </div>
    </section>
  );
}
