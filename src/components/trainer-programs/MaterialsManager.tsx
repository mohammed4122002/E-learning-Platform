"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CircleAlert, CircleCheck, FileText, Info, LoaderCircle, ShieldAlert, Upload, Video } from "lucide-react";
import { addMaterial } from "@/app/(trainer)/trainer/programs/actions";
import { announceSaved } from "@/components/trainer-programs/SavedIndicator";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Radio } from "@/components/ui/Choice";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { env } from "@/lib/env";
import { toArabicDigits } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { UPLOAD_LIMITS, filesWord, formatBytes } from "@/lib/trainer-programs";

export type MaterialsUnit = { id: string; title: string; files: number; bytes: number };

type Upload = { id: string; unitId: string; name: string; size: number; loaded: number; state: "uploading" | "failed"; error?: string; file: File };

const ACCEPT = "video/mp4,application/pdf,image/jpeg,image/png";

/** Unique client-side id / object name for an upload. */
function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function uploadWithProgress(path: string, file: File, token: string, onProgress: (loaded: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${env.supabaseUrl}/storage/v1/object/program-materials/${path.split("/").map(encodeURIComponent).join("/")}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", env.supabaseKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

/** TRR-PRG-02 · ٣ المواد (314:11174): per-unit files, real upload progress, failures with retry. */
export function MaterialsManager({ programId, userId, units }: { programId: string; userId: string; units: MaterialsUnit[] }) {
  const router = useRouter();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [picking, setPicking] = useState(false);
  const [target, setTarget] = useState(units[0]?.id ?? "");
  const [pending, setPending] = useState<File[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const retryUnit = useRef<string | null>(null);

  const totalFiles = units.reduce((a, u) => a + u.files, 0);
  const totalBytes = units.reduce((a, u) => a + u.bytes, 0);

  function patch(id: string, p: Partial<Upload>) {
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...p } : u)));
  }

  async function start(unitId: string, files: File[]) {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    let used = totalBytes + uploads.reduce((a, u) => a + u.size, 0);
    for (const file of files) {
      const id = uniqueSuffix();
      const isVideo = file.type === "video/mp4";
      const limit = isVideo ? UPLOAD_LIMITS.videoBytes : UPLOAD_LIMITS.docBytes;
      const base: Upload = { id, unitId, name: file.name, size: file.size, loaded: 0, state: "uploading", file };
      let error: string | null = null;
      if (!ACCEPT.split(",").includes(file.type)) error = `«${file.name}» نوع غير مدعوم — ارفع فيديو MP4 أو PDF أو صورة.`;
      else if (file.size > limit) error = `«${file.name}» تجاوز الحد الأقصى ${isVideo ? "٥٠٠ م.ب" : "٥٠ م.ب"} — اضغط الملف أو قسّمه إلى جزأين.`;
      else if (used + file.size > UPLOAD_LIMITS.programBytes) error = `«${file.name}» يتجاوز إجمالي البرنامج (٥ غ.ب).`;
      else if (!token) error = "انتهت جلستك. سجّل دخولك مرة أخرى ثم أعد الرفع.";
      if (error) {
        setUploads((list) => [...list, { ...base, state: "failed", error }]);
        continue;
      }
      used += file.size;
      setUploads((list) => [...list, base]);
      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
      const path = `${userId}/${programId}/${uniqueSuffix()}.${ext}`;
      try {
        await uploadWithProgress(path, file, token!, (loaded) => patch(id, { loaded }));
        const res = await addMaterial({ programId, unitId, path, name: file.name, size: file.size, type: file.type });
        if (!res.ok) throw new Error(res.message);
        setUploads((list) => list.filter((u) => u.id !== id));
        announceSaved(new Date().toISOString());
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error && e.message && !/^\d+$|^network$/.test(e.message) ? e.message : `تعذّر رفع «${file.name}». تحقّق من اتصالك ثم أعد الرفع.`;
        patch(id, { state: "failed", error: msg });
      }
    }
  }

  function chooseFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    if (units.length === 1) void start(units[0].id, list);
    else {
      setPending(list);
      setPicking(true);
    }
  }

  return (
    <section className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 flex-1 type-h2 text-text-primary">دورات البرنامج</h2>
        <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-brand-tint px-3.5 py-[9px] text-[16px] leading-[1.5] text-text-brand">
          <Glyph icon={Upload} size={20} />
          {filesWord(totalFiles)} · {formatBytes(totalBytes)}
        </span>
      </div>

      {units.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-16 bg-bg-page px-5 py-8 text-center">
          <p className="type-title text-text-primary">لا فصول لترفع لها مواد بعد</p>
          <p className="type-small text-text-secondary">أضف فصول البرنامج أولًا من خطوة «الأهداف والمحتوى»، ثم ارفع ملفات كل فصل هنا.</p>
          <ButtonLink href={`/trainer/programs/${programId}/curriculum?add=chapter`} variant="outline">
            أضف فصلًا
          </ButtonLink>
        </div>
      )}

      {units.map((u, i) => {
        const mine = uploads.filter((x) => x.unitId === u.id);
        const failed = mine.filter((x) => x.state === "failed");
        const active = mine.filter((x) => x.state === "uploading");
        const loaded = active.reduce((a, x) => a + x.loaded, 0);
        const total = active.reduce((a, x) => a + x.size, 0);
        const pct = total ? Math.round((loaded / total) * 100) : 0;
        const tone = failed.length ? "failed" : active.length ? "uploading" : u.files > 0 ? "done" : "empty";
        return (
          <article key={u.id} className={`flex flex-col gap-3 rounded-16 px-5 pt-[18px] pb-5 ${tone === "failed" ? "border-2 border-state-error bg-state-error-bg" : "bg-bg-page"}`}>
            <div className="flex flex-wrap items-center gap-3.5">
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface ${tone === "failed" ? "text-state-error" : tone === "uploading" ? "text-state-warning" : tone === "done" ? "text-state-success" : "text-text-muted"}`}
              >
                {tone === "uploading" ? (
                  <LoaderCircle aria-hidden size={20} strokeWidth={1.4} absoluteStrokeWidth className="animate-[tg-spin_0.9s_linear_infinite]" />
                ) : (
                  <Glyph icon={tone === "failed" ? CircleAlert : tone === "done" ? CircleCheck : Upload} size={20} />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <h3 className="type-title text-text-primary">
                  <Link href={`/trainer/programs/${programId}/curriculum?edit=${u.id}`} className="rounded-8 hover:underline focus-ring">
                    دورة {toArabicDigits(i + 1)} · {u.title}
                  </Link>
                </h3>
                <p className="type-body text-text-muted">
                  {filesWord(u.files)} · {formatBytes(u.bytes)}
                </p>
              </div>
              {tone === "done" && (
                <span className="inline-flex items-center gap-[7px] rounded-full bg-state-success-bg px-[11px] py-1.5 type-small text-state-success">
                  <Glyph icon={CircleCheck} size={16} />
                  مكتمل
                </span>
              )}
              {tone === "empty" && (
                <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-disabled px-[11px] py-1.5 type-small text-text-muted">
                  <Glyph icon={Upload} size={16} />
                  لا ملفات بعد
                </span>
              )}
              {tone === "uploading" && (
                <span className="inline-flex items-center gap-[7px] rounded-full bg-state-warning-bg px-[11px] py-1.5 type-small text-state-warning">
                  <LoaderCircle aria-hidden size={16} strokeWidth={1.25} absoluteStrokeWidth className="animate-[tg-spin_0.9s_linear_infinite]" />
                  جارٍ الرفع · {toArabicDigits(pct)}٪
                </span>
              )}
              {tone === "failed" && (
                <span className="inline-flex items-center gap-[7px] rounded-full px-[11px] py-1.5 type-small text-state-error">
                  <Glyph icon={CircleAlert} size={16} />
                  {failed.length === 1 ? "ملف واحد فشل رفعه" : `${toArabicDigits(failed.length)} ملفات فشل رفعها`}
                </span>
              )}
            </div>
            {tone === "uploading" && (
              <div role="progressbar" aria-label={`رفع ملفات ${u.title}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2.5 w-full max-w-[400px] overflow-hidden rounded-full bg-border-default">
                <div className="h-full rounded-full bg-state-warning transition-[width]" style={{ width: `${pct}%` }} />
              </div>
            )}
            {failed.map((f) => (
              <div key={f.id} className="flex flex-col gap-3 rounded-12 bg-bg-surface px-3.5 py-3 sm:flex-row sm:items-center">
                <p className="min-w-0 flex-1 type-body text-state-error">{f.error}</p>
                <Button
                  size="s"
                  onClick={() => {
                    setUploads((list) => list.filter((x) => x.id !== f.id));
                    if (f.size > (f.file.type === "video/mp4" ? UPLOAD_LIMITS.videoBytes : UPLOAD_LIMITS.docBytes) || !ACCEPT.split(",").includes(f.file.type)) {
                      retryUnit.current = u.id;
                      fileRef.current?.click();
                    } else void start(u.id, [f.file]);
                  }}
                  className="w-[120px]"
                >
                  أعد الرفع
                </Button>
              </div>
            ))}
          </article>
        );
      })}

      {units.length > 0 && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            chooseFiles(e.dataTransfer.files);
          }}
          className={`flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-16 border-[1.5px] border-dashed p-6 text-center focus-ring ${dragOver ? "border-action-primary bg-bg-brand-tint" : "border-border-default bg-bg-surface"}`}
        >
          <Glyph icon={Upload} size={24} className="text-text-primary" />
          <span className="text-[16px] leading-[1.5] text-text-primary">أضف ملفات لفصل</span>
          <span className="type-caption text-text-muted">فيديو MP4 حتى ٥٠٠ م.ب · PDF وصور حتى ٥٠ م.ب · لا حد لعدد الملفات</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const files = e.target.files;
          const unit = retryUnit.current;
          retryUnit.current = null;
          if (unit && files?.length) void start(unit, Array.from(files));
          else chooseFiles(files);
          e.target.value = "";
        }}
      />

      <Modal
        open={picking}
        onClose={() => {
          setPicking(false);
          setPending(null);
        }}
        title="أضف ملفات لفصل"
        footer={
          <>
            <Button
              onClick={() => {
                if (pending && target) void start(target, pending);
                setPicking(false);
                setPending(null);
              }}
              disabled={!target}
            >
              ارفع {pending ? filesWord(pending.length) : ""}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPicking(false);
                setPending(null);
              }}
            >
              إلغاء
            </Button>
          </>
        }
      >
        <p className="mb-3">اختر الفصل الذي تنتمي إليه الملفات:</p>
        <div role="radiogroup" className="flex flex-col">
          {units.map((u, i) => (
            <Radio key={u.id} name="material-unit" value={u.id} checked={target === u.id} onChange={() => setTarget(u.id)}>
              دورة {toArabicDigits(i + 1)} · {u.title}
            </Radio>
          ))}
        </div>
      </Modal>
    </section>
  );
}

