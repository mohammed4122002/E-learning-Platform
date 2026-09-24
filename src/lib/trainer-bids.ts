/*
 * Pure helpers shared by the trainer bid screens (TRR-BID-01…05): labels, term formatting, match thresholds and
 * negotiation term encoding. No server-only imports — used by client components too.
 */
import { formatPrice, pluralAr, toArabicDigits } from "@/lib/format";

/** A request is "matching" when it is in one of the trainer's specialties; "high" from this score on. */
export const HIGH_MATCH_SCORE = 55;
/** Hours a party has to answer a negotiation step, and days to contract after acceptance. */
export const NEGOTIATION_HOURS = 72;
export const CONTRACT_DAYS = 7;
/** Weights of the match score (TRR-BID-01 «كيف تُحسب المطابقة؟»). */
export const MATCH_WEIGHTS = { specialty: 40, rating: 25, availability: 20, location: 15 } as const;

export type BidStatus = "draft" | "submitted" | "shortlisted" | "accepted" | "rejected" | "withdrawn" | "expired";
export type NegotiationStatus = "draft" | "awaiting_org" | "countered" | "agreed" | "rejected" | "declined" | "expired" | "withdrawn" | "cancelled";

/**
 * Contract step handed over to the contracts module (built separately). While a proposal waits for the organization
 * or a counter-proposal waits for the trainer, the contract cannot be created yet: «أكمل التعاقد» opens the
 * negotiation instead (the database refuses `negotiation_open`).
 */
export function contractHref(bidId: string, negotiation?: NegotiationStatus | null): string {
  if (negotiation === "awaiting_org" || negotiation === "countered") return `/trainer/bids/${bidId}/negotiation`;
  return `/trainer/contracts/new?source=bid&id=${bidId}`;
}

// ─── Dates & money ──────────────────────────────────────────────────────────────────────────────────────
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** "YYYY-MM-DD" → parts (dates are calendar days, no time zone). */
function ymd(d: string) {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return { y, m, day };
}
const dd = (n: number) => toArabicDigits(String(n).padStart(2, "0"));

/** "١٥ – ١٧ مايو" · "٠١ – ٠٤ يونيو" · "٣٠ مايو – ٠٢ يونيو" (Figma date ranges, two-digit days). */
export function formatDayRange(start: string, end: string): string {
  const s = ymd(start);
  const e = ymd(end);
  if (s.y === e.y && s.m === e.m) return s.day === e.day ? `${dd(s.day)} ${MONTHS[s.m - 1]}` : `${dd(s.day)} – ${dd(e.day)} ${MONTHS[s.m - 1]}`;
  return `${dd(s.day)} ${MONTHS[s.m - 1]} – ${dd(e.day)} ${MONTHS[e.m - 1]}`;
}

const grouped = new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 0 });
/** "٤٬٥٠٠" */
export function amount(n: number): string {
  return grouped.format(Math.round(n));
}
/** "٤٬٥٠٠ – ٦٬٠٠٠ ر.س" */
export function budgetRange(min: number, max: number): string {
  return min === max ? formatPrice(min) : `${amount(min)} – ${amount(max)} ر.س`;
}

