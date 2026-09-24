"use client";

import { Checkbox } from "@/components/ui/Choice";

/** «راجع بعين المتدرب» (298:8553): a personal checklist before the declaration (not stored). */
export function SelfCheck({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((q) => (
        <li key={q} className="rounded-12 bg-bg-page px-3.5 py-1">
          <Checkbox>{q}</Checkbox>
        </li>
      ))}
    </ul>
  );
}
