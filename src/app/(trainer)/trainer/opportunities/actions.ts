"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import type { FormState } from "@/lib/validation/auth";
import { parseAmount } from "@/lib/trainer-bids";

const bidSchema = z.object({
  requestId: z.uuid(),
  programId: z.string().optional(),
  price: z.string().optional(),
  hours: z.string().optional(),
  message: z.string().max(4000, "الرسالة أطول من ٤٠٠٠ حرف.").optional(),
  attachmentPath: z.string().max(500).optional(),
  attachmentName: z.string().max(200).optional(),
  commit: z.string().optional(),
  intent: z.enum(["submit", "draft"]),
});

/** TRR-BID-02 · «أرسل العرض» / «احفظ كمسودة» — executed by save_training_bid (open request, own published program). */
export async function saveBid(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = bidSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: toArabicError({ code: "invalid_input" }) };
  const d = parsed.data;
  const values = {
    programId: d.programId ?? "",
    price: d.price ?? "",
    hours: d.hours ?? "",
    message: d.message ?? "",
    attachmentPath: d.attachmentPath ?? "",
    attachmentName: d.attachmentName ?? "",
  };
  const submit = d.intent === "submit";
  const price = parseAmount(d.price);
  const hours = parseAmount(d.hours);
  const fieldErrors: Record<string, string> = {};
  if (d.price && (!Number.isFinite(price) || price <= 0)) fieldErrors.price = "اكتب سعرًا صحيحًا بالريال.";
  if (d.hours && (!Number.isFinite(hours) || hours <= 0 || hours > 500)) fieldErrors.hours = "اكتب عدد ساعات بين ١ و٥٠٠.";
  if (submit) {
    if (!d.programId) fieldErrors.programId = "اختر البرنامج الذي ستقدّمه.";
    if (!d.price) fieldErrors.price = "اكتب سعرك للورشة كاملة.";
    if (!d.hours) fieldErrors.hours = "اكتب عدد الساعات.";
    if ((d.message ?? "").trim().length < 20) fieldErrors.message = "اشرح في ٢٠ حرفًا على الأقل لماذا أنت المناسب.";
  }
  if (Object.keys(fieldErrors).length) return { status: "error", fieldErrors, values };
  if (d.attachmentPath && !d.attachmentPath.toLowerCase().endsWith(".pdf")) return { status: "error", message: toArabicError({ code: "invalid_input" }), values };

  const supabase = await createClient();
  const { data: bidId, error } = await supabase.rpc("save_training_bid", {
    p_request: d.requestId,
    p_program: (d.programId || null) as string,
    p_price: (d.price ? price : null) as number,
    p_hours: (d.hours ? hours : null) as number,
    p_message: d.message ?? "",
    p_attachment_path: (d.attachmentPath || null) as string,
    p_attachment_name: (d.attachmentName || null) as string,
    p_commit: d.commit === "on",
    p_submit: submit,
  });
  if (error) return { status: "error", message: toArabicError(error), values };

  revalidatePath("/trainer", "layout");
  if (submit) redirect(`/trainer/bids?sent=${bidId}`);
  return { status: "success", message: "حُفظ عرضك كمسودة — تجده هنا حين تعود، ولا يصل للجهة قبل الإرسال.", values };
}
