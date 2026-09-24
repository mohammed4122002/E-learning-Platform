import { pluralAr, toArabicDigits } from "@/lib/format";
import type { Database } from "@/types/database";

/*
 * Trainer programs (TRR-PRG-*): shared pure helpers — lifecycle phase, labels, wizard steps and deadlines.
 * Safe to import from Server and Client Components (no Supabase access here).
 */

export type ReviewState = Database["public"]["Enums"]["program_review_state"];
export type ProgramStatus = Database["public"]["Enums"]["program_status"];

/** The five states of «حالات البرنامج» (262:2211) plus the final «مرفوض» decision (270:4040). */
export type ProgramPhase = "draft" | "under_review" | "needs_changes" | "rejected" | "published" | "suspended";

export function programPhase(status: ProgramStatus, review: ReviewState): ProgramPhase {
  if (status === "archived") return "suspended";
  if (status === "published") return "published";
  if (review === "under_review" || review === "needs_changes" || review === "rejected") return review;
  return "draft";
}

export const PHASE_LABEL: Record<ProgramPhase, string> = {
  draft: "مسودة",
  under_review: "قيد المراجعة",
  needs_changes: "يحتاج تعديل",
  rejected: "مرفوض",
  published: "منشور",
  suspended: "موقوف",
};

export const isEditable = (phase: ProgramPhase) => phase === "draft" || phase === "needs_changes";

/** "v1.2": one lineage per program (a new version is a new program, TRR-PRG-09); the minor counts submissions. */
export function versionLabel(revision: number): string {
  return `v1.${revision}`;
}
/** "١٫٢" — the Arabic form used on list cards. */
export function versionLabelAr(revision: number): string {
  return `١٫${toArabicDigits(revision)}`;
}

