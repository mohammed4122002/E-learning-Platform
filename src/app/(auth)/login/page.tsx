import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthSplitLayout, AuthTitle, LegalLinks, OrDivider, SuccessPill } from "@/components/auth/AuthLayouts";
import { LoginForm } from "@/components/auth/AuthForms";
import { Alert } from "@/components/ui/Feedback";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "سجّل دخولك إلى منصة بوابة التدريب لمتابعة دوراتك واستكمال رحلة تعلّمك.",
};

/** PUB-AUT-02 · تسجيل الدخول */
export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next, "") : "";
  const linkExpired = sp.error === "link_expired";
  return (
    <AuthSplitLayout>
      <AuthTitle
        title="مرحبًا بعودتك"
        subtitle="سجّل دخولك لمتابعة دوراتك واستكمال رحلة تعلّمك."
        badge={<SuccessPill icon={ShieldCheck}>منصة معتمدة وآمنة</SuccessPill>}
      />
      {linkExpired && (
        <Alert tone="warning" title="انتهت صلاحية الرابط">
          اطلب رابطًا أو رمزًا جديدًا ثم أعد المحاولة.
        </Alert>
      )}
      <LoginForm next={next} />
      <OrDivider />
      <p className="flex flex-wrap items-center justify-center gap-2 text-center">
        <span className="type-body text-text-secondary">ليس لديك حساب؟</span>
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
          أنشئ حسابًا جديدًا
        </Link>
      </p>
      <LegalLinks />
    </AuthSplitLayout>
  );
}
