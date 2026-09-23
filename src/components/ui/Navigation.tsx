import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toArabicDigits } from "@/lib/format";

/*
 * Figma "Nav / Tab Item" (62:197): Underline — 17 Regular text/secondary, active 16 Medium text/brand + 3px
 * rounded indicator. Pill — white pill, active brand-tint + text/brand. Implemented as links (URL state).
 */
export type TabLink = { href: string; label: string; count?: number };

export function Tabs({ tabs, active, variant = "underline", label }: { tabs: TabLink[]; active: string; variant?: "underline" | "pill"; label: string }) {
  return (
    <nav aria-label={label} className={`flex max-w-full gap-2 overflow-x-auto ${variant === "underline" ? "border-b border-border-divider" : ""}`}>
      {tabs.map((t) => {
        const isActive = t.href === active;
        const text = t.count !== undefined ? `${t.label} (${toArabicDigits(t.count)})` : t.label;
        return variant === "underline" ? (
          <Link
            key={t.href}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex shrink-0 flex-col gap-2 px-3.5 pt-3 pb-3 focus-ring ${isActive ? "type-subtitle text-text-brand" : "type-body text-text-secondary hover:text-text-primary"}`}
          >
            {text}
            {isActive && <span aria-hidden className="absolute inset-x-3.5 bottom-0 h-[3px] rounded-full bg-action-primary" />}
          </Link>
        ) : (
          <Link
            key={t.href}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex shrink-0 items-center rounded-full px-[18px] py-3 focus-ring ${isActive ? "bg-bg-brand-tint type-subtitle text-text-brand" : "bg-bg-surface type-body text-text-secondary hover:bg-bg-sidebar-hover"}`}
          >
            {text}
          </Link>
        );
      })}
    </nav>
  );
}

/* Figma "Nav / Breadcrumb" (62:208): 15 Regular, links text/brand, current text/primary, chevron-left 16. */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="مسار التنقل">
      <ol className="flex flex-wrap items-center gap-2 type-small">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && <ChevronLeft aria-hidden size={16} strokeWidth={1.25} absoluteStrokeWidth className="text-text-muted" />}
            {item.href ? (
              <Link href={item.href} className="rounded-8 text-text-brand hover:underline focus-ring">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-text-primary">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* Figma "Nav / Pagination" (62:251): 44px squares r12, 1px border/default; current = action/primary. */
export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  const from = Math.max(1, Math.min(page - 1, pageCount - 3));
  const pages = Array.from({ length: Math.min(4, pageCount) }, (_, i) => from + i);
  const box = "flex size-11 items-center justify-center rounded-12 border border-border-default bg-bg-surface type-small text-text-primary focus-ring";
  return (
    <nav aria-label="الصفحات" className="flex flex-wrap items-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} aria-label="الصفحة السابقة" className={box}>
          <ChevronRight aria-hidden size={20} strokeWidth={1.4} absoluteStrokeWidth />
        </Link>
      ) : null}
      {pages.map((p) =>
        p === page ? (
          <span key={p} aria-current="page" className="flex size-11 items-center justify-center rounded-12 bg-action-primary type-small text-text-on-brand">
            {toArabicDigits(p)}
          </span>
        ) : (
          <Link key={p} href={hrefFor(p)} className={box}>
            {toArabicDigits(p)}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} aria-label="الصفحة التالية" className={box}>
          <ChevronLeft aria-hidden size={20} strokeWidth={1.4} absoluteStrokeWidth />
        </Link>
      ) : null}
      <span className="type-caption text-text-muted">من {toArabicDigits(pageCount)} صفحة</span>
    </nav>
  );
}
