"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";
import type { FormState } from "@/lib/validation/auth";

const schema = z.object({ courseId: z.uuid(), slug: z.string().regex(/^[a-z0-9-]{2,140}$/) });

/** TRN-WTL-01 · join the waitlist of a full course (RPC join_waitlist enforces the rules). */
export async function joinWaitlist(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "طلب غير صالح." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect(`/login?next=/courses/${parsed.data.slug}`);
  const { error } = await supabase.rpc("join_waitlist", { p_course: parsed.data.courseId });
  if (error) return { status: "error", message: toArabicError(error) };
  revalidatePath(`/courses/${parsed.data.slug}`);
  redirect("/trainee/waitlist?joined=1");
}
