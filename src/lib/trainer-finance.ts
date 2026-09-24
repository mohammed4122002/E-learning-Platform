/*
 * Trainer finance helpers shared by server and client code (TRR-FIN-01…04).
 * Money is summed in integer halalas (1 ر.س = 100) so totals are exact; the database stores numeric(12,2).
 */

const money2Fmt = new Intl.NumberFormat("ar-SA-u-nu-arab", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wholeFmt = new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 0 });

/** numeric → halalas (exact for values with at most two decimals). */
export const toCents = (v: number | string | null | undefined): number => Math.round(Number(v ?? 0) * 100);
export const fromCents = (c: number): number => c / 100;

/** "٤٬٣٢٠٫٠٠" (no currency). */
export const amount2 = (cents: number): string => money2Fmt.format(cents / 100);
/** "٤٬٣٢٠٫٠٠ ر.س" */
export const sar = (cents: number): string => `${amount2(cents)} ر.س`;
/** "− ٥٧٦٫٠٠ ر.س" for deductions (Figma uses U+2212 and a space). */
export const minusSar = (cents: number): string => `− ${sar(Math.abs(cents))}`;
/** "٢٬٩٨٠" — chart labels without decimals. */
export const wholeAmount = (cents: number): string => wholeFmt.format(Math.round(cents / 100));

/** Saudi IBAN: SA + 2 check digits + 2-digit bank code + 18 account characters, mod-97 checksum (ISO 13616). */
export function normalizeIban(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

export function isValidSaudiIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!/^SA\d{4}[0-9A-Z]{18}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let r = 0;
  for (const ch of rearranged) {
    const digits = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of digits) r = (r * 10 + Number(d)) % 97;
  }
  return r === 1;
}

/** Bank code = IBAN characters 5–6 (SAMA). */
export const ibanBankCode = (raw: string): string => normalizeIban(raw).slice(4, 6);

/** "SA•• •••• •••• •••• 4412" — the only IBAN form the app ever shows. */
export const maskedIban = (last4: string): string => `SA•• •••• •••• •••• ${last4}`;
/** "SA00 •••• 4412" (withdrawal status rows). */
export const shortMaskedIban = (last4: string): string => `SA00 •••• ${last4}`;

/** Settlement number from its month: STL-YYYY-MMDD, the month's last day (Figma STL-2026-0331). */
export function settlementNumber(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `STL-${y}-${String(m).padStart(2, "0")}${String(last).padStart(2, "0")}`;
}

/** STL-YYYY-MMDD → "YYYY-MM" (null when malformed or the day is not the month's last day). */
export function periodFromSettlementNumber(num: string): string | null {
  const m = /^STL-(\d{4})-(\d{2})(\d{2})$/.exec(num);
  if (!m) return null;
  const period = `${m[1]}-${m[2]}`;
  return settlementNumber(period) === num ? period : null;
}

/** First instant after the settlement month in Riyadh (the month closes at local midnight). */
export function settlementClosesAt(period: string): Date {
  const [y, m] = period.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return new Date(`${next}-01T00:00:00+03:00`);
}

/** Last calendar day of the settlement month (for «أُغلقت ٣١ مارس»). */
export function settlementLastDay(period: string): Date {
  return new Date(settlementClosesAt(period).getTime() - 1);
}

export const WITHDRAWAL_STATUS = ["pending", "processing", "completed", "failed", "cancelled"] as const;
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUS)[number];
export const BANK_STATUS = ["pending", "verified", "rejected", "cancelled", "replaced"] as const;
export type BankStatus = (typeof BANK_STATUS)[number];

const LOCALE = "ar-SA-u-ca-gregory-nu-arab";
const dayMonth2Fmt = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "long", timeZone: "Asia/Riyadh" });
const dayMonthFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", timeZone: "Asia/Riyadh" });
const monthFmt = new Intl.DateTimeFormat(LOCALE, { month: "long", timeZone: "Asia/Riyadh" });

/** "٠٥ أبريل" (Figma pads the day in release/withdrawal dates). */
export const dayMonth2 = (d: string | Date): string => dayMonth2Fmt.format(typeof d === "string" ? new Date(d) : d);
/** "٣١ مارس" */
export const dayMonth = (d: string | Date): string => dayMonthFmt.format(typeof d === "string" ? new Date(d) : d);
/** "مارس" for an ISO date. */
export const monthNameOf = (d: string | Date): string => monthFmt.format(typeof d === "string" ? new Date(d) : d);
/** "مارس" for a "YYYY-MM" period. */
export const periodMonthName = (period: string): string => monthFmt.format(new Date(`${period}-15T12:00:00+03:00`));

/** Quick amounts on TRR-FIN-04 («١٬٠٠٠ · ٢٬٠٠٠ · ٣٬٠٠٠ · كل الرصيد»). */
export const QUICK_AMOUNTS = [1000, 2000, 3000] as const;

/** Milliseconds elapsed since an instant (48-hour hold, 30-day dispute window). */
export function msSince(iso: string): number {
  return Date.now() - new Date(iso).getTime();
}
export const HOURS_48 = 48 * 3_600_000;
