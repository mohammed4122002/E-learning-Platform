"use client";

import { useId, useOptimistic, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { Checkbox, Radio } from "@/components/ui/Choice";
import { Glyph } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Feedback";
import { toArabicDigits } from "@/lib/format";
import {
  LEVEL_FILTER_LABELS,
  MODE_FILTER_LABELS,
  PRICE_RANGES,
  RATING_OPTIONS,
  activeFilterCount,
  discoverHref,
  toggleIn,
  type DiscoverPatch,
  type DiscoverState,
  type PriceKey,
  type RatingKey,
} from "@/lib/discover-params";
import type { CourseLevel, CourseMode } from "@/types/views";

type Option = { value: string; label: string; count: number };

export type FilterPanelProps = {
  state: DiscoverState;
  categories: Option[];
  modes: Record<CourseMode, number>;
  levels: Record<CourseLevel, number>;
  cities: Option[];
};

const VISIBLE = 4;

/*
 * Figma "Nav / Filter Group" (103:1237) inside the FILTERS card (104:1163): card r16 px 20 pt 8 pb 16, header
 * "تصفية النتائج" H3 + "مسح الكل" subtitle/brand; each group py 18 gap 14, title 19 Bold + chevron 20,
 * 44px checkbox rows "label · count", "عرض المزيد" subtitle/brand, 1px divider.
 * Every change updates the URL (server-side filtering); the checkbox state is optimistic while navigating.
 */
export function FilterPanel({ state, categories, modes, levels, cities }: FilterPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useOptimistic(state);
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelId = useId();

  const apply = (patch: DiscoverPatch) => {
    const next = { ...view, ...patch };
    startTransition(() => {
      setView(next);
      router.push(discoverHref(view, patch), { scroll: false });
    });
  };

  const active = activeFilterCount(view) - (view.q ? 1 : 0);
  const count = (n: number) => ` · ${toArabicDigits(n)}`;

  return (
    <section
      id="filters"
      aria-labelledby={`${panelId}-title`}
      className="w-full shrink-0 scroll-mt-28 rounded-16 border border-border-default bg-bg-card px-5 pt-2 pb-4 shadow-card lg:w-[300px]"
    >
      <div className="flex items-center justify-between gap-3 pt-4 pb-2">
        <h2 id={`${panelId}-title`} className="flex-1 type-h3 text-text-primary">
          تصفية النتائج
        </h2>
        {pending && <Spinner inline label="جارٍ التحديث" className="!p-0" />}
        {active > 0 && !pending && (
          <button
            type="button"
            onClick={() => apply({ cat: [], mode: [], level: [], city: [], price: null, rating: null })}
            className="cursor-pointer rounded-8 type-subtitle text-text-brand hover:underline focus-ring"
          >
            مسح الكل
          </button>
        )}
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls={`${panelId}-body`}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex size-11 cursor-pointer items-center justify-center rounded-12 bg-bg-page text-text-primary focus-ring lg:hidden"
        >
          <Glyph icon={SlidersHorizontal} size={20} label={mobileOpen ? "إخفاء عوامل التصفية" : "إظهار عوامل التصفية"} />
        </button>
      </div>

      <div id={`${panelId}-body`} className={`${mobileOpen ? "flex" : "hidden"} flex-col lg:flex`} aria-busy={pending || undefined}>
        {categories.length > 0 && (
          <Group title="التخصص">
            <MoreList
              items={categories.map((c) => (
                <Checkbox key={c.value} checked={view.cat.includes(c.value)} onChange={() => apply({ cat: toggleIn(view.cat, c.value) })}>
                  {c.label}
                  {count(c.count)}
                </Checkbox>
              ))}
            />
          </Group>
        )}

        <Group title="نمط الحضور">
          {(Object.keys(MODE_FILTER_LABELS) as CourseMode[]).map((m) => (
            <Checkbox key={m} checked={view.mode.includes(m)} onChange={() => apply({ mode: toggleIn(view.mode, m) })}>
              {MODE_FILTER_LABELS[m]}
              {count(modes[m])}
            </Checkbox>
          ))}
        </Group>

        {cities.length > 0 && (
          <Group title="الموقع" defaultOpen={view.city.length > 0}>
            <MoreList
              items={cities.map((c) => (
                <Checkbox key={c.value} checked={view.city.includes(c.value)} onChange={() => apply({ city: toggleIn(view.city, c.value) })}>
                  {c.label}
                  {count(c.count)}
                </Checkbox>
              ))}
            />
          </Group>
        )}

        <Group title="المستوى" defaultOpen={view.level.length > 0}>
          {(Object.keys(LEVEL_FILTER_LABELS) as CourseLevel[]).map((l) => (
            <Checkbox key={l} checked={view.level.includes(l)} onChange={() => apply({ level: toggleIn(view.level, l) })}>
              {LEVEL_FILTER_LABELS[l]}
              {count(levels[l])}
            </Checkbox>
          ))}
        </Group>

        <Group title="السعر" defaultOpen={view.price !== null}>
          <fieldset className="contents">
            <legend className="sr-only">نطاق السعر</legend>
            <Radio name="price" checked={view.price === null} onChange={() => apply({ price: null })}>
              كل الأسعار
            </Radio>
            {(Object.keys(PRICE_RANGES) as PriceKey[]).map((p) => (
              <Radio key={p} name="price" checked={view.price === p} onChange={() => apply({ price: p })}>
                {PRICE_RANGES[p].label}
              </Radio>
            ))}
          </fieldset>
        </Group>

        <Group title="التقييم" defaultOpen={view.rating !== null} last>
          <fieldset className="contents">
            <legend className="sr-only">الحد الأدنى للتقييم</legend>
            <Radio name="rating" checked={view.rating === null} onChange={() => apply({ rating: null })}>
              كل التقييمات
            </Radio>
            {(Object.keys(RATING_OPTIONS) as RatingKey[]).map((r) => (
              <Radio key={r} name="rating" checked={view.rating === r} onChange={() => apply({ rating: r })}>
                {RATING_OPTIONS[r]}
              </Radio>
            ))}
          </fieldset>
        </Group>
      </div>
    </section>
  );
}

function Group({ title, children, defaultOpen = true, last }: { title: string; children: ReactNode; defaultOpen?: boolean; last?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="flex flex-col gap-3.5 py-[18px]">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-8 text-start focus-ring"
        >
          <span className="flex-1 type-title text-text-primary">{title}</span>
          <Glyph icon={open ? ChevronUp : ChevronDown} size={20} className="text-text-primary" />
        </button>
      </h3>
      <div id={id} hidden={!open} className="flex flex-col gap-3">
        {children}
      </div>
      {!last && <div aria-hidden className="h-px w-full bg-border-divider" />}
    </div>
  );
}

function MoreList({ items }: { items: ReactNode[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, VISIBLE);
  return (
    <>
      {shown}
      {items.length > VISIBLE && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full cursor-pointer rounded-8 text-start type-subtitle text-text-brand hover:underline focus-ring">
          {expanded ? "عرض أقل" : "عرض المزيد"}
        </button>
      )}
    </>
  );
}
