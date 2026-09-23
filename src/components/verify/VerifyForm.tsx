"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { VerifyAside, VerifyCard, VerifyLayout } from "./VerifyLayout";
import { isCertificateCode, normalizeCertificateCode } from "@/lib/validation/profile";

const EXAMPLE = "C0FFEE123456";

/** PUB-VRF-01 · Default (4139:1586) · Loading (4139:1701) · InvalidInput (4139:2185). */
export function VerifyForm({ initial = "", initialError = false }: { initial?: string; initialError?: boolean }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState(initialError);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeCertificateCode(value);
    if (!isCertificateCode(code)) {
      setError(true);
      return;
    }
    start(() => router.push(`/verify/${code}`));
  };

  const aside = pending ? (
    <VerifyAside title="جارٍ التحقق" lines={["نتأكد الآن من صحة الرقم لدى سجل الشهادات."]} />
  ) : error ? (
    <VerifyAside title="صيغة الرقم" lines={["رقم الشهادة ١٢ خانة من الأرقام والحروف A–F كما هو مطبوع على الشهادة أو في رابط التحقق."]} />
  ) : (
    <VerifyAside
      title="تحقق من أي شهادة"
      lines={["كل شهادة صادرة عن بوابة التدريب لها رقم مرجعي ورابط تحقق عام.", "يعمل الرابط دون تسجيل دخول ولا ينتهي.", "تُعرض بيانات عامة فقط — لا رقم هوية ولا هاتف ولا بريد إلكتروني."]}
    />
  );

  return (
    <VerifyLayout aside={aside}>
      <VerifyCard labelledBy="verify-title">
        <h1 id="verify-title" className="text-[30px] font-bold leading-[1.25] text-text-primary">
          التحقق من صحة شهادة
        </h1>
        {!error && !pending && <p className="type-small text-text-secondary">أدخل رقم الشهادة للتأكد من صدورها عبر بوابة التدريب. لا يتطلب حسابًا.</p>}
        <form onSubmit={submit} noValidate className="flex flex-col gap-5" aria-busy={pending || undefined}>
          <Input
            name="code"
            label={<span className="font-bold text-text-primary">رقم الشهادة</span>}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            placeholder={EXAMPLE}
            value={value}
            readOnly={pending}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(false);
            }}
            error={error ? "صيغة غير صالحة — الرقم ١٢ خانة من الأرقام والحروف A–F." : undefined}
            hint={`مثال: ${EXAMPLE}`}
          />
          <Button type="submit" size="l" fullWidth disabled={error || pending} loading={pending}>
            {pending ? "جارٍ التحقق..." : "تحقّق"}
          </Button>
          {pending && (
            <p role="status" className="type-caption text-text-muted">
              يرجى الانتظار
            </p>
          )}
        </form>
      </VerifyCard>
    </VerifyLayout>
  );
}
