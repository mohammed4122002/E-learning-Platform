import type { Metadata } from "next";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { NotificationCenter, type CenterItem } from "@/components/notifications/NotificationCenter";
import { requireUser } from "@/lib/auth";
import { listNotifications, NOTIFICATION_FILTERS, type NotificationFilter } from "@/lib/data/notifications";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "مركز الإشعارات", description: "كل إشعاراتك مع البحث والفلترة" };

const riyadhDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(d);

/** GEN-NOT-01 · مركز الإشعارات — Default (235:14479) · Selection (238:14778). */
export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  const user = await requireUser("/notifications");
  const sp = await searchParams;
  const filter = (typeof sp.filter === "string" && sp.filter in NOTIFICATION_FILTERS ? sp.filter : "all") as NotificationFilter;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const archived = sp.archived === "1";
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const data = await listNotifications(user.id, { filter, q, page, archived });

  const now = new Date();
  const today = riyadhDay(now);
  const weekAgo = now.getTime() - 7 * 24 * 3600 * 1000;
  const items: CenterItem[] = data.items.map((n) => {
    const at = new Date(n.createdAt);
    const group: CenterItem["group"] =
      n.needsAction && !archived ? "action" : riyadhDay(at) === today ? "today" : at.getTime() >= weekAgo ? "week" : "older";
    return {
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      unread: !n.readAt,
      needsAction: n.needsAction,
      timeLabel: formatRelative(n.createdAt, now),
      group,
    };
  });

  const params = (f: string) => {
    const s = new URLSearchParams();
    if (f !== "all") s.set("filter", f);
    if (q) s.set("q", q);
    if (archived) s.set("archived", "1");
    const str = s.toString();
    return str ? `/notifications?${str}` : "/notifications";
  };
  const chips = (Object.keys(NOTIFICATION_FILTERS) as NotificationFilter[]).map((key) => ({
    key,
    label: NOTIFICATION_FILTERS[key].label,
    href: params(key),
    count: key === "all" ? data.counts.all : key === "action" ? data.counts.action : key === "unread" ? data.counts.unread : undefined,
  }));

  return (
    <>
      <TopBar title="مركز الإشعارات" subtitle={archived ? "الإشعارات المؤرشفة" : "كل إشعاراتك مع البحث والفلترة"} />
      <PageBody className="gap-6">
        <NotificationCenter
          key={`${filter}-${q}-${page}-${archived}`}
          items={items}
          chips={chips}
          activeChip={filter}
          q={q}
          totals={{ all: data.counts.all, unread: data.counts.unread }}
          page={data.page}
          pageCount={data.pageCount}
          hrefForPage={params(filter)}
          archived={archived}
        />
      </PageBody>
    </>
  );
}
