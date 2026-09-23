"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { SORTS, discoverHref, type DiscoverState, type SortKey } from "@/lib/discover-params";

/** Figma sort trigger (104:1249): 1.5px border/default, r12, px 16 py 12, "ترتيب حسب" caption/muted + value subtitle + chevron 16. */
export function SortSelect({ state }: { state: DiscoverState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const id = useId();
  return (
    <div
      className={`relative flex shrink-0 items-center gap-2.5 rounded-12 border-[1.5px] border-border-default bg-bg-surface ps-4 pe-10 py-3 focus-within:border-action-primary ${pending ? "opacity-70" : ""}`}
    >
      <label htmlFor={id} className="type-caption whitespace-nowrap text-text-muted">
        ترتيب حسب
      </label>
      <select
        id={id}
        value={state.sort}
        aria-busy={pending || undefined}
        onChange={(e) => {
          const sort = e.target.value as SortKey;
          startTransition(() => router.push(discoverHref(state, { sort }), { scroll: false }));
        }}
        className="cursor-pointer appearance-none bg-transparent type-subtitle text-text-primary outline-none"
      >
        {(Object.keys(SORTS) as SortKey[]).map((k) => (
          <option key={k} value={k}>
            {SORTS[k]}
          </option>
        ))}
      </select>
      <Glyph icon={ChevronDown} size={16} className="pointer-events-none absolute end-4 text-text-secondary" />
    </div>
  );
}
