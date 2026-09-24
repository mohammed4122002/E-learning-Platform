import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { settlementClosesAt, settlementNumber, toCents, type BankStatus, type WithdrawalStatus } from "@/lib/trainer-finance";

/*
 * TRR-FIN-01…04 read models. Every figure comes from the ledger RPCs (trainer_ledger / trainer_balance, migration
 * 20260924141000) — the same source as trainer_stats() behind the dashboard «رصيدك» card — and is summed here in
 * integer halalas so totals always equal the sum of their rows.
 */

type Mode = Database["public"]["Enums"]["course_mode"];
type CourseStatus = Database["public"]["Enums"]["course_status"];

export type LedgerRow = {
  id: string;
  kind: "sale" | "refund" | "chargeback";
  reference: string | null;
  courseId: string;
  courseTitle: string;
  courseMode: Mode;
  courseStatus: CourseStatus;
  courseStartsAt: string | null;
  courseEndsAt: string | null;
  organizationId: string | null;
  organizationName: string | null;
  enrollmentId: string;
  traineeName: string;
  occurredAt: string;
  unit: number;
  gross: number;
  commissionPercent: number;
  commission: number;
  fee: number;
  net: number;
  refundPercent: number | null;
  daysBeforeStart: number | null;
  releaseAt: string | null;
  projectedReleaseAt: string | null;
  released: boolean;
  /** "YYYY-MM" settlement month (Asia/Riyadh) once released. */
  period: string | null;
};

export type Balance = {
  available: number;
  pending: number;
  released: number;
  withdrawn: number;
  inFlight: number;
  min: number;
  fee: number;
  commissionPercent: number;
  refundFeePercent: number;
};

export type Withdrawal = {
  id: string;
  number: string;
  amount: number;
  fee: number;
  net: number;
  status: WithdrawalStatus;
  failureReason: string | null;
  bankName: string;
  last4: string;
  bankStatus: BankStatus;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
};

export type BankAccount = {
  id: string;
  bankCode: string;
  bankName: string;
  holderName: string;
  last4: string;
  currency: string;
  status: BankStatus;
  statusNote: string | null;
  createdAt: string;
  verifiedAt: string | null;
  decidedAt: string | null;
  cancelledAt: string | null;
  replacedAt: string | null;
};

const riyadhMonth = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Riyadh" }).format(new Date(iso)).slice(0, 7);

export const getLedger = cache(async (): Promise<LedgerRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trainer_ledger");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.entry_id,
    kind: r.kind as LedgerRow["kind"],
    reference: r.reference ?? null,
    courseId: r.course_id,
    courseTitle: r.course_title,
    courseMode: r.course_mode,
    courseStatus: r.course_status,
    courseStartsAt: r.course_starts_at ?? null,
    courseEndsAt: r.course_ends_at ?? null,
    organizationId: r.organization_id ?? null,
    organizationName: r.organization_name ?? null,
    enrollmentId: r.enrollment_id,
    traineeName: r.trainee_name,
    occurredAt: r.occurred_at,
    unit: toCents(r.unit_price),
    gross: toCents(r.gross),
    commissionPercent: Number(r.commission_percent),
    commission: toCents(r.commission),
    fee: toCents(r.fee),
    net: toCents(r.net),
    refundPercent: r.refund_percent === null ? null : Number(r.refund_percent),
    daysBeforeStart: r.days_before_start ?? null,
    releaseAt: r.release_at ?? null,
    projectedReleaseAt: r.projected_release_at ?? null,
    released: Boolean(r.released),
    period: r.settlement_period ? r.settlement_period.slice(0, 7) : null,
  }));
});

export const getBalance = cache(async (): Promise<Balance> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trainer_balance");
  if (error) throw new Error(error.message);
  const b = (data ?? {}) as Record<string, number | string>;
  return {
    available: toCents(b.available),
    pending: toCents(b.pending),
    released: toCents(b.released),
    withdrawn: toCents(b.withdrawn),
    inFlight: toCents(b.in_flight),
    min: toCents(b.min_amount),
    fee: toCents(b.fee_amount),
    commissionPercent: Number(b.commission_percent ?? 0),
    refundFeePercent: Number(b.refund_fee_percent ?? 0),
  };
});

const BANK_COLUMNS = "id, bank_code, bank_name, holder_name, iban_last4, currency, status, status_note, created_at, verified_at, decided_at, cancelled_at, replaced_at";

export const getBankAccounts = cache(async (userId: string): Promise<BankAccount[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trainer_bank_accounts").select(BANK_COLUMNS).eq("trainer_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((a) => ({
    id: a.id,
    bankCode: a.bank_code,
    bankName: a.bank_name,
    holderName: a.holder_name,
    last4: a.iban_last4,
    currency: a.currency,
    status: a.status as BankStatus,
    statusNote: a.status_note,
    createdAt: a.created_at,
    verifiedAt: a.verified_at,
    decidedAt: a.decided_at,
    cancelledAt: a.cancelled_at,
    replacedAt: a.replaced_at,
  }));
});

