"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { toArabicError } from "@/lib/errors";
import { fieldErrorsOf, type FormState } from "@/lib/validation/auth";
import { courseIdSchema, inquirySchema, programSlugSchema } from "@/lib/validation/discover";

export type ActionResult = { status: "success"; message: string } | { status: "error"; message: string };

const notSignedIn: ActionResult = { status: "error", message: toArabicError({ code: "not_authenticated" }) };

/** TRN-DSC-02 · استفسر قبل التسجيل — owner-scoped insert into inquiries (RLS: user_id = auth.uid()). */
export async function sendInquiry(_: FormState, formData: FormData): Promise<FormState> {
  const kept = { topic: String(formData.get("topic") ?? ""), question: String(formData.get("question") ?? "") };
  const parsed = inquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: kept };
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: notSignedIn.message, values: kept };

  const supabase = await createClient();
  const { error } = await supabase
    .from("inquiries")
    .insert({ course_id: parsed.data.courseId, user_id: user.id, topic: parsed.data.topic, question: parsed.data.question });
  if (error) return { status: "error", message: toArabicError(error), values: kept };
  return { status: "success", message: "أرسلنا استفسارك إلى مقدّم البرنامج. ستصلك الإجابة في الإشعارات." };
}

/** Bookmark in the program hero — saves the program's next open course in المفضلة. */
export async function setFavorite(courseId: string, save: boolean, programSlug: string): Promise<ActionResult> {
  const id = courseIdSchema.safeParse(courseId);
  const slug = programSlugSchema.safeParse(programSlug);
  if (!id.success || !slug.success) return { status: "error", message: toArabicError({ code: "invalid_input" }) };
  const user = await getCurrentUser();
  if (!user) return notSignedIn;

  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("favorites").upsert({ user_id: user.id, course_id: id.data }, { onConflict: "user_id,course_id", ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", user.id).eq("course_id", id.data);
  if (error) return { status: "error", message: toArabicError(error) };
  revalidatePath(`/trainee/programs/${slug.data}`);
  revalidatePath("/trainee/favorites");
  return { status: "success", message: save ? "حُفظ البرنامج في المفضلة." : "أُزيل البرنامج من المفضلة." };
}

/** TRN-DSC-03 · فارغة — "نبّهني عند فتح دورة": follow the program's provider (or trainer) to be notified of new runs. */
export async function followProgramOwner(programSlug: string): Promise<ActionResult> {
  const slug = programSlugSchema.safeParse(programSlug);
  if (!slug.success) return { status: "error", message: toArabicError({ code: "invalid_input" }) };
  const user = await getCurrentUser();
  if (!user) return notSignedIn;

  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("owner_id, organization_id")
    .eq("slug", slug.data)
    .eq("status", "published")
    .maybeSingle();
  if (!program) return { status: "error", message: toArabicError({ code: "not_found" }) };

  const row = {
    user_id: user.id,
    organization_id: program.organization_id,
    trainer_id: program.organization_id ? null : program.owner_id,
  };
  const { error } = await supabase.from("follows").insert(row);
  // 23505 = already following — the outcome the trainee asked for.
  if (error && error.code !== "23505") return { status: "error", message: toArabicError(error) };
  revalidatePath(`/trainee/programs/${slug.data}/courses`);
  revalidatePath("/trainee/following");
  return { status: "success", message: "فعّلنا التنبيه — سنُشعرك فور فتح دورة جديدة." };
}

/** TRN-DSC-03 · انضم لقائمة الانتظار — business rules live in join_waitlist (full course, not enrolled, not queued). */
export async function joinWaitlist(courseId: string, programSlug: string): Promise<ActionResult> {
  const id = courseIdSchema.safeParse(courseId);
  const slug = programSlugSchema.safeParse(programSlug);
  if (!id.success || !slug.success) return { status: "error", message: toArabicError({ code: "invalid_input" }) };
  if (!(await getCurrentUser())) return notSignedIn;

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_waitlist", { p_course: id.data });
  if (error) return { status: "error", message: toArabicError(error) };
  revalidatePath(`/trainee/programs/${slug.data}/courses`);
  return { status: "success", message: "انضممت إلى قائمة الانتظار. سنُشعرك فور شغور مقعد." };
}
