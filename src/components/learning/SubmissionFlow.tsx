"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Upload } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { submitAssignment, type SubmitState } from "@/app/(workspace)/trainee/assignments/actions";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { formatDate, formatDayMonth, formatPercent, formatTime, toArabicDigits } from "@/lib/format";
import { formatBytes } from "@/lib/learning";

/*
 * TRN-LRN-05 submission flow — Figma 4145:2 (الافتراضية) · 4145:386 (جارٍ الرفع) · 4145:715 (فشل الرفع) ·
 * 4145:1043 (مراجعة قبل الإرسال) · 4145:1372 (تم الإرسال) · 4145:1705 (انقضى الموعد).
 * The browser uploads straight to the private "submissions" bucket at <uid>/<assignment>/<uuid>-<file>
 * (XHR for real progress + cancel), then the server action records it through submit_assignment_file.
 */

export type FlowAssignment = {
  id: string;
  title: string;
  courseTitle: string;
  dueAt: string | null;
  acceptedFormats: string;
  maxFileMb: number;
  statusLabel: string;
  attemptsUsed: number;
  maxAttempts: number;
  current: { fileName: string | null; fileSize: number | null; submittedAt: string; note: string | null } | null;
};

type Mode = "initial" | "revision" | "replace" | "late";
type Step = "idle" | "uploading" | "failed" | "review" | "sent";

const MIME: Record<string, string[]> = {
  PDF: ["application/pdf", ".pdf"],
  PNG: ["image/png", ".png"],
  JPG: ["image/jpeg", ".jpg", ".jpeg"],
  ZIP: ["application/zip", ".zip"],
  DOCX: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  PPTX: ["application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx"],
};

function acceptFor(formats: string): string[] {
  const tokens = formats.toUpperCase().match(/PDF|PNG|JPE?G|ZIP|DOCX|PPTX/g) ?? ["PDF"];
  return [...new Set(tokens.flatMap((t) => MIME[t.startsWith("JP") ? "JPG" : t] ?? []))];
}

function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize("NFKD").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "file";
  return ext ? `${base}.${ext}` : base;
}

function dueText(dueAt: string | null) {
  return dueAt ? `${formatDayMonth(dueAt)} · ${formatTime(dueAt)}` : "بلا موعد نهائي";
}

const NOTICE = {
  brand: "border-action-primary bg-bg-brand-tint text-text-brand",
  success: "border-state-success bg-state-success-bg text-state-success",
  warning: "border-state-warning bg-state-warning-bg text-state-warning",
  error: "border-state-error bg-state-error-bg text-state-error",
} as const;

