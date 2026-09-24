"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import type { FormState } from "@/lib/validation/auth";
import { AVAILABLE_WORKSPACES } from "@/lib/workspaces";


const schema = z.object({ kind: z.enum(["trainee", "trainer", "provider", "studio", "requester"]) });

/** PUB-CTX-01 · اختيار نوع المساحة الأولى */
export async function chooseWorkspace(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "اختر نوع المساحة للمتابعة." };
  if (!(AVAILABLE_WORKSPACES as readonly string[]).includes(parsed.data.kind)) {
    return { status: "error", message: "هذه المساحة لم تُفتح بعد في المنصة. يمكنك البدء كمتدرب الآن وإضافتها لاحقًا." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_workspace", { p_kind: parsed.data.kind });
  if (error) return { status: "error", message: toArabicError(error) };
  redirect(parsed.data.kind === "trainer" ? "/trainer/onboarding" : "/onboarding");
}
