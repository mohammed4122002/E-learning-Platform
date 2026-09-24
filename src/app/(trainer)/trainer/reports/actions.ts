"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTrainer } from "@/lib/auth";
import { toArabicError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { APPEAL_BASES, type AppealBasis } from "@/lib/trainer-reports";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";

/* TRR-RPT-01/02 server actions; the rules (one response, 7-day appeal window, one appeal) live in the RPCs. */

const attachment = z.object({ path: z.string().min(3).max(400), name: z.string().min(1).max(200), size: z.number().int().min(0) });
const attachments = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return [];
    try {
      return z.array(attachment).max(5).parse(JSON.parse(v));
    } catch {
      ctx.addIssue({ code: "custom", message: "تعذّر قراءة المرفقات. أعد رفعها." });
      return z.NEVER;
    }
  });

const responseSchema = z.object({
  reportId: z.uuid(),
  intent: z.enum(["reply", "admit"]),
  body: z.string().trim().max(4000, "الرد طويل جدًا (٤٠٠٠ حرف كحد أقصى)"),
  attachments,
});

/** «أرسل ردّي» / «أقرّ بالخطأ وأصحّح الوصف» (282:6532). */
export async function respondToReport(_: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/reports");
  const values = { body: String(fd.get("body") ?? ""), reportId: String(fd.get("reportId") ?? "") };
  const parsed = responseSchema.safeParse({
    reportId: fd.get("reportId"),
    intent: fd.get("intent"),
    body: fd.get("body") ?? "",
    attachments: fd.get("attachments") ?? undefined,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const d = parsed.data;
  if (d.intent === "reply" && d.body.length < 20) return { status: "error", fieldErrors: { body: toArabicError({ code: "response_too_short" }) }, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_report", {
    p_report: d.reportId,
    p_body: d.body,
    p_admit: d.intent === "admit",
    p_attachments: d.attachments,
  });
  if (error) return { status: "error", message: toArabicError(error), values };
  revalidatePath("/trainer/reports");
  const fix = fd.get("fixHref");
  if (d.intent === "admit" && typeof fix === "string" && fix.startsWith("/trainer/")) redirect(fix);
  redirect("/trainer/reports?responded=1");
}

const appealSchema = z.object({
  reportId: z.uuid(),
  basis: z.enum(Object.keys(APPEAL_BASES) as [AppealBasis, ...AppealBasis[]], { error: "اختر أساس تظلّمك" }),
  body: z.string({ error: "اشرح دليلك" }).trim().min(20, "اشرح دليلك بتفصيل أكثر (٢٠ حرفًا على الأقل)").max(4000, "النص طويل جدًا (٤٠٠٠ حرف كحد أقصى)"),
  ack: z.literal("on", { error: "أشّر على الإقرار بأن قرار المراجعة نهائي قبل الإرسال" }),
  attachments,
});

/** «أرسل التظلّم» (310:10595). */
export async function submitAppeal(_: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/reports");
  const values = { basis: String(fd.get("basis") ?? ""), body: String(fd.get("body") ?? "") };
  const parsed = appealSchema.safeParse({
    reportId: fd.get("reportId"),
    basis: fd.get("basis") ?? undefined,
    body: fd.get("body") ?? undefined,
    ack: fd.get("ack") ?? undefined,
    attachments: fd.get("attachments") ?? undefined,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_report_appeal", {
    p_report: d.reportId,
    p_basis: d.basis,
    p_body: d.body,
    p_attachments: d.attachments,
    p_ack: true,
  });
  if (error) return { status: "error", message: toArabicError(error), values };
  revalidatePath("/trainer/reports", "layout");
  redirect("/trainer/reports?appealed=1");
}

/** «أقبل القرار وأعدّل الوصف» → the edit screen of the reported content. */
export async function acceptDecision(_: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/reports");
  const id = z.uuid().safeParse(fd.get("reportId"));
  if (!id.success) return { status: "error", message: toArabicError({ code: "not_found" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_report_decision", { p_report: id.data });
  if (error) return { status: "error", message: toArabicError(error) };
  revalidatePath("/trainer/reports", "layout");
  const fix = fd.get("fixHref");
  redirect(typeof fix === "string" && fix.startsWith("/trainer/") ? fix : "/trainer/reports");
}
