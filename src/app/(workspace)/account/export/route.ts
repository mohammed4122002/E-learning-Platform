import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GEN-ACC-01 · ٤ «نزّل نسخة من بياناتك»: the signed-in user's own data as a JSON download.
 * Every query runs as the user, so RLS guarantees only their own rows are included.
 * Identity document files are not included (only the review status), per TRN-VER privacy rules.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data: user } = await supabase.auth.getUser();
  const [profile, settings, prefs, experiences, enrollments, payments, certificates, external, progress, attendance, quizAttempts, submissions, ratings, favorites, follows, notifications, conversations, messages, verifications, refunds, disputes, waitlist] =
    await Promise.all([
      supabase.from("profiles").select("full_name, headline, bio, city, is_public, identity_status, created_at, updated_at").eq("id", uid).maybeSingle(),
      supabase.from("account_settings").select("phone, locale, timezone, arabic_digits, notification_prefs, show_certificates, show_learning_record").eq("user_id", uid).maybeSingle(),
      supabase.from("trainee_preferences").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("experiences").select("title, organization, start_date, end_date, is_current, description, created_at").eq("user_id", uid),
      supabase.from("enrollments").select("id, status, list_price, price_paid, currency, funding, created_at, confirmed_at, completed_at, ended_at, end_reason, courses(title, slug)").eq("trainee_id", uid),
      supabase.from("payments").select("id, amount, currency, method, status, created_at, receipts(number, amount, vat_amount, issued_at)").eq("trainee_id", uid),
      supabase.from("certificates").select("code, course_title, trainee_name, hours, status, issued_at, revoked_at").eq("trainee_id", uid),
      supabase.from("external_certificates").select("title, issuer, issued_on, credential_url, status, created_at").eq("trainee_id", uid),
      supabase.from("lesson_progress").select("lesson_id, course_id, position_seconds, completed_at, updated_at").eq("trainee_id", uid),
      supabase.from("attendance").select("session_id, checked_in_at, method").eq("trainee_id", uid),
      supabase.from("quiz_attempts").select("quiz_id, score_percent, passed, started_at, submitted_at").eq("trainee_id", uid),
      supabase.from("assignment_submissions").select("assignment_id, status, note, feedback, score, submitted_at, reviewed_at").eq("trainee_id", uid),
      supabase.from("course_ratings").select("course_id, content_score, trainer_score, organization_score, comment, created_at").eq("trainee_id", uid),
      supabase.from("favorites").select("course_id, created_at").eq("user_id", uid),
      supabase.from("follows").select("trainer_id, organization_id, category_id, created_at").eq("user_id", uid),
      supabase.from("notifications").select("kind, title, body, link, read_at, created_at").eq("user_id", uid),
      supabase.from("conversation_participants").select("conversation_id, last_read_at, conversations(subject, created_at)").eq("user_id", uid),
      supabase.from("messages").select("conversation_id, body, created_at").eq("sender_id", uid),
      supabase.from("identity_verifications").select("document_type, document_number_last4, status, submitted_at, reviewed_at").eq("user_id", uid),
      supabase.from("refund_requests").select("enrollment_id, reason, details, amount, status, created_at, decided_at").eq("trainee_id", uid),
      supabase.from("disputes").select("payment_id, reason, details, status, resolution, created_at").eq("trainee_id", uid),
      supabase.from("waitlist_entries").select("course_id, status, created_at").eq("trainee_id", uid),
    ]);

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: uid, email: user.user?.email ?? null, created_at: user.user?.created_at ?? null, last_sign_in_at: user.user?.last_sign_in_at ?? null },
    profile: profile.data,
    settings: settings.data,
    learning_preferences: prefs.data,
    experiences: experiences.data ?? [],
    enrollments: enrollments.data ?? [],
    payments: payments.data ?? [],
    certificates: certificates.data ?? [],
    external_certificates: external.data ?? [],
    lesson_progress: progress.data ?? [],
    attendance: attendance.data ?? [],
    quiz_attempts: quizAttempts.data ?? [],
    assignment_submissions: submissions.data ?? [],
    ratings: ratings.data ?? [],
    favorites: favorites.data ?? [],
    follows: follows.data ?? [],
    notifications: notifications.data ?? [],
    conversations: conversations.data ?? [],
    messages_sent: messages.data ?? [],
    identity_verifications: verifications.data ?? [],
    refund_requests: refunds.data ?? [],
    disputes: disputes.data ?? [],
    waitlist: waitlist.data ?? [],
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bawaba-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