/** «حدود الرفع» card (314:11174). */
export function UploadLimits() {
  const rows = [
    { icon: Video, text: "فيديو MP4 · حتى ٥٠٠ م.ب للملف" },
    { icon: FileText, text: "PDF وصور · حتى ٥٠ م.ب" },
    { icon: Upload, text: "إجمالي البرنامج · حتى ٥ غ.ب", tone: "text-state-warning" },
    { icon: ShieldAlert, text: "لا ترفع مواد لا تملك حقوقها", tone: "text-state-error" },
  ];
  return (
    <section className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <h2 className="type-h2 text-text-primary">حدود الرفع</h2>
      <ul className="flex flex-col gap-[18px]">
        {rows.map((r) => (
          <li key={r.text} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
            <Glyph icon={r.icon} size={20} className={r.tone ?? "text-text-brand"} />
            <span className="type-body text-text-primary">{r.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MaterialsInfo() {
  return (
    <section className="flex w-full items-start gap-3.5 rounded-16 border-2 border-state-info bg-state-info-bg px-[22px] pt-5 pb-[22px]">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-info">
        <Glyph icon={Info} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="type-h3 text-state-info">المواد تُنتَج خارج المنصة</p>
        <p className="type-body-lg text-text-secondary">المنصة لا توفّر تسجيلًا ولا استوديو ولا محرّر فيديو. سجّل موادك بأي أداة تناسبك ثم ارفعها هنا للمراجعة والبيع.</p>
      </div>
    </section>
  );
}
