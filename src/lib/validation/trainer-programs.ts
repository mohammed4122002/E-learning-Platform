import { z } from "zod";
import { asciiDigits } from "@/lib/validation/profile";

/* TRR-PRG-02 / TRR-PRG-07 form schemas (Arabic messages). */

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => (v.length ? v : null));

const stringList = (maxItems: number, maxLen: number, message: string) =>
  z
    .string()
    .default("[]")
    .transform((raw, ctx) => {
      try {
        const v = JSON.parse(raw) as unknown;
        if (!Array.isArray(v)) throw new Error();
        const list = Array.from(new Set(v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean)));
        if (list.length > maxItems || list.some((x) => x.length > maxLen)) {
          ctx.addIssue({ code: "custom", message });
          return z.NEVER;
        }
        return list;
      } catch {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
    });

const numberText = (message: string) =>
  z
    .string()
    .trim()
    .transform((v) => asciiDigits(v).replace(/[٬,\s]/g, "").replace("٫", "."))
    .refine((v) => v === "" || /^\d+(\.\d+)?$/.test(v), message)
    .transform((v) => (v === "" ? null : Number(v)));

export const intentField = z.enum(["next", "later", "stay"]).default("next");

export const basicsSchema = z.object({
  title: z.string({ error: "أدخل اسم البرنامج" }).trim().min(3, "أدخل اسم البرنامج (٣ أحرف على الأقل)").max(200, "الاسم لا يتجاوز ٢٠٠ حرف"),
  summary: optionalText(2000, "الوصف لا يتجاوز ٢٠٠٠ حرف").refine((v) => v === null || v.length >= 20, "اكتب وصفًا أوضح (٢٠ حرفًا على الأقل)"),
  categoryId: z
    .string()
    .trim()
    .transform((v) => (v.length ? v : null))
    .refine((v) => v === null || /^[0-9a-f-]{36}$/i.test(v), "اختر تصنيفًا من القائمة"),
  skills: stringList(15, 60, "المهارات حتى ١٥ مهارة، وكل مهارة لا تتجاوز ٦٠ حرفًا"),
  level: z.enum(["beginner", "intermediate", "advanced"], { error: "اختر المستوى" }),
  hours: numberText("أدخل عدد الساعات بالأرقام").refine((v) => v === null || (v > 0 && v <= 2000), "الساعات بين ١ و٢٠٠٠"),
  language: z.enum(["ar", "en", "ar_en"]).default("ar"),
  prerequisites: optionalText(1500, "المتطلبات لا تتجاوز ١٥٠٠ حرف"),
  coverPath: z
    .string()
    .trim()
    .transform((v) => (v.length ? v : null))
    .refine((v) => v === null || /^(\/assets\/images\/[\w-]+\.jpg|[0-9a-f-]{36}\/programs\/[\w./-]+)$/i.test(v), "صورة الغلاف غير صالحة"),
  intent: intentField,
});

export const goalsSchema = z.object({
  objectives: stringList(12, 240, "حتى ١٢ هدفًا، وكل هدف لا يتجاوز ٢٤٠ حرفًا"),
  audience: stringList(12, 60, "حتى ١٢ فئة، وكل فئة لا تتجاوز ٦٠ حرفًا"),
  prerequisites: optionalText(1500, "المتطلبات لا تتجاوز ١٥٠٠ حرف"),
  intent: intentField,
});

export const pricingSchema = z.object({
  price: numberText("أدخل السعر بالأرقام").refine((v) => v !== null, "أدخل السعر المرجعي للمتدرب الواحد").refine((v) => v === null || v <= 1_000_000, "السعر أعلى من المسموح"),
  intent: intentField,
});

export const unitSchema = z.object({
  programId: z.uuid(),
  unitId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  kind: z.enum(["module", "chapter"]).default("module"),
  title: z.string({ error: "أدخل العنوان" }).trim().min(2, "أدخل العنوان (حرفان على الأقل)").max(160, "العنوان لا يتجاوز ١٦٠ حرفًا"),
  summary: optionalText(600, "الوصف لا يتجاوز ٦٠٠ حرف"),
  /** "start" | "end" | "after:<unit id>" */
  place: z.string().trim().default("end"),
});

export const itemSchema = z.object({
  programId: z.uuid(),
  unitId: z.uuid({ error: "اختر المحور" }),
  itemId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  kind: z.enum(["video", "file", "text", "quiz", "assignment"], { error: "اختر نوع الدرس" }),
  title: z.string({ error: "أدخل العنوان" }).trim().min(2, "أدخل العنوان (حرفان على الأقل)").max(160, "العنوان لا يتجاوز ١٦٠ حرفًا"),
  summary: optionalText(600, "الوصف لا يتجاوز ٦٠٠ حرف"),
  minutes: numberText("أدخل المدة بالدقائق").refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 1440), "المدة بين ١ و١٤٤٠ دقيقة"),
  maxScore: numberText("أدخل الدرجة بالأرقام").refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 1000), "الدرجة بين ١ و١٠٠٠"),
  weight: numberText("أدخل الوزن بالأرقام").refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 100), "الوزن بين ١٪ و١٠٠٪"),
  dueNote: optionalText(160, "موعد التسليم لا يتجاوز ١٦٠ حرفًا"),
});

export const cloneSchema = z.object({
  sourceId: z.uuid(),
  title: z.string({ error: "أدخل اسم النسخة" }).trim().min(3, "أدخل اسم النسخة (٣ أحرف على الأقل)").max(200, "الاسم لا يتجاوز ٢٠٠ حرف"),
  objectives: z.preprocess((v) => v === "on", z.boolean()),
  units: z.preprocess((v) => v === "on", z.boolean()),
  assignments: z.preprocess((v) => v === "on", z.boolean()),
  materials: z.preprocess((v) => v === "on", z.boolean()),
});

export const DECLARATION_CLAUSES = ["content_ownership", "accuracy", "credentials", "delivery"] as const;
