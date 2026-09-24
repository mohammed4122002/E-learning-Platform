"use client";

import { useRef, useState } from "react";
import { FileText, LoaderCircle, Upload, X } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { toArabicError } from "@/lib/errors";
import { toArabicDigits } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

const ACCEPT = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;

export type Attachment = { path: string; name: string; size: number };

/**
 * Figma «Form / Upload Field» of TRR-RPT-01 (dashed, «أرفق ما يدعم ردّك») and TRR-RPT-02 (success tint once files are
 * attached: «٣ ملفات مرفقة» + names). Files go to the private report-evidence bucket under the trainer's folder;
 * the list is posted as JSON in `attachments`.
 */
export function EvidenceUpload({ userId, title, hint, form }: { userId: string; title: string; hint: string; form?: string }) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const id = `evidence-${form ?? "form"}`;

  async function add(list: FileList | null) {
    setError(null);
    if (!list?.length) return;
    const picked = Array.from(list).slice(0, MAX_FILES - files.length);
    if (picked.length === 0) return setError(`حتى ${toArabicDigits(MAX_FILES)} ملفات.`);
    for (const f of picked) {
      if (!ACCEPT.includes(f.type)) return setError("اختر ملف PDF أو صورة أو ملف Excel/Word.");
      if (f.size > MAX_BYTES) return setError("حجم الملف أكبر من ١٠ م.ب.");
    }
    setBusy(true);
    const supabase = createClient();
    const done: Attachment[] = [];
    for (const f of picked) {
      const ext = (f.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const base = f.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 60) || "evidence";
      const path = `${userId}/${crypto.randomUUID()}-${base}.${ext}`;
      const { error: err } = await supabase.storage.from("report-evidence").upload(path, f, { contentType: f.type });
      if (err) {
        setError(toArabicError({ code: "upload_failed" }));
        break;
      }
      done.push({ path, name: f.name, size: f.size });
    }
    setFiles((prev) => [...prev, ...done]);
    setBusy(false);
    if (ref.current) ref.current.value = "";
  }

  const attached = files.length > 0;
  return (
    <div className="flex w-full flex-col gap-2">
      <input type="hidden" name="attachments" value={JSON.stringify(files)} form={form} />
      <input
        ref={ref}
        id={id}
        type="file"
        multiple
        accept={ACCEPT.join(",")}
        className="sr-only"
        onChange={(e) => add(e.target.files)}
        disabled={busy || files.length >= MAX_FILES}
      />
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
        className={`flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-16 border-[1.5px] p-6 text-center focus-within:outline-2 ${
          attached ? "border-solid border-state-success bg-state-success-bg" : `border-dashed border-border-default ${drag ? "bg-bg-brand-tint" : "bg-bg-surface"}`
        }`}
      >
        <Glyph icon={busy ? LoaderCircle : Upload} size={24} className={`${busy ? "animate-spin" : ""} ${attached ? "text-state-success" : "text-text-primary"}`} />
        <span className={`type-subtitle ${attached ? "text-state-success" : "text-text-primary"}`}>
          {attached ? (files.length === 1 ? "ملف واحد مرفق" : files.length === 2 ? "ملفان مرفقان" : `${toArabicDigits(files.length)} ملفات مرفقة`) : title}
        </span>
        <span className="type-caption text-text-muted" dir="auto">
          {attached ? files.map((f) => f.name).join(" · ") : hint}
        </span>
      </label>
      {attached && (
        <ul className="flex flex-wrap gap-2" aria-label="الملفات المرفقة">
          {files.map((f) => (
            <li key={f.path} className="inline-flex items-center gap-1.5 rounded-full bg-bg-page px-3 py-1 type-caption text-text-secondary">
              <Glyph icon={FileText} size={16} />
              <span dir="auto" className="max-w-[180px] truncate">
                {f.name}
              </span>
              <button type="button" onClick={() => setFiles((p) => p.filter((x) => x.path !== f.path))} aria-label={`إزالة ${f.name}`} className="cursor-pointer rounded-8 text-text-muted hover:text-state-error focus-ring">
                <Glyph icon={X} size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="type-caption text-state-error">
          {error}
        </p>
      )}
    </div>
  );
}
