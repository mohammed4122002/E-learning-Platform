"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import { verificationSchema } from "@/lib/validation/profile";

/** TRN-VER-01 · أرسل للمراجعة → submit_identity_documents (RPC enforces one open request + own folder). */
export async function submitVerification(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = verificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_identity_documents", {
    p_type: parsed.data.documentType,
    // The full document number is never sent to the server — only the last four characters.
    p_last4: parsed.data.last4 as string, // nullable in SQL; generated types mark it required
    p_front_path: parsed.data.frontPath,
    p_back_path: parsed.data.backPath as string,
  });
  if (error) return { status: "error", message: toArabicError(error) };

  revalidatePath("/trainee/verification");
  revalidatePath("/", "layout");
  redirect("/trainee/verification");
}