function Notice({ tone, title, children }: { tone: keyof typeof NOTICE; title: string; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex flex-col gap-2 rounded-16 border-[1.5px] px-6 py-[22px] ${NOTICE[tone]}`}>
      <p className="text-[22px] leading-[1.3] font-bold">{title}</p>
      <p className="type-small text-text-secondary">{children}</p>
    </div>
  );
}

function Details({ rows }: { rows: { label: string; value: ReactNode; tone?: "muted" | "brand" | "warning" | "error" }[] }) {
  const color = { muted: "text-text-secondary", brand: "text-text-brand", warning: "text-state-warning", error: "text-state-error" } as const;
  return (
    <section aria-label="تفاصيل التسليم" className="flex flex-col gap-2.5 rounded-16 border border-border-default bg-bg-card p-6">
      <h2 className="type-title text-text-primary">تفاصيل التسليم</h2>
      <dl className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-center gap-2.5 rounded-12 border border-border-default bg-bg-page px-4 py-[13px]">
            <dt className="type-caption text-text-secondary">{r.label}</dt>
            <dd className={`type-small font-bold ${r.tone ? color[r.tone] : "text-text-primary"}`} dir="auto">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Dropzone({ title, hint, onFile, accept, disabled }: { title: string; hint: string; onFile: (f: File) => void; accept: string; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && !disabled) onFile(f);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={`relative flex flex-col items-center gap-2 rounded-16 border-2 border-dashed px-6 py-9 text-center transition-colors ${
        over ? "border-action-primary bg-bg-brand-tint" : "border-action-primary bg-bg-page"
      }`}
    >
      <Glyph icon={Upload} size={24} className="text-text-brand" />
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="cursor-pointer rounded-8 text-[18px] leading-[1.4] font-bold text-text-brand after:absolute after:inset-0 focus-ring disabled:cursor-not-allowed"
      >
        {title}
      </button>
      <p className="type-caption text-text-secondary">{hint}</p>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function SubmissionFlow({ assignment, userId, mode }: { assignment: FlowAssignment; userId: string; mode: Mode }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [note, setNote] = useState(mode === "replace" ? (assignment.current?.note ?? "") : "");
  const xhr = useRef<XMLHttpRequest | null>(null);
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitAssignment, { status: "idle" });
  const accept = useMemo(() => acceptFor(assignment.acceptedFormats), [assignment.acceptedFormats]);
  const acceptAttr = accept.join(",");
  const heading = useRef<HTMLElement | null>(null);
  const setHeading = useCallback((el: HTMLElement | null) => {
    heading.current = el;
  }, []);

  const [sentId, setSentId] = useState<string | null>(null);
  if (state.status === "success" && state.submission && sentId !== state.submission.id) {
    setSentId(state.submission.id);
    setStep("sent");
  }
  useEffect(() => {
    if (step !== "idle") heading.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [step]);
  useEffect(() => () => xhr.current?.abort(), []);

  const upload = useCallback(
    async (f: File) => {
      setFile(f);
      setUploadError(null);
      const okType = accept.some((a) => (a.startsWith(".") ? f.name.toLowerCase().endsWith(a) : f.type === a));
      if (!okType) {
        setUploadError(`صيغة الملف غير مقبولة. المقبول: ${assignment.acceptedFormats}.`);
        setStep("failed");
        return;
      }
      if (f.size > assignment.maxFileMb * 1024 * 1024) {
        setUploadError(`حجم الملف يتجاوز ${toArabicDigits(assignment.maxFileMb)} م.ب.`);
        setStep("failed");
        return;
      }
      setStep("uploading");
      setProgress(0);
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setUploadError("انتهت جلستك. سجّل دخولك مرة أخرى ثم أعد الرفع.");
        setStep("failed");
        return;
      }
      const objectPath = `${userId}/${assignment.id}/${crypto.randomUUID()}-${safeName(f.name)}`;
      const req = new XMLHttpRequest();
      xhr.current = req;
      req.open("POST", `${env.supabaseUrl}/storage/v1/object/submissions/${objectPath.split("/").map(encodeURIComponent).join("/")}`);
      req.setRequestHeader("Authorization", `Bearer ${token}`);
      req.setRequestHeader("apikey", env.supabaseKey);
      req.setRequestHeader("x-upsert", "false");
      req.setRequestHeader("Content-Type", f.type || "application/octet-stream");
      req.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      req.onload = () => {
        xhr.current = null;
        if (req.status >= 200 && req.status < 300) {
          setPath(objectPath);
          setProgress(100);
          setStep("review");
        } else {
          setUploadError(req.status === 413 ? "حجم الملف أكبر من المسموح." : "رفض الخادم الملف. تحقّق من صيغته وحجمه ثم أعد المحاولة.");
          setStep("failed");
        }
      };
      req.onerror = async () => {
        xhr.current = null;
        // The connection can drop after the object was stored — check before reporting a failure.
        const dir = objectPath.slice(0, objectPath.lastIndexOf("/"));
        const leaf = objectPath.slice(objectPath.lastIndexOf("/") + 1);
        const { data: found } = await createClient().storage.from("submissions").list(dir, { search: leaf, limit: 1 }).catch(() => ({ data: null }));
        if (found?.some((o) => o.name === leaf)) {
          setPath(objectPath);
          setProgress(100);
          setStep("review");
          return;
        }
        setUploadError("حدث خلل أثناء الرفع. تحقّق من اتصالك ثم أعد المحاولة.");
        setStep("failed");
      };
      req.onabort = () => {
        xhr.current = null;
        setStep("idle");
      };
      req.send(f);
    },
    [accept, assignment.acceptedFormats, assignment.id, assignment.maxFileMb, userId],
  );

  const reset = () => {
    xhr.current?.abort();
    setStep("idle");
    setFile(null);
    setPath(null);
    setUploadError(null);
  };

  const hint = `${assignment.acceptedFormats} فقط · الحد الأقصى ${toArabicDigits(assignment.maxFileMb)} م.ب — يمكنك استبدال الملف قبل الإرسال`;

  /* ── Steps shared by every mode ── */
  if (step === "uploading" && file) {
    return (
      <div ref={setHeading} className="flex scroll-mt-28 flex-col gap-6">
        <Notice tone="brand" title="جارٍ رفع الملف">
          لا تغلق الصفحة حتى يكتمل الرفع.
        </Notice>
        <Details
          rows={[
            { label: "الملف", value: file.name },
            {
              label: "التقدّم",
              value: (
                <span className="flex items-center gap-3">
                  <span role="progressbar" aria-label="تقدّم الرفع" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="h-2 w-32 overflow-hidden rounded-full bg-border-divider">
                    <span className="block h-full rounded-full bg-action-primary transition-[width]" style={{ width: `${progress}%` }} />
                  </span>
                  {formatPercent(progress)}
                </span>
              ),
              tone: "brand",
            },
            { label: "الحالة", value: "جارٍ الرفع", tone: "brand" },
          ]}
        />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={reset}>
            إلغاء الرفع
          </Button>
        </div>
      </div>
    );
  }
  if (step === "failed") {
    return (
      <div ref={setHeading} className="flex scroll-mt-28 flex-col gap-6">
        <Notice tone="error" title="تعذّر رفع الملف">
          {uploadError ?? "حدث خلل أثناء الرفع. تحقّق من اتصالك ثم أعد المحاولة."}
        </Notice>
        <Details
          rows={[
            ...(file ? [{ label: "الملف", value: file.name }] : []),
            { label: "الحالة", value: "فشل الرفع", tone: "error" as const },
          ]}
        />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={reset}>
            إلغاء
          </Button>
          {file && <Button onClick={() => upload(file)}>أعد الرفع</Button>}
        </div>
        <Dropzone title="أعد رفع الملف" hint={hint} onFile={upload} accept={acceptAttr} />
      </div>
    );
  }
  if (step === "review" && file && path) {
    return (
      <form ref={setHeading} action={action} className="flex scroll-mt-28 flex-col gap-6">
        <Notice tone="warning" title="راجع قبل الإرسال">
          تأكّد من الملف والملاحظات — بعد الإرسال يصل ملفك للمدرب مباشرة، ويمكنك استبداله فقط قبل بدء المراجعة وحتى الموعد النهائي.
        </Notice>
        <Details
          rows={[
            { label: "الملف المرفق", value: `${file.name} · ${formatBytes(file.size)}` },
            { label: "الموعد النهائي", value: dueText(assignment.dueAt) },
            { label: "الحالة", value: "جاهز للإرسال", tone: "brand" },
          ]}
        />
        <input type="hidden" name="assignmentId" value={assignment.id} />
        <input type="hidden" name="filePath" value={path} />
        <input type="hidden" name="fileName" value={file.name.slice(0, 200)} />
        <input type="hidden" name="fileSize" value={file.size} />
        <Textarea
          name="note"
          label={mode === "revision" ? "ما الذي عدّلته؟ (اختياري)" : "ملاحظاتك للمدرب (اختياري)"}
          placeholder={mode === "revision" ? "اذكر باختصار ما غيّرته ليسهل على المدرب المراجعة…" : "أي توضيح يساعد المدرب على المراجعة…"}
          maxLength={4000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={state.fieldErrors?.note}
        />
        {state.status === "error" && (
          <p role="alert" className="rounded-12 border-[1.5px] border-state-error bg-state-error-bg px-4 py-3 type-small text-state-error">
            {state.message}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={reset} disabled={pending}>
            إلغاء
          </Button>
          <Button type="submit" loading={pending}>
            {mode === "revision" ? "أرسل النسخة المعدّلة" : mode === "replace" ? "استبدل الملف المُرسل" : "أرسل الواجب"}
          </Button>
        </div>
      </form>
    );
  }
  if (step === "sent" && state.submission) {
    const at = state.submission.submittedAt;
    return (
      <div ref={setHeading} className="flex scroll-mt-28 flex-col gap-6">
        <Notice tone="success" title="أُرسل واجبك">
          وصل واجبك للمدرب. ستصلك النتيجة عند اكتمال المراجعة.
        </Notice>
        <Details
          rows={[
            { label: "وقت الإرسال", value: `${formatDayMonth(at)} · ${formatTime(at)}` },
            { label: "رقم التسليم", value: <span dir="ltr">{`SUB-${new Date(at).getFullYear()}-${state.submission.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`}</span> },
            { label: "الملف المرسل", value: file?.name ?? "" },
            { label: "الحالة", value: "قيد المراجعة", tone: "warning" },
          ]}
        />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/trainee/assignments">عد إلى الواجبات</ButtonLink>
          <Button variant="secondary" onClick={() => router.refresh()}>
            اعرض حالة الواجب
          </Button>
        </div>
      </div>
    );
  }

  /* ── Idle presentation per mode ── */
  if (mode === "late") {
    return (
      <div className="flex flex-col gap-6">
        <Notice tone="error" title="انتهى الموعد النهائي">
          الإرسال المتأخر غير متاح لهذا الواجب.
        </Notice>
        <Details
          rows={[
            { label: "الواجب", value: assignment.title },
            { label: "انتهى الموعد", value: dueText(assignment.dueAt) },
            { label: "الحالة", value: "متأخر — الإرسال مغلق", tone: "error" },
          ]}
        />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/trainee/assignments">عد إلى الواجبات</ButtonLink>
        </div>
      </div>
    );
  }
  if (mode === "revision") {
    return (
      <section aria-labelledby="resubmit-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
        <h2 id="resubmit-title" className="type-h3 text-text-primary">
          أعد التسليم
        </h2>
        <Dropzone title="اسحب الملف المعدّل هنا أو اختر من جهازك" hint={hint} onFile={upload} accept={acceptAttr} />
        <p className="type-caption text-text-muted">
          المحاولة {toArabicDigits(assignment.attemptsUsed + 1)} من {toArabicDigits(assignment.maxAttempts)} · الموعد النهائي {dueText(assignment.dueAt)}
        </p>
      </section>
    );
  }
  if (mode === "replace" && assignment.current) {
    const c = assignment.current;
    return (
      <section aria-labelledby="yours-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="yours-title" className="min-w-0 flex-1 type-h3 text-text-primary">
            تسليمك
          </h2>
          <span className="rounded-full bg-bg-page px-3 py-1 type-caption text-text-secondary">
            المحاولة {toArabicDigits(assignment.attemptsUsed)} من {toArabicDigits(assignment.maxAttempts)}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-16 border-[1.5px] border-state-success bg-state-success-bg p-6 text-center">
          <Glyph icon={CircleCheck} size={24} className="text-state-success" />
          <p className="type-subtitle text-state-success">تم رفع الملف بنجاح</p>
          <p className="type-caption text-text-muted">
            {[c.fileName, formatBytes(c.fileSize), `سُلّم في ${formatDayMonth(c.submittedAt)} ${formatTime(c.submittedAt)}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        {c.note && (
          <div className="flex flex-col gap-2">
            <p className="type-small text-text-secondary">ملاحظاتك للمدرب</p>
            <p className="rounded-12 border-[1.5px] border-border-default px-4 py-3.5 type-body text-text-primary">{c.note}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex h-12 cursor-pointer items-center justify-center rounded-12 px-6 type-button text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-brand-tint has-focus-visible:outline-2 has-focus-visible:outline-border-focus">
            استبدل الملف
            <input
              type="file"
              accept={acceptAttr}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </label>
          <p className="min-w-0 flex-1 type-caption text-text-muted">
            يمكنك الاستبدال حتى {assignment.dueAt ? `الموعد النهائي (${formatDate(assignment.dueAt)})` : "بدء المراجعة"} ما لم يبدأ المدرب المراجعة. بعده يُقفل التسليم ويبدأ التقييم.
          </p>
        </div>
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <Notice tone="brand" title="ابدأ تسليم واجبك">
        ارفع ملف الحل ثم راجعه قبل الإرسال.
      </Notice>
      <Details
        rows={[
          { label: "الواجب", value: assignment.title },
          { label: "الدورة", value: assignment.courseTitle },
          { label: "الموعد النهائي", value: dueText(assignment.dueAt) },
          { label: "نوع التسليم", value: `ملف ${assignment.acceptedFormats}` },
          { label: "الحالة", value: assignment.statusLabel, tone: "muted" },
        ]}
      />
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/trainee/assignments" variant="secondary">
          عد إلى الواجبات
        </ButtonLink>
        <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-12 bg-action-primary px-6 type-button text-text-on-brand shadow-hero hover:bg-action-primary-hover has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-border-focus">
          ارفع ملف الحل
          <input
            type="file"
            accept={acceptAttr}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <Dropzone title="ارفع ملف الحل" hint={hint} onFile={upload} accept={acceptAttr} />
    </div>
  );
}
