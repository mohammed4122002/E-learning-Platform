import { z } from "zod";
import { DISPUTE_REASONS, MAX_ATTACHMENT_BYTES, REFUND_REASONS, WITHDRAW_REASONS } from "@/lib/trainings";

export { fieldErrorsOf, initialFormState, type FormState } from "@/lib/validation/auth";

const uuid = z.string().uuid("طلب غير صالح. حدّث الصفحة وأعد المحاولة.");
const toLatinDigits = (v: string) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export const withdrawSchema = z.object({
  enrollmentId: uuid,
  reason: z.enum(WITHDRAW_REASONS.map((r) => r.value) as [string, ...string[]], { error: "اختر سبب الانسحاب" }).default("other"),
  details: z.string().trim().max(2000, "التفاصيل طويلة جدًا (٢٠٠٠ حرف كحد أقصى)").optional().default(""),
  acknowledge: z.literal("on", { error: "أكّد أنك تفهم أثر الانسحاب قبل المتابعة" }),
});

export const refundSchema = z.object({
  enrollmentId: uuid,
  reason: z.enum(REFUND_REASONS.map((r) => r.value) as [string, ...string[]], { error: "اختر سبب طلب الاسترداد" }),
  details: z.string().trim().max(2000, "التفاصيل طويلة جدًا (٢٠٠٠ حرف كحد أقصى)").optional().default(""),
  acknowledge: z.literal("on", { error: "أكّد أنك تفهم نتيجة الاسترداد قبل الإرسال" }),
});

export const disputeSchema = z.object({
  paymentId: uuid,
  reason: z.enum(DISPUTE_REASONS.map((r) => r.value) as [string, ...string[]], { error: "اختر السبب الأقرب لنزاعك" }),
  details: z
    .string({ error: "اشرح سبب النزاع" })
    .trim()
    .min(20, "اشرح سبب النزاع في ٢٠ حرفًا على الأقل")
    .max(4000, "الشرح طويل جدًا (٤٠٠٠ حرف كحد أقصى)"),
  acknowledge: z.literal("on", { error: "أقرّ بصحة المعلومات قبل الإرسال" }),
});

export const attachmentSchema = z.object({
  disputeId: uuid,
  path: z.string().min(40).max(500),
  name: z.string().trim().min(1).max(200),
  size: z.coerce.number().int().positive().max(MAX_ATTACHMENT_BYTES, "حجم الملف يتجاوز ١٠ ميجابايت"),
});

export const checkInSchema = z.object({
  enrollmentId: uuid,
  code: z
    .string({ error: "أدخل رمز الحضور" })
    .transform((v) => toLatinDigits(v).trim().toUpperCase())
    .refine((v) => /^[A-Z0-9_-]{4,64}$/.test(v), "أدخل الرمز كما يظهر أمامك (حروف لاتينية وأرقام)"),
});

export const idSchema = uuid;
