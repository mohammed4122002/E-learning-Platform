"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { BellRing, CircleAlert, KeyRound, Lock, Monitor, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { TileRow } from "@/components/profile/bits";
import { changePassword, signOutOtherSessions, updateNotificationPrefs } from "@/app/(workspace)/account/actions";
import { initialFormState } from "@/lib/validation/auth";
import type { NotificationPrefs } from "@/lib/data/account";

const card = "flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6";

function Switch({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void; label: string }) {
  return (
    <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer absolute inset-0 cursor-pointer appearance-none rounded-full bg-border-default transition-colors checked:bg-action-primary focus-ring disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span aria-hidden className="pointer-events-none absolute start-[3px] size-[22px] rounded-full bg-white shadow-knob transition-transform peer-checked:-translate-x-5" />
    </span>
  );
}

function Row({ icon, title, caption, children, iconClass = "text-text-brand" }: { icon: typeof Lock; title: string; caption: string; children?: React.ReactNode; iconClass?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5 sm:flex-nowrap">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${iconClass}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="type-subtitle text-text-primary">{title}</p>
        <p className="type-caption text-text-muted">{caption}</p>
      </div>
      {children}
    </div>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState(changePassword, initialFormState);
  const toast = useToast();
  useEffect(() => {
    if (state.status === "success") {
      toast("success", state.message ?? "تغيّرت كلمة المرور.");
      onClose();
    }
  }, [state, toast, onClose]);
  return (
    <Modal open={open} onClose={onClose} title="غيّر كلمة المرور" size="s">
      <form action={action} noValidate className="flex flex-col gap-4">
        {state.status === "error" && state.message && (
          <Alert tone="error" title="تعذّر التغيير">
            {state.message}
          </Alert>
        )}
        <PasswordInput name="current" label="كلمة المرور الحالية" autoComplete="current-password" required error={state.fieldErrors?.current} />
        <PasswordInput name="password" label="كلمة المرور الجديدة" autoComplete="new-password" required error={state.fieldErrors?.password} hint="٨ أحرف على الأقل، وتتضمن رقمًا وحرفًا كبيرًا وحرفًا صغيرًا." />
        <PasswordInput name="confirmPassword" label="تأكيد كلمة المرور" autoComplete="new-password" required error={state.fieldErrors?.confirmPassword} />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="s" loading={pending}>
            احفظ كلمة المرور
          </Button>
          <Button variant="outline" size="s" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** GEN-ACC-01 · ٢ الأمان والجلسات (228:13978). */
export function SecurityPanel({ prefs, device, lastSignIn }: { prefs: NotificationPrefs; device: string; lastSignIn: string | null }) {
  const [pwOpen, setPwOpen] = useState(false);
  const closePw = useCallback(() => setPwOpen(false), []);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const [othersError, setOthersError] = useState<string | null>(null);
  const [loginAlerts, setLoginAlerts] = useState(prefs.loginAlerts);
  const [pending, start] = useTransition();
  const toast = useToast();

  const endOthers = () =>
    start(async () => {
      const res = await signOutOtherSessions();
      if (res.status === "error") return setOthersError(res.message ?? null);
      setConfirmOthers(false);
      toast("success", res.message ?? "تم");
    });

  const toggleAlerts = (v: boolean) => {
    setLoginAlerts(v);
    start(async () => {
      const res = await updateNotificationPrefs({ ...prefs, loginAlerts: v });
      if (res.status === "error") {
        setLoginAlerts(!v);
        toast("error", res.message ?? "تعذّر الحفظ");
      } else toast("success", v ? "سنرسل لك تنبيهًا عند كل دخول جديد." : "أوقفنا تنبيهات الدخول الجديد.");
    });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="pw-title" className={card}>
          <h2 id="pw-title" className="type-h3 text-text-primary">
            كلمة المرور
          </h2>
          <Row icon={Lock} title="كلمة مرور الحساب" caption="ننصح بتغييرها كل ٦ أشهر. سيُطلب منك إدخال كلمة المرور الحالية.">
            <Button size="s" onClick={() => setPwOpen(true)}>
              غيّر كلمة المرور
            </Button>
          </Row>
          <Row icon={ShieldCheck} iconClass="text-state-success" title="التحقق بخطوتين" caption="رمز إضافي عند تسجيل الدخول من جهاز جديد — يتاح قريبًا لكل الحسابات.">
            <Switch checked={false} disabled label="التحقق بخطوتين (غير متاح بعد)" />
          </Row>
          <Row icon={BellRing} iconClass="text-state-info" title="تنبيه عند دخول جديد" caption="يصلك بريد فور تسجيل دخول من جهاز أو موقع غير معتاد.">
            <Switch checked={loginAlerts} disabled={pending} onChange={toggleAlerts} label="تنبيه عند دخول جديد" />
          </Row>
        </section>

        <section aria-labelledby="sessions-title" className={card}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="sessions-title" className="flex-1 type-h3 text-text-primary">
              الأجهزة والجلسات النشطة
            </h2>
            <button type="button" onClick={() => setConfirmOthers(true)} className="cursor-pointer rounded-8 type-subtitle text-state-error hover:underline focus-ring">
              إنهاء كل الجلسات الأخرى
            </button>
          </div>
          <p className="type-caption text-text-secondary">إن لم تتعرّف على نشاط في حسابك أنهِ الجلسات الأخرى فورًا وغيّر كلمة مرورك.</p>
          <Row icon={Monitor} iconClass="text-state-success" title={device} caption={`هذا الجهاز${lastSignIn ? ` · آخر دخول ${lastSignIn}` : ""}`}>
            <span className="rounded-full bg-bg-surface px-2.5 py-[3px] type-caption text-state-success">نشطة الآن</span>
          </Row>
          <p className="type-caption text-text-muted">الجلسات على الأجهزة الأخرى تنتهي كلها دفعة واحدة — لا نعرض تفاصيل أجهزتك الأخرى حفاظًا على خصوصيتك.</p>
        </section>
      </div>

      <aside aria-label="نصائح أمان" className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="tips-title" className={card}>
          <h2 id="tips-title" className="type-h3 text-text-primary">
            نصائح أمان
          </h2>
          <TileRow icon={ShieldCheck} iconClass="text-state-success" title="فعّل التحقق بخطوتين" caption="يمنع ٩٩٪ من محاولات الاختراق الشائعة." />
          <TileRow icon={CircleAlert} iconClass="text-state-error" title="لا تشارك رمز التحقق" caption="لن يطلبه منك موظفو المنصة إطلاقًا." />
          <TileRow icon={KeyRound} title="كلمة مرور فريدة" caption="لا تستخدم كلمة مرور تستعملها في موقع آخر." />
        </section>
      </aside>

      {pwOpen && <PasswordModal open onClose={closePw} />}

      <Modal
        open={confirmOthers}
        onClose={() => setConfirmOthers(false)}
        title="إنهاء كل الجلسات الأخرى؟"
        size="s"
        destructive
        footer={
          <>
            <Button variant="danger" size="s" loading={pending} onClick={endOthers}>
              أنهِ الجلسات الأخرى
            </Button>
            <Button variant="outline" size="s" onClick={() => setConfirmOthers(false)}>
              تراجع
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>سيُطلب تسجيل الدخول من جديد على كل جهاز آخر (الجوال، المتصفحات الأخرى). يبقى هذا الجهاز مسجّلًا.</p>
          {othersError && <Alert tone="error" title="تعذّر الإنهاء">{othersError}</Alert>}
        </div>
      </Modal>
    </div>
  );
}
