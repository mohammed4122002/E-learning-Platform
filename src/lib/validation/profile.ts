import { z } from "zod";

/** Arabic-Indic → ASCII digits and trimmed text; empty strings become null for optional columns. */
export const asciiDigits = (v: string) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => (v.length ? v : null));

export const phoneField = z
  .string()
  .trim()
  .transform((v) => asciiDigits(v).replace(/[\s-]/g, ""))
  .refine((v) => v === "" || /^\+?[0-9]{8,15}$/.test(v), "أدخل رقم هاتف صحيحًا (٨–١٥ رقمًا)")
  .transform((v) => (v.length ? v : null));

export const fullNameField = z
  .string({ error: "أدخل اسمك الكامل" })
  .trim()
  .min(3, "أدخل اسمك الكامل (٣ أحرف على الأقل)")
  .max(120, "الاسم طويل جدًا");

/** TRN-PRF-02 · تحرير ملفي المهني */
export const profileSchema = z.object({
  fullName: fullNameField.optional(),
  headline: optionalText(160, "العنوان المهني لا يتجاوز ١٦٠ حرفًا"),
  bio: optionalText(2000, "النبذة لا تتجاوز ٢٠٠٠ حرف"),
  city: optionalText(80, "اسم المدينة طويل جدًا"),
  phone: phoneField,
  intent: z.enum(["save", "preview"]).default("save"),
});

const monthField = (label: string) =>
  z
    .string({ error: `أدخل ${label}` })
    .trim()
    .regex(/^\d{4}-\d{2}$/, `أدخل ${label} بصيغة شهر وسنة`);

/** TRN-PRF-04 · الخبرات المهنية */
export const experienceSchema = z
  .object({
    id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    title: z.string({ error: "أدخل المسمى الوظيفي" }).trim().min(2, "أدخل المسمى الوظيفي (حرفان على الأقل)").max(160, "المسمى طويل جدًا"),
    organization: z.string({ error: "أدخل اسم الجهة" }).trim().min(2, "أدخل اسم الجهة (حرفان على الأقل)").max(160, "اسم الجهة طويل جدًا"),
    startMonth: monthField("تاريخ البداية"),
    endMonth: z.string().trim().optional(),
    isCurrent: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    description: optionalText(2000, "الوصف لا يتجاوز ٢٠٠٠ حرف"),
  })
  .superRefine((d, ctx) => {
    const today = new Date().toISOString().slice(0, 7);
    if (d.startMonth > today) ctx.addIssue({ code: "custom", path: ["startMonth"], message: "تاريخ البداية لا يكون في المستقبل" });
    if (!d.isCurrent) {
      if (!d.endMonth || !/^\d{4}-\d{2}$/.test(d.endMonth)) {
        ctx.addIssue({ code: "custom", path: ["endMonth"], message: "أدخل تاريخ النهاية أو اختر «ما زلت أعمل هنا»" });
      } else if (d.endMonth < d.startMonth) {
        ctx.addIssue({ code: "custom", path: ["endMonth"], message: "تاريخ النهاية بعد تاريخ البداية" });
      }
    }
  });

/** TRN-VER-01 */
export const verificationSchema = z.object({
  documentType: z.enum(["national_id", "iqama", "passport"], { error: "اختر نوع الهوية" }),
  last4: z
    .string()
    .trim()
    .transform((v) => asciiDigits(v).toUpperCase())
    .refine((v) => v === "" || /^[0-9A-Z]{4}$/.test(v), "أدخل آخر ٤ خانات من رقم المستند")
    .transform((v) => (v.length ? v : null)),
  frontPath: z.string().min(1, "ارفع صورة المستند أولًا"),
  backPath: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  consent: z.literal("on", { error: "أقرّ بأن المستند يخصّك قبل الإرسال" }),
});

/** GEN-ACC-01 · ١ الحساب واللغة */
export const accountSchema = z.object({
  fullName: fullNameField.optional(),
  phone: phoneField,
  email: z.string().trim().toLowerCase().email("تحقق من صيغة البريد الإلكتروني").max(254),
});

export const localeSchema = z.object({
  locale: z.enum(["ar", "en"]),
  timezone: z.enum(["Asia/Riyadh", "Asia/Muscat", "Asia/Dubai", "Asia/Kuwait", "Asia/Qatar", "Asia/Bahrain", "Africa/Cairo", "Asia/Amman"]),
  arabicDigits: z.boolean(),
});

/** GEN-MSG-01/02 */
export const messageSchema = z.object({
  conversationId: z.uuid(),
  body: z.string().trim().min(1, "اكتب رسالتك أولًا").max(4000, "الرسالة طويلة جدًا (٤٠٠٠ حرف كحد أقصى)"),
  attachmentPath: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
});

export const newConversationSchema = z.object({
  courseId: z.uuid({ error: "اختر الدورة" }),
  subject: z.string().trim().max(200, "الموضوع طويل جدًا").optional(),
  body: z.string().trim().min(2, "اكتب رسالتك أولًا").max(4000, "الرسالة طويلة جدًا (٤٠٠٠ حرف كحد أقصى)"),
});

export const reportSchema = z.object({
  conversationId: z.uuid(),
  reason: z.enum(["misleading", "inappropriate", "fraud", "harassment", "copyright", "other"], { error: "اختر سبب البلاغ" }),
  details: z.string().trim().max(2000, "التفاصيل طويلة جدًا").optional(),
});

/** PUB-VRF: 12 hex characters (printed with optional dashes / "CRT" prefix). */
export function normalizeCertificateCode(input: string): string {
  return asciiDigits(input)
    .toUpperCase()
    .replace(/^CRT/, "")
    .replace(/[\s\-–_]/g, "");
}
export const isCertificateCode = (code: string) => /^[0-9A-F]{12}$/.test(code);
