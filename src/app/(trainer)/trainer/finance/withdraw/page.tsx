import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { PrintReceipt } from "@/components/trainer-courses/sales/PrintReceipt";
import { FinanceTabs } from "@/components/trainer-finance/parts";
import { WithdrawForm } from "@/components/trainer-finance/WithdrawForm";
import { requireTrainer } from "@/lib/auth";
import { getBalance, getBankAccounts, getWithdrawals, type Withdrawal } from "@/lib/data/trainer-finance";
import { toArabicError } from "@/lib/errors";
import { dayMonth2, HOURS_48, msSince, sar, shortMaskedIban, toCents } from "@/lib/trainer-finance";

export const metadata: Metadata = { title: "طلب سحب", description: "حوّل رصيدك المتاح إلى حسابك البنكي الموثَّق." };

const PANEL = {
  processing: {
    box: "border-state-warning bg-state-warning-bg",
    title: "طلب التحويل قيد المعالجة",
    titleCls: "text-state-warning",
    lead: "استلمنا طلبك ونعالجه الآن. لا تغلق الصفحة.",
  },
  completed: { box: "border-state-success bg-state-success-bg", title: "تم التحويل", titleCls: "text-state-success", lead: "حُوّل المبلغ إلى حسابك الموثَّق." },
  failed: {
    box: "border-state-error bg-state-error-bg",
    title: "تعذّر تنفيذ طلب التحويل",
    titleCls: "text-state-error",
    lead: "لم يكتمل التحويل. راجع الطلب وبيانات الحساب ثم أعد الإرسال.",
  },
} as const;

const BANK_STATE: Record<Withdrawal["bankStatus"], { label: string; cls: string }> = {
  verified: { label: "موثَّق", cls: "text-state-success" },
  pending: { label: "قيد التحقق", cls: "text-state-warning" },
  rejected: { label: "لم يُوثَّق", cls: "text-state-error" },
  cancelled: { label: "أُلغي", cls: "text-text-muted" },
  replaced: { label: "استُبدل", cls: "text-text-muted" },
};

