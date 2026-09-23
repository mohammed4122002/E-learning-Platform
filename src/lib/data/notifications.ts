import "server-only";
import { createClient } from "@/lib/supabase/server";

/** GEN-NOT-01 filter chips → notification kinds. */
export const NOTIFICATION_FILTERS = {
  all: { label: "الكل", kinds: null },
  messages: { label: "الرسائل", kinds: ["message"] },
  certificates: { label: "الشهادات", kinds: ["certificate_issued", "certificate_revoked", "quiz_result", "assignment_reviewed"] },
  courses: {
    label: "الدورات والجلسات",
    kinds: ["enrollment_confirmed", "enrollment_pending_provider", "enrollment_rejected", "session_changed", "session_reminder", "course_update", "rating_request", "waitlist_invite"],
  },
  payments: { label: "المدفوعات", kinds: ["payment_succeeded", "payment_failed", "refund_approved", "refund_rejected", "refund_requested", "receipt"] },
  action: { label: "تحتاج إجراء", kinds: null },
  unread: { label: "غير مقروءة", kinds: null },
} as const;
export type NotificationFilter = keyof typeof NOTIFICATION_FILTERS;

/** Kinds that ask the trainee to act before a deadline — pinned on top while unread, and not deletable. */
export const ACTION_KINDS = ["action_required", "waitlist_invite"];

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  needsAction: boolean;
};

export type NotificationsPage = {
  items: NotificationRow[];
  page: number;
  pageCount: number;
  total: number;
  counts: { all: number; unread: number; action: number };
};

export const PAGE_SIZE = 20;

export async function listNotifications(
  userId: string,
  opts: { filter: NotificationFilter; q: string; page: number; archived: boolean },
): Promise<NotificationsPage> {
  const supabase = await createClient();
  const base = () =>
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("archived_at", null);

  let query = supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, archived_at, created_at", { count: "exact" })
    .eq("user_id", userId);
  query = opts.archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);

  const f = NOTIFICATION_FILTERS[opts.filter];
  if (f.kinds) query = query.in("kind", [...f.kinds]);
  if (opts.filter === "unread") query = query.is("read_at", null);
  if (opts.filter === "action") query = query.in("kind", ACTION_KINDS).is("read_at", null);
  const q = opts.q.trim().replace(/[%,()]/g, " ").slice(0, 80);
  if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%`);

  const from = (opts.page - 1) * PAGE_SIZE;
  const [list, all, unread, action] = await Promise.all([
    query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1),
    base(),
    base().is("read_at", null),
    base().is("read_at", null).in("kind", ACTION_KINDS),
  ]);
  if (list.error) throw new Error(list.error.message);

  const total = list.count ?? 0;
  return {
    items: (list.data ?? []).map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.read_at,
      archivedAt: n.archived_at,
      createdAt: n.created_at,
      needsAction: ACTION_KINDS.includes(n.kind) && !n.read_at,
    })),
    page: opts.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
    counts: { all: all.count ?? 0, unread: unread.count ?? 0, action: action.count ?? 0 },
  };
}
