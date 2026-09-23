"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import { idSchema } from "@/lib/validation/trainings";

type Result = { ok: boolean; message: string };
const invalid = (): Result => ({ ok: false, message: toArabicError({ code: "invalid_input" }) });

function revalidateAll() {
  revalidatePath("/trainee/waitlist");
  revalidatePath("/trainee/trainings");
  revalidatePath("/trainee/queue");
  revalidatePath("/trainee", "layout");
}

/** TRN-WTL-01/02 · «إلغاء الانتظار» / «اعتذر عن المقعد» → leave_waitlist (an invite passes to the next trainee). */
export async function leaveWaitlist(entryId: string): Promise<Result> {
  if (!idSchema.safeParse(entryId).success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_waitlist", { p_entry: entryId });
  if (error) return { ok: false, message: toArabicError(error) };
  revalidateAll();
  return { ok: true, message: "خرجت من قائمة الانتظار. يمكنك الانضمام مجددًا متى شئت ما دامت الدورة مكتملة." };
}

/** TRN-WTL-02 · «اقبل المقعد وأكمل الدفع» → accept_waitlist_invite, then payment (paid) or the enrollment (free). */
export async function acceptWaitlistInvite(entryId: string): Promise<Result> {
  if (!idSchema.safeParse(entryId).success) return invalid();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_waitlist_invite", { p_entry: entryId });
  if (error) {
    revalidateAll();
    return { ok: false, message: toArabicError(error) };
  }
  const row = data?.[0];
  if (!row) return { ok: false, message: toArabicError(null) };
  revalidateAll();
  redirect(row.status === "pending_payment" ? `/checkout/${row.enrollment_id}/pay` : `/trainee/trainings/${row.enrollment_id}`);
}

/** «انضم لقائمة الانتظار» / «ابقَ في القائمة» after an invite lapsed → join_waitlist. */
export async function rejoinWaitlist(courseId: string): Promise<Result> {
  if (!idSchema.safeParse(courseId).success) return invalid();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_waitlist", { p_course: courseId });
  if (error) return { ok: false, message: toArabicError(error) };
  revalidateAll();
  redirect(`/trainee/waitlist/${data}`);
}
