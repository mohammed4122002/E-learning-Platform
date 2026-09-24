"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CircleCheckBig, FileSpreadsheet, FileText, Bookmark, Image as ImageIcon, Lock, SquarePen, Trash2, Upload, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDayMonth, formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import { checkLessonFile, uploadLessonMedia, type UploadHandle } from "@/lib/lesson-upload";
import { formatSize } from "@/lib/trainer-courses";
import type { CourseFileRow, InheritedUnit } from "@/lib/data/trainer-course-page";
import { addCourseFile, courseFileUrl, deleteCourseFile, updateCourseFile } from "@/app/(trainer)/trainer/courses/actions";

/* TRR-CRS-05 · ٣ الملفات (335:12950): locked program materials + this course's own files (upload → draft →
   publish; publishing notifies current trainees through a DB trigger). */

function fileIcon(mime: string): { icon: LucideIcon; tone: string } {
  if (mime.includes("sheet") || mime.includes("excel")) return { icon: FileSpreadsheet, tone: "text-state-success" };
  if (mime.startsWith("image/")) return { icon: ImageIcon, tone: "text-text-brand" };
  return { icon: FileText, tone: "text-state-error" };
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

async function openSigned(courseId: string, path: string, bucket: "lesson-media" | "program-materials", onError: (m: string) => void) {
  const res = await courseFileUrl(courseId, path, bucket);
  if (res.ok && res.data) window.open(res.data.url, "_blank", "noopener");
  else onError(res.ok ? "تعذّر فتح الملف." : res.error);
}

export function InheritedMaterials({ courseId, units }: { courseId: string; units: InheritedUnit[] }) {
  const [open, setOpen] = useState<InheritedUnit | null>(null);
  const toast = useToast();
  const total = units.reduce((s, u) => s + u.files.length, 0);
  return (
    <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-[12rem] flex-1 type-h2 text-text-primary">مواد البرنامج الموروثة</h2>
        <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-disabled px-3.5 py-[9px] type-subtitle text-text-secondary">
          {pluralAr(total, ["ملف واحد", "ملفان", "ملفات", "ملفًا"])} · مقفلة
          <Glyph icon={Lock} size={20} />
        </span>
      </div>
      {units.length === 0 ? (
        <p className="rounded-16 bg-bg-page px-5 py-6 text-center type-body text-text-secondary">لا مواد مرفقة في البرنامج.</p>
      ) : (
        units.map((u) => (
          <div key={u.index} className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5 sm:flex-nowrap">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
              <Glyph icon={Bookmark} size={20} />
            </span>
            <p className="min-w-0 flex-1 type-subtitle text-text-primary">
              الفصل {toArabicDigits(u.index)} · {u.title}
            </p>
            <p className="type-body text-text-muted">
              {pluralAr(u.files.length, ["ملف واحد", "ملفان", "ملفات", "ملفًا"])} · {formatSize(u.size)}
            </p>
            <Button size="s" variant="ghost" className="w-[120px]" onClick={() => setOpen(u)}>
              اعرض
            </Button>
          </div>
        ))
      )}
      <Modal open={open !== null} onClose={() => setOpen(null)} title={open ? `الفصل ${toArabicDigits(open.index)} · ${open.title}` : ""}>
        <ul className="flex flex-col gap-2.5">
          {open?.files.map((f) => (
            <li key={f.path} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3">
              <Glyph icon={FileText} size={20} className="text-text-brand" />
              <span className="min-w-0 flex-1 truncate type-body text-text-primary">{f.name}</span>
              <span className="type-caption text-text-muted">{formatSize(f.size)}</span>
              <Button size="s" variant="ghost" onClick={() => void openSigned(courseId, f.path, "program-materials", (m) => toast("error", m))}>
                افتح
              </Button>
            </li>
          ))}
        </ul>
      </Modal>
    </section>
  );
}

export function CourseFiles({ courseId, files, canPublish }: { courseId: string; files: CourseFileRow[]; canPublish: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const upload = useRef<UploadHandle | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CourseFileRow | null>(null);
  const [removing, setRemoving] = useState<CourseFileRow | null>(null);
  const [pending, start] = useTransition();
  const now = new Date();

  async function onFile(file: File) {
    const problem = checkLessonFile(file, "file");
    if (problem) return setError(problem);
    setError(null);
    setProgress(0);
    const handle = uploadLessonMedia(file, courseId, "files", setProgress);
    upload.current = handle;
    try {
      const { path } = await handle.promise;
      const res = await addCourseFile(courseId, { title: file.name, path, size: file.size, mime: file.type, publish: false });
      if (!res.ok) throw new Error(res.error);
      toast("success", "رُفع الملف كمسودة — انشره ليظهر للمسجّلين.");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg !== "cancelled") setError(msg && !msg.startsWith("upload_") && msg !== "network" ? msg : "تعذّر رفع الملف. تحقّق من اتصالك ثم أعد المحاولة — يُستأنف الرفع من حيث توقّف.");
    } finally {
      setProgress(null);
      upload.current = null;
    }
  }

  return (
    <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-[12rem] flex-1 type-h2 text-text-primary">مواد خاصة بهذه الدورة</h2>
        <span className="inline-flex items-center gap-[7px] rounded-full bg-state-success-bg px-3.5 py-[9px] type-subtitle text-state-success">
          {pluralAr(files.length, ["ملف واحد", "ملفان", "ملفات", "ملفًا"])} · قابلة للتعديل
          <Glyph icon={SquarePen} size={20} />
        </span>
      </div>
      {files.map((f) => {
        const ic = fileIcon(f.mime);
        const created = new Date(f.createdAt);
        return (
          <div key={f.id} className={`flex flex-wrap items-center gap-3 rounded-12 px-4 py-3.5 sm:flex-nowrap ${f.publishedAt ? "bg-bg-page" : "bg-state-warning-bg"}`}>
            <div className="flex min-w-0 flex-1 basis-full flex-col gap-0.5 sm:basis-auto">
              <p className="truncate type-subtitle text-text-primary">{f.title}</p>
              <p className="type-caption text-text-muted">
                {formatSize(f.size)} · رُفع {sameDay(created, now) ? "اليوم" : formatDayMonth(created)}
              </p>
            </div>
            {f.publishedAt ? (
              <span className="inline-flex shrink-0 items-center gap-[7px] rounded-full bg-state-success-bg px-[11px] py-1.5 type-small text-state-success">
                <Glyph icon={CircleCheckBig} size={16} />
                منشور للمتدربين
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-[7px] rounded-full bg-bg-surface px-[11px] py-1.5 type-small text-state-warning">
                <Glyph icon={FileText} size={16} />
                مسودة — لم يُنشر
              </span>
            )}
            <button type="button" aria-label={`عدّل «${f.title}»`} onClick={() => setEditing(f)} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-surface text-text-secondary focus-ring hover:text-text-brand">
              <Glyph icon={SquarePen} size={16} />
            </button>
            <button type="button" aria-label={`احذف «${f.title}»`} onClick={() => setRemoving(f)} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-surface text-state-error focus-ring">
              <Glyph icon={Trash2} size={16} />
            </button>
            <button
              type="button"
              aria-label={`افتح «${f.title}»`}
              onClick={() => void openSigned(courseId, f.path, "lesson-media", (m) => toast("error", m))}
              className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-surface focus-ring ${ic.tone}`}
            >
              <Glyph icon={ic.icon} size={20} />
            </button>
          </div>
        );
      })}

      {progress !== null ? (
        <div className="flex flex-col gap-2 rounded-16 border-[1.5px] border-dashed border-border-default bg-bg-surface p-6" role="status" aria-live="polite">
          <div className="flex items-center justify-between type-caption text-text-secondary">
            <span>جارٍ الرفع… يُستأنف إن انقطع الاتصال</span>
            <span>{formatPercent(progress)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-border-default">
            <div className="h-full rounded-full bg-action-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <Button size="s" variant="outline" className="self-start" icon={<Glyph icon={X} size={16} />} onClick={() => upload.current?.cancel()}>
            ألغِ الرفع
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-16 border-[1.5px] border-dashed border-border-default bg-bg-surface p-6 text-center focus-ring hover:bg-bg-brand-tint"
        >
          <Glyph icon={Upload} size={24} className="text-text-secondary" />
          <span className="type-subtitle text-text-primary">أضف ملفًا لهذه الدورة</span>
          <span className="type-caption text-text-muted">PDF · Excel · صور حتى ٥٠ م.ب · يظهر للمسجّلين فور نشره</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept=".pdf,.xlsx,.xls,.docx,.pptx,.zip,.jpg,.jpeg,.png"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onFile(f);
        }}
      />
      {error && (
        <p role="alert" className="type-caption text-state-error">
          {error}
        </p>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="تعديل الملف">
        {editing && (
          <FileForm
            key={editing.id}
            file={editing}
            canPublish={canPublish}
            pending={pending}
            onCancel={() => setEditing(null)}
            onSave={(patch) =>
              start(async () => {
                const res = await updateCourseFile(courseId, editing.id, patch);
                if (!res.ok) return toast("error", res.error);
                toast("success", patch.publish === true ? "نُشر الملف وأُبلغ المسجّلون." : patch.publish === false ? "أُخفي الملف عن المتدربين." : "حُفظ الملف.");
                setEditing(null);
                router.refresh();
              })
            }
          />
        )}
      </Modal>
      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="حذف الملف"
        destructive
        footer={
          <>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  if (!removing) return;
                  const res = await deleteCourseFile(courseId, removing.id);
                  if (!res.ok) return toast("error", res.error);
                  toast("success", "حُذف الملف.");
                  setRemoving(null);
                  router.refresh();
                })
              }
            >
              احذف
            </Button>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        <p>سيُحذف «{removing?.title}» نهائيًا ولن يراه المسجّلون.</p>
      </Modal>
    </section>
  );
}

function FileForm({
  file,
  canPublish,
  pending,
  onSave,
  onCancel,
}: {
  file: CourseFileRow;
  canPublish: boolean;
  pending: boolean;
  onSave: (patch: { title?: string; publish?: boolean }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(file.title);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ title: title.trim() });
      }}
    >
      <Input label="اسم الملف" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={pending} disabled={title.trim().length < 1 || title.trim() === file.title}>
          احفظ الاسم
        </Button>
        {file.publishedAt ? (
          <Button variant="outline" loading={pending} onClick={() => onSave({ publish: false })}>
            أخفِ عن المتدربين
          </Button>
        ) : (
          <Button variant="secondary" loading={pending} disabled={!canPublish} onClick={() => onSave({ publish: true })}>
            انشر للمتدربين
          </Button>
        )}
        <Button variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
