"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

/** Figma "Form / Select · Dropdown" (220px) on TRR-PRG-01 — navigates to the chosen sort (URL state). */
export function ProgramsSort({ value, options, hrefs }: { value: string; options: Record<string, string>; hrefs: Record<string, string> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const id = useId();
  return (
    <div className={`relative flex h-12 w-full shrink-0 items-center sm:w-[220px] ${pending ? "opacity-70" : ""}`}>
      <label htmlFor={id} className="sr-only">
        ترتيب البرامج
      </label>
      <select
        id={id}
        value={value}
        aria-busy={pending || undefined}
        onChange={(e) => startTransition(() => router.push(hrefs[e.target.value], { scroll: false }))}
        className="h-12 w-full cursor-pointer appearance-none rounded-12 border-[1.5px] border-border-default bg-bg-surface ps-4 pe-11 type-body text-text-primary outline-none focus:border-2 focus:border-action-primary"
      >
        {Object.entries(options).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden size={16} strokeWidth={1.25} absoluteStrokeWidth className="pointer-events-none absolute end-4 text-text-secondary" />
    </div>
  );
}
