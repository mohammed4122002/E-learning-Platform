import { Icon } from "./Icon";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  linkLabel: string;
  id: string;
};

/** Section title block (start) + "see all" link with a chevron pointing to the end (left). */
export function SectionHeader({ title, subtitle, linkLabel, id }: SectionHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id={id} className="type-h2 text-text-primary">
          {title}
        </h2>
        {subtitle && <p className="type-small text-text-muted">{subtitle}</p>}
      </div>
      <a href="#" className="flex shrink-0 items-center gap-1.5 type-subtitle text-text-brand">
        <span className="whitespace-nowrap">{linkLabel}</span>
        <Icon src="/assets/icons/chevron-left.svg" size={16} />
      </a>
    </div>
  );
}
