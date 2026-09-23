import type { Metadata } from "next";
import { LockOpen } from "lucide-react";
import { AuthCard, AuthCenteredLayout, BackToLogin, RECOVERY_STEPS, Stepper } from "@/components/auth/AuthLayouts";
import { NewPasswordForm } from "@/components/auth/AuthForms";
import { Alert } from "@/components/ui/Feedback";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "كلمة مرور جديدة", robots: { index: false } };

/** PUB-AUT-04 · خطوة ٣ — كلمة مرور جديدة */
export default async function NewPasswordPage() {
  const user = await getCurrentUser();
  return (
    <AuthCenteredLayout icon={LockOpen} title="اختر كلمة مرور جديدة" subtitle="اختر كلمة مرور قوية لن تستخدمها في مواقع أخرى.">
      <AuthCard>
        <Stepper steps={RECOVERY_STEPS} current={3} />
        <hr className="border-border-divider" />
        {user ? (
          <NewPasswordForm />
        ) : (
          <>
            <Alert tone="warning" title="انتهت صلاحية جلسة الاسترجاع">
              اطلب رمزًا جديدًا لإعادة تعيين كلمة المرور.
            </Alert>
            <ButtonLink href="/forgot-password" size="l" fullWidth>
              طلب رمز جديد
            </ButtonLink>
          </>
        )}
        <BackToLogin />
      </AuthCard>
    </AuthCenteredLayout>
  );
}