/** "يوم واحد" · "يومان" · "٣ أيام" (Figma list meta). */
export function daysLabel(n: number): string {
  return pluralAr(n, ["يوم واحد", "يومان", "أيام", "يومًا"]);
}
/** "٢٥ موظفًا" */
export function seatsLabel(n: number): string {
  return pluralAr(n, ["موظف واحد", "موظفان", "موظفين", "موظفًا"]);
}
/** "١٨ ساعة" */
export function hoursLabel(n: number): string {
  return `${toArabicDigits(Number.isInteger(n) ? n : Number(n.toFixed(1)))} ساعة`;
}
/** "بعد ٤ أيام" style countdown in whole days (at least one). */
export function daysLeft(until: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(until).getTime() - now) / 86_400_000));
}
/** "تنتهي بعد ٤ أيام" */
export function closesIn(until: string, now = Date.now()): string {
  const d = daysLeft(until, now);
  if (d <= 0) return "انتهت المهلة";
  return `تنتهي بعد ${pluralAr(d, ["يوم واحد", "يومين", "أيام", "يومًا"])}`;
}
/** "يتبقى ٤٨ ساعة للرد" */
export function hoursLeftLabel(until: string, now = Date.now()): string {
  const h = Math.max(0, Math.ceil((new Date(until).getTime() - now) / 3_600_000));
  return pluralAr(h, ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"]);
}
/** "قبل يومين" · "اليوم" */
export function daysAgo(at: string, now = Date.now()): string {
  const d = Math.floor((now - new Date(at).getTime()) / 86_400_000);
  if (d <= 0) return "اليوم";
  return `قبل ${pluralAr(d, ["يوم", "يومين", "أيام", "يومًا"])}`;
}

// ─── Labels ─────────────────────────────────────────────────────────────────────────────────────────────
/** TRR-BID-04 categorised reasons as the organization chose them. */
export const DECISION_REASON: Record<string, string> = {
  sector_experience: "خبرة أقرب لقطاع الجهة",
  price: "سعر أعلى من المنافس",
  dates: "تعارض في التواريخ",
  other_trainer: "اختارت الجهة مدربًا آخر",
  scope: "أُلغي الطلب أو تغيّر نطاقه",
  closest_experience: "الخبرة الأقرب لمجال الجهة",
  best_value: "أفضل قيمة مقابل السعر",
  detailed_proposal: "المقترح التفصيلي",
  availability: "التوفّر في التواريخ المطلوبة",
  other: "سبب آخر",
};
/** Short labels of the TRR-BID-03 «لماذا لم تُقبل عروضك؟» rows (the three categories drawn in Figma first). */
export const REJECTION_SUMMARY: { key: string; label: string }[] = [
  { key: "sector_experience", label: "خبرة أقرب للقطاع" },
  { key: "price", label: "سعر أعلى من المنافس" },
  { key: "dates", label: "تعارض في التواريخ" },
];

export const WITHDRAW_REASONS: { value: string; label: string; sentence: string }[] = [
  { value: "schedule_conflict", label: "تعارض في جدولي", sentence: "سحبته بسبب تعارض في جدولك" },
  { value: "price_change", label: "تغيّر تقديري للسعر", sentence: "سحبته بسبب تغيّر تقديرك للسعر" },
  { value: "not_available", label: "لم أعد متاحًا", sentence: "سحبته لأنك لم تعد متاحًا" },
  { value: "other", label: "سبب آخر", sentence: "سحبته" },
];

export const PAYMENT_TERMS: Record<string, string> = {
  single_after: "دفعة واحدة بعد الانتهاء",
  half_upfront: "نصف مقدّمًا ونصف بعد الانتهاء",
  per_day: "دفعة عن كل يوم تنفيذ",
};

export const MODE_LABEL: Record<string, string> = { in_person: "حضوري", live_remote: "عن بُعد", recorded: "مسجَّل" };

// ─── Negotiation terms ──────────────────────────────────────────────────────────────────────────────────
/** Flat effective terms of a bid (public.bid_terms). */
export type BidTerms = { price: number; days: number; hours: number; starts_on: string; ends_on: string; payment_terms: string };
export type TermKey = "price" | "duration" | "dates" | "payment_terms";
export const TERM_KEYS: TermKey[] = ["price", "duration", "dates", "payment_terms"];
export const TERM_TITLES: Record<TermKey, string> = {
  price: "السعر الإجمالي",
  duration: "عدد أيام التنفيذ",
  dates: "تواريخ التنفيذ",
  payment_terms: "شروط الدفع",
};
/** The three platform terms that are never negotiable (Figma locked rows). */
export const LOCKED_TERMS: { title: string; caption: string }[] = [
  { title: "عمولة المنصة · وفق إعدادات المنصة المعتمدة", caption: "يحددها نظام المنصة ولا تُعدَّل" },
  { title: "موعد صرف المستحق", caption: "بعد انتهاء الورشة وإقرار الجهة" },
  { title: "سياسة الاسترداد", caption: "السياسة الموحّدة للمنصة" },
];

export type TermValue = number | { days: number; hours: number } | { starts_on: string; ends_on: string } | string;
export type TermChange = { value: TermValue; reason?: string };
export type TermChanges = Partial<Record<TermKey, TermChange>>;

export function toBidTerms(raw: unknown): BidTerms {
  const t = (raw ?? {}) as Record<string, unknown>;
  return {
    price: Number(t.price ?? 0),
    days: Number(t.days ?? 0),
    hours: Number(t.hours ?? 0),
    starts_on: String(t.starts_on ?? ""),
    ends_on: String(t.ends_on ?? ""),
    payment_terms: String(t.payment_terms ?? "single_after"),
  };
}

export function termValue(terms: BidTerms, key: TermKey): TermValue {
  if (key === "price") return terms.price;
  if (key === "duration") return { days: terms.days, hours: terms.hours };
  if (key === "dates") return { starts_on: terms.starts_on, ends_on: terms.ends_on };
  return terms.payment_terms;
}

/** Applies proposed / countered changes on top of flat terms (mirror of public.apply_bid_terms). */
export function applyTerms(base: BidTerms, changes: TermChanges | null | undefined): BidTerms {
  const t = { ...base };
  if (!changes) return t;
  if (changes.price) t.price = Number(changes.price.value);
  if (changes.duration) Object.assign(t, changes.duration.value as object);
  if (changes.dates) Object.assign(t, changes.dates.value as object);
  if (changes.payment_terms) t.payment_terms = String(changes.payment_terms.value);
  return t;
}

const money2Fmt = new Intl.NumberFormat("ar-SA-u-nu-arab", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** "٥٬٢٠٠٫٠٠ ر.س" */
export function money2(n: number): string {
  return `${money2Fmt.format(Math.round(n * 100) / 100)} ر.س`;
}

/** Display text of one term value ("٥٬٢٠٠٫٠٠ ر.س", "٣ أيام · ١٨ ساعة", "١٥ – ١٧ مايو", "دفعة واحدة بعد الانتهاء"). */
export function formatTerm(key: TermKey, value: TermValue): string {
  if (key === "price") return money2(Number(value));
  if (key === "duration") {
    const v = value as { days: number; hours: number };
    return `${daysLabel(Number(v.days))} · ${hoursLabel(Number(v.hours))}`;
  }
  if (key === "dates") {
    const v = value as { starts_on: string; ends_on: string };
    return v.starts_on && v.ends_on ? formatDayRange(v.starts_on, v.ends_on) : "—";
  }
  return PAYMENT_TERMS[String(value)] ?? String(value);
}

/** Short summary of a proposal for the timeline: "٦٬٠٠٠ ر.س + ٢٢ – ٢٤ مايو". */
export function summarizeChanges(changes: TermChanges | null | undefined): string {
  if (!changes) return "";
  const parts: string[] = [];
  if (changes.price) parts.push(`${amount(Number(changes.price.value))} ر.س`);
  if (changes.duration) {
    const v = changes.duration.value as { days: number };
    parts.push(daysLabel(Number(v.days)));
  }
  if (changes.dates) {
    const v = changes.dates.value as { starts_on: string; ends_on: string };
    parts.push(formatDayRange(v.starts_on, v.ends_on));
  }
  if (changes.payment_terms) parts.push(PAYMENT_TERMS[String(changes.payment_terms.value)] ?? "");
  return parts.join(" + ");
}

/** "شرطان معدَّلان من أربعة." */
export function changedCountSentence(n: number): string {
  const count = pluralAr(n, ["شرط واحد معدَّل", "شرطان معدَّلان", "شروط معدَّلة", "شرطًا معدَّلًا"]);
  return `${count} من أربعة. الشروط الثابتة الثلاثة لم تُمس.`;
}

/** Parses "٥٬٤٠٠٫٠٠" / "5,400.00" / "١٢ ساعة" to a number (NaN when empty or invalid). */
export function parseAmount(raw: string | null | undefined): number {
  if (raw == null) return Number.NaN;
  const latin = String(raw)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٬,\s]/g, "")
    .replace(/٫/g, ".")
    .replace(/[^0-9.]/g, "");
  if (!latin) return Number.NaN;
  return Number(latin);
}

/** Net to the trainer after the platform commission. */
export function netOf(price: number, commissionPercent: number): number {
  return Math.round(price * (1 - commissionPercent / 100) * 100) / 100;
}
