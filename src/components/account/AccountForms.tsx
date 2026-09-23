"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { AtSign, CircleCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { updateAccount, updateLocale } from "@/app/(workspace)/account/actions";
import { initialFormState } from "@/lib/validation/auth";

const card = "flex flex-col gap-5 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6";

/** GEN-ACC-01 · ١ «هويتك على المنصة» (228:13766). */
export function AccountIdentityForm({
  userId,
  fullName,
  email,
  pendingEmail,
  phone,
  verified,
  avatarUrl,
}: {
  userId: string;
  fullName: string;
  email: string;
  pendingEmail: string | null;
  phone: string | null;
  verified: boolean;
  avatarUrl: string | null;
}) {
  const [state, action, pending] = useActionState(updateAccount, initialFormState);
  const v = state.values;
  return (
    <form action={action} noValidate aria-labelledby="acc-identity-title" className={card}>
      <h2 id="acc-identity-title" className="type-h3 text-text-primary">
        هويتك على المنصة
      </h2>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={fullName || "؟"} src={avatarUrl} size="l" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="type-title text-text-primary">{fullName}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span dir="ltr" className="font-mono text-[14px] leading-normal text-text-secondary">
              ID-{userId.slice(0, 8).toUpperCase()}
            </span>
            {verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-state-success-bg px-2.5 py-[3px] type-caption text-state-success">
                <Glyph icon={CircleCheck} size={16} />
                هوية موثَّقة
              </span>
            ) : (
              <Link href="/trainee/verification" className="rounded-full bg-bg-page px-2.5 py-[3px] type-caption text-text-muted hover:text-text-brand focus-ring">
                غير موثّقة
              </Link>
            )}
          </div>
        </div>
        <ButtonLink href="/trainee/profile/photo" variant="outline" className="w-[120px]">
          غيّر الصورة
        </ButtonLink>
      </div>
      {state.status === "success" && (
        <Alert tone="success" title="تم الحفظ">
          {state.message}
        </Alert>
      )}
      {state.status === "error" && state.message && (
        <Alert tone="error" title="تعذّر الحفظ">
          {state.message}
        </Alert>
      )}
      {verified ? (
        <Input label="الاسم الكامل" value={fullName} disabled readOnly hint="مطابق لهويتك الموثّقة — تغييره يتطلب إعادة التوثيق." />
      ) : (
        <Input name="fullName" label="الاسم الكامل" autoComplete="name" required defaultValue={v?.fullName ?? fullName} error={state.fieldErrors?.fullName} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="phone"
          type="tel"
          dir="ltr"
          label="رقم الهاتف"
          placeholder="+9665XXXXXXXX"
          autoComplete="tel"
          defaultValue={v?.phone ?? phone ?? ""}
          error={state.fieldErrors?.phone}
        />
        <Input
          name="email"
          type="email"
          dir="ltr"
          label="البريد الإلكتروني"
          autoComplete="email"
          required
          defaultValue={v?.email ?? email}
          error={state.fieldErrors?.email}
          hint={pendingEmail ? `بانتظار تأكيد ${pendingEmail} — افتح الرابط المرسل إليه.` : "تغييره يرسل رابط تأكيد إلى البريد الجديد."}
        />
      </div>
      <Button type="submit" loading={pending} className="self-end">
        احفظ التغييرات
      </Button>
    </form>
  );
}

const TIMEZONES = [
  { value: "Asia/Riyadh", label: "الرياض (GMT+3)" },
  { value: "Asia/Muscat", label: "مسقط (GMT+4)" },
  { value: "Asia/Dubai", label: "دبي (GMT+4)" },
  { value: "Asia/Kuwait", label: "الكويت (GMT+3)" },
  { value: "Asia/Qatar", label: "الدوحة (GMT+3)" },
  { value: "Asia/Bahrain", label: "المنامة (GMT+3)" },
  { value: "Asia/Amman", label: "عمّان (GMT+3)" },
  { value: "Africa/Cairo", label: "القاهرة (GMT+2)" },
];

/** GEN-ACC-01 · «اللغة والمنطقة» (anchor #language, auto-saved). */
export function LocaleCard({ locale, timezone, arabicDigits }: { locale: "ar" | "en"; timezone: string; arabicDigits: boolean }) {
  const [value, setValue] = useState({ locale, timezone, arabicDigits });
  const [pending, start] = useTransition();
  const toast = useToast();
  const save = (next: typeof value) => {
    const prev = value;
    setValue(next);
    start(async () => {
      const res = await updateLocale(next);
      if (res.status === "error") {
        setValue(prev);
        toast("error", res.message ?? "تعذّر الحفظ");
      } else toast("success", res.message ?? "حُفظ التغيير.");
    });
  };
  return (
    <section id="language" aria-labelledby="locale-title" aria-busy={pending || undefined} className={`scroll-mt-28 ${card}`}>
      <h2 id="locale-title" className="type-h3 text-text-primary">
        اللغة والمنطقة
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="المنطقة الزمنية" value={value.timezone} options={TIMEZONES} onChange={(e) => save({ ...value, timezone: e.target.value })} />
        <Select
          label="لغة الواجهة"
          value={value.locale}
          options={[
            { value: "ar", label: "العربية" },
            { value: "en", label: "English" },
          ]}
          hint={value.locale === "en" ? "الواجهة الإنجليزية قيد الإعداد — ستبقى الواجهة بالعربية حتى إطلاقها." : undefined}
          onChange={(e) => save({ ...value, locale: e.target.value as "ar" | "en" })}
        />
      </div>
      <div className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
          <Glyph icon={AtSign} size={20} />
        </span>
        <Toggle
          className="flex-1"
          checked={value.arabicDigits}
          onChange={(e) => save({ ...value, arabicDigits: e.target.checked })}
          description="عرض ١٢٣ بدل 123 في كل أنحاء المنصة."
        >
          الأرقام العربية الهندية
        </Toggle>
      </div>
    </section>
  );
}
