"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Clock, Search, Tag, TrendingUp, User } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { formatRating, pluralAr, toArabicDigits } from "@/lib/format";
import { DISCOVER_PATH } from "@/lib/discover-params";
import { searchSuggestions } from "@/app/(workspace)/trainee/discover/actions";
import type { Suggestion } from "@/lib/data/discover";

const RECENT_KEY = "tg.discover.recent";

function parseRecent(raw: string | null): string[] {
  try {
    const list = JSON.parse(raw ?? "[]");
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string").slice(0, 3) : [];
  } catch {
    return [];
  }
}
function readRecentRaw(): string | null {
  try {
    return window.localStorage.getItem(RECENT_KEY);
  } catch {
    return null;
  }
}
function readRecent(): string[] {
  return parseRecent(readRecentRaw());
}
function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
function saveRecent(q: string) {
  try {
    const next = [q, ...readRecent().filter((x) => x !== q)].slice(0, 3);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode) — recent searches are a convenience only */
  }
}

type Row = { key: string; icon: LucideIcon; label: string; meta: string; href: string; query?: string };

function rowsFor(items: Suggestion[], kind: Suggestion["kind"]): Row[] {
  const seen = new Set<string>();
  return items
    .filter((s) => s.kind === kind)
    // Several dated runs of one program share a title — suggest it once.
    .filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)))
    .map((s) => {
      if (s.kind === "trainer") {
        return { key: s.id, icon: User, label: s.label, meta: pluralAr(s.hits ?? 0, ["برنامج واحد", "برنامجان", "برامج", "برنامجًا"]), href: `${DISCOVER_PATH}?q=${encodeURIComponent(s.label)}` };
      }
      if (s.kind === "category") {
        return { key: s.id, icon: Tag, label: s.label, meta: pluralAr(s.hits ?? 0, ["برنامج واحد", "برنامجان", "برامج", "برنامجًا"]), href: `${DISCOVER_PATH}?cat=${s.slug}` };
      }
      const meta = [s.hours ? `${toArabicDigits(Number(s.hours))} ساعة` : null, s.rating ? formatRating(s.rating) : null].filter(Boolean).join(" · ");
      return { key: s.id, icon: s.kind === "trending" ? TrendingUp : BookOpen, label: s.label, meta: s.kind === "trending" ? `برنامج${meta ? ` · ${meta}` : ""}` : meta, href: `/courses/${s.slug}` };
    });
}

/*
 * Figma "Nav / Search Overlay" (138:1867 · Idle / Typing / No Results), shown over TRN-DSC-01 (138:5088):
 * 760px surface r22, 1px border/default, float shadow; header px 22 py 20 (Esc chip · 20 Medium input · search 20);
 * divider; body pt 18 pb 22 px 22 gap 14 with caption group labels and page-tinted r12 rows (36px brand-tint icon tile).
 * Esc or a click outside closes it. Enter searches all results.
 */
