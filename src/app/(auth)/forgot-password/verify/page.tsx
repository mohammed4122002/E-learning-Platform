import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockOpen } from "lucide-react";
import { AuthCard, AuthCenteredLayout, BackToLogin, RECOVERY_STEPS, Stepper } from "@/components/auth/AuthLayouts";
import { ForgotCodeForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "أدخل رمز التحقق", robots: { index: false } };

/** PUB-AUT-04 · خطوة ٢ — رمز التحقق */
export default async function ForgotVerifyPage(props: PageProps<"/forgot-password/verify">) {
  const sp = await props.searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  if (!email.includes("@")) redirect("/forgot-password");
  return (
    <AuthCenteredLayout icon={LockOpen} title="أدخل رمز التحقق" subtitle="أرسلنا رسالة إلى بريدك. اضغط الرابط فيها من هذا المتصفح، أو أدخل الرمز المكوَّن من ٦ أرقام إن ظهر في الرسالة.">
      <AuthCard>
        <Stepper steps={RECOVERY_STEPS} current={2} />
        <hr className="border-border-divider" />
        <ForgotCodeForm email={email} />
        <BackToLogin />
      </AuthCard>
    </AuthCenteredLayout>
  );
}