export async function getSaudiBanks(): Promise<{ code: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("saudi_banks").select("code, name").order("sort");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getWithdrawals = cache(async (userId: string): Promise<Withdrawal[]> => {
  const supabase = await createClient();
  const [w, accounts] = await Promise.all([
    supabase
      .from("trainer_withdrawals")
      .select("id, number, amount, fee, net_amount, status, failure_reason, bank_account_id, created_at, completed_at, failed_at, cancelled_at")
      .eq("trainer_id", userId)
      .order("created_at", { ascending: false }),
    getBankAccounts(userId),
  ]);
  if (w.error) throw new Error(w.error.message);
  const byId = new Map(accounts.map((a) => [a.id, a]));
  return (w.data ?? []).map((r) => {
    const acct = byId.get(r.bank_account_id);
    return {
      id: r.id,
      number: r.number,
      amount: toCents(r.amount),
      fee: toCents(r.fee),
      net: toCents(r.net_amount),
      status: r.status as WithdrawalStatus,
      failureReason: r.failure_reason,
      bankName: acct?.bankName ?? "",
      last4: acct?.last4 ?? "",
      bankStatus: acct?.status ?? "verified",
      createdAt: r.created_at,
      completedAt: r.completed_at,
      failedAt: r.failed_at,
      cancelledAt: r.cancelled_at,
    };
  });
});

// ── Settlements (TRR-FIN-02) ─────────────────────────────────────────────────────────────────────────────────

export type SettlementLine = {
  courseId: string;
  title: string;
  mode: Mode;
  startsAt: string | null;
  endsAt: string | null;
  count: number;
  /** Unit price (ex VAT) when every sale in the line had the same price, else null. */
  unit: number | null;
  gross: number;
  commission: number;
  commissionPercent: number;
  net: number;
};

export type Settlement = {
  period: string;
  number: string;
  closesAt: string;
  closed: boolean;
  net: number;
  salesGross: number;
  commission: number;
  refundGross: number;
  refundFees: number;
  commissionPercent: number;
  lines: SettlementLine[];
  refunds: LedgerRow[];
  scheduledCourses: number;
  recordedPurchases: number;
  coursesEndedAt: string | null;
  status: "available" | "withdrawn";
  withdrawnAt: string | null;
};

export function buildSettlements(ledger: LedgerRow[], withdrawals: Withdrawal[]): Settlement[] {
  const byPeriod = new Map<string, LedgerRow[]>();
  for (const r of ledger) {
    if (!r.released || !r.period) continue;
    byPeriod.set(r.period, [...(byPeriod.get(r.period) ?? []), r]);
  }
  const now = Date.now();
  const asc = [...byPeriod.keys()].sort();
  const done = withdrawals.filter((w) => w.status === "completed" && w.completedAt).sort((a, b) => a.completedAt!.localeCompare(b.completedAt!));
  let cumulative = 0;
  const out: Settlement[] = [];
  for (const period of asc) {
    const rows = byPeriod.get(period)!;
    const sales = rows.filter((r) => r.kind === "sale");
    const deductions = rows.filter((r) => r.kind !== "sale");
    const lineMap = new Map<string, LedgerRow[]>();
    for (const s of sales) lineMap.set(s.courseId, [...(lineMap.get(s.courseId) ?? []), s]);
    const lines: SettlementLine[] = [...lineMap.values()].map((rs) => {
      const units = new Set(rs.map((r) => r.unit));
      return {
        courseId: rs[0].courseId,
        title: rs[0].courseTitle,
        mode: rs[0].courseMode,
        startsAt: rs[0].courseStartsAt,
        endsAt: rs[0].courseEndsAt,
        count: rs.length,
        unit: units.size === 1 ? rs[0].unit : null,
        gross: rs.reduce((t, r) => t + r.gross, 0),
        commission: rs.reduce((t, r) => t + r.commission, 0),
        commissionPercent: rs[0].commissionPercent,
        net: rs.reduce((t, r) => t + r.net, 0),
      };
    });
    lines.sort((a, b) => b.gross - a.gross);
    const net = rows.reduce((t, r) => t + r.net, 0);
    cumulative += net;
    // Completed withdrawals are applied oldest settlement first; the one that covers it dates «سُحبت …».
    let paid = 0;
    let withdrawnAt: string | null = null;
    for (const w of done) {
      paid += w.amount;
      if (paid >= cumulative) {
        withdrawnAt = w.completedAt;
        break;
      }
    }
    const closesAt = settlementClosesAt(period);
    const scheduled = lines.filter((l) => l.mode !== "recorded");
    const ends = scheduled.map((l) => l.endsAt).filter((d): d is string => Boolean(d)).sort();
    out.push({
      period,
      number: settlementNumber(period),
      closesAt: closesAt.toISOString(),
      closed: closesAt.getTime() <= now,
      net,
      salesGross: sales.reduce((t, r) => t + r.gross, 0),
      commission: rows.reduce((t, r) => t + r.commission, 0),
      refundGross: deductions.reduce((t, r) => t + r.gross, 0),
      refundFees: deductions.reduce((t, r) => t + r.fee, 0),
      commissionPercent: sales[0]?.commissionPercent ?? deductions[0]?.commissionPercent ?? 0,
      lines,
      refunds: deductions,
      scheduledCourses: scheduled.length,
      recordedPurchases: lines.filter((l) => l.mode === "recorded").reduce((t, l) => t + l.count, 0),
      coursesEndedAt: ends.length ? ends[ends.length - 1] : null,
      status: withdrawnAt && net > 0 ? "withdrawn" : "available",
      withdrawnAt: net > 0 ? withdrawnAt : null,
    });
  }
  return out.reverse();
}

// ── Pending amounts (FIN-01 «المبالغ المعلّقة ومتى تُفرَج») ───────────────────────────────────────────────────

export type PendingGroup = {
  courseId: string;
  title: string;
  mode: Mode;
  startsAt: string | null;
  endsAt: string | null;
  releaseAt: string | null;
  net: number;
};

export function pendingGroups(ledger: LedgerRow[]): PendingGroup[] {
  const map = new Map<string, PendingGroup>();
  for (const r of ledger) {
    if (r.released) continue;
    const g = map.get(r.courseId) ?? {
      courseId: r.courseId,
      title: r.courseTitle,
      mode: r.courseMode,
      startsAt: r.courseStartsAt,
      endsAt: r.courseEndsAt,
      releaseAt: null,
      net: 0,
    };
    g.net += r.net;
    if (r.projectedReleaseAt && (!g.releaseAt || r.projectedReleaseAt > g.releaseAt)) g.releaseAt = r.projectedReleaseAt;
    map.set(r.courseId, g);
  }
  return [...map.values()].filter((g) => g.net !== 0).sort((a, b) => (a.releaseAt ?? "").localeCompare(b.releaseAt ?? ""));
}

// ── KPIs and income by source (FIN-01 tiles · «العمليات» 328:12108) ──────────────────────────────────────────

export function monthKey(iso: string | Date = new Date()): string {
  return riyadhMonth(typeof iso === "string" ? iso : iso.toISOString());
}

export function shiftMonth(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type MonthTotals = { net: number; gross: number; commission: number };

export function totalsByMonth(ledger: LedgerRow[]): Map<string, MonthTotals> {
  const map = new Map<string, MonthTotals>();
  for (const r of ledger) {
    const k = riyadhMonth(r.occurredAt);
    const t = map.get(k) ?? { net: 0, gross: 0, commission: 0 };
    t.net += r.net;
    t.gross += r.gross;
    t.commission += r.commission;
    map.set(k, t);
  }
  return map;
}

export type SourceKind = "direct" | "organization" | "recorded";
export type SourceRow = { key: string; kind: SourceKind; name: string; net: number; courses: number; people: number };

/** Channel of a ledger row: recorded course · a provider organization's course · direct sale to individuals. */
function sourceOf(r: LedgerRow): { key: string; kind: SourceKind; name: string } {
  if (r.courseMode === "recorded") return { key: "recorded", kind: "recorded", name: "كورس مسجَّل" };
  if (r.organizationId) return { key: `org:${r.organizationId}`, kind: "organization", name: r.organizationName ?? "جهة تدريب" };
  return { key: "direct", kind: "direct", name: "بيع مباشر للأفراد" };
}

export function sourcesForMonth(ledger: LedgerRow[], period: string): SourceRow[] {
  const map = new Map<string, SourceRow & { courseSet: Set<string>; peopleSet: Set<string> }>();
  for (const r of ledger) {
    if (riyadhMonth(r.occurredAt) !== period) continue;
    const s = sourceOf(r);
    const row = map.get(s.key) ?? { ...s, net: 0, courses: 0, people: 0, courseSet: new Set<string>(), peopleSet: new Set<string>() };
    row.net += r.net;
    if (r.kind === "sale") {
      row.courseSet.add(r.courseId);
      row.peopleSet.add(r.enrollmentId);
    }
    map.set(s.key, row);
  }
  // Direct sales and the recorded channel are always listed (zero when empty); organizations only when they paid.
  for (const s of [
    { key: "direct", kind: "direct" as const, name: "بيع مباشر للأفراد" },
    { key: "recorded", kind: "recorded" as const, name: "كورس مسجَّل" },
  ]) {
    if (!map.has(s.key)) map.set(s.key, { ...s, net: 0, courses: 0, people: 0, courseSet: new Set(), peopleSet: new Set() });
  }
  const order: Record<SourceKind, number> = { direct: 0, organization: 1, recorded: 2 };
  return [...map.values()]
    .map(({ courseSet, peopleSet, ...row }) => ({ ...row, courses: courseSet.size, people: peopleSet.size }))
    .sort((a, b) => order[a.kind] - order[b.kind] || b.net - a.net);
}
