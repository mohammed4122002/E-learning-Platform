"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CircleCheck, CircleX, FileText, LoaderCircle, RefreshCw, Trash2, Upload } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { checkAttachment, uploadDisputeFile } from "@/lib/dispute-upload";
import { toArabicDigits } from "@/lib/format";
import { fileSize } from "@/lib/trainings";
import { addDisputeAttachment } from "@/app/(workspace)/trainee/disputes/actions";

export type UploadItem = { key: string; file: File; status: "queued" | "uploading" | "done" | "failed"; progress: number; error?: string };


/** Upload queue for dispute evidence: validate → upload (with progress) → register via add_dispute_attachment. */
export function useDisputeUploads(limit = 5) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const patch = useCallback((key: string, p: Partial<UploadItem>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i))), []);

  const add = useCallback(
    (files: FileList | File[], already = 0) => {
      setRejected(null);
      const next: UploadItem[] = [];
      for (const file of Array.from(files)) {
        const problem = checkAttachment(file);
        if (problem) {
          setRejected(`«${file.name}»: ${problem}`);
          continue;
        }
        if (itemsRef.current.length + next.length + already >= limit) {
          setRejected(`يمكن إرفاق ${toArabicDigits(limit)} ملفات كحد أقصى.`);
          break;
        }
        next.push({ key: crypto.randomUUID(), file, status: "queued", progress: 0 });
      }
      setItems((list) => [...list, ...next]);
      return next;
    },
    [limit],
  );

  const uploadOne = useCallback(
    async (item: UploadItem, disputeId: string) => {
      patch(item.key, { status: "uploading", progress: 0, error: undefined });
      try {
        const { path } = await uploadDisputeFile(item.file, disputeId, (progress) => patch(item.key, { progress }));
        const res = await addDisputeAttachment({ disputeId, path, name: item.file.name, size: item.file.size });
        if (!res.ok) throw new Error(res.message);
        patch(item.key, { status: "done", progress: 100 });
        return true;
      } catch (e) {
        const msg = e instanceof Error && !/^upload_|^network|^not_authenticated/.test(e.message) ? e.message : "تعذّر رفع الملف. تحقّق من اتصالك ثم أعد المحاولة.";
        patch(item.key, { status: "failed", error: msg });
        return false;
      }
    },
    [patch],
  );

  const uploadAll = useCallback(
    async (disputeId: string, only?: UploadItem[]) => {
      const targets = (only ?? itemsRef.current).filter((i) => i.status === "queued" || i.status === "failed");
      const results = [];
      for (const i of targets) results.push(await uploadOne(i, disputeId));
      return results.every(Boolean);
    },
    [uploadOne],
  );

  const remove = useCallback((key: string) => setItems((list) => list.filter((i) => i.key !== key)), []);

  return { items, add, uploadAll, uploadOne, remove, rejected };
}

/** Dashed drop zone (TRN-DSP-02 · «أرفق دليلًا»). */
export function DropZone({ onFiles, disabled, tone = "brand" }: { onFiles: (files: FileList) => void; disabled?: boolean; tone?: "brand" | "success" }) {
  const id = useId();
  const [over, setOver] = useState(false);
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled && e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-16 border-[1.5px] border-dashed px-6 py-7 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-border-focus ${
        tone === "success" ? "border-state-success bg-state-success-bg" : "border-action-primary bg-bg-brand-tint"
      } ${over ? "ring-4 ring-action-primary/20" : ""} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <Glyph icon={Upload} size={20} className={tone === "success" ? "text-state-success" : "text-text-brand"} />
      <span className={`type-subtitle ${tone === "success" ? "text-state-success" : "text-text-brand"}`}>أرفق دليلًا</span>
      <span className="type-caption text-text-muted">حتى ١٠ ميجابايت للملف · خمسة ملفات كحد أقصى · PDF أو JPG أو PNG</span>
      <input
        id={id}
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/png"
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

/** Evidence list with per-file state: جاهز · جارٍ الرفع (progress) · تم الرفع · فشل الرفع (retry). */
export function UploadList({ items, onRetry, onRemove }: { items: UploadItem[]; onRetry?: (i: UploadItem) => void; onRemove?: (i: UploadItem) => void }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3" aria-live="polite">
      {items.map((i) => (
        <li
          key={i.key}
          className={`flex flex-wrap items-center gap-3 rounded-12 px-3.5 py-3 ${i.status === "failed" ? "border-[1.5px] border-state-error bg-state-error-bg" : i.status === "done" ? "bg-state-success-bg" : "bg-bg-page"}`}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-error">
            <Glyph icon={FileText} size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate type-subtitle text-text-primary">{i.file.name}</span>
            <span className="type-caption text-text-muted">
              {fileSize(i.file.size)} ·{" "}
              {i.status === "queued" ? "جاهز للرفع" : i.status === "uploading" ? `جارٍ الرفع ${toArabicDigits(i.progress)}٪` : i.status === "done" ? "تم رفع الملف بنجاح" : (i.error ?? "فشل الرفع")}
            </span>
            {i.status === "uploading" && (
              <span role="progressbar" aria-label={`رفع ${i.file.name}`} aria-valuenow={i.progress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-border-default">
                <span className="block h-full rounded-full bg-action-primary transition-[width]" style={{ width: `${i.progress}%` }} />
              </span>
            )}
          </span>
          {i.status === "uploading" && <Glyph icon={LoaderCircle} size={20} className="animate-[tg-spin_0.9s_linear_infinite] text-text-brand" />}
          {i.status === "done" && <Glyph icon={CircleCheck} size={20} className="text-state-success" />}
          {i.status === "failed" && (
            <>
              <Glyph icon={CircleX} size={20} className="text-state-error" />
              {onRetry && (
                <button type="button" onClick={() => onRetry(i)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-8 px-2 py-1 type-caption text-text-brand hover:underline focus-ring">
                  <Glyph icon={RefreshCw} size={16} />
                  أعد المحاولة
                </button>
              )}
            </>
          )}
          {(i.status === "queued" || i.status === "failed") && onRemove && (
            <button type="button" onClick={() => onRemove(i)} aria-label={`إزالة ${i.file.name}`} className="cursor-pointer rounded-8 p-1 text-text-muted hover:text-state-error focus-ring">
              <Glyph icon={Trash2} size={16} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
