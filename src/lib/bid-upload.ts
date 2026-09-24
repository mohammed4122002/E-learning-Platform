"use client";

import { createClient } from "@/lib/supabase/client";

/** TRR-BID-02 «أرفق خطة الورشة»: PDF up to 10 MB. */
export const MAX_BID_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function checkBidAttachment(file: File): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return "يُقبل ملف PDF فقط.";
  if (file.size > MAX_BID_ATTACHMENT_BYTES) return "حجم الملف يتجاوز ١٠ ميجابايت.";
  if (file.size === 0) return "الملف فارغ.";
  return null;
}

/** Uploads to the private bucket `bid-attachments` at `<auth uid>/<request id>/<uuid>.pdf` (storage RLS: owner folder). */
export async function uploadBidAttachment(file: File, requestId: string): Promise<{ path: string; name: string }> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error("not_authenticated");
  const path = `${uid}/${requestId}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from("bid-attachments").upload(path, file, { contentType: "application/pdf", upsert: false });
  if (error) throw new Error(error.message);
  return { path, name: file.name.slice(0, 200) };
}
