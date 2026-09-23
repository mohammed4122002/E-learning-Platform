"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { fieldErrorsOf, inquirySchema, type FormState } from "@/lib/validation/engagement";

/** TRN-INQ-01 · «أرسل الاستفسار» → owner insert into `inquiries` (RLS inquiries_insert: own row, no answer). */
export async function submitInquiry(_: FormState, formData: FormData): Promise<FormState> {
  const kept = { topic: String(formData.get("topic") ?? ""), question: String(formData.get("question") ?? "") };
  const parsed = inquirySchema.safeParse({ course: formData.get("course"), topic: formData.get("topic") ?? undefined, question: formData.get("question") ?? "" });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: kept };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }), values: kept };

  const { data: course } = await supabase.from("courses").select("id, slug").eq("id", parsed.data.course).neq("status", "draft").maybeSingle();
  if (!course) return { status: "error", message: toArabicError({ code: "not_found" }), values: kept };

  const { error } = await supabase.from("inquiries").insert({ course_id: course.id, user_id: uid, topic: parsed.data.topic, question: parsed.data.question });
  if (error) return { status: "error", message: toArabicError(error), values: kept };

  revalidatePath("/trainee/inquiry");
  revalidatePath("/trainee/help");
  redirect(`/trainee/inquiry?course=${course.slug}&sent=1#my-inquiries`);
}
