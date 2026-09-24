"use client";

import Link from "next/link";
import { useActionState, useState, useTransition, type ReactNode } from "react";
import { BadgeCheck, CircleCheckBig, FileText, Hourglass } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { amount2, maskedIban, minusSar, QUICK_AMOUNTS, sar, wholeAmount } from "@/lib/trainer-finance";
import { initialFormState } from "@/lib/validation/auth";
import { cancelWithdrawal, requestWithdrawal } from "@/app/(trainer)/trainer/finance/actions";

/* TRR-FIN-04 · طلب سحب (279:6036): amount, transfer summary, request path, confirmation. */

const toAscii = (s: string) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[٬,\s]/g, "").replace("٫", ".");
/** Typed amount → halalas, or null when it is not a valid amount with at most two decimals. */
function parseCents(v: string): number | null {
  const s = toAscii(v.trim());
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

const STEPS = [
  { icon: FileText, title: "تقديم الطلب", caption: "الآن · يُسجَّل برقم مرجعي" },
  { icon: Hourglass, title: "مراجعة مالية", caption: "خلال يوم عمل · تحقق من الرصيد والحساب" },
  { icon: Hourglass, title: "التحويل البنكي", caption: "٣ إلى ٥ أيام عمل حسب البنك" },
  { icon: CircleCheckBig, title: "وصول المبلغ", caption: "يصلك إشعار وإيصال تحويل" },
];

const card = "flex w-full min-w-0 flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6";

export type WithdrawFormProps = {
  available: number;
  min: number;
  fee: number;
  initialAmount: number | null;
  bank: { name: string; last4: string } | null;
  /** Why a new request cannot be sent right now (Arabic), or null. */
  blocked: string | null;
  /** The status panel above already explains the block (request in progress) — no extra alert. */
  blockedExplained?: boolean;
  /** A request still waiting for the finance review — «إلغاء» cancels it. */
  cancellableId: string | null;
  previous: ReactNode;
};

export function WithdrawForm({ available, min, fee, initialAmount, bank, blocked, blockedExplained, cancellableId, previous }: WithdrawFormProps) {
  const [state, action, pending] = useActionState(requestWithdrawal, initialFormState);
  const start = initialAmount ?? (available > 0 ? available : 0);
  const [amount, setAmount] = useState(state.values?.amount ?? (start > 0 ? amount2(start) : ""));
  const [confirmed, setConfirmed] = useState(false);
  const [cancelling, startCancel] = useTransition();
  const [cancelError, setCancelError] = useState<string | null>(null);
  const toast = useToast();

  const cents = parseCents(amount);
  const amountError =
    state.fieldErrors?.amount ??
    (amount === "" || cents === null
      ? amount === ""
        ? undefined
        : "اكتب مبلغًا صحيحًا بحد أقصى خانتين عشريتين."
      : cents < min
        ? `الحد الأدنى للسحب ${wholeAmount(min)} ر.س.`
        : cents > available
          ? "المبلغ أكبر من رصيدك المتاح للسحب."
          : undefined);
  const valid = cents !== null && cents >= min && cents <= available && cents > fee;
  const ready = valid && confirmed && !blocked && !pending;
  const shown = cents ?? 0;

  return (
    <form action={action} noValidate className="flex w-full flex-col items-start gap-6 lg:flex-row">
      <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
        <section aria-labelledby="amount-title" className={card}>
          <h2 id="amount-title" className="type-h3 text-text-primary">
            المبلغ المطلوب سحبه
          </h2>
          <Input
            name="amount"
            label="المبلغ بالريال السعودي"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={amountError}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="مبالغ سريعة">
            {QUICK_AMOUNTS.map((q) => {
              const c = q * 100;
              const on = cents === c;
              return (
                <button
                  key={q}
                  type="button"
                  disabled={c > available}
                  aria-pressed={on}
                  onClick={() => setAmount(amount2(c))}
                  className={`flex items-center justify-center rounded-12 border-[1.5px] py-3 type-subtitle focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                    on ? "border-action-primary bg-action-primary text-text-on-brand" : "cursor-pointer border-border-default bg-bg-page text-text-secondary"
                  }`}
                >
                  {wholeAmount(c)}
                </button>
              );
            })}
            <button
              type="button"
              disabled={available <= 0}
              aria-pressed={cents === available}
              onClick={() => setAmount(amount2(available))}
              className={`flex items-center justify-center rounded-12 border-[1.5px] py-3 type-subtitle focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                cents === available && available > 0 ? "border-action-primary bg-action-primary text-text-on-brand" : "cursor-pointer border-border-default bg-bg-page text-text-secondary"
              }`}
            >
              كل الرصيد
            </button>
          </div>
        </section>

        <section aria-labelledby="summary-title" className={card}>
          <h2 id="summary-title" className="type-h3 text-text-primary">
            ملخّص التحويل
          </h2>
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 type-body text-text-secondary">المبلغ المطلوب</p>
            <p className="type-subtitle whitespace-nowrap text-text-primary">{sar(shown)}</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 type-body text-text-secondary">رسوم التحويل البنكي</p>
            <p className="type-subtitle whitespace-nowrap text-state-warning">{minusSar(fee)}</p>
          </div>
          <hr className="border-border-divider" />
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 type-title text-text-secondary">يصل إلى حسابك</p>
            <p className="type-h3 whitespace-nowrap text-state-success">{sar(Math.max(shown - fee, 0))}</p>
          </div>
          {bank ? (
            <div className="flex items-center gap-3 rounded-12 bg-bg-page p-3.5">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-8 bg-state-success-bg text-state-success">
                <Glyph icon={BadgeCheck} size={20} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <p className="type-subtitle text-text-primary">{bank.name} · الحساب الموثَّق</p>
                <p dir="ltr" className="text-end font-mono text-[14px] leading-[1.5] text-text-muted">
                  {maskedIban(bank.last4)}
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-12 bg-state-warning-bg p-3.5 type-subtitle text-state-warning">
              لا يوجد حساب موثَّق بعد —{" "}
              <Link href="/trainer/finance/bank" className="underline focus-ring">
                أضف حسابك البنكي
              </Link>
            </p>
          )}
          <p className="type-caption text-state-info">لا يمكن التحويل إلى حساب غير الحساب الموثَّق باسمك — حماية من الاحتيال.</p>
        </section>

        <section aria-labelledby="path-title" className={card}>
          <h2 id="path-title" className="type-h3 text-text-primary">
            مسار طلب السحب
          </h2>
          <ol className="flex flex-col gap-4">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className={`flex items-center gap-3 rounded-12 px-3.5 py-[13px] ${i === 0 ? "inner-stroke istroke-w-[1.5px] istroke-c-state-warning bg-state-warning-bg" : "bg-bg-page"}`}
              >
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface text-text-primary">
                  <Glyph icon={s.icon} size={20} />
                </span>
                <div className={`flex min-w-0 flex-1 flex-col gap-[3px] ${i === 0 ? "" : "text-text-muted"}`}>
                  <p className={`type-subtitle ${i === 0 ? "text-text-primary" : ""}`}>{s.title}</p>
                  <p className={`type-caption ${i === 0 ? "text-text-muted" : ""}`}>{s.caption}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
        {previous}
        <section aria-labelledby="confirm-title" className={card}>
          <h2 id="confirm-title" className="type-h3 text-text-primary">
            تأكيد الطلب
          </h2>
          {blocked && !blockedExplained && <Alert tone="warning" title={blocked} />}
          {state.status === "error" && state.message && <Alert tone="error" title={state.message} />}
          {cancelError && <Alert tone="error" title={cancelError} />}
          <Checkbox name="confirm" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={Boolean(blocked)}>
            أؤكد صحة بيانات الحساب البنكي
          </Checkbox>
          {state.fieldErrors?.confirm && (
            <p role="alert" className="type-caption text-state-error">
              {state.fieldErrors.confirm}
            </p>
          )}
          <Button type="submit" size="l" fullWidth disabled={!ready} loading={pending}>
            أرسل طلب السحب
          </Button>
          {cancellableId ? (
            <Button
              variant="ghost"
              size="l"
              fullWidth
              loading={cancelling}
              onClick={() =>
                startCancel(async () => {
                  const res = await cancelWithdrawal(cancellableId);
                  if (res.error) setCancelError(res.error);
                  else toast("success", "أُلغي طلب السحب. رصيدك كما هو.");
                })
              }
            >
              إلغاء
            </Button>
          ) : (
            <ButtonLink href="/trainer/finance" variant="ghost" size="l" fullWidth>
              إلغاء
            </ButtonLink>
          )}
          <p className="type-caption text-text-secondary">يمكنك إلغاء الطلب ما دام قيد المراجعة المالية.</p>
        </section>
      </div>
    </form>
  );
}
