import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Building2, Star, User } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { REPORT_TARGETS, type ReportTarget } from "@/lib/validation/engagement";

export const TARGET_ICONS: Record<ReportTarget, LucideIcon> = { course: BookOpen, trainer: User, organization: Building2, review: Star };

/** Figma 227:13617 type cards: 1 of 4, selected = brand tint + 2px primary + filled icon tile. Navigates (the target depends on the type). */
export function ReportTypeCards({ selected, hrefs }: { selected: ReportTarget; hrefs: Record<ReportTarget, string> }) {
  return (
    <ul className="grid w-full grid-cols-2 gap-4 md:grid-cols-4" aria-label="نوع البلاغ">
      {(Object.keys(REPORT_TARGETS) as ReportTarget[]).map((t) => {
        const on = t === selected;
        return (
          <li key={t}>
            <Link
              href={hrefs[t]}
              aria-current={on ? "true" : undefined}
              scroll={false}
              className={`flex h-full w-full flex-col items-center gap-2 rounded-12 px-4 py-[18px] text-center focus-ring ${
                on ? "border-2 border-action-primary bg-bg-brand-tint" : "border-[1.5px] border-border-default bg-bg-page hover:bg-bg-brand-tint"
              }`}
            >
              <span className={`flex size-11 items-center justify-center rounded-8 ${on ? "bg-action-primary text-text-on-brand" : "bg-bg-surface text-text-brand"}`}>
                <Glyph icon={TARGET_ICONS[t]} size={20} />
              </span>
              <span className={`type-subtitle ${on ? "text-text-brand" : "text-text-primary"}`}>{REPORT_TARGETS[t].label}</span>
              <span className="type-caption text-text-muted">{REPORT_TARGETS[t].hint}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

