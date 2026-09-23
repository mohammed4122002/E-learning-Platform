import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { AuthSplitLayout, AuthTitle, LegalLinks, OrDivider, SuccessPill } from "@/components/auth/AuthLayouts";
import { RegisterForm } from "@/components/auth/AuthForms";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "إنشاء حساب",
  description: "أنشئ حسابك في منصة بوابة التدريب وابدأ رحلتك مع آلاف البرامج التدريبية المعتمدة.",
};

/** PUB-AUT-01 · إنشاء حساب (also TRN-ENR-06 when `next` points back to a checkout — BR-U3). */
export default async function RegisterPage(props: PageProps<"/register">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next, "") : "";
  const buying = next.startsWith("/checkout");
  return (
    <AuthSplitLayout>
      <AuthTitle
        title={buying ? "أنشئ حسابك لإكمال التسجيل" : "أنشئ حسابك اليوم"}
        subtitle={
          buying
            ? "اختيارك محفوظ — بعد إنشاء الحساب ستعود مباشرة إلى خطوة الدفع دون إعادة إدخال أي شيء."
            : "خطوة واحدة تفصلك عن آلاف البرامج التدريبية المعتمدة."
        }
        badge={<SuccessPill icon={Users}>انضم لأكثر من ١٥٬٠٠٠ متدرب</SuccessPill>}
      />
      <RegisterForm next={next} />
      <OrDivider />
      <p className="flex flex-wrap items-center justify-center gap-2 text-center">
        <span className="type-body text-text-secondary">لديك حساب بالفعل؟</span>
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
          تسجيل الدخول
        </Link>
      </p>
      <LegalLinks />
    </AuthSplitLayout>
  );
}
