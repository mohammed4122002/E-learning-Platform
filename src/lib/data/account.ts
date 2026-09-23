import "server-only";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/storage";
import { getLatestVerification, type VerificationView } from "@/lib/data/profile";

/** GEN-ACC-01 · ٣ الإشعارات — per event: which channels are on. */
export type Channel = "in_app" | "email" | "sms";
export type NotificationEvent = "urgent" | "waitlist" | "sessions" | "payments" | "certificates" | "messages" | "offers";
export type NotificationPrefs = {
  events: Record<NotificationEvent, Record<Channel, boolean>>;
  weeklyDigest: boolean;
  allowMessages: boolean;
  surveys: boolean;
  quietHours: { enabled: boolean; from: string; to: string };
  loginAlerts: boolean;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  events: {
    urgent: { in_app: true, email: true, sms: true },
    waitlist: { in_app: true, email: true, sms: true },
    sessions: { in_app: true, email: true, sms: false },
    payments: { in_app: true, email: true, sms: false },
    certificates: { in_app: true, email: true, sms: false },
    messages: { in_app: true, email: false, sms: false },
    offers: { in_app: true, email: false, sms: false },
  },
  weeklyDigest: true,
  allowMessages: true,
  surveys: false,
  quietHours: { enabled: false, from: "22:00", to: "07:00" },
  loginAlerts: true,
};

/** Merges the stored JSON over the defaults so new events/channels get sensible values. */
export function readPrefs(raw: unknown): NotificationPrefs {
  const j = (raw && typeof raw === "object" ? raw : {}) as Partial<NotificationPrefs>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
  const events = { ...DEFAULT_PREFS.events };
  for (const key of Object.keys(events) as NotificationEvent[]) {
    const stored = j.events?.[key];
    events[key] = {
      in_app: bool(stored?.in_app, events[key].in_app),
      email: bool(stored?.email, events[key].email),
      sms: bool(stored?.sms, events[key].sms),
    };
  }
  events.urgent = { in_app: true, email: true, sms: true }; // mandatory (cannot be turned off)
  return {
    events,
    weeklyDigest: bool(j.weeklyDigest, DEFAULT_PREFS.weeklyDigest),
    allowMessages: bool(j.allowMessages, DEFAULT_PREFS.allowMessages),
    surveys: bool(j.surveys, DEFAULT_PREFS.surveys),
    quietHours: {
      enabled: bool(j.quietHours?.enabled, DEFAULT_PREFS.quietHours.enabled),
      from: str(j.quietHours?.from, DEFAULT_PREFS.quietHours.from),
      to: str(j.quietHours?.to, DEFAULT_PREFS.quietHours.to),
    },
    loginAlerts: bool(j.loginAlerts, DEFAULT_PREFS.loginAlerts),
  };
}

export type AccountView = {
  id: string;
  email: string;
  pendingEmail: string | null;
  fullName: string;
  avatarUrl: string | null;
  identityStatus: "pending" | "verified" | "needs_changes" | "rejected" | null;
  verification: VerificationView | null;
  isPublic: boolean;
  phone: string | null;
  locale: "ar" | "en";
  timezone: string;
  arabicDigits: boolean;
  showCertificates: boolean;
  showLearningRecord: boolean;
  prefs: NotificationPrefs;
  memberSince: string;
};

export async function getAccount(userId: string): Promise<AccountView> {
  const supabase = await createClient();
  const [userRes, profileRes, settingsRes, verification] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("full_name, avatar_path, identity_status, is_public, created_at").eq("id", userId).single(),
    supabase
      .from("account_settings")
      .select("phone, locale, timezone, arabic_digits, notification_prefs, show_certificates, show_learning_record")
      .eq("user_id", userId)
      .maybeSingle(),
    getLatestVerification(userId),
  ]);
  if (profileRes.error || !profileRes.data) throw new Error(profileRes.error?.message ?? "profile_missing");
  const p = profileRes.data;
  const s = settingsRes.data;
  return {
    id: userId,
    email: userRes.data.user?.email ?? "",
    pendingEmail: userRes.data.user?.new_email ?? null,
    fullName: p.full_name,
    avatarUrl: avatarUrl(p.avatar_path),
    identityStatus: p.identity_status,
    verification,
    isPublic: p.is_public,
    phone: s?.phone ?? null,
    locale: (s?.locale as "ar" | "en") ?? "ar",
    timezone: s?.timezone ?? "Asia/Riyadh",
    arabicDigits: s?.arabic_digits ?? true,
    showCertificates: s?.show_certificates ?? true,
    showLearningRecord: s?.show_learning_record ?? true,
    prefs: readPrefs(s?.notification_prefs),
    memberSince: p.created_at,
  };
}

export type DeletionBlocker = "active_enrollment" | "open_refund" | "open_dispute";

export async function getDeletionBlockers(): Promise<DeletionBlocker[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("account_deletion_blockers");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.reason as DeletionBlocker);
}
