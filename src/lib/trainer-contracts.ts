import { formatDayMonth, pluralAr, toArabicDigits } from "@/lib/format";
import type { ContractTerms, TermValue } from "@/lib/data/trainer-contracts";

/* Display helpers of TRR-CTR-01/02/03 (terms JSON → Figma rows). */

const money2Fmt = new Intl.NumberFormat("ar-SA-u-nu-arab", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** «٦٬٠٠٠٫٠٠ ر.س» — contract amounts always show two decimals like the frames. */
export const money2 = (n: number) => `${money2Fmt.format(Math.round(n * 100) / 100)} ر.س`;

export type TermRowView = { label: string; negotiable: boolean; original: string | null; agreed: string | null; note: string | null };

const isIsoDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);

/** «٢٢ – ٢٤ مايو» (same month) · «٣٠ مايو – ٢ يونيو». */
export function dateRangeLabel(start: string | null | undefined, end: string | null | undefined): string | null {
  if (!start) return null;
  const s = new Date(`${start.slice(0, 10)}T12:00:00+03:00`);
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return formatDayMonth(s);
  const e = new Date(`${end.slice(0, 10)}T12:00:00+03:00`);
  const sameMonth = s.getUTCMonth() === e.getUTCMonth();
  return sameMonth ? `${toArabicDigits(s.getUTCDate())} – ${formatDayMonth(e)}` : `${formatDayMonth(s)} – ${formatDayMonth(e)}`;
}

function valueText(key: string | undefined, v: TermValue | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return key === "price" ? money2(v) : toArabicDigits(v);
  if (Array.isArray(v)) return dateRangeLabel(v[0], v[1]);
  if (isIsoDate(v)) return formatDayMonth(new Date(v));
  return v;
}

export function termRows(t: ContractTerms): TermRowView[] {
  return (t.items ?? []).map((i) => ({
    label: i.label,
    negotiable: Boolean(i.negotiable),
    original: valueText(i.key, i.original),
    agreed: valueText(i.key, i.agreed),
    note: i.note ?? null,
  }));
}

/** «٢ قابلة للتفاوض · ٣ ثابتة» */
export function termsCountLabel(rows: TermRowView[]): string {
  const n = rows.filter((r) => r.negotiable).length;
  return `${toArabicDigits(n)} قابلة للتفاوض · ${toArabicDigits(rows.length - n)} ثابتة`;
}

/** «٣ أيام · ١٨ ساعة» */
export function durationText(t: ContractTerms): string | null {
  if (t.duration) return t.duration;
  const parts = [
    t.days ? pluralAr(t.days, ["يوم واحد", "يومان", "أيام", "يومًا"]) : null,
    t.hours ? pluralAr(Number(t.hours), ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"]) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export const datesText = (t: ContractTerms) => t.dates ?? dateRangeLabel(t.starts_on, t.ends_on);

/** Contract value line («٦٬٠٠٠٫٠٠ ر.س» or «عمولة الجهة ١٢٪ من قيمة كل تسجيل»). */
export const valueText2 = (t: ContractTerms) => (typeof t.value === "number" ? money2(t.value) : (t.value_label ?? "—"));

export function netOf(t: ContractTerms) {
  if (typeof t.value !== "number") return null;
  const pct = Number(t.platform_commission_percent ?? 10);
  const fee = Math.round(t.value * pct) / 100;
  const net = t.value - fee;
  const origNet = typeof t.original_value === "number" ? t.original_value - Math.round(t.original_value * pct) / 100 : null;
  return { pct, fee, net, delta: origNet === null ? null : net - origNet };
}

/** «ناتجة عن تفاوض · جولتان» — the stored label, with the rounds from the history when not stored. */
export function termsSourceText(t: ContractTerms): string {
  if (t.terms_source) return t.terms_source;
  return "شروط العرض المقبول";
}

export const roundsOf = (t: ContractTerms) => (t.history ?? []).filter((h) => h.kind !== "accept").length;
