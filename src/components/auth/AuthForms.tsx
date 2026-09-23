"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CircleCheck, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Field";
import { Checkbox, Toggle } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { OtpInput } from "@/components/auth/OtpInput";
import { ResendCode } from "@/components/auth/ResendCode";
import {
  requestPasswordReset,
  resendRecoveryCode,
  resendSignupCode,
  signIn,
  signUp,
  updatePassword,
  verifyRecoveryCode,
  verifySignupCode,
} from "@/app/(auth)/actions";
import { initialFormState, passwordRules } from "@/lib/validation/auth";

function FormError({ message }: { message?: string }) {
  return message ? <Alert tone="error" title="تعذّر إتمام العملية">{message}</Alert> : null;
}

/** PUB-AUT-02 */
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-[22px]">
      <FormError message={state.message} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Input
        name="email"
        type="email"
        label="البريد الإلكتروني"
        placeholder="name@example.com"
        autoComplete="email"
        dir="ltr"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <PasswordInput name="password" label="كلمة المرور" placeholder="••••••••" autoComplete="current-password" required error={state.fieldErrors?.password} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Toggle name="remember" className="w-full max-w-[260px]">
          تذكّرني على هذا الجهاز
        </Toggle>
        <Link href="/forgot-password" className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
          نسيت كلمة المرور؟
        </Link>
      </div>
      <Button type="submit" size="l" fullWidth loading={pending}>
        تسجيل الدخول
      </Button>
    </form>
  );
}

function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="flex flex-col gap-2 rounded-12 bg-bg-page px-4 pt-3.5 pb-4" aria-label="شروط كلمة المرور">
      {passwordRules.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.id} className={`flex items-center gap-2.5 type-small ${ok ? "text-state-success" : "text-text-muted"}`}>
            <Glyph icon={ok ? CircleCheck : CircleDot} size={16} />
            <span>
              {r.label}
              <span className="sr-only">{ok ? " — متحقق" : " — غير متحقق"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** PUB-AUT-01 */
export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signUp, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-[22px]">
      <FormError message={state.message} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="fullName" label="الاسم الكامل" placeholder="أدخل اسمك الكامل" autoComplete="name" required defaultValue={state.values?.fullName} error={state.fieldErrors?.fullName} />
        <Input name="phone" type="tel" label="رقم الهاتف" placeholder="٩٦٨XXXXXXXX" autoComplete="tel" dir="ltr" required defaultValue={state.values?.phone} error={state.fieldErrors?.phone} />
      </div>
      <Input name="email" type="email" label="البريد الإلكتروني" placeholder="name@example.com" autoComplete="email" dir="ltr" required defaultValue={state.values?.email} error={state.fieldErrors?.email} />
      <div className="flex flex-col gap-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput name="password" label="كلمة المرور" placeholder="••••••••" autoComplete="new-password" required error={state.fieldErrors?.password} />
          <PasswordInput name="confirmPassword" label="تأكيد كلمة المرور" placeholder="••••••••" autoComplete="new-password" required error={state.fieldErrors?.confirmPassword} />
        </div>
        {!state.fieldErrors?.password && <p className="type-caption text-text-muted">٨ أحرف على الأقل، وتتضمن رقمًا وحرفًا كبيرًا.</p>}
      </div>
      <div className="flex flex-col gap-1">
        <Checkbox name="terms" required aria-invalid={state.fieldErrors?.terms ? true : undefined}>
          أوافق على <Link href="/terms" className="text-text-brand underline-offset-4 hover:underline">الشروط والأحكام</Link> و
          <Link href="/terms#privacy" className="text-text-brand underline-offset-4 hover:underline">سياسة الخصوصية</Link>
        </Checkbox>
        {state.fieldErrors?.terms && <p role="alert" className="type-caption text-state-error">{state.fieldErrors.terms}</p>}
      </div>
      <Button type="submit" size="l" fullWidth loading={pending}>
        إنشاء حساب جديد
      </Button>
    </form>
  );
}

/** PUB-AUT-03 (e-mail code) */
export function VerifyEmailForm({ email, next }: { email: string; next?: string }) {
  const [state, action, pending] = useActionState(verifySignupCode, initialFormState);
  return (
    <div className="flex flex-col gap-[22px]">
      <form action={action} noValidate className="flex flex-col gap-[22px]">
        <FormError message={state.message} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next ?? ""} />
        <OtpInput error={state.fieldErrors?.token} />
        <Button type="submit" size="l" fullWidth loading={pending}>
          تأكيد الرمز
        </Button>
      </form>
      <ResendCode onResend={() => resendSignupCode(email)} />
    </div>
  );
}

/** PUB-AUT-04 · step 1 */
export function ForgotEmailForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <FormError message={state.message} />
      <Input name="email" type="email" label="البريد الإلكتروني" placeholder="name@example.com" autoComplete="email" dir="ltr" required defaultValue={state.values?.email} error={state.fieldErrors?.email} />
      <Button type="submit" size="l" fullWidth loading={pending}>
        إرسال رمز التحقق
      </Button>
    </form>
  );
}

/** PUB-AUT-04 · step 2 */
export function ForgotCodeForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyRecoveryCode, initialFormState);
  return (
    <div className="flex flex-col gap-6">
      <form action={action} noValidate className="flex flex-col gap-6">
        <FormError message={state.message} />
        <input type="hidden" name="email" value={email} />
        <OtpInput error={state.fieldErrors?.token} />
        <Button type="submit" size="l" fullWidth loading={pending}>
          تأكيد الرمز
        </Button>
      </form>
      <ResendCode onResend={() => resendRecoveryCode(email)} />
    </div>
  );
}

/** PUB-AUT-04 · step 3 */
export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialFormState);
  const [password, setPassword] = useState("");
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <FormError message={state.message} />
      <PasswordInput
        name="password"
        label="كلمة المرور الجديدة"
        placeholder="••••••••"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={state.fieldErrors?.password}
      />
      <PasswordInput name="confirmPassword" label="تأكيد كلمة المرور" placeholder="••••••••" autoComplete="new-password" required error={state.fieldErrors?.confirmPassword} />
      <PasswordChecklist value={password} />
      <Button type="submit" size="l" fullWidth loading={pending}>
        حفظ كلمة المرور الجديدة
      </Button>
    </form>
  );
}
