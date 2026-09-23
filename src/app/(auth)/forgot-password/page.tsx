import type { Metadata } from "next";
import { LockOpen } from "lucide-react";
import { AuthCard, AuthCenteredLayout, BackToLogin, RECOVERY_STEPS, Stepper } from "@/components/auth/AuthLayouts";
import { ForgotEmailForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "استرجاع كلمة المرور" };

/** PUB-AUT-04 · خطوة ١ — طلب الرمز */
export default function ForgotPasswordPage() {
  return (
    <AuthCenteredLayout icon={LockOpen} title="نسيت كلمة المرور؟" subtitle="أدخل بريدك الإلكتروني وسنرسل لك رمزًا لإعادة التعيين.">
      <AuthCard>
        <Stepper steps={RECOVERY_STEPS} current={1} />
        <hr className="border-border-divider" />
        <ForgotEmailForm />
        <BackToLogin />
      </AuthCard>
    </AuthCenteredLayout>
  );
}
