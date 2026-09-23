import Link from "next/link";
import { Check, GitCompareArrows, X } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { CourseCard } from "@/components/course/CourseCard";
import { toArabicDigits } from "@/lib/format";
import {
  COMPARE_MAX,
  COMPARE_MIN,
  LEVEL_FILTER_LABELS,
  MODE_FILTER_LABELS,
  PRICE_RANGES,
  RATING_OPTIONS,
  compareHref,
  discoverHref,
  type DiscoverState,
} from "@/lib/discover-params";
import type { CourseCardView } from "@/types/views";

/** Figma "Data / Chip" removable (104:1151): brand-tint, 1.5px action/primary, h 36, px 14, gap 8, 15 Regular text/brand. */
export function ActiveFilterChips({ state, categoryNames }: { state: DiscoverState; categoryNames: Record<string, string> }) {
  const chips: { key: string; label: string; href: string }[] = [];
  if (state.q) chips.push({ key: "q", label: `«${state.q}»`, href: discoverHref(state, { q: "" }) });
  for (const c of state.cat) chips.push({ key: `cat-${c}`, label: categoryNames[c] ?? c, href: discoverHref(state, { cat: state.cat.filter((x) => x !== c) }) });
  for (const m of state.mode) chips.push({ key: `mode-${m}`, label: MODE_FILTER_LABELS[m], href: discoverHref(state, { mode: state.mode.filter((x) => x !== m) }) });
  for (const l of state.level) chips.push({ key: `level-${l}`, label: `مستوى ${LEVEL_FILTER_LABELS[l]}`, href: discoverHref(state, { level: state.level.filter((x) => x !== l) }) });
  for (const c of state.city) chips.push({ key: `city-${c}`, label: c, href: discoverHref(state, { city: state.city.filter((x) => x !== c) }) });
  if (state.price) chips.push({ key: "price", label: PRICE_RANGES[state.price].label, href: discoverHref(state, { price: null }) });
  if (state.rating) chips.push({ key: "rating", label: RATING_OPTIONS[state.rating], href: discoverHref(state, { rating: null }) });
  if (chips.length === 0) return null;

  return (
    <ul aria-label="عوامل التصفية المفعّلة" className="flex w-full flex-wrap items-center gap-2.5">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={chip.href}
            scroll={false}
            aria-label={`إزالة عامل التصفية: ${chip.label}`}
            className="flex h-9 items-center gap-2 rounded-full border-[1.5px] border-action-primary bg-bg-brand-tint px-3.5 text-text-brand hover:bg-bg-surface focus-ring"
          >
            <span className="type-small whitespace-nowrap">{chip.label}</span>
            <Glyph icon={X} size={20} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * "أضف للمقارنة" toggle on a result card. The selection is URL state (`?compare=id1,id2`), so the toggle is a plain link
 * rendered on the cover's free corner (the mode badge sits on the other one).
 */
function CompareToggle({ state, courseId, title }: { state: DiscoverState; courseId: string; title: string }) {
  const selected = state.compare.includes(courseId);
  const full = !selected && state.compare.length >= COMPARE_MAX;
  const cls =
    "absolute top-3 left-3 z-10 inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-[9px] py-1 type-caption shadow-card focus-ring";
  if (full) {
    return (
      <span aria-disabled className={`${cls} bg-bg-disabled text-text-disabled`} title={`يمكنك مقارنة ${toArabicDigits(COMPARE_MAX)} برامج كحد أقصى`}>
        <Glyph icon={GitCompareArrows} size={16} />
        قارن
      </span>
    );
  }
  return (
    <Link
      href={discoverHref(state, { compare: selected ? state.compare.filter((id) => id !== courseId) : [...state.compare, courseId] })}
      scroll={false}
      aria-pressed={selected}
      aria-label={selected ? `إزالة «${title}» من المقارنة` : `إضافة «${title}» إلى المقارنة`}
      className={`${cls} ${selected ? "bg-action-primary text-text-on-brand" : "bg-bg-surface text-text-brand hover:bg-bg-brand-tint"}`}
    >
      <Glyph icon={selected ? Check : GitCompareArrows} size={16} />
      {selected ? "في المقارنة" : "قارن"}
    </Link>
  );
}

/** Results grid: shared catalog CourseCard (links to /courses/<slug>) + compare toggle. */
export function ResultsGrid({ cards, state, dense = false }: { cards: CourseCardView[]; state: DiscoverState; dense?: boolean }) {
  return (
    <ul
      className={`grid w-full grid-cols-1 items-stretch gap-5 ${dense ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-[repeat(auto-fill,minmax(238px,1fr))]"}`}
    >
      {cards.map((card, i) => (
        <li key={card.id} className="relative flex">
          <CourseCard course={card} priority={i < 2} />
          <CompareToggle state={state} courseId={card.id} title={card.title} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Figma "Compare Bar" (4134:1119 جاهزة للمقارنة · 4134:598 الحد الأدنى للمقارنة): inverse surface r16, px 20, gap 14,
 * accent CTA (disabled until 2 are picked), removable chips, "n من ٣" counter.
 */
export function CompareBar({ state, items }: { state: DiscoverState; items: { id: string; title: string }[] }) {
  if (items.length === 0) return null;
  const ready = items.length >= COMPARE_MIN;
  return (
    <section
      aria-label="المقارنة"
      className="sticky bottom-6 z-20 flex w-full max-w-[692px] flex-wrap items-center gap-3.5 self-end rounded-16 bg-bg-inverse px-5 py-4 shadow-inverse sm:flex-nowrap"
    >
      <span className="shrink-0 rounded-full bg-action-primary px-[15px] py-[7px] text-[14px] leading-none font-bold whitespace-nowrap text-text-on-brand">
        {toArabicDigits(items.length)} من {toArabicDigits(COMPARE_MAX)}
      </span>
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-3.5">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <Link
              href={discoverHref(state, { compare: state.compare.filter((id) => id !== item.id) })}
              scroll={false}
              aria-label={`إزالة «${item.title}» من المقارنة`}
              className="flex max-w-[240px] items-center gap-2.5 rounded-full bg-bg-inverse-chip py-[9px] ps-4 pe-3.5 focus-ring"
            >
              <span className="truncate text-[14px] leading-none font-medium text-text-on-brand">{item.title}</span>
              <X aria-hidden size={13} strokeWidth={2.5} className="shrink-0 text-text-on-inverse-muted" />
            </Link>
          </li>
        ))}
      </ul>
      {ready ? (
        <Link
          href={compareHref(items.map((i) => i.id))}
          className="shrink-0 rounded-[10px] bg-action-accent px-[26px] py-[13px] text-[16px] leading-none font-bold whitespace-nowrap text-text-on-accent-strong hover:opacity-90 focus-ring"
        >
          قارن البرامج
        </Link>
      ) : (
        <span
          aria-disabled
          className="shrink-0 rounded-[10px] bg-bg-inverse-chip px-[18px] py-[13px] text-[16px] leading-none font-bold whitespace-nowrap text-text-on-inverse-muted"
        >
          اختر برنامجين على الأقل
        </span>
      )}
    </section>
  );
}
