"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { getReportTarget } from "@/lib/data/support";
import { fieldErrorsOf, reportSchema, type FormState } from "@/lib/validation/engagement";

/** TRN-RPT-01 · «أرسل البلاغ» → owner insert into `violation_reports` (RLS reports_insert: own row, status open). */
export async function submitReport(_: FormState, formData: FormData): Promise<FormState> {
  const kept = { reason: String(formData.get("reason") ?? ""), details: String(formData.get("details") ?? "") };
  const parsed = reportSchema.safeParse({
    type: formData.get("type") ?? undefined,
    target: formData.get("target") ?? undefined,
    reason: formData.get("reason") ?? undefined,
    details: formData.get("details") ?? "",
    confirm: formData.get("confirm") ?? undefined,
    evidencePath: String(formData.get("evidencePath") ?? ""),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: kept };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }), values: kept };
  if (d.evidencePath && !d.evidencePath.startsWith(`${uid}/`)) return { status: "error", message: toArabicError({ code: "forbidden" }), values: kept };

  const target = await getReportTarget(uid, d.type, d.target);
  if (!target) return { status: "error", message: toArabicError({ code: "not_found" }), values: kept };

  const { data, error } = await supabase
    .from("violation_reports")
    .insert({ reporter_id: uid, target_type: d.type, target_id: d.target, reason: d.reason, details: d.details, evidence_path: d.evidencePath, status: "open" })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: toArabicError(error), values: kept };

  revalidatePath("/trainee/help");
  redirect(`/trainee/report?sent=${data.id}`);
}

/** «اسحب البلاغ» → RPC withdraw_violation_report (only while the report is still open). */
export async function withdrawReport(id: string): Promise<{ ok: boolean; message?: string }> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_violation_report", { p_report: id });
  if (error) return { ok: false, message: toArabicError(error) };
  revalidatePath("/trainee/report");
  revalidatePath("/trainee/help");
  return { ok: true };
}
