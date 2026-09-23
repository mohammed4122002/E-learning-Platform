import "server-only";
import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ShellData = {
  unreadNotifications: number;
  totalNotifications: number;
  latestNotifications: NotificationItem[];
  unreadMessages: number;
  pendingActions: number;
};

/** Counts and previews for the top bar / sidebar. All queries run as the user (RLS). */
export async function getShellData(userId: string): Promise<ShellData> {
  const supabase = await createClient();
  const [unread, total, latest, participants, pending] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("conversation_participants").select("last_read_at, conversations(last_message_at)").eq("user_id", userId),
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("trainee_id", userId)
      .in("status", ["pending_payment"]),
  ]);

  const unreadMessages = (participants.data ?? []).filter((p) => {
    const last = p.conversations?.last_message_at;
    return last && (!p.last_read_at || new Date(last) > new Date(p.last_read_at));
  }).length;

  const { count: invites } = await supabase
    .from("waitlist_entries")
    .select("id", { count: "exact", head: true })
    .eq("trainee_id", userId)
    .eq("status", "invited");

  return {
    unreadNotifications: unread.count ?? 0,
    totalNotifications: total.count ?? 0,
    latestNotifications: (latest.data ?? []).map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
    unreadMessages,
    pendingActions: (pending.count ?? 0) + (invites ?? 0),
  };
}
