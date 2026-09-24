import type { Metadata } from "next";
import { BadgeCheck, Hourglass, Shield } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Glyph } from "@/components/ui/Icon";
import { BankForm, CancelBankChangeButton } from "@/components/trainer-finance/BankForm";
import { FinanceTabs, FinCard, FinColumns, FinTitle, IconBox } from "@/components/trainer-finance/parts";
import { requireTrainer } from "@/lib/auth";
import { getBankAccounts, getSaudiBanks, type BankAccount } from "@/lib/data/trainer-finance";
import { formatDate } from "@/lib/format";
import { HOURS_48, maskedIban, msSince } from "@/lib/trainer-finance";

export const metadata: Metadata = { title: "بيانات التحويل", description: "حسابك البنكي الموثَّق لاستلام أرباحك." };

const STATUS_LINE: Record<BankAccount["status"], { label: string; cls: string; at: (a: BankAccount) => string | null }> = {
  verified: { label: "موثَّق", cls: "text-state-success", at: (a) => a.verifiedAt },
  pending: { label: "قيد التحقق", cls: "text-state-warning", at: (a) => a.createdAt },
  rejected: { label: "لم يُوثَّق", cls: "text-state-error", at: (a) => a.decidedAt },
  cancelled: { label: "أُلغي", cls: "text-text-muted", at: (a) => a.cancelledAt },
  replaced: { label: "استُبدل", cls: "text-text-muted", at: (a) => a.replacedAt },
};

function AccountRows({ a }: { a: BankAccount }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "اسم صاحب الحساب", value: a.holderName },
    { label: "البنك", value: a.bankName },
    {
      label: "رقم الآيبان",
      value: (
        <span dir="ltr" className="font-mono text-[14px] leading-[1.5] font-semibold">
          {maskedIban(a.last4)}
        </span>
      ),
    },
    { label: "العملة", value: `ريال سعودي · ${a.currency}` },
    {
      label: "حالة التحقق",
      value: a.status === "verified" && a.verifiedAt ? `موثَّق منذ ${formatDate(a.verifiedAt)}` : `قيد التحقق منذ ${formatDate(a.createdAt)}`,
    },
  ];
  return (
    <dl className="flex flex-col gap-[18px]">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-16 bg-bg-surface px-[18px] py-4">
          <dt className="type-body-lg text-text-secondary">{r.label}</dt>
          <dd className="type-title text-text-primary">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** TRR-FIN-03 · بيانات التحويل البنكي (301:9016). */
export default async function BankPage() {
  const user = await requireTrainer("/trainer/finance/bank");
  const [accounts, banks] = await Promise.all([getBankAccounts(user.id), getSaudiBanks()]);
  const verified = accounts.find((a) => a.status === "verified") ?? null;
  const pending = accounts.find((a) => a.status === "pending") ?? null;
  const canCancel = pending ? msSince(pending.createdAt) < HOURS_48 : false;

  return (
    <>
      <TopBar title="بيانات التحويل" subtitle="حسابك لاستلام الأرباح" />
      <PageBody className="gap-6">
        <FinanceTabs active="/trainer/finance/bank" />
        <FinColumns
          main={
            <>
              {verified && (
                <section aria-labelledby="verified-title" className="flex w-full flex-col gap-[18px] rounded-22 border-2 border-state-success bg-state-success-bg px-5 pt-[26px] pb-7 sm:px-[26px]">
                  <div className="flex items-center gap-3.5">
                    <IconBox icon={BadgeCheck} size={56} radius="rounded-16" className="text-state-success" />
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <h2 id="verified-title" className="type-h2 text-text-primary">
                        حسابك الموثَّق
                      </h2>
                      <p className="type-body text-text-muted">كل تحويلاتك تذهب إلى هذا الحساب حصرًا</p>
                    </div>
                  </div>
                  <AccountRows a={verified} />
                </section>
              )}
              {pending && (
                <section aria-labelledby="pending-title" className="flex w-full flex-col gap-[18px] rounded-22 border-2 border-state-warning bg-state-warning-bg px-5 pt-[26px] pb-7 sm:px-[26px]">
                  <div className="flex items-center gap-3.5">
                    <IconBox icon={Hourglass} size={56} radius="rounded-16" className="text-state-warning" />
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <h2 id="pending-title" className="type-h2 text-text-primary">
                        {verified ? "حسابك الجديد قيد التحقق" : "حسابك قيد التحقق"}
                      </h2>
                      <p className="type-body text-text-muted">
                        {verified ? "تبقى تحويلاتك إلى حسابك الموثَّق حتى يكتمل التحقق." : "يصلك إشعار عند اكتمال التحقق ويمكنك بعدها طلب السحب."}
                      </p>
                    </div>
                  </div>
                  <AccountRows a={pending} />
                  {canCancel && <CancelBankChangeButton accountId={pending.id} />}
                </section>
              )}
              {!pending && <BankForm userId={user.id} banks={banks} title={verified ? "تغيير الحساب" : "أضف حسابك البنكي"} />}
            </>
          }
          side={
            <>
              <FinCard size="l" labelledBy="log-title">
                <FinTitle id="log-title" size="l">
                  سجل التغييرات
                </FinTitle>
                {accounts.length === 0 ? (
                  <p className="rounded-12 bg-bg-page px-3.5 py-[13px] type-small text-text-muted">لا تغييرات بعد.</p>
                ) : (
                  <ul className="flex flex-col gap-[18px]">
                    {accounts.map((a) => {
                      const st = STATUS_LINE[a.status];
                      const at = st.at(a);
                      return (
                        <li key={a.id} className="flex flex-col gap-1 rounded-12 bg-bg-page px-3.5 pt-[13px] pb-3.5">
                          <p className="type-subtitle text-text-primary">
                            {a.bankName} · {a.last4}
                          </p>
                          <p className={`type-caption ${st.cls}`}>
                            {st.label}
                            {at ? ` · ${formatDate(at)}` : ""}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </FinCard>
              <FinCard size="l" labelledBy="protect-title">
                <FinTitle id="protect-title" size="l">
                  حمايتك
                </FinTitle>
                <ul className="flex flex-col gap-[18px]">
                  {["لن يطلب منك موظفو المنصة رقم حسابك", "لا نحوّل لحساب باسم غير اسمك", "يصلك إشعار فور أي محاولة تغيير", "يمكنك إلغاء التغيير خلال ٤٨ ساعة"].map((t) => (
                    <li key={t} className="flex items-start gap-2.5 rounded-12 bg-state-success-bg px-3.5 py-3">
                      <Glyph icon={Shield} size={20} className="mt-1 text-state-success" />
                      <span className="min-w-0 flex-1 type-body text-text-primary">{t}</span>
                    </li>
                  ))}
                </ul>
              </FinCard>
            </>
          }
        />
      </PageBody>
    </>
  );
}
