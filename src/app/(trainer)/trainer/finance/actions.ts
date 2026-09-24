"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { ibanBankCode, isValidSaudiIban, normalizeIban } from "@/lib/trainer-finance";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";

/* TRR-FIN-03 / TRR-FIN-04 writes. Every rule (IBAN checksum, bank code, 48-hour hold, minimum, available balance,
 * one request at a time) is enforced again by the RPCs (migration 20260924141000); these checks only give inline
 * messages before the round trip. */

const bankSchema = z
  .object({
    iban: z.string().trim().min(1, "اكتب رقم الآيبان"),
    bank: z.string().regex(/^\d{2}$/, "اختر البنك"),
    document: z.string().min(1, "ارفع شهادة الآيبان"),
  })
  .superRefine((v, ctx) => {
    if (!isValidSaudiIban(v.iban)) {
      ctx.addIssue({ code: "custom", path: ["iban"], message: "رقم الآيبان غير صحيح — يبدأ بـ SA ويتكوّن من ٢٤ خانة." });
    } else if (/^\d{2}$/.test(v.bank) && ibanBankCode(v.iban) !== v.bank) {
      ctx.addIssue({ code: "custom", path: ["bank"], message: "البنك المختار لا يطابق رقم الآيبان." });
    }
  });

export async function submitBankAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = { iban: String(formData.get("iban") ?? ""), bank: String(formData.get("bank") ?? ""), document: String(formData.get("document") ?? "") };
  const parsed = bankSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: raw };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_bank_account", {
    p_iban: normalizeIban(parsed.data.iban),
    p_bank_code: parsed.data.bank,
    p_document_path: parsed.data.document,
  });
  if (error) return { status: "error", message: toArabicError(error), values: raw };
  revalidatePath("/trainer/finance", "layout");
  revalidatePath("/trainer");
  return { status: "success", message: "أرسلنا حسابك للتحقق. يصلك إشعار عند اكتماله." };
}

export async function cancelBankChange(accountId: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(accountId).success) return { error: toArabicError({ message: "invalid_input" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_bank_account_change", { p_account: accountId });
  if (error) return { error: toArabicError(error) };
  revalidatePath("/trainer/finance", "layout");
  revalidatePath("/trainer");
  return {};
}

const amountSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[٬,\s]/g, "").replace("٫", "."))
  .refine((s) => /^\d+(\.\d{1,2})?$/.test(s), "اكتب مبلغًا صحيحًا بحد أقصى خانتين عشريتين.");

export async function requestWithdrawal(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = { amount: String(formData.get("amount") ?? ""), confirm: String(formData.get("confirm") ?? "") };
  const parsed = amountSchema.safeParse(raw.amount);
  if (!parsed.success) return { status: "error", fieldErrors: { amount: parsed.error.issues[0].message }, values: raw };
  if (raw.confirm !== "on") return { status: "error", fieldErrors: { confirm: "أكّد صحة بيانات الحساب البنكي أولًا." }, values: raw };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_withdrawal", { p_amount: Number(parsed.data) });
  if (error) return { status: "error", message: toArabicError(error), values: raw };
  revalidatePath("/trainer/finance", "layout");
  revalidatePath("/trainer");
  redirect(`/trainer/finance/withdraw?w=${data}`);
}

export async function cancelWithdrawal(withdrawalId: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(withdrawalId).success) return { error: toArabicError({ message: "invalid_input" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_withdrawal", { p_withdrawal: withdrawalId });
  if (error) return { error: toArabicError(error) };
  revalidatePath("/trainer/finance", "layout");
  revalidatePath("/trainer");
  return {};
}
