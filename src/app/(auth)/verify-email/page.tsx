import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AuthSplitLayout, AuthTitle, BackToLogin, LegalLinks, SuccessPill } from "@/components/auth/AuthLayouts";
import { VerifyEmailForm } from "@/components/auth/AuthForms";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "تحقّق من هويتك", robots: { index: false } };

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 2)}${"•".repeat(Math.max(user.length - 2, 1))}@${domain}`;
}

/** PUB-AUT-03 · تحقّق بخطوتين — e-mail code (the SMS channel needs an SMS provider; see OPEN_QUESTIONS.md). */
export default async function VerifyEmailPage(props: PageProps<"/verify-email">) {
  const sp = await props.searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  if (!email.includes("@")) redirect("/register");
  const next = typeof sp.next === "string" ? safeNext(sp.next, "") : "";
  return (
    <AuthSplitLayout>
      <AuthTitle
        title="تحقّق من هويتك"
        subtitle={
          <>
            أرسلنا رسالة تفعيل إلى بريدك <bdi dir="ltr">{maskEmail(email)}</bdi>. اضغط رابط التفعيل فيها من هذا المتصفح، أو أدخل الرمز المكوَّن من ٦ أرقام إن ظهر في الرسالة.
          </>
        }
        badge={<SuccessPill icon={ShieldCheck}>الرمز صالح لمدة ١٠ دقائق</SuccessPill>}
      />
      <VerifyEmailForm email={email} next={next} />
      <BackToLogin />
      <LegalLinks />
    </AuthSplitLayout>
  );
}
