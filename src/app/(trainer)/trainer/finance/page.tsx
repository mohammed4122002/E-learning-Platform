import type { Metadata } from "next";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { BalanceView, EmptyBalanceView, OperationsView } from "@/components/trainer-finance/BalanceViews";
import { FinanceTabs } from "@/components/trainer-finance/parts";
import { requireTrainer } from "@/lib/auth";
import {
  buildSettlements,
  getBalance,
  getBankAccounts,
  getLedger,
  getWithdrawals,
  monthKey,
  pendingGroups,
  shiftMonth,
  sourcesForMonth,
  totalsByMonth,
} from "@/lib/data/trainer-finance";
import { periodMonthName } from "@/lib/trainer-finance";

export const metadata: Metadata = { title: "الرصيد والمستحقات", description: "رصيدك المتاح والمبالغ المعلّقة وتسوياتك الشهرية ومصادر دخلك." };

/** TRR-FIN-01 · الرصيد والمستحقات: default (279:5729), empty (313:10503), «العمليات» (328:12108, ?tab=operations). */
export default async function FinancePage({ searchParams }: PageProps<"/trainer/finance">) {
  const user = await requireTrainer("/trainer/finance");
  const sp = await searchParams;
  const tab = sp.tab === "operations" ? "operations" : "balance";
  const [ledger, balance, accounts, withdrawals] = await Promise.all([getLedger(), getBalance(), getBankAccounts(user.id), getWithdrawals(user.id)]);
  const bank = accounts.find((a) => a.status === "verified") ?? null;
  const bankPending = accounts.find((a) => a.status === "pending") ?? null;

  if (ledger.length === 0) {
    return (
      <>
        <TopBar title="المالي" subtitle="لا إيرادات بعد" />
        <PageBody className="gap-6">
          <EmptyBalanceView hasBank={Boolean(bank ?? bankPending)} />
        </PageBody>
      </>
    );
  }

  const now = monthKey();
  const months = totalsByMonth(ledger);
  const zero = { net: 0, gross: 0, commission: 0 };

  if (tab === "operations") {
    // Newest month first: Figma draws the current month at the inline start (right) of the chart.
    const trend = [0, -1, -2, -3, -4].map((d) => {
      const key = shiftMonth(now, d);
      return { key, label: periodMonthName(key), net: (months.get(key) ?? zero).net, current: d === 0 };
    });
    const quarter = (from: number) => [0, 1, 2].reduce((t, i) => t + (months.get(shiftMonth(now, from - i)) ?? zero).net, 0);
    const lastQ = quarter(0);
    const prevQ = quarter(-3);
    const sources = sourcesForMonth(ledger, now);
    const prevRecorded = sourcesForMonth(ledger, shiftMonth(now, -1)).find((s) => s.kind === "recorded")?.net ?? 0;
    const curRecorded = sources.find((s) => s.kind === "recorded")?.net ?? 0;
    const curTotal = (months.get(now) ?? zero).net;
    const prevTotal = (months.get(shiftMonth(now, -1)) ?? zero).net;
    return (
      <>
        <TopBar title="المالي" subtitle="دخلك حسب المصدر واتجاهه" />
        <PageBody className="gap-6">
          <FinanceTabs active="/trainer/finance?tab=operations" />
          <OperationsView
            d={{
              monthName: periodMonthName(now),
              trend,
              quarterChange: prevQ > 0 ? Math.round(((lastQ - prevQ) / prevQ) * 100) : null,
              recordedJump: prevRecorded <= 0 && curRecorded > 0 && curTotal > prevTotal,
              sources,
            }}
          />
        </PageBody>
      </>
    );
  }

  const cur = months.get(now) ?? zero;
  const prevKey = shiftMonth(now, -1);
  const lastSale = ledger.find((r) => r.kind === "sale");
  return (
    <>
      <TopBar title="المالي" subtitle="رصيدك ومستحقاتك" />
      <PageBody className="gap-6">
        <FinanceTabs active="/trainer/finance" />
        <BalanceView
          d={{
            balance,
            pending: pendingGroups(ledger),
            settlements: buildSettlements(ledger, withdrawals),
            month: {
              name: periodMonthName(now),
              net: cur.net,
              commission: cur.commission,
              gross: cur.gross,
              prevName: periodMonthName(prevKey),
              prevNet: (months.get(prevKey) ?? zero).net,
            },
            allTime: { net: ledger.reduce((t, r) => t + r.net, 0), courses: new Set(ledger.filter((r) => r.kind === "sale").map((r) => r.courseId)).size },
            bank,
            bankPending,
            example: lastSale ? { unit: lastSale.unit, commissionPercent: lastSale.commissionPercent } : null,
          }}
        />
      </PageBody>
    </>
  );
}
