"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { externalCertificateSchema, fieldErrorsOf, type FormState } from "@/lib/validation/engagement";

const KEYS = ["title", "issuer", "issuedOn", "expiresOn", "serialNumber", "credentialUrl", "field", "filePath"] as const;

/**
 * TRN-CRT-03 · «أرسل للمراجعة». Inserts a new external certificate, or re-submits one that is pending or
 * needs changes (RLS: owner only, status pending/needs_changes → pending, reviewer note cleared).
 */
export async function submitExternalCertificate(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(KEYS.map((k) => [k, String(formData.get(k) ?? "")]));
  const kept = raw as Record<string, string>;
  const parsed = externalCertificateSchema.safeParse({ ...raw, id: String(formData.get("id") ?? "") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: kept };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }), values: kept };
  const d = parsed.data;
  if (d.filePath && !d.filePath.startsWith(`${uid}/`)) return { status: "error", message: toArabicError({ code: "forbidden" }), values: kept };

  const row = {
    title: d.title,
    issuer: d.issuer,
    issued_on: d.issuedOn,
    expires_on: d.expiresOn,
    serial_number: d.serialNumber,
    credential_url: d.credentialUrl,
    field: d.field,
    file_path: d.filePath,
    status: "pending" as const,
    reviewer_note: null,
  };

  let id = d.id;
  if (id) {
    const { data: current } = await supabase.from("external_certificates").select("file_path, status").eq("id", id).eq("trainee_id", uid).maybeSingle();
    if (!current) return { status: "error", message: toArabicError({ code: "not_found" }), values: kept };
    if (!["pending", "needs_changes"].includes(current.status)) return { status: "error", message: toArabicError({ code: "invalid_state" }), values: kept };
    const { error } = await supabase
      .from("external_certificates")
      .update({ ...row, file_path: d.filePath ?? current.file_path })
      .eq("id", id)
      .eq("trainee_id", uid);
    if (error) return { status: "error", message: toArabicError(error), values: kept };
    if (d.filePath && current.file_path && current.file_path !== d.filePath) {
      await supabase.storage.from("external-certificates").remove([current.file_path]);
    }
  } else {
    const { data, error } = await supabase.from("external_certificates").insert({ ...row, trainee_id: uid }).select("id").single();
    if (error || !data) return { status: "error", message: toArabicError(error), values: kept };
    id = data.id;
  }

  revalidatePath("/trainee/certificates");
  revalidatePath("/trainee");
  redirect(`/trainee/certificates/external/${id}?sent=1`);
}

/** «احذف الطلب» — allowed while the certificate is not verified (RLS). Removes the uploaded file too. */
export async function deleteExternalCertificate(id: string): Promise<{ ok: boolean; message?: string }> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: toArabicError({ code: "invalid_input" }) };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { ok: false, message: toArabicError({ code: "not_authenticated" }) };
  const { data: current } = await supabase.from("external_certificates").select("file_path, status").eq("id", id).eq("trainee_id", uid).maybeSingle();
  if (!current) return { ok: false, message: toArabicError({ code: "not_found" }) };
  if (current.status === "verified") return { ok: false, message: toArabicError({ code: "invalid_state" }) };
  const { error } = await supabase.from("external_certificates").delete().eq("id", id).eq("trainee_id", uid);
  if (error) return { ok: false, message: toArabicError(error) };
  if (current.file_path) await supabase.storage.from("external-certificates").remove([current.file_path]);
  revalidatePath("/trainee/certificates");
  revalidatePath("/trainee");
  redirect("/trainee/certificates?filter=external");
}
