import "server-only";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/storage";

export type ConversationListItem = {
  id: string;
  name: string;
  avatarUrl: string | null;
  subject: string;
  courseTitle: string | null;
  isSupport: boolean;
  lastMessage: string | null;
  lastMessageAt: string;
  unread: boolean;
  muted: boolean;
};

type Counterpart = { name: string; avatarUrl: string | null; verifiedOrg: boolean };

async function counterparts(conversationIds: string[], userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id, profiles(full_name, avatar_path)")
    .in("conversation_id", conversationIds)
    .neq("user_id", userId);
  const map = new Map<string, { name: string; avatarUrl: string | null }>();
  for (const p of data ?? []) {
    if (!map.has(p.conversation_id) && p.profiles?.full_name) {
      map.set(p.conversation_id, { name: p.profiles.full_name, avatarUrl: avatarUrl(p.profiles.avatar_path) });
    }
  }
  return map;
}

/** Display name of the other side: the provider for provider courses (BR-R1), else the trainer, else support. */
function resolveName(
  course: { title: string; organizations: { name: string; verification_status: string } | null } | null,
  other: { name: string; avatarUrl: string | null } | undefined,
): Counterpart {
  if (course?.organizations) return { name: course.organizations.name, avatarUrl: null, verifiedOrg: course.organizations.verification_status === "verified" };
  if (other) return { ...other, verifiedOrg: false };
  return { name: course ? "فريق الدورة" : "الدعم الفني", avatarUrl: null, verifiedOrg: false };
}

export async function listConversations(userId: string): Promise<ConversationListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at, muted_at, conversations(id, subject, course_id, last_message_at, courses(title, organizations(name, verification_status)))")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).filter((r) => r.conversations);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.conversation_id);

  const [others, latest] = await Promise.all([
    counterparts(ids, userId),
    supabase.from("messages").select("conversation_id, body, created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(500),
  ]);
  const last = new Map<string, string>();
  for (const m of latest.data ?? []) if (!last.has(m.conversation_id)) last.set(m.conversation_id, m.body);

  return rows
    .map((r) => {
      const c = r.conversations!;
      const who = resolveName(c.courses, others.get(c.id));
      return {
        id: c.id,
        name: who.name,
        avatarUrl: who.avatarUrl,
        subject: c.subject,
        courseTitle: c.courses?.title ?? null,
        isSupport: !c.course_id,
        lastMessage: last.get(c.id) ?? null,
        lastMessageAt: c.last_message_at,
        unread: !r.last_read_at || new Date(c.last_message_at) > new Date(r.last_read_at),
        muted: Boolean(r.muted_at),
      };
    })
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  senderName: string;
  attachment: { name: string; url: string | null; path: string } | null;
  readByOthers: boolean;
};

export type ConversationDetail = {
  id: string;
  subject: string;
  name: string;
  avatarUrl: string | null;
  verifiedOrg: boolean;
  isSupport: boolean;
  muted: boolean;
  course: { id: string; title: string; slug: string; startsAt: string | null; enrollmentStatus: string | null } | null;
  messages: ThreadMessage[];
};

/** File name shown for an attachment stored as "<conversation>/<uuid>-<name>". */
export function attachmentName(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file.replace(/^[0-9a-f-]{36}-/i, "");
}

export async function getConversation(id: string, userId: string): Promise<ConversationDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: me } = await supabase.from("conversation_participants").select("muted_at").eq("conversation_id", id).eq("user_id", userId).maybeSingle();
  if (!me) return null; // not a member → treated as not found

  const [convRes, msgRes, others, partsRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, subject, course_id, courses(id, title, slug, starts_at, organizations(name, verification_status))")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("messages").select("id, body, created_at, sender_id, attachment_path, profiles(full_name)").eq("conversation_id", id).order("created_at").limit(500),
    counterparts([id], userId),
    supabase.from("conversation_participants").select("user_id, last_read_at").eq("conversation_id", id).neq("user_id", userId),
  ]);
  const conv = convRes.data;
  if (!conv) return null;

  const enrollment = conv.course_id
    ? (
        await supabase
          .from("enrollments")
          .select("status")
          .eq("course_id", conv.course_id)
          .eq("trainee_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data
    : null;

  const paths = (msgRes.data ?? []).map((m) => m.attachment_path).filter((p): p is string => Boolean(p));
  const signed = paths.length ? (await supabase.storage.from("message-attachments").createSignedUrls(paths, 3600)).data ?? [] : [];
  const urlFor = new Map(signed.map((s) => [s.path, s.signedUrl]));
  const othersRead = (partsRes.data ?? []).map((p) => p.last_read_at).filter((d): d is string => Boolean(d));
  const who = resolveName(conv.courses, others.get(id));

  return {
    id: conv.id,
    subject: conv.subject,
    name: who.name,
    avatarUrl: who.avatarUrl,
    verifiedOrg: who.verifiedOrg,
    isSupport: !conv.course_id,
    muted: Boolean(me.muted_at),
    course: conv.courses
      ? { id: conv.courses.id, title: conv.courses.title, slug: conv.courses.slug, startsAt: conv.courses.starts_at, enrollmentStatus: enrollment?.status ?? null }
      : null,
    messages: (msgRes.data ?? []).map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.created_at,
      mine: m.sender_id === userId,
      senderName: m.profiles?.full_name ?? who.name,
      attachment: m.attachment_path ? { path: m.attachment_path, name: attachmentName(m.attachment_path), url: urlFor.get(m.attachment_path) ?? null } : null,
      readByOthers: othersRead.some((d) => new Date(d) >= new Date(m.created_at)),
    })),
  };
}

/** /messages/new?course=<slug> — the course being asked about. */
export async function getCourseForMessage(slug: string) {
  if (!/^[a-z0-9-]{2,140}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, title, slug, organizations(name), trainer:profiles!courses_trainer_id_fkey(full_name)")
    .eq("slug", slug)
    .neq("status", "draft")
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, title: data.title, slug: data.slug, recipient: data.organizations?.name ?? data.trainer?.full_name ?? "فريق الدورة" };
}
