import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Glyph } from "./Icon";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  link?: { label: string; href: string };
  id: string;
};

/** Section title block (start) + "see all" link with a chevron pointing to the end (left). */
export function SectionHeader({ title, subtitle, link, id }: SectionHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id={id} className="type-h2 text-text-primary">
          {title}
        </h2>
        {subtitle && <p className="type-small text-text-muted">{subtitle}</p>}
      </div>
      {link && (
        <Link href={link.href} className="flex shrink-0 items-center gap-1.5 rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
          <span className="whitespace-nowrap">{link.label}</span>
          <Glyph icon={ChevronLeft} size={16} />
        </Link>
      )}
    </div>
  );
}
