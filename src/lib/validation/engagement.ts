import { z } from "zod";

/*
 * Zod schemas (Arabic messages) for certificates, ratings, inquiries and reports.
 * Form state + helpers are shared with the auth forms (src/lib/validation/auth.ts).
 */
export { fieldErrorsOf, initialFormState, type FormState } from "@/lib/validation/auth";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "اختر تاريخًا صحيحًا");

/** TRN-CRT-03 · بيانات الشهادة الخارجية */
export const externalCertificateSchema = z
  .object({
    id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    title: z.string({ error: "أدخل اسم الشهادة" }).trim().min(2, "أدخل اسم الشهادة (حرفان على الأقل)").max(200, "اسم الشهادة طويل جدًا"),
    issuer: z.string({ error: "أدخل الجهة المصدرة" }).trim().min(2, "أدخل الجهة المصدرة").max(200, "اسم الجهة طويل جدًا"),
    issuedOn: isoDate.refine((v) => new Date(v) <= new Date(), "تاريخ الإصدار لا يمكن أن يكون في المستقبل"),
    expiresOn: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .transform((v) => v ?? null)
      .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "اختر تاريخًا صحيحًا"),
    serialNumber: optionalText(100, "الرقم التسلسلي طويل جدًا"),
    credentialUrl: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : /^https?:\/\//i.test(v) ? v : `https://${v}`))
      .nullable()
      .optional()
      .transform((v) => v ?? null)
      .refine((v) => v === null || z.url({ protocol: /^https?$/ }).safeParse(v).success, "أدخل رابطًا صحيحًا، مثل pmi.org/verify/123"),
    field: optionalText(120, "المجال طويل جدًا"),
    filePath: optionalText(400, "مسار الملف غير صالح"),
  })
  .refine((d) => d.expiresOn === null || d.expiresOn >= d.issuedOn, { path: ["expiresOn"], message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار" });

/** TRN-RTG-01 · تقييم الدورة (BR-R3 axes). */
const score = (label: string) =>
  z.coerce
    .number({ error: `قيّم ${label} من ١ إلى ٥ نجوم` })
    .int(`قيّم ${label} من ١ إلى ٥ نجوم`)
    .min(1, `قيّم ${label} من ١ إلى ٥ نجوم`)
    .max(5, `قيّم ${label} من ١ إلى ٥ نجوم`);

export const RATING_TAGS = ["محتوى تطبيقي", "شرح واضح", "مواد مفيدة", "وتيرة مناسبة", "يحتاج أمثلة أكثر"] as const;

export const ratingSchema = z.object({
  enrollment: z.uuid("تسجيل غير صالح"),
  content: score("المحتوى"),
  trainer: score("أداء المدرب"),
  organization: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 5), "قيّم التنظيم من ١ إلى ٥ نجوم"),
  comment: optionalText(1800, "التعليق طويل جدًا (١٨٠٠ حرف كحد أقصى)"),
  tags: z.array(z.enum(RATING_TAGS)).max(RATING_TAGS.length).default([]),
  consent: z.literal("on", { error: "وافق على نشر تقييمك باسمك لإرساله" }),
});

/** TRN-INQ-01 · استفسار قبل التسجيل */
export const INQUIRY_TOPICS = {
  content: "محتوى البرنامج",
  prerequisites: "المتطلبات المسبقة",
  schedule: "المواعيد والمكان",
  price: "السعر والدفع",
  certificate: "الشهادة",
} as const;
export type InquiryTopic = keyof typeof INQUIRY_TOPICS | "other";

export const inquirySchema = z.object({
  course: z.uuid("اختر البرنامج الذي تسأل عنه"),
  topic: z.enum(["content", "prerequisites", "schedule", "price", "certificate", "other"], { error: "اختر موضوع سؤالك" }),
  question: z
    .string({ error: "اكتب سؤالك" })
    .trim()
    .min(10, "اكتب سؤالك بتفصيل أكثر (١٠ أحرف على الأقل)")
    .max(2000, "السؤال طويل جدًا (٢٠٠٠ حرف كحد أقصى)")
    .refine((v) => !/\b(?:\d[ -]?){13,19}\b/.test(v), "لا تُشارك أرقام بطاقات أو أرقامًا وطنية في السؤال"),
});

/** TRN-RPT-01 · الإبلاغ عن مخالفة */
export const REPORT_TARGETS = {
  course: { label: "برنامج أو دورة", hint: "محتوى مضلّل أو مخالف" },
  trainer: { label: "مدرب", hint: "سلوك أو مؤهلات مشكوك فيها" },
  organization: { label: "جهة تدريبية", hint: "ممارسة مخالفة" },
  review: { label: "تقييم أو تعليق", hint: "مسيء أو مزيّف" },
} as const;
export type ReportTarget = keyof typeof REPORT_TARGETS;

export const REPORT_REASONS = {
  misleading: "وصف مضلّل للبرنامج",
  inappropriate: "محتوى مخالف أو مسيء",
  false_accreditation: "ادّعاء اعتماد غير صحيح",
  unprofessional: "سلوك غير مهني",
  false_trainer_info: "بيانات مدرب غير صحيحة",
  fake_reviews: "تقييمات مزيّفة",
  other: "سبب آخر",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;

export const reportSchema = z.object({
  type: z.enum(["course", "trainer", "organization", "review"], { error: "اختر ما تُبلّغ عنه" }),
  target: z.uuid("اختر العنصر المُبلَّغ عنه"),
  reason: z.enum(Object.keys(REPORT_REASONS) as [ReportReason, ...ReportReason[]], { error: "اختر سبب البلاغ" }),
  details: z.string({ error: "صف المخالفة" }).trim().min(20, "صف المخالفة بتفصيل أكثر (٢٠ حرفًا على الأقل)").max(2000, "التفاصيل طويلة جدًا"),
  confirm: z.literal("on", { error: "أقرّ بصحة ما ورد في البلاغ لإرساله" }),
  evidencePath: optionalText(400, "مسار الملف غير صالح"),
});