export function SearchOverlay({ initialQuery, onCloseHref }: { initialQuery: string; onCloseHref: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputId = useId();
  const [q, setQ] = useState(initialQuery);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const recentRaw = useSyncExternalStore(subscribeStorage, readRecentRaw, () => null);
  const recent = useMemo(() => parseRecent(recentRaw), [recentRaw]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const term = q.trim();
  useEffect(() => {
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const res = await searchSuggestions(term);
        if (res.status === "success") {
          setItems(res.items);
          setError(null);
        } else {
          setError(res.message);
        }
        setLoadedFor(term);
      });
    }, term ? 220 : 0);
    return () => window.clearTimeout(handle);
  }, [term]);

  const close = () => router.replace(onCloseHref, { scroll: false });
  const submit = () => {
    if (!term) return;
    saveRecent(term);
    router.push(`${DISCOVER_PATH}?q=${encodeURIComponent(term)}`);
  };

  const typing = term.length > 0;
  const settled = loadedFor === term;
  const groups: { title: string; rows: Row[] }[] = typing
    ? [
        { title: "برامج", rows: rowsFor(items, "program") },
        { title: "مدربون", rows: rowsFor(items, "trainer") },
        { title: "تخصصات", rows: rowsFor(items, "category") },
      ].filter((g) => g.rows.length > 0)
    : [
        {
          title: "عمليات بحث سابقة",
          rows: recent.map((r) => ({ key: `recent-${r}`, icon: Clock, label: r, meta: "بحث", href: `${DISCOVER_PATH}?q=${encodeURIComponent(r)}`, query: r })),
        },
        { title: "الأكثر طلبًا هذا الأسبوع", rows: rowsFor(items, "trending") },
      ].filter((g) => g.rows.length > 0);

  return (
    <dialog
      ref={dialogRef}
      aria-label="البحث في البرامج"
      onClose={close}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className="mx-auto mt-[8vh] max-h-[84vh] w-[calc(100%-32px)] max-w-[760px] overflow-hidden rounded-22 border border-border-default bg-bg-surface p-0 text-text-primary shadow-float backdrop:bg-scrim"
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-3.5 px-[22px] py-5"
      >
        <Glyph icon={Search} size={20} className="text-text-brand" />
        <label htmlFor={inputId} className="sr-only">
          ابحث عن برنامج أو مدرب أو تخصص
        </label>
        <input
          id={inputId}
          autoFocus
          type="search"
          value={q}
          maxLength={120}
          autoComplete="off"
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن برنامج أو مدرب أو تخصص…"
          className="min-w-0 flex-1 bg-transparent type-h3 text-text-primary outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        <button type="button" onClick={close} className="cursor-pointer rounded-8 bg-bg-page px-2.5 py-1.5 type-caption text-text-muted focus-ring">
          Esc
          <span className="sr-only"> — إغلاق البحث</span>
        </button>
      </form>
      <div aria-hidden className="h-px w-full bg-border-divider" />

      <div className="flex max-h-[calc(84vh-90px)] flex-col gap-3.5 overflow-y-auto px-[22px] pt-[18px] pb-[22px]" aria-live="polite" aria-busy={pending || undefined}>
        {error && <Alert tone="error" title={error} />}
        {!settled && groups.length === 0 && !error && <Spinner label="جارٍ البحث" />}
        {groups.map((g) => (
          <section key={g.title} className="flex flex-col gap-3.5" aria-label={g.title}>
            <h2 className="type-caption text-text-muted">{g.title}</h2>
            <ul className="flex flex-col gap-3.5">
              {g.rows.map((row) => (
                <li key={row.key}>
                  <Link
                    href={row.href}
                    onClick={() => saveRecent(row.query ?? (typing ? term : row.label))}
                    className="flex items-center gap-3 rounded-12 bg-bg-page px-3 py-2.5 hover:bg-bg-brand-tint focus-ring"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
                      <Glyph icon={row.icon} size={20} />
                    </span>
                    <span className="min-w-0 flex-1 truncate type-body text-text-primary">{row.label}</span>
                    {row.meta && <span className="shrink-0 type-caption text-text-muted">{row.meta}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {typing && settled && !error && groups.length === 0 && (
          <div className="flex w-full flex-col items-center gap-3 rounded-16 border-[1.5px] border-dashed border-border-divider bg-bg-page px-8 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-16 bg-bg-brand-tint text-text-brand">
              <Glyph icon={Search} size={20} />
            </div>
            <h2 className="type-title text-text-primary">لا نتائج مطابقة</h2>
            <p className="max-w-md type-small text-text-secondary">لم نعثر على «{term}». جرّب كلمات أقل أو تصفّح التخصصات.</p>
            <Button size="s" onClick={() => router.replace(`${DISCOVER_PATH}#filters`)}>
              تصفّح التخصصات
            </Button>
          </div>
        )}

        {typing && settled && groups.length > 0 && (
          <Button variant="text" size="s" className="self-start" onClick={submit}>
            اعرض كل النتائج لـ «{term}»
          </Button>
        )}
      </div>
    </dialog>
  );
}
