import { activitySection } from "@/lib/dashboard-data";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function ActivitySection() {
  const { title, subtitle, link, items } = activitySection;
  return (
    <section aria-labelledby="activity-title" className="flex flex-col gap-[18px]">
      <SectionHeader id="activity-title" title={title} subtitle={subtitle} linkLabel={link} />
      <ol className="flex w-full flex-col gap-4 overflow-hidden rounded-16 bg-bg-card p-4 shadow-card inner-stroke sm:p-6">
        {items.map((item) => (
          <li key={item.id} className="flex w-full items-start gap-3.5 rounded-12 bg-bg-page px-3.5 py-[13px]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface">
              <Icon src={item.icon} size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <p className="type-subtitle text-text-primary">{item.title}</p>
              <p className="type-caption text-text-muted">{item.description}</p>
            </div>
            <span className="shrink-0 whitespace-nowrap type-caption text-text-muted">{item.time}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
