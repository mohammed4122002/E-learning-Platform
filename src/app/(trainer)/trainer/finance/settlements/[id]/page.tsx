import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { SettlementView } from "@/components/trainer-finance/SettlementView";
import { requireTrainer } from "@/lib/auth";
import { buildSettlements, getBalance, getLedger, getWithdrawals } from "@/lib/data/trainer-finance";
import { periodFromSettlementNumber, periodMonthName } from "@/lib/trainer-finance";
import { toArabicDigits } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/trainer/finance/settlements/[id]">): Promise<Metadata> {
  const { id } = await params;
  const period = periodFromSettlementNumber(id);
  return { title: period ? `تسوية ${periodMonthName(period)} ${toArabicDigits(period.slice(0, 4))}` : "تفاصيل التسوية" };
}

/** TRR-FIN-02 · تفاصيل التسوية (301:8728 · 310:10328). The id is the settlement number STL-YYYY-MMDD. */
export default async function SettlementPage({ params }: PageProps<"/trainer/finance/settlements/[id]">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/finance/settlements/${id}`);
  const period = periodFromSettlementNumber(id);
  if (!period) notFound();
  const [ledger, withdrawals, balance] = await Promise.all([getLedger(), getWithdrawals(user.id), getBalance()]);
  const s = buildSettlements(ledger, withdrawals).find((x) => x.period === period);
  if (!s) notFound();
  return (
    <>
      <TopBar title="تفاصيل التسوية" subtitle={`تسوية ${periodMonthName(period)} ${toArabicDigits(period.slice(0, 4))}`} />
      <PageBody className="gap-6">
        <SettlementView s={s} refundFeePercent={balance.refundFeePercent} />
      </PageBody>
    </>
  );
}
