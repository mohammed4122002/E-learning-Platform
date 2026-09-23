import type { Metadata } from "next";
import { headers } from "next/headers";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { AccountHeader } from "@/components/account/AccountHeader";
import { SecurityPanel } from "@/components/account/SecurityPanel";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "الأمان والجلسات", description: "كلمة المرور والجلسات النشطة" };

/** "Chrome · Windows" from the request's user agent. */
function describeDevice(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "متصفح";
  const os = /Windows/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return `متصفّح ${browser}${os ? ` · ${os}` : ""}`;
}

/** GEN-ACC-01 · ٢ الأمان والجلسات (228:13978). */
export default async function SecurityPage() {
  const user = await requireUser("/account/security");
  const supabase = await createClient();
  const [account, h, authUser] = await Promise.all([getAccount(user.id), headers(), supabase.auth.getUser()]);
  const last = authUser.data.user?.last_sign_in_at ?? null;
  return (
    <>
      <TopBar title="إعدادات الحساب" subtitle="الأمان والجلسات" />
      <PageBody className="gap-6">
        <AccountHeader active="/account/security" />
        <SecurityPanel prefs={account.prefs} device={describeDevice(h.get("user-agent") ?? "")} lastSignIn={last ? formatRelative(last) : null} />
      </PageBody>
    </>
  );
}
