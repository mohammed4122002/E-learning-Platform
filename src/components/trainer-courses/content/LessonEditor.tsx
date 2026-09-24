"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CircleCheck, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Choice";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatClock, formatPercent, toArabicDigits } from "@/lib/format";
import { checkLessonFile, uploadLessonMedia, videoDuration, type UploadHandle } from "@/lib/lesson-upload";
import { formatSize } from "@/lib/trainer-courses";
import type { TrainerLesson } from "@/lib/data/trainer-courses";
import { courseFileUrl, saveQuiz, updateLesson } from "@/app/(trainer)/trainer/courses/actions";

type Question = { id: string; text: string; options: string[]; answer: number };

/** Lesson editor: title, free preview flag and the material (video/file upload, text body, quiz questions). */
export function LessonEditor({ courseId, lesson, onClose }: { courseId: string; lesson: TrainerLesson; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(lesson.title);
  const [preview, setPreview] = useState(lesson.isPreview);
  const [body, setBody] = useState(lesson.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const upload = useRef<UploadHandle | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<Question[]>(lesson.quiz?.questions ?? []);
  const [passPercent, setPassPercent] = useState(lesson.quiz?.passPercent ?? 60);
  const [timeLimit, setTimeLimit] = useState<number | "">(lesson.quiz?.timeLimitMinutes ?? "");
  const [attempts, setAttempts] = useState(lesson.quiz?.maxAttempts ?? 2);

  const save = (patch: Parameters<typeof updateLesson>[2], okMsg = "حُفظ الدرس.") =>
    start(async () => {
      setError(null);
      const res = await updateLesson(courseId, lesson.id, patch);
      if (!res.ok) return setError(res.error);
      toast("success", okMsg);
      router.refresh();
    });

  async function onFile(file: File) {
    const kind = lesson.kind === "video" ? "video" : "file";
    const problem = checkLessonFile(file, kind);
    if (problem) return setError(problem);
    setError(null);
    const duration = kind === "video" ? await videoDuration(file) : 0;
    setProgress(0);
    const handle = uploadLessonMedia(file, courseId, "lessons", setProgress);
    upload.current = handle;
    try {
      const { path } = await handle.promise;
      const res = await updateLesson(courseId, lesson.id, {
        media_path: path,
        media_size: file.size,
        media_type: file.type,
        ...(kind === "video" ? { duration_seconds: duration } : {}),
      });
      if (!res.ok) throw new Error(res.error);
      toast("success", kind === "video" ? "رُفع الفيديو." : "رُفع الملف.");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg !== "cancelled") setError(msg && !msg.startsWith("upload_") && msg !== "network" ? msg : "تعذّر رفع الملف. تحقّق من اتصالك ثم أعد المحاولة — يُستأنف الرفع من حيث توقّف.");
    } finally {
      setProgress(null);
      upload.current = null;
    }
  }

  const updateQ = (i: number, patch: Partial<Question>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <Modal
      open
      size="l"
      onClose={() => {
        if (progress !== null) return;
        onClose();
      }}
      title={`تعديل الدرس · ${lesson.title}`}
    >
      <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pe-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input label="عنوان الدرس" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          <Button variant="outline" disabled={title.trim() === lesson.title || title.trim().length < 2} loading={pending} onClick={() => save({ title: title.trim() })}>
            احفظ العنوان
          </Button>
        </div>
        <Toggle
          checked={preview}
          onChange={(e) => {
            setPreview(e.target.checked);
            save({ is_preview: e.target.checked }, e.target.checked ? "أصبح الدرس معاينة مجانية." : "أُلغيت المعاينة المجانية.");
          }}
          description="يشاهده الزائر في صفحة البيع قبل الشراء."
        >
          درس معاينة مجاني
        </Toggle>

        {(lesson.kind === "video" || lesson.kind === "file") && (
          <section className="flex flex-col gap-3 rounded-16 bg-bg-page p-4">
            <h3 className="type-subtitle text-text-primary">{lesson.kind === "video" ? "فيديو الدرس" : "ملف الدرس"}</h3>
            {lesson.mediaPath ? (
              <p className="flex flex-wrap items-center gap-2 type-small text-state-success">
                <Glyph icon={CircleCheck} size={16} />
                مرفوع · {formatSize(lesson.mediaSize ?? 0)}
                {lesson.kind === "video" && lesson.durationSeconds > 0 && ` · ${formatClock(lesson.durationSeconds)}`}
                <button
                  type="button"
                  className="cursor-pointer rounded-8 text-text-brand hover:underline focus-ring"
                  onClick={async () => {
                    const res = await courseFileUrl(courseId, lesson.mediaPath!);
                    if (res.ok && res.data) window.open(res.data.url, "_blank", "noopener");
                  }}
                >
                  اعرض
                </button>
              </p>
            ) : (
              <p className="type-small text-state-warning">لم تُرفع مادة بعد — الدرس لا يُنشر بلا مادة.</p>
            )}
            {progress !== null ? (
              <div className="flex flex-col gap-2" role="status" aria-live="polite">
                <div className="flex items-center justify-between type-caption text-text-secondary">
                  <span>جارٍ الرفع… يمكنك الاستئناف إن انقطع الاتصال</span>
                  <span>{formatPercent(progress)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-border-default">
                  <div className="h-full rounded-full bg-action-primary transition-[width]" style={{ width: `${progress}%` }} />
                </div>
                <Button size="s" variant="outline" icon={<Glyph icon={X} size={16} />} onClick={() => upload.current?.cancel()}>
                  ألغِ الرفع
                </Button>
              </div>
            ) : (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  className="sr-only"
                  accept={lesson.kind === "video" ? "video/mp4,video/webm" : ".pdf,.xlsx,.xls,.docx,.pptx,.zip,.jpg,.jpeg,.png"}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void onFile(f);
                  }}
                />
                <Button variant="secondary" icon={<Glyph icon={Upload} size={20} />} onClick={() => fileInput.current?.click()}>
                  {lesson.mediaPath ? "استبدل المادة" : lesson.kind === "video" ? "ارفع الفيديو" : "ارفع الملف"}
                </Button>
                <p className="type-caption text-text-muted">
                  {lesson.kind === "video" ? "MP4 أو WebM حتى ٢ جيجابايت · رفع قابل للاستئناف" : "PDF · Excel · Word · PowerPoint · ZIP · صور حتى ٥٠ م.ب"}
                </p>
              </>
            )}
          </section>
        )}

        {lesson.kind === "text" && (
          <section className="flex flex-col gap-3">
            <Textarea label="نص الدرس" rows={10} value={body} onChange={(e) => setBody(e.target.value)} maxLength={50000} hint="يظهر للمتدرب كما كتبته، مع الحفاظ على الأسطر." />
            <Button loading={pending} disabled={body === (lesson.body ?? "")} onClick={() => save({ body }, "حُفظ نص الدرس.")}>
              احفظ النص
            </Button>
          </section>
        )}

        {lesson.kind === "quiz" && (
          <section className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="درجة النجاح (٪)" type="number" min={0} max={100} value={passPercent} onChange={(e) => setPassPercent(Number(e.target.value))} />
              <Input label="المدة (دقائق)" type="number" min={1} max={600} placeholder="بلا حد" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value === "" ? "" : Number(e.target.value))} />
              <Input label="عدد المحاولات" type="number" min={1} max={10} value={attempts} onChange={(e) => setAttempts(Number(e.target.value))} />
            </div>
            <ol className="flex flex-col gap-4">
              {questions.map((q, i) => (
                <li key={q.id} className="flex flex-col gap-3 rounded-16 bg-bg-page p-4">
                  <div className="flex items-start gap-3">
                    <Textarea label={`السؤال ${toArabicDigits(i + 1)}`} rows={2} value={q.text} onChange={(e) => updateQ(i, { text: e.target.value })} maxLength={1000} />
                    <button type="button" aria-label={`احذف السؤال ${toArabicDigits(i + 1)}`} onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} className="mt-9 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-8 text-state-error hover:bg-state-error-bg focus-ring">
                      <Glyph icon={Trash2} size={16} />
                    </button>
                  </div>
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 type-caption text-text-secondary">الخيارات — حدّد الإجابة الصحيحة</legend>
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name={`answer-${q.id}`}
                          checked={q.answer === oi}
                          onChange={() => updateQ(i, { answer: oi })}
                          aria-label={`الخيار ${toArabicDigits(oi + 1)} هو الإجابة الصحيحة`}
                          className="size-5 shrink-0 cursor-pointer accent-[var(--color-action-primary)]"
                        />
                        <input
                          value={o}
                          onChange={(e) => updateQ(i, { options: q.options.map((x, xi) => (xi === oi ? e.target.value : x)) })}
                          placeholder={`الخيار ${toArabicDigits(oi + 1)}`}
                          maxLength={300}
                          className="h-11 min-w-0 flex-1 rounded-12 border-[1.5px] border-border-default bg-bg-surface px-3 type-body outline-none focus:border-action-primary"
                        />
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            aria-label="احذف الخيار"
                            onClick={() => updateQ(i, { options: q.options.filter((_, xi) => xi !== oi), answer: q.answer === oi ? 0 : q.answer > oi ? q.answer - 1 : q.answer })}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-8 text-text-muted hover:bg-bg-surface focus-ring"
                          >
                            <Glyph icon={X} size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    {q.options.length < 6 && (
                      <button type="button" onClick={() => updateQ(i, { options: [...q.options, ""] })} className="self-start rounded-8 type-small text-text-brand hover:underline focus-ring">
                        + أضف خيارًا
                      </button>
                    )}
                  </fieldset>
                </li>
              ))}
            </ol>
            <Button variant="outline" icon={<Glyph icon={Plus} size={20} />} onClick={() => setQuestions((qs) => [...qs, { id: `q${Date.now().toString(36)}`, text: "", options: ["", ""], answer: 0 }])}>
              أضف سؤالًا
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await saveQuiz(courseId, lesson.id, {
                    passPercent,
                    timeLimitMinutes: timeLimit === "" ? null : timeLimit,
                    maxAttempts: attempts,
                    questions: questions.map((q) => ({ ...q, text: q.text.trim(), options: q.options.map((o) => o.trim()) })),
                  });
                  if (!res.ok) return setError(res.error);
                  toast("success", "حُفظ الاختبار.");
                  router.refresh();
                })
              }
            >
              احفظ الاختبار
            </Button>
          </section>
        )}

        {error && (
          <p role="alert" className="rounded-12 bg-state-error-bg px-4 py-3 type-small text-state-error">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button variant="outline" disabled={progress !== null} onClick={onClose}>
            تم
          </Button>
        </div>
      </div>
    </Modal>
  );
}
