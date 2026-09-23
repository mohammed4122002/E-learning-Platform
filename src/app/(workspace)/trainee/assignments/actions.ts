"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toArabicError } from "@/lib/errors";

export type SubmitState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  submission?: { id: string; submittedAt: string };
};

const schema = z.object({
  assignmentId: z.string().uuid("واجب غير صالح"),
  filePath: z
    .string({ error: "ارفع ملف الحل أولًا" })
    .min(1, "ارفع ملف الحل أولًا")
    .max(400, "مسار الملف طويل جدًا")
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/, "مسار الملف غير صالح"),
  fileName: z.string().trim().min(1, "اسم الملف مطلوب").max(200, "اسم الملف طويل جدًا"),
  fileSize: z.coerce.number({ error: "حجم الملف غير صالح" }).int().min(1, "الملف فارغ").max(25 * 1024 * 1024, "حجم الملف يتجاوز ٢٥ م.ب"),
  note: z.string().trim().max(4000, "الملاحظات طويلة جدًا (٤٠٠٠ حرف كحد أقصى)").optional().default(""),
});

/** TRN-LRN-05 — the file is already in storage (browser upload); this records the submission via RPC. */
export async function submitAssignment(_: SubmitState, formData: FormData): Promise<SubmitState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "form");
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { status: "error", message: Object.values(fieldErrors)[0], fieldErrors };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid || !d.filePath.startsWith(`${uid}/${d.assignmentId}/`)) return { status: "error", message: toArabicError({ code: "forbidden" }) };

  const { data, error } = await supabase.rpc("submit_assignment_file", {
    p_assignment: d.assignmentId,
    p_file_path: d.filePath,
    p_note: d.note,
    p_file_name: d.fileName,
    p_file_size: d.fileSize,
  });
  if (error || !data) return { status: "error", message: toArabicError(error) };
  // No revalidation here: pages are rendered per request, and re-rendering now would unmount the client's
  // "أُرسل واجبك" confirmation. The trainee refreshes the detail view from that panel (router.refresh()).
  return { status: "success", message: "أُرسل واجبك إلى المدرب.", submission: { id: data, submittedAt: new Date().toISOString() } };
}
