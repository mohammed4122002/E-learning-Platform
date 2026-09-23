import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

const TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/**
 * Link-based verification from Supabase auth e-mails (confirmation, password recovery, e-mail change).
 * Two link shapes are accepted:
 *  - `?code=` — Supabase's default templates ({{ .ConfirmationURL }}, PKCE). The code can only be exchanged in
 *    the browser that started the flow; elsewhere the e-mail is already confirmed, so the user just signs in.
 *  - `?token_hash=&type=` — custom templates. Works in any browser.
 * The code-based path (6-digit OTP) is handled by the verify-email / forgot-password screens.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next");
  const isRecovery = type === "recovery" || rawNext === "/forgot-password/new";
  const next = safeNext(rawNext, isRecovery ? "/forgot-password/new" : "/select-workspace");
  const supabase = await createClient();

  if (tokenHash && type && TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    // Opened in another browser/device: the e-mail is confirmed but this browser holds no session.
    if (!isRecovery) return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=link_expired", request.url));
}
