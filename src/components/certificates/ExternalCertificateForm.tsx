"use client";

import { useActionState, useId, useRef, useState, type ReactNode } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { toArabicError } from "@/lib/errors";
import { submitExternalCertificate } from "@/app/(workspace)/trainee/certificates/external/actions";
import { initialFormState } from "@/lib/validation/engagement";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["application/pdf", "image/jpeg", "image/png"];

export type ExternalFormValues = {
  id?: string;
  title: string;
  issuer: string;
  issuedOn: string;
  expiresOn: string;
  serialNumber: string;
  credentialUrl: string;
  field: string;
  filePath: string;
  fileName: string | null;
};

/* Figma "Data Card" row (4146:272): page tint, 1px border, r10, px 16 py 13 — label 13.5 text/secondary + value 15 Bold. */
function Row({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <div
        className={`flex w-full flex-col gap-1 rounded-[10px] border bg-bg-page px-4 py-[13px] transition-shadow focus-within:border-action-primary focus-within:shadow-[0_0_0_4px_rgba(91,60,196,0.10)] sm:flex-row sm:items-center sm:gap-2.5 ${
          error ? "border-state-error" : "border-border-default"
        }`}
      >
        <label htmlFor={htmlFor} className="shrink-0 text-[13.5px] leading-normal text-text-secondary sm:w-32">
          {label}
        </label>
        {children}
      </div>
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="ps-1 type-caption text-state-error">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls = "min-w-0 flex-1 bg-transparent text-[15px] leading-normal font-bold text-text-primary outline-none placeholder:font-normal placeholder:text-text-muted";

/** TRN-CRT-03 · النموذج (Figma 4146:2): notice + «بيانات الشهادة» data card as editable rows + action row. */
export function ExternalCertificateForm({ userId, initial, cancelHref }: { userId: string; initial?: ExternalFormValues; cancelHref: string }) {
  const [state, action, pending] = useActionState(submitExternalCertificate, initialFormState);
  const v = { ...initial, ...(state.values ?? {}) } as Partial<ExternalFormValues>;
  const ids = {
    title: useId(),
    issuer: useId(),
    issuedOn: useId(),
    expiresOn: useId(),
    serial: useId(),
    url: useId(),
    field: useId(),
    file: useId(),
  };
  const fileInput = useRef<HTMLInputElement>(null);
  const [filePath, setFilePath] = useState(initial?.filePath ?? "");
  const [fileName, setFileName] = useState<string | null>(initial?.fileName ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const fe = state.fieldErrors ?? {};

  async function onFile(file: File | undefined) {
    setUploadError(null);
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return setUploadError("اختر ملف PDF أو صورة (JPG / PNG).");
    if (file.size > MAX_BYTES) return setUploadError("حجم الملف أكبر من ٥ م.ب.");
    setUploading(true);
    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "pdf";
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 60) || "certificate";
    const path = `${userId}/${crypto.randomUUID()}-${base}.${ext}`;
    const { error } = await createClient().storage.from("external-certificates").upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (error) return setUploadError(toArabicError({ code: "upload_failed" }));
    setFilePath(path);
    setFileName(file.name);
  }

  return (
    <form action={action} noValidate className="flex w-full flex-col gap-6">
      {state.message && (
        <Alert tone="error" title="تعذّر إرسال الشهادة">
          {state.message}
        </Alert>
      )}
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="filePath" value={filePath} />

      <section aria-labelledby="ext-data-title" className="flex w-full flex-col gap-2.5 rounded-[14px] border-2 border-state-info bg-bg-surface p-4 sm:p-6">
        <div className="flex w-full items-center gap-2.5 pb-1">
          <h2 id="ext-data-title" className="text-[19px] leading-normal font-bold text-text-primary">
            بيانات الشهادة
          </h2>
          <span className="rounded-full bg-state-info-bg px-[13px] py-[5px] text-[12.5px] leading-normal font-bold text-state-info">شهادة خارجية</span>
        </div>

        <Row label="اسم الشهادة" htmlFor={ids.title} error={fe.title}>
          <input id={ids.title} name="title" required maxLength={200} defaultValue={v.title} placeholder="مثال: PMP · إدارة المشاريع الاحترافية" aria-invalid={!!fe.title || undefined} aria-describedby={fe.title ? `${ids.title}-error` : undefined} className={inputCls} />
        </Row>
        <Row label="الجهة المصدرة" htmlFor={ids.issuer} error={fe.issuer}>
          <input id={ids.issuer} name="issuer" required maxLength={200} defaultValue={v.issuer} placeholder="مثال: PMI" aria-invalid={!!fe.issuer || undefined} aria-describedby={fe.issuer ? `${ids.issuer}-error` : undefined} className={inputCls} />
        </Row>
        <Row label="تاريخ الإصدار" htmlFor={ids.issuedOn} error={fe.issuedOn}>
          <input id={ids.issuedOn} name="issuedOn" type="date" required max={today} defaultValue={v.issuedOn} aria-invalid={!!fe.issuedOn || undefined} aria-describedby={fe.issuedOn ? `${ids.issuedOn}-error` : undefined} className={`${inputCls} text-end sm:text-start`} />
        </Row>
        <Row label="تاريخ الانتهاء" htmlFor={ids.expiresOn} error={fe.expiresOn}>
          <input id={ids.expiresOn} name="expiresOn" type="date" defaultValue={v.expiresOn} aria-invalid={!!fe.expiresOn || undefined} aria-describedby={fe.expiresOn ? `${ids.expiresOn}-error` : undefined} className={`${inputCls} text-end sm:text-start`} />
        </Row>
        <Row label="الرقم التسلسلي" htmlFor={ids.serial} error={fe.serialNumber}>
          <input id={ids.serial} name="serialNumber" dir="ltr" maxLength={100} defaultValue={v.serialNumber} placeholder="PMI-2024-88214" className={`${inputCls} text-end`} />
        </Row>
        <Row label="رابط التحقق" htmlFor={ids.url} error={fe.credentialUrl}>
          <input id={ids.url} name="credentialUrl" dir="ltr" inputMode="url" defaultValue={v.credentialUrl} placeholder="pmi.org/verify/88214" aria-invalid={!!fe.credentialUrl || undefined} aria-describedby={fe.credentialUrl ? `${ids.url}-error` : undefined} className={`${inputCls} text-end`} />
        </Row>
        <Row label="المجال" htmlFor={ids.field} error={fe.field}>
          <input id={ids.field} name="field" maxLength={120} defaultValue={v.field} placeholder="مثال: إدارة المشاريع" className={inputCls} />
        </Row>
        <Row label="ملف الشهادة" htmlFor={ids.file} error={uploadError ?? fe.filePath}>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <input
              ref={fileInput}
              id={ids.file}
              type="file"
              accept=".pdf,image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {fileName ? (
              <span className="flex min-w-0 items-center gap-2 text-[15px] font-bold text-text-primary">
                <Glyph icon={FileText} size={16} className="text-text-brand" />
                <span className="truncate" dir="auto">
                  {fileName}
                </span>
              </span>
            ) : (
              <span className="text-[15px] font-bold text-text-secondary">{uploading ? "جارٍ الرفع…" : "لم يُرفع بعد"}</span>
            )}
            <Button size="s" variant="secondary" loading={uploading} onClick={() => fileInput.current?.click()} icon={<Glyph icon={Upload} size={16} />} className="ms-auto">
              {fileName ? "استبدل الملف" : "ارفع الملف"}
            </Button>
            {fileName && !uploading && (
              <button
                type="button"
                onClick={() => {
                  setFilePath(initial?.filePath ?? "");
                  setFileName(initial?.fileName ?? null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                aria-label="تراجع عن الملف المختار"
                className="cursor-pointer rounded-8 p-1 text-text-muted hover:text-state-error focus-ring"
              >
                <Glyph icon={X} size={16} />
              </button>
            )}
          </div>
        </Row>
        <p className="type-caption text-text-muted">PDF أو صورة حتى ٥ م.ب. الملف خاص بك ولا يطّلع عليه إلا فريق المراجعة.</p>
      </section>

      <div className="flex w-full flex-wrap items-center gap-3">
        <Button type="submit" loading={pending} disabled={uploading}>
          أرسل للمراجعة
        </Button>
        <ButtonLink href={cancelHref} variant="secondary">
          إلغاء
        </ButtonLink>
        <p className="w-full type-caption text-text-muted">بعد الإرسال تُراجع الشهادة خلال ٢٤–٤٨ ساعة عمل، وتظهر في ملفك موسومة «شهادة خارجية» مع حالة توثيقها.</p>
      </div>
    </form>
  );
}
