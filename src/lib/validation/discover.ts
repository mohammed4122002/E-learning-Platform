import { z } from "zod";

/** Server-action inputs for TRN-DSC-01..03 (Arabic messages, shown inline). */
export const courseIdSchema = z.string({ error: "الدورة غير محددة" }).uuid("الدورة غير صالحة");

export const programSlugSchema = z.string().regex(/^[a-z0-9-]{2,120}$/, "البرنامج غير صالح");

export const suggestSchema = z.string().trim().max(120, "عبارة البحث طويلة جدًا");

export const INQUIRY_TOPICS = {
  content: "محتوى البرنامج",
  schedule: "المواعيد والمكان",
  price: "السعر والدفع",
  certificate: "الشهادة",
  other: "أخرى",
} as const;

export const inquirySchema = z.object({
  courseId: courseIdSchema,
  topic: z.enum(Object.keys(INQUIRY_TOPICS) as [keyof typeof INQUIRY_TOPICS, ...(keyof typeof INQUIRY_TOPICS)[]], { error: "اختر موضوع الاستفسار" }),
  question: z
    .string({ error: "اكتب سؤالك" })
    .trim()
    .min(10, "اكتب سؤالك بعشرة أحرف على الأقل")
    .max(2000, "السؤال طويل جدًا (٢٠٠٠ حرف كحد أقصى)"),
});
