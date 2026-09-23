"use client";

import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/trainings";

/** Client-side validation of an evidence file (TRN-DSP-02: PDF/JPG/PNG up to 10 MB). */
export function checkAttachment(file: File): string | null {
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type)) return "يُقبل PDF أو صورة JPG أو PNG فقط.";
  if (file.size > MAX_ATTACHMENT_BYTES) return "حجم الملف يتجاوز ١٠ ميجابايت.";
  if (file.size === 0) return "الملف فارغ.";
  return null;
}

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "file"}${ext ? `.${ext}` : ""}`;
}

/**
 * Uploads to the private bucket `dispute-attachments` at `<auth uid>/<dispute id>/<uuid>-<filename>` with progress
 * (the storage REST endpoint via XHR, authenticated as the signed-in user so storage RLS applies).
 */
export async function uploadDisputeFile(file: File, disputeId: string, onProgress: (percent: number) => void): Promise<{ path: string }> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error("not_authenticated");
  const path = `${session.user.id}/${disputeId}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const url = `${env.supabaseUrl}/storage/v1/object/dispute-attachments/${path.split("/").map(encodeURIComponent).join("/")}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", env.supabaseKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload_${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
  onProgress(100);
  return { path };
}
