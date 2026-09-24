"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";

/**
 * Figma "Form / Select · Dropdown" (220px) + "Form / Search" row above the lists (436:20139, 968:74629).
 * URL-driven (`?sort=` / `?q=`) so the server renders the filtered list.
 */
export function ListControls({
  sortOptions,
  sort,
  q,
  searchLabel,
}: {
  sortOptions: { value: string; label: string }[];
  sort: string;
  q: string;
  searchLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const push = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-4" aria-busy={pending || undefined}>
      <form
        role="search"
        className="relative min-w-0 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          push("q", String(new FormData(e.currentTarget).get("q") ?? "").trim());
        }}
      >
        <label htmlFor="list-q" className="sr-only">
          {searchLabel}
        </label>
        <Glyph icon={Search} size={16} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          id="list-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={searchLabel}
          onChange={(e) => {
            if (e.currentTarget.value === "" && q) push("q", "");
          }}
          className="h-12 w-full rounded-12 border-[1.5px] border-border-default bg-bg-surface ps-11 pe-4 type-body text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary"
        />
      </form>
      <div className="relative flex w-full items-center sm:w-[220px]">
        <label htmlFor="list-sort" className="sr-only">
          الترتيب
        </label>
        <select
          id="list-sort"
          value={sort}
          onChange={(e) => push("sort", e.currentTarget.value)}
          className="h-12 w-full cursor-pointer appearance-none rounded-12 border-[1.5px] border-border-default bg-bg-surface ps-4 pe-11 type-body text-text-primary outline-none focus:border-2 focus:border-action-primary"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden size={16} strokeWidth={1.25} absoluteStrokeWidth className="pointer-events-none absolute end-4 text-text-secondary" />
      </div>
    </div>
  );
}
