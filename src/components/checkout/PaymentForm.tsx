"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleQuestionMark, Landmark, Lock, Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Checkbox } from "@/components/ui/Choice";
import { submitPayment } from "@/app/(workspace)/checkout/actions";
import { initialFormState } from "@/lib/validation/auth";
import { formatPrice } from "@/lib/format";

type Method = "card" | "transfer" | "wallet";

const METHODS: { value: Method; title: string; hint: string; icon: LucideIcon; disabledHint?: string }[] = [
  { value: "card", title: "بطاقة بنكية", hint: "فيزا · ماستركارد · مدى", icon: Wallet },
  { value: "transfer", title: "تحويل بنكي", hint: "يُفعَّل التسجيل بعد تأكيد التحويل", icon: Landmark, disabledHint: "غير متاح لهذه الدورة — مهلة الحجز ١٥ دقيقة لا تكفي لتأكيد التحويل." },
  { value: "wallet", title: "محفظة إلكترونية", hint: "Apple Pay · Google Pay", icon: Smartphone },
];

const digits = (v: string) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, "");

function luhn(num: string) {
  let sum = 0;
  for (let i = 0; i < num.length; i++) {
    let d = Number(num[num.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return num.length >= 13 && num.length <= 19 && sum % 10 === 0;
}

function expiryValid(v: string) {
  const [mm, yy] = digits(v).match(/^(\d{2})(\d{2})$/)?.slice(1) ?? [];
  if (!mm || !yy) return false;
  const month = Number(mm);
  if (month < 1 || month > 12) return false;
  const end = new Date(2000 + Number(yy), month, 0, 23, 59, 59);
  return end >= new Date();
}

/* Field styled as "Form / Input". Card inputs have NO name attribute: card data never leaves the browser. */
function CardField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="type-small text-text-secondary">{label}</span>
      {children}
      {error && <span className="type-caption text-state-error">{error}</span>}
    </label>
  );
}
const inputCls =
  "h-12 w-full rounded-12 border-[1.5px] border-border-default bg-bg-surface px-4 type-body text-text-primary placeholder:text-text-muted outline-none focus:border-2 focus:border-action-primary focus:shadow-[0_0_0_4px_rgba(91,60,196,0.10)]";

/** TRN-ENR-03 · الدفع — payment method + card details (validated locally) and the pay button in the side column. */
export function PaymentForm({ enrollmentId, total, currency, summary }: { enrollmentId: string; total: number; currency: string; summary: ReactNode }) {
  const [state, action, pending] = useActionState(submitPayment, initialFormState);
  const [method, setMethod] = useState<Method>("card");
  const [card, setCard] = useState({ name: "", number: "", expiry: "", cvv: "" });
  const [touched, setTouched] = useState(false);
  // New attempt key after every failure so a retry is a new payment, while double clicks reuse the same key (BR-L12).
  const [attempt, setAttempt] = useState(0);
  const idempotencyKey = useMemo(() => `${enrollmentId}:${attempt}:${crypto.randomUUID()}`, [enrollmentId, attempt]);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "error") setAttempt((a) => a + 1);
  }

  const number = digits(card.number);
  const errors = {
    name: card.name.trim().length < 3 ? "أدخل الاسم كما يظهر على البطاقة" : undefined,
    number: !luhn(number) ? "رقم البطاقة غير صحيح" : undefined,
    expiry: !expiryValid(card.expiry) ? "تاريخ الانتهاء غير صالح" : undefined,
    cvv: !/^\d{3,4}$/.test(digits(card.cvv)) ? "رمز التحقق من ٣ أو ٤ أرقام" : undefined,
  };
  const cardValid = method !== "card" || Object.values(errors).every((e) => !e);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!cardValid) {
          e.preventDefault();
          setTouched(true);
        }
      }}
      className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start"
    >
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="method" value={method === "wallet" ? "wallet" : "card"} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="simulateDecline" value={number === "4000000000000002" ? "1" : "0"} />

      <div className="order-last flex w-full flex-col gap-5 lg:order-none lg:w-[380px] lg:shrink-0">
        {summary}
        <Button type="submit" size="l" fullWidth loading={pending}>
          {pending ? "جارٍ تنفيذ العملية…" : `ادفع ${formatPrice(total, currency)}`}
        </Button>
        <a href="/trainee/help" className="flex items-center gap-2.5 rounded-8 type-caption text-text-brand hover:underline focus-ring">
          <Glyph icon={CircleQuestionMark} size={16} />
          تحتاج مساعدة في الدفع؟ تواصل مع الدعم
        </a>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {state.status === "error" && state.message && (
          <Alert tone="error" title="تعذّر إتمام العملية">
            {state.message}
          </Alert>
        )}
        {pending && (
          <Alert tone="info" title="جارٍ تنفيذ العملية">
            لا تغلق الصفحة أو تعد تحميلها — نتحقق من الدفع مع البنك.
          </Alert>
        )}
        <fieldset className="flex flex-col gap-[18px] rounded-16 border border-border-default bg-bg-surface p-6">
          <legend className="float-start mb-[18px] type-h3 text-text-primary">طريقة الدفع</legend>
          {METHODS.map((m) => {
            const disabled = Boolean(m.disabledHint);
            const active = method === m.value;
            return (
              <label
                key={m.value}
                className={`flex items-center gap-3.5 rounded-12 px-[18px] py-4 ${
                  disabled ? "cursor-not-allowed bg-bg-disabled" : "cursor-pointer"
                } ${active ? "border-2 border-action-primary bg-bg-brand-tint" : "border-[1.5px] border-border-default"} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-border-focus`}
              >
                <input
                  type="radio"
                  name="methodChoice"
                  value={m.value}
                  checked={active}
                  disabled={disabled}
                  onChange={() => setMethod(m.value)}
                  className="size-[22px] shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-border-default bg-bg-surface checked:border-[7px] checked:border-action-primary disabled:cursor-not-allowed"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className={`type-title ${disabled ? "text-text-disabled" : "text-text-primary"}`}>{m.title}</span>
                  <span className="type-caption text-text-muted">{disabled ? m.disabledHint : m.hint}</span>
                </span>
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 ${disabled ? "bg-bg-surface text-text-disabled" : "bg-bg-page text-text-secondary"}`}>
                  <Glyph icon={m.icon} size={20} />
                </span>
              </label>
            );
          })}
        </fieldset>

        {method === "card" && (
          <section aria-labelledby="card-title" className="flex flex-col gap-[18px] rounded-16 border border-border-default bg-bg-surface p-6">
            <h2 id="card-title" className="type-h3 text-text-primary">
              بيانات البطاقة
            </h2>
            <CardField label="الاسم على البطاقة" error={touched ? errors.name : undefined}>
              <input dir="ltr" autoComplete="cc-name" className={inputCls} placeholder="SALEM A ALHARTHI" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })} />
            </CardField>
            <CardField label="رقم البطاقة" error={touched ? errors.number : undefined}>
              <input
                dir="ltr"
                inputMode="numeric"
                autoComplete="cc-number"
                className={inputCls}
                placeholder="4532 8801 2234 9987"
                value={card.number}
                maxLength={23}
                onChange={(e) => setCard({ ...card, number: digits(e.target.value).replace(/(\d{4})(?=\d)/g, "$1 ") })}
              />
            </CardField>
            <div className="grid gap-4 sm:grid-cols-2">
              <CardField label="تاريخ الانتهاء" error={touched ? errors.expiry : undefined}>
                <input
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  className={inputCls}
                  placeholder="MM / YY"
                  value={card.expiry}
                  maxLength={7}
                  onChange={(e) => {
                    const d = digits(e.target.value).slice(0, 4);
                    setCard({ ...card, expiry: d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d });
                  }}
                />
              </CardField>
              <CardField label="رمز التحقق CVV" error={touched ? errors.cvv : undefined}>
                <input dir="ltr" inputMode="numeric" autoComplete="cc-csc" type="password" className={inputCls} placeholder="•••" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: digits(e.target.value) })} />
              </CardField>
            </div>
            <Checkbox disabled description="يتاح حفظ البطاقة عبر بوابة الدفع فقط.">
              احفظ هذه البطاقة لعمليات الدفع القادمة
            </Checkbox>
            <p className="flex items-center gap-2.5 rounded-8 bg-state-success-bg px-3 py-2.5 type-caption text-state-success">
              <Glyph icon={Lock} size={16} />
              اتصال مشفَّر — لا تُخزَّن بيانات بطاقتك على خوادم المنصة.
            </p>
          </section>
        )}
        {method === "wallet" && (
          <Alert tone="info" title="الدفع عبر المحفظة">
            عند الضغط على «ادفع» تُفتح نافذة المحفظة لتأكيد العملية من جهازك.
          </Alert>
        )}
      </div>
    </form>
  );
}
