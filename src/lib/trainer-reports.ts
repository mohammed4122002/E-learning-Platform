import { pluralAr, toArabicDigits } from "@/lib/format";

/* Copy helpers of TRR-RPT-01/02 (Figma wording). Types are structural so client components can use them too. */

type ReportLike = {
  number: number;
  createdAt: string;
  targetType: "course" | "program" | "trainer";
  targetId: string;
  targetTitle: string;
  reason: string;
  responseAt: string | null;
  decision: null | { outcome: string; acceptedAt: string | null; appealDeadline: string };
  appeal: null | { status: string };
};

export const REASON_SHORT: Record<string, string> = {
  misleading: "وصف مضلّل",
  false_accreditation: "ادعاء اعتماد غير صحيح",
  inappropriate: "محتوى مخالف أو مسيء",
  unprofessional: "سلوك غير مهني",
  false_trainer_info: "بيانات مدرب غير صحيحة",
  fake_reviews: "تقييمات مزيّفة",
  fraud: "احتيال",
  harassment: "إساءة أو تحرّش",
  copyright: "انتهاك حقوق الملكية",
  other: "سبب آخر",
};

export const APPEAL_BASES = {
  new_evidence: { title: "لدي دليل جديد لم يُقدَّم", body: "مستند أو تسجيل يغيّر الوقائع" },
  fact_error: { title: "خطأ في فهم الوقائع", body: "القرار بُني على معلومة غير صحيحة" },
  disproportionate: { title: "الإجراء غير متناسب", body: "الوقائع صحيحة لكن العقوبة أشد مما تستحق" },
} as const;
export type AppealBasis = keyof typeof APPEAL_BASES;

/** «RPT-2026-0091» */
export function reportCode(r: Pick<ReportLike, "number" | "createdAt">): string {
  const year = new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: "Asia/Riyadh" }).format(new Date(r.createdAt));
  return `RPT-${year}-${String(r.number).padStart(4, "0")}`;
}

/** «البرنامج: أساسيات إدارة المشاريع» */
export function targetLabel(r: Pick<ReportLike, "targetType" | "targetTitle">): string {
  if (r.targetType === "trainer") return "ملفك المهني";
  return `${r.targetType === "program" ? "البرنامج" : "الدورة"}: ${r.targetTitle}`;
}

/** Where «أقرّ بالخطأ وأصحّح الوصف» / «أقبل القرار وأعدّل الوصف» lead. */
export function fixHref(r: Pick<ReportLike, "targetType" | "targetId">): string {
  if (r.targetType === "program") return `/trainer/programs/${r.targetId}/edit/basics`;
  if (r.targetType === "course") return `/trainer/courses/${r.targetId}`;
  return "/trainer/profile/edit";
}

export const needsReply = (r: ReportLike) => !r.responseAt && !r.decision;

export const canAppeal = (r: ReportLike, now = Date.now()) =>
  Boolean(r.decision && r.decision.outcome !== "dismissed" && !r.decision.acceptedAt && !r.appeal && new Date(r.decision.appealDeadline).getTime() > now);

export type Pill = { label: string; tone: "success" | "warning" | "error" | "info" | "brand" };

/** Status pill of «بلاغات سابقة». */
export function reportPill(r: ReportLike): Pill {
  if (r.appeal?.status === "pending") return { label: "تظلّم قيد المراجعة", tone: "info" };
  if (r.appeal?.status === "upheld") return { label: "قُبل تظلّمك — أُلغيت المخالفة", tone: "success" };
  if (r.appeal?.status === "rejected") return { label: "رُفض التظلّم — القرار نهائي", tone: "error" };
  if (!r.decision) return { label: "قيد المراجعة", tone: "warning" };
  if (r.decision.outcome === "dismissed") return { label: "أُغلق لصالحك — لا مخالفة", tone: "success" };
  if (r.decision.acceptedAt) return { label: "قبلت القرار", tone: "brand" };
  return { label: r.decision.outcome === "partially_upheld" ? "بلاغ مثبَت جزئيًا" : "بلاغ مثبَت", tone: "error" };
}

/** «لديك ٤٢ ساعة» */
export function hoursLeftLabel(iso: string, now = Date.now()): string {
  const h = Math.ceil((new Date(iso).getTime() - now) / 3_600_000);
  if (h <= 0) return "انتهت المهلة — ما زال بإمكانك الرد";
  return `لديك ${pluralAr(h, ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"])}`;
}

/** «لديك ٧ أيام» */
export function daysLeftLabel(iso: string, now = Date.now()): string {
  const d = Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));
  return d === 0 ? "آخر يوم" : `لديك ${pluralAr(d, ["يوم واحد", "يومان", "أيام", "يومًا"])}`;
}

/** «٣ بلاغات منذ انضمامك · ٢ أُغلقا لصالحك» */
export function historyLabel(total: number, dismissed: number): string {
  const t = pluralAr(total, ["بلاغ واحد منذ انضمامك", "بلاغان منذ انضمامك", "بلاغات منذ انضمامك", "بلاغًا منذ انضمامك"]);
  if (dismissed === 0) return t;
  const d = dismissed === 1 ? "واحد أُغلق لصالحك" : dismissed === 2 ? "٢ أُغلقا لصالحك" : `${toArabicDigits(dismissed)} أُغلقت لصالحك`;
  return `${t} · ${d}`;
}

/** «بلاغ واحد يحتاج ردك» */
export const needingLabel = (n: number) => (n === 1 ? "بلاغ واحد يحتاج ردك" : n === 2 ? "بلاغان يحتاجان ردك" : `${toArabicDigits(n)} بلاغات تحتاج ردك`);
