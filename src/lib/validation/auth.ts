import { z } from "zod";

/** PUB-AUT-01 / PUB-AUT-04 password rules: 8+ chars, upper + lower case, a digit. */
export const passwordRules = [
  { id: "length", label: "٨ أحرف على الأقل", test: (v: string) => v.length >= 8 },
  { id: "case", label: "حرف كبير وحرف صغير", test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: "digit", label: "رقم واحد على الأقل", test: (v: string) => /[0-9٠-٩]/.test(v) },
] as const;

const email = z
  .string({ error: "أدخل بريدك الإلكتروني" })
  .trim()
  .min(1, "أدخل بريدك الإلكتروني")
  .max(254, "البريد الإلكتروني طويل جدًا")
  .email("تحقق من صيغة البريد الإلكتروني")
  .transform((v) => v.toLowerCase());

const newPassword = z
  .string({ error: "أدخل كلمة المرور" })
  .max(72, "كلمة المرور طويلة جدًا")
  .refine((v) => passwordRules.every((r) => r.test(v)), "٨ أحرف على الأقل، وتتضمن رقمًا وحرفًا كبيرًا وحرفًا صغيرًا.");

export const loginSchema = z.object({
  email,
  password: z.string({ error: "أدخل كلمة المرور" }).min(1, "أدخل كلمة المرور"),
  remember: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export const registerSchema = z
  .object({
    fullName: z.string({ error: "أدخل اسمك الكامل" }).trim().min(3, "أدخل اسمك الكامل (٣ أحرف على الأقل)").max(120, "الاسم طويل جدًا"),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[\s-]/g, ""))
      .refine((v) => /^\+?[0-9]{8,15}$/.test(v), "أدخل رقم هاتف صحيحًا (٨–١٥ رقمًا)"),
    email,
    password: newPassword,
    confirmPassword: z.string(),
    terms: z.literal("on", { error: "يجب الموافقة على الشروط والأحكام وسياسة الخصوصية" }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "كلمتا المرور غير متطابقتين" });

export const emailSchema = z.object({ email });

export const otpSchema = z.object({
  email,
  token: z
    .string()
    .transform((v) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, ""))
    .refine((v) => v.length === 6, "أدخل الرمز المكوّن من ٦ أرقام"),
});

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "كلمتا المرور غير متطابقتين" });

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

/** First error per field, for inline messages. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
