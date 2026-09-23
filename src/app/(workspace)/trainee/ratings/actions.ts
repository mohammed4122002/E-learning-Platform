"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { RATING_WINDOW_MS } from "@/lib/data/certificates";
import { fieldErrorsOf, ratingSchema, type FormState } from "@/lib/validation/engagement";

/**
 * TRN-RTG-01 · «أرسل التقييم» → RPC rate_course (BR-R3). The rating is sent once (no edits) and only within
 * 30 days of the course ending; the organisation axis is required for provider courses only.
 */
export async function submitRating(_: FormState, formData: FormData): Promise<FormState> {
  const kept = {
    content: String(formData.get("content") ?? ""),
    trainer: String(formData.get("trainer") ?? ""),
    organization: String(formData.get("organization") ?? ""),
    comment: String(formData.get("comment") ?? ""),
    tags: formData.getAll("tags").map(String).join("|"),
  };
  const parsed = ratingSchema.safeParse({
    enrollment: formData.get("enrollment"),
    content: formData.get("content") || undefined,
    trainer: formData.get("trainer") || undefined,
    organization: String(formData.get("organization") ?? ""),
    comment: String(formData.get("comment") ?? ""),
    tags: formData.getAll("tags").map(String),
    consent: formData.get("consent") ?? undefined,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: kept };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { status: "error", message: toArabicError({ code: "not_authenticated" }), values: kept };

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, status, completed_at, courses(organization_id)")
    .eq("id", d.enrollment)
    .eq("trainee_id", uid)
    .maybeSingle();
  if (!enrollment) return { status: "error", message: toArabicError({ code: "not_found" }), values: kept };
  if (!["in_progress", "completed"].includes(enrollment.status)) return { status: "error", message: toArabicError({ code: "not_eligible" }), values: kept };
  if (enrollment.completed_at && Date.now() - new Date(enrollment.completed_at).getTime() > RATING_WINDOW_MS) {
    return { status: "error", message: toArabicError({ code: "rating_closed" }), values: kept };
  }
  const { data: existing } = await supabase.from("course_ratings").select("id").eq("enrollment_id", enrollment.id).maybeSingle();
  if (existing) return { status: "error", message: toArabicError({ code: "already_rated" }), values: kept };

  const isProvider = !!enrollment.courses?.organization_id;
  if (isProvider && d.organization === null) return { status: "error", fieldErrors: { organization: "قيّم التنظيم من ١ إلى ٥ نجوم" }, values: kept };

  const comment = [d.tags.length ? d.tags.join(" · ") : null, d.comment].filter(Boolean).join("\n") || "";
  const { error } = await supabase.rpc("rate_course", {
    p_enrollment: enrollment.id,
    p_content: d.content,
    p_trainer: d.trainer,
    p_org: (isProvider ? d.organization : null) as number,
    p_comment: comment,
  });
  if (error) return { status: "error", message: toArabicError(error), values: kept };

  revalidatePath("/trainee/ratings");
  revalidatePath(`/trainee/certificates`, "layout");
  redirect(`/trainee/ratings/new?enrollment=${enrollment.id}&sent=1`);
}
