"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTrainer } from "@/lib/auth";
import { toArabicError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";

/*
 * TRR-CTR-02 · click-to-sign. There is no third-party e-signature provider: the platform records the typed name,
 * the explicit consent, the time, SHA-256 hashes of the signer's IP address and user agent and the SHA-256 of the
 * signed version's canonical terms (computed in the database). The record is immutable.
 */

const sha256 = (v: string) => createHash("sha256").update(v, "utf8").digest("hex");

const signSchema = z.object({
  contractId: z.uuid(),
  version: z.coerce.number().int().min(1),
  typedName: z.string({ error: "اكتب اسمك الكامل للتوقيع" }).trim().min(2, "اكتب اسمك الكامل للتوقيع").max(160, "الاسم طويل جدًا"),
  consent: z.literal("on", { error: "أشّر على إقرار المراجعة قبل التوقيع" }),
});

export async function signContract(_: FormState, fd: FormData): Promise<FormState> {
  await requireTrainer("/trainer/contracts");
  const values = { typedName: String(fd.get("typedName") ?? "") };
  const parsed = signSchema.safeParse({
    contractId: fd.get("contractId"),
    version: fd.get("version"),
    typedName: fd.get("typedName") ?? undefined,
    consent: fd.get("consent") ?? undefined,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "";
  const ua = h.get("user-agent") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.rpc("sign_contract", {
    p_contract: parsed.data.contractId,
    p_version: parsed.data.version,
    p_typed_name: parsed.data.typedName,
    p_consent: true,
    p_ip_hash: ip ? sha256(ip) : "",
    p_ua_hash: ua ? sha256(ua) : "",
  });
  if (error) {
    const msg = toArabicError(error);
    if (error.message === "signature_name_mismatch" || error.message === "signature_name_required") return { status: "error", fieldErrors: { typedName: msg }, values };
    return { status: "error", message: msg, values };
  }
  revalidatePath(`/trainer/contracts/${parsed.data.contractId}`, "layout");
  redirect(`/trainer/contracts/${parsed.data.contractId}?signed=1`);
}