/** 4270:2 (قيد المعالجة) · 4270:353 (مكتمل) · 4270:649 (فشل). */
function StatusPanel({ w }: { w: Withdrawal }) {
  const kind = w.status === "completed" ? "completed" : w.status === "failed" ? "failed" : "processing";
  const p = PANEL[kind];
  const rows: { label: string; value: string; cls: string }[] = [
    { label: "المبلغ المطلوب", value: sar(w.amount), cls: "text-text-primary" },
    { label: "الحساب", value: `${w.bankName} · ${shortMaskedIban(w.last4)}`, cls: "text-text-primary" },
    { label: "حالة الحساب", value: BANK_STATE[w.bankStatus].label, cls: BANK_STATE[w.bankStatus].cls },
  ];
  if (kind === "completed") {
    rows.push({ label: "المبلغ المحوَّل", value: sar(w.net), cls: "text-state-success" }, { label: "حالة الطلب", value: "مكتمل", cls: "text-state-success" });
  } else if (kind === "failed") {
    rows.push({ label: "حالة الطلب", value: "فشل", cls: "text-state-error" }, { label: "الرصيد", value: "لم يُخصم", cls: "text-state-success" });
  } else {
    rows.push({ label: "حالة الطلب", value: "قيد المعالجة", cls: "text-state-warning" }, { label: "الرصيد", value: "لم يتغيّر بعد", cls: "text-text-secondary" });
  }
  return (
    <>
      <section aria-labelledby="w-status" aria-live="polite" className={`flex w-full flex-col gap-2.5 rounded-[14px] border-2 p-5 sm:p-6 ${p.box}`}>
        <h2 id="w-status" className={`text-[20px] leading-[1.4] font-bold ${p.titleCls}`}>
          {p.title}
        </h2>
        <p className="type-small text-text-secondary">
          {p.lead}
          {kind === "failed" && w.failureReason ? ` السبب: ${w.failureReason}.` : ""}
        </p>
        <dl className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px]">
              <dt className="text-[13.5px] leading-[1.5] text-text-secondary">{r.label}</dt>
              <dd className={`text-[15px] leading-[1.5] font-bold ${r.cls}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {kind === "completed" && (
        <div className="flex w-full flex-wrap gap-3">
          <PrintReceipt label="نزّل الإيصال" variant="secondary" />
          <ButtonLink href="/trainer/finance">العودة إلى الرصيد</ButtonLink>
        </div>
      )}
      {kind === "failed" && (
        <div className="flex w-full flex-wrap gap-3">
          <ButtonLink href="/trainer/finance" variant="secondary">
            العودة إلى الرصيد
          </ButtonLink>
          <ButtonLink href={`/trainer/finance/withdraw?amount=${(w.amount / 100).toFixed(2)}`}>راجع الطلب</ButtonLink>
        </div>
      )}
    </>
  );
}

function statusLine(w: Withdrawal): { text: string; cls: string } {
  if (w.status === "completed" && w.completedAt) return { text: `وصل ${dayMonth2(w.completedAt)}`, cls: "text-state-success" };
  if (w.status === "failed") return { text: `مرفوض · ${w.failureReason ?? "تعذّر التحويل"}`, cls: "text-state-error" };
  if (w.status === "cancelled") return { text: "أُلغي", cls: "text-text-muted" };
  return { text: "قيد المعالجة", cls: "text-state-warning" };
}

/** TRR-FIN-04 · طلب سحب (279:6036) with the request states 4270:2 / 4270:353 / 4270:649. */
export default async function WithdrawPage({ searchParams }: PageProps<"/trainer/finance/withdraw">) {
  const user = await requireTrainer("/trainer/finance/withdraw");
  const sp = await searchParams;
  const [balance, accounts, withdrawals] = await Promise.all([getBalance(), getBankAccounts(user.id), getWithdrawals(user.id)]);
  const verified = accounts.find((a) => a.status === "verified") ?? null;
  const bankPending = accounts.some((a) => a.status === "pending");
  const inFlight = withdrawals.find((w) => w.status === "pending" || w.status === "processing") ?? null;
  const wanted = typeof sp.w === "string" ? withdrawals.find((w) => w.id === sp.w && w.status !== "cancelled") : undefined;
  const panel = sp.amount ? inFlight : (wanted ?? inFlight);
  const amountParam = typeof sp.amount === "string" && /^\d+(\.\d{1,2})?$/.test(sp.amount) ? toCents(sp.amount) : null;

  const blocked = !verified
    ? toArabicError({ message: "bank_account_required" })
    : bankPending
      ? toArabicError({ message: "bank_change_pending" })
      : msSince(verified.createdAt) < HOURS_48
        ? toArabicError({ message: "bank_hold_active" })
        : inFlight
          ? toArabicError({ message: "withdrawal_in_progress" })
          : balance.available < balance.min
            ? `رصيدك المتاح أقل من الحد الأدنى للسحب (${sar(balance.min)}).`
            : null;

  const previous = (
    <section aria-labelledby="prev-title" className="flex w-full min-w-0 flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
      <h2 id="prev-title" className="type-h3 text-text-primary">
        طلبات سابقة
      </h2>
      {withdrawals.length === 0 ? (
        <p className="rounded-12 bg-bg-page px-3 py-[11px] type-caption text-text-muted">لا طلبات سحب بعد.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {withdrawals.slice(0, 5).map((w) => {
            const st = statusLine(w);
            return (
              <li key={w.id}>
                <Link
                  href={`/trainer/finance/withdraw?w=${w.id}`}
                  className={`flex flex-col gap-1 rounded-12 bg-bg-page px-3 py-[11px] hover:ring-1 hover:ring-border-default focus-ring ${panel?.id === w.id ? "ring-1 ring-action-primary" : ""}`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="me-auto type-subtitle whitespace-nowrap text-text-primary">{sar(w.amount)}</span>
                    <span className="type-caption text-text-muted">رقم طلب السحب</span>
                    <span dir="ltr" className="font-mono text-[14px] leading-[1.5] text-text-muted">
                      {w.number}
                    </span>
                  </span>
                  <span className={`type-caption ${st.cls}`}>{st.text}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <>
      <TopBar title="طلب سحب" subtitle="تحويل رصيدك المتاح" />
      <PageBody className="gap-6">
        <FinanceTabs active="/trainer/finance/withdraw" />
        {panel && <StatusPanel w={panel} />}
        <WithdrawForm
          key={panel?.id ?? "new"}
          available={balance.available}
          min={balance.min}
          fee={balance.fee}
          initialAmount={amountParam ?? (panel && panel.id === inFlight?.id ? panel.amount : null)}
          bank={verified ? { name: verified.bankName, last4: verified.last4 } : null}
          blocked={blocked}
          blockedExplained={Boolean(inFlight && panel?.id === inFlight.id)}
          cancellableId={inFlight?.status === "pending" ? inFlight.id : null}
          previous={previous}
        />
      </PageBody>
    </>
  );
}
