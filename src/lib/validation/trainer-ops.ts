import { z } from "zod";

/* Zod schemas of the trainer course-operation forms (TRR-CRS-03/04/05/11, TRR-ATT, TRR-RES, TRR-CRT, TRR-RTG). */

const uuid = z.string().uuid("طلب غير صالح. حدّث الصفحة وأعد المحاولة.");
export const toLatinDigits = (v: string) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export const POSTPONE_REASONS = [
  { value: "schedule_conflict", label: "تعارض في جدولي" },
  { value: "trainee_request", label: "طلب من المسجّلين" },
  { value: "venue_not_ready", label: "عدم جاهزية القاعة" },
  { value: "other", label: "سبب آخر" },
] as const;

export const CANCEL_REASONS = [
  { value: "low_enrollment", label: "عدد المسجّلين غير كافٍ" },
  { value: "trainer_emergency", label: "ظرف طارئ للمدرب" },
  { value: "venue_unavailable", label: "عدم توفر القاعة" },
  { value: "provider_request", label: "طلب من الجهة" },
  { value: "other", label: "سبب آخر" },
] as const;

export const REVIEW_REASONS = [
  { value: "abusive", label: "لغة مسيئة أو شتائم", hint: "يخالف شروط النشر صراحةً" },
  { value: "not_attended", label: "من شخص لم يحضر الدورة", hint: "لم يسجّل أو انسحب قبل البدء" },
  { value: "private_data", label: "يكشف بيانات خاصة", hint: "أسماء متدربين أو معلومات شخصية" },
  { value: "duplicate", label: "تقييم مكرر أو كيدي", hint: "عدة تقييمات من الشخص نفسه" },
] as const;

const message = z
  .string({ error: "اكتب رسالتك للمتدربين" })
  .trim()
  .min(10, "اكتب رسالة من ١٠ أحرف على الأقل تشرح السبب")
  .max(2000, "الرسالة طويلة جدًا (٢٠٠٠ حرف كحد أقصى)");

const isoDate = z
  .string({ error: "اختر التاريخ" })
  .transform((v) => toLatinDigits(v).trim())
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "اختر التاريخ");

export const postponeSchema = z
  .object({
    courseId: uuid,
    startsOn: isoDate,
    endsOn: isoDate,
    reason: z.enum(POSTPONE_REASONS.map((r) => r.value) as [string, ...string[]], { error: "اختر سبب التأجيل" }),
    message,
    acknowledge: z.literal("on", { error: "أكّد أنك تفهم أثر التأجيل على المتدربين" }),
  })
  .refine((v) => v.endsOn >= v.startsOn, { path: ["endsOn"], message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" });

export const cancelSchema = z.object({
  courseId: uuid,
  reason: z.enum(CANCEL_REASONS.map((r) => r.value) as [string, ...string[]], { error: "اختر سبب الإلغاء" }),
  message,
  acknowledge: z.literal("on", { error: "أكّد أنك تفهم أن الإلغاء نهائي" }),
});

export const capacitySchema = z.object({
  courseId: uuid,
  capacity: z.coerce.number({ error: "أدخل عدد المقاعد" }).int("أدخل رقمًا صحيحًا").min(1, "أدخل رقمًا أكبر من صفر").max(1000, "الحد الأقصى ١٠٠٠ مقعد"),
});

export const broadcastSchema = z.object({
  courseId: uuid,
  audience: z.enum(["enrolled", "waitlist", "selected"]),
  body: z.string({ error: "اكتب رسالتك" }).trim().min(5, "اكتب رسالة من ٥ أحرف على الأقل").max(1000, "الرسالة طويلة جدًا (١٠٠٠ حرف كحد أقصى)"),
  trainees: z.array(uuid).optional(),
});

export const attendanceSchema = z.object({
  sessionId: uuid,
  marks: z.record(uuid, z.enum(["present", "late", "excused", "absent"])),
  approve: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export const unlockSchema = z.object({
  sessionId: uuid,
  reason: z.string({ error: "اكتب سبب الطلب" }).trim().min(10, "اشرح السبب في ١٠ أحرف على الأقل").max(1000, "السبب طويل جدًا"),
});

export const gradeSchema = z.object({
  submissionId: uuid,
  scores: z.record(z.string().min(1).max(40), z.number().min(0)),
  feedback: z.string().trim().max(4000, "الملاحظات طويلة جدًا (٤٠٠٠ حرف كحد أقصى)").optional().default(""),
  flag: z.boolean(),
});

export const replySchema = z.object({
  ratingId: uuid,
  body: z.string().trim().max(1500, "الرد طويل جدًا (١٥٠٠ حرف كحد أقصى)").optional().default(""),
  action: z.enum(["draft", "publish", "skip"]),
});

export const reviewSchema = z.object({
  ratingId: uuid,
  reason: z.enum(REVIEW_REASONS.map((r) => r.value) as [string, ...string[]], { error: "اختر سبب الطلب" }),
  details: z
    .string({ error: "اشرح طلبك" })
    .trim()
    .min(20, "اذكر الوقائع في ٢٠ حرفًا على الأقل")
    .max(2000, "الشرح طويل جدًا (٢٠٠٠ حرف كحد أقصى)"),
  evidencePath: z.string().max(400).optional(),
  acknowledge: z.literal("on", { error: "أقرّ بأن طلبك مبني على مخالفة فعلية" }),
});
