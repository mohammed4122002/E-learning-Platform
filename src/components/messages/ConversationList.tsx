import Link from "next/link";
import { BellOff, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { formatRelative, toArabicDigits } from "@/lib/format";
import type { ConversationListItem } from "@/lib/data/messages";

type Props = {
  items: ConversationListItem[];
  activeId: string | null;
  filter: "all" | "support" | "unread";
  q: string;
  counts: { all: number; unread: number };
  now: Date;
};

const hrefFor = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
  const str = s.toString();
  return str ? `/messages?${str}` : "/messages";
};

/** GEN-MSG-01 · قائمة المحادثات (235:14763): search, filter chips and the conversation rows. */
export function ConversationList({ items, activeId, filter, q, counts, now }: Props) {
  const chips = [
    { key: "all", label: `الكل · ${toArabicDigits(counts.all)}` },
    { key: "support", label: "الدعم" },
    { key: "unread", label: `غير مقروءة · ${toArabicDigits(counts.unread)}` },
  ] as const;
  return (
    <div className="flex min-h-0 flex-col gap-3 p-4">
      <form role="search" action="/messages" className="relative">
        {filter !== "all" && <input type="hidden" name="f" value={filter} />}
        <label htmlFor="conv-q" className="sr-only">
          ابحث في المحادثات
        </label>
        <Glyph icon={Search} size={16} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          id="conv-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="ابحث في المحادثات"
          className="h-12 w-full rounded-12 border-[1.5px] border-border-default bg-bg-surface ps-11 pe-4 type-body text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary"
        />
      </form>
      <nav aria-label="تصفية المحادثات" className="flex flex-wrap gap-2">
        {chips.map((c) => {
          const active = c.key === filter;
          return (
            <Link
              key={c.key}
              href={hrefFor({ f: c.key === "all" ? undefined : c.key, q: q || undefined })}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 items-center rounded-full px-3.5 type-small focus-ring ${
                active ? "border-[1.5px] border-action-primary bg-bg-brand-tint text-text-brand" : "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-page"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </nav>
      {items.length === 0 ? (
        <p className="px-2 py-8 text-center type-small text-text-muted">{q ? `لا محادثات تطابق «${q}».` : "لا محادثات في هذا التصنيف."}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((c) => {
            const active = c.id === activeId;
            return (
              <li key={c.id}>
                <Link
                  href={hrefFor({ c: c.id, f: filter === "all" ? undefined : filter, q: q || undefined })}
                  aria-current={active ? "true" : undefined}
                  className={`flex items-start gap-3 rounded-12 px-3 py-3 focus-ring ${
                    active ? "border-[1.5px] border-action-primary bg-bg-brand-tint" : c.unread ? "bg-bg-page" : "hover:bg-bg-page"
                  }`}
                >
                  <Avatar name={c.name} src={c.avatarUrl} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate type-subtitle ${c.unread ? "text-text-primary" : "text-text-primary"}`}>
                        {c.name}
                        {c.unread && <span className="sr-only"> — غير مقروءة</span>}
                      </span>
                      {c.muted && <Glyph icon={BellOff} size={16} className="text-text-muted" label="مكتومة" />}
                      <span className="shrink-0 type-caption text-text-muted">{formatRelative(c.lastMessageAt, now)}</span>
                    </span>
                    <span className={`line-clamp-2 type-caption ${c.unread ? "font-medium text-text-primary" : "text-text-muted"}`}>{c.lastMessage ?? c.subject}</span>
                  </span>
                  {c.unread && <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-action-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