/** Same display reference as the trainee program page (TRN-DSC-02). */
export function programReference(id: string, createdAt: string): string {
  return `PRG-${createdAt.slice(0, 4)}-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/** "SHA-8F3A…C21D" */
export function shortHash(hash: string): string {
  return `SHA-${hash.slice(0, 4)}…${hash.slice(-4)}`;
}

// ── Wizard (TRR-PRG-02) ────────────────────────────────────────────────────
export const WIZARD_STEPS = [
  { key: "basics", label: "الأساسيات والغلاف", short: "الأساسيات" },
  { key: "goals", label: "الأهداف والمحاور", short: "الأهداف والمحتوى" },
  { key: "materials", label: "المواد", short: "المواد" },
  { key: "pricing", label: "التسعير", short: "التسعير" },
  { key: "review", label: "المعاينة والإقرار", short: "المعاينة والإقرار" },
] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number]["key"];
export const EDIT_STEPS = ["basics", "goals", "materials", "pricing"] as const;
export type EditStep = (typeof EDIT_STEPS)[number];

export function isEditStep(v: string): v is EditStep {
  return (EDIT_STEPS as readonly string[]).includes(v);
}

/** Missing-field codes (program_missing_fields) → label + the step that fixes it. */
export const MISSING_FIELDS: Record<string, { label: string; step: EditStep; stepNo: number }> = {
  cover: { label: "صورة الغلاف", step: "basics", stepNo: 1 },
  summary: { label: "وصف البرنامج", step: "basics", stepNo: 1 },
  category: { label: "التصنيف الرئيسي", step: "basics", stepNo: 1 },
  hours: { label: "إجمالي الساعات", step: "basics", stepNo: 1 },
  objectives: { label: "الأهداف التعليمية", step: "goals", stepNo: 2 },
  units: { label: "محتوى البرنامج", step: "goals", stepNo: 2 },
  price: { label: "السعر المرجعي", step: "pricing", stepNo: 4 },
};

/** Reviewer finding fields → where the trainer fixes them. */
export const FINDING_FIELDS: Record<string, { label: string; step: EditStep }> = {
  title: { label: "اسم البرنامج", step: "basics" },
  summary: { label: "وصف البرنامج", step: "basics" },
  cover: { label: "صورة الغلاف", step: "basics" },
  category: { label: "التصنيف والمهارات", step: "basics" },
  skills: { label: "التصنيف والمهارات", step: "basics" },
  hours: { label: "المستوى والمدة", step: "basics" },
  prerequisites: { label: "المتطلبات المسبقة", step: "goals" },
  objectives: { label: "الأهداف التعليمية", step: "goals" },
  audience: { label: "الجمهور المستهدف", step: "goals" },
  units: { label: "محتوى البرنامج", step: "goals" },
  materials: { label: "المواد", step: "materials" },
  price: { label: "السعر المرجعي", step: "pricing" },
};

export type Finding = { field: string; label: string; note: string };

export function readFindings(raw: unknown): Finding[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => (f && typeof f === "object" ? (f as Record<string, unknown>) : {}))
    .map((f) => {
      const field = typeof f.field === "string" ? f.field : "";
      return {
        field,
        label: typeof f.label === "string" && f.label ? f.label : (FINDING_FIELDS[field]?.label ?? "حقل في البرنامج"),
        note: typeof f.note === "string" ? f.note : "",
      };
    })
    .filter((f) => f.note || f.field);
}

export function missingSummary(missing: string[]): string {
  const labels = missing.map((m) => MISSING_FIELDS[m]?.label ?? m);
  return labels.join(" و");
}

export function fieldsWord(n: number): string {
  return pluralAr(n, ["حقل إلزامي واحد", "حقلان إلزاميان", "حقول إلزامية", "حقلًا إلزاميًا"]);
}

// ── Review timing (3 business days SLA, 14 days to fix) ──────────────────────
export const REVIEW_SLA_DAYS = 3;
export const FIX_WINDOW_DAYS = 14;

/** Business days (Sun–Thu, Saudi week) elapsed since `from`. */
export function businessDaysSince(from: string | Date, now: Date = new Date()): number {
  const start = new Date(from);
  let days = 0;
  const d = new Date(start);
  d.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  while (d < end) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 5 && wd !== 6) days++;
  }
  return days;
}

export function reviewDaysLeft(submittedAt: string, now: Date = new Date()): number {
  return Math.max(0, REVIEW_SLA_DAYS - businessDaysSince(submittedAt, now));
}

export function businessDaysWord(n: number): string {
  if (n <= 0) return "اليوم";
  return pluralAr(n, ["يوم عمل واحد", "يوما عمل", "أيام عمل", "يوم عمل"]);
}

export function fixDaysLeft(decidedAt: string, now: Date = new Date()): number {
  const ms = new Date(decidedAt).getTime() + FIX_WINDOW_DAYS * 86_400_000 - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// ── Courses derived from a program (read-only, courses are owned elsewhere) ──
export type CourseModeKey = Database["public"]["Enums"]["course_mode"];
export type ProgramModeKey = CourseModeKey | "blended";

export function programModeOf(modes: CourseModeKey[]): ProgramModeKey | null {
  const set = Array.from(new Set(modes));
  if (set.length === 0) return null;
  return set.length === 1 ? set[0] : "blended";
}

export const LANGUAGE_LABELS: Record<string, string> = { ar: "العربية", en: "الإنجليزية", ar_en: "العربية والإنجليزية" };

export const ITEM_KIND_LABELS: Record<string, string> = {
  video: "فيديو",
  file: "ملف",
  text: "نص",
  quiz: "اختبار",
  assignment: "واجب",
};

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 1 }).format(bytes / 1024 ** 3)} غ.ب`;
  if (bytes >= 1024 ** 2) return `${new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 0 }).format(bytes / 1024 ** 2)} م.ب`;
  return `${new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 0 }).format(Math.max(1, bytes / 1024))} ك.ب`;
}

export function filesWord(n: number): string {
  if (n === 0) return "٠ ملفات";
  return pluralAr(n, ["ملف واحد", "ملفان", "ملفات", "ملفًا"]);
}
export function lessonsWord(n: number): string {
  if (n === 0) return "٠ دروس";
  return pluralAr(n, ["درس واحد", "درسان", "دروس", "درسًا"]);
}
export function hoursWord(h: number): string {
  if (h === 0) return "٠ ساعات";
  const r = Math.round(h * 10) / 10;
  if (!Number.isInteger(r)) return `${new Intl.NumberFormat("ar-SA-u-nu-arab").format(r)} ساعة`;
  return pluralAr(r, ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"]);
}
export function unitsWord(n: number): string {
  return pluralAr(n, ["محور واحد", "محوران", "محاور", "محورًا"]);
}

/** Upload limits shown in «حدود الرفع» (314:11174); the bucket enforces 500 MB per file. */
export const UPLOAD_LIMITS = {
  videoBytes: 500 * 1024 * 1024,
  docBytes: 50 * 1024 * 1024,
  programBytes: 5 * 1024 ** 3,
  coverBytes: 5 * 1024 * 1024,
};
