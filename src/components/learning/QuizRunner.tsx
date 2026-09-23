"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CircleCheck, ClipboardCheck, Hourglass, RefreshCw, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { AccentProgress } from "@/components/course/CourseCard";
import { submitQuiz } from "@/app/(workspace)/trainee/learn/actions";
import { formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import { ORDINAL_F, OPTION_LETTERS, attemptLabel } from "@/lib/learning";
import type { QuizQuestion } from "@/lib/data/learning";


function clock(total: number) {
  const s = Math.max(0, Math.floor(total));
  return toArabicDigits(`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
}

type Props = {
  quizId: string;
  title: string;
  passPercent: number;
  timeLimitMinutes: number | null;
  attemptNo: number;
  maxAttempts: number;
  questions: QuizQuestion[];
};

/** TRN-LRN-04 · الاختبار (Figma 191:10076): one question at a time, question map, rules, review-and-submit. */
export function QuizRunner({ quizId, title, passPercent, timeLimitMinutes, attemptNo, maxAttempts, questions }: Props) {
  const router = useRouter();
  const storageKey = `tg:quiz:${quizId}:${attemptNo}`;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const submitted = useRef(false);

  // Restore answers + start time (the timer keeps running if the trainee leaves — Figma rule).
  useEffect(() => {
    let saved: { answers?: Record<string, string>; startedAt?: number } = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
    } catch {
      saved = {};
    }
    const start = saved.startedAt ?? Date.now();
    const restore = setTimeout(() => {
      setStartedAt(start);
      if (saved.answers) setAnswers(saved.answers);
      setNow(Date.now());
    }, 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(restore);
      clearInterval(t);
    };
  }, [storageKey]);
  useEffect(() => {
    if (startedAt === null) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ answers, startedAt }));
    } catch {
      /* private mode — answers stay in memory */
    }
  }, [answers, startedAt, storageKey]);

  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const q = questions[index];
  const elapsed = now && startedAt ? (now - startedAt) / 1000 : 0;
  const remaining = timeLimitMinutes ? timeLimitMinutes * 60 - elapsed : null;

  const send = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    setError(null);
    startTransition(async () => {
      const res = await submitQuiz({ quizId, answers });
      if (res.ok) {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
        router.replace(`/trainee/learn/quiz/${quizId}?attempt=${res.attemptId}`);
        router.refresh();
      } else {
        submitted.current = false;
        setConfirm(false);
        setError(res.message);
      }
    });
  }, [answers, quizId, router, storageKey]);

  // Time is up → submit what was answered.
  const expired = remaining !== null && now !== null && remaining <= 0;
  useEffect(() => {
    if (!expired || submitted.current) return;
    const t = setTimeout(send, 0);
    return () => clearTimeout(t);
  }, [expired, send]);

  const mapState = useMemo(
    () => questions.map((x, i) => (i === index ? "current" : answers[x.id] !== undefined ? "answered" : "todo")),
    [answers, index, questions],
  );
  if (!q) return null;
  const chosen = answers[q.id];

  return (
    <div className="flex flex-col gap-[26px]">
      <section aria-labelledby="quiz-title" className="flex w-full flex-col gap-5 rounded-22 border-2 border-state-warning bg-state-warning-bg px-5 py-6 sm:flex-row sm:items-center sm:px-7">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <ul className="flex flex-wrap items-center gap-2">
            <li className="flex items-center gap-1.5 rounded-full bg-bg-surface px-3 py-1 type-caption text-text-secondary">
              <Glyph icon={RefreshCw} size={16} />
              {attemptLabel(attemptNo, maxAttempts)}
            </li>
            <li className="flex items-center gap-1.5 rounded-full bg-bg-surface px-3 py-1 type-caption text-text-secondary">
              <Glyph icon={ClipboardCheck} size={16} />
              السؤال {toArabicDigits(index + 1)} من {toArabicDigits(questions.length)}
            </li>
          </ul>
          <h2 id="quiz-title" className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">
            {title}
          </h2>
          <div className="flex items-center justify-between gap-3 type-caption text-text-secondary">
            <span>
              أجبت على {toArabicDigits(answered)} من {pluralAr(questions.length, ["سؤال واحد", "سؤالين", "أسئلة", "سؤالًا"])}
            </span>
            <span>{formatPercent((answered / questions.length) * 100)}</span>
          </div>
          <AccentProgress percent={(answered / questions.length) * 100} label="نسبة الأسئلة المُجاب عنها" />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1 rounded-16 bg-bg-surface px-6 py-4" role="timer" aria-live="off">
          <span className={`text-[32px] leading-none font-bold tabular-nums ${remaining !== null && remaining < 60 ? "text-state-error" : "text-state-warning"}`} dir="ltr">
            {remaining !== null ? clock(remaining) : clock(elapsed)}
          </span>
          <span className="type-caption text-text-muted">{remaining !== null ? "الوقت المتبقي" : "الوقت المنقضي"}</span>
        </div>
      </section>

      {error && (
        <Alert tone="error" title="تعذّر إرسال إجاباتك">
          {error}
        </Alert>
      )}

      <div className="flex w-full flex-col gap-[26px] lg:flex-row lg:items-start">
        <section aria-labelledby="question-text" className="flex min-w-0 flex-1 flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <span className="self-start rounded-full bg-bg-brand-tint px-3 py-1 type-caption text-text-brand">سؤال {toArabicDigits(index + 1)}</span>
          <fieldset className="flex flex-col gap-4">
            <legend id="question-text" className="mb-4 type-h3 text-text-primary">
              {q.text}
            </legend>
            {q.options.map((opt, i) => {
              const value = String(i);
              const selected = chosen === value;
              return (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-12 px-4 py-3.5 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-border-focus ${
                    selected ? "border-2 border-action-primary bg-bg-brand-tint px-[15px] py-[13px]" : "border-[1.5px] border-border-default bg-bg-surface hover:bg-bg-page"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex size-8 shrink-0 items-center justify-center rounded-8 type-subtitle ${selected ? "bg-action-primary text-text-on-brand" : "bg-bg-page text-text-secondary"}`}
                  >
                    {OPTION_LETTERS[i] ?? toArabicDigits(i + 1)}
                  </span>
                  <span className={`min-w-0 flex-1 type-body ${selected ? "text-text-brand" : "text-text-primary"}`}>{opt}</span>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={value}
                    checked={selected}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: value }))}
                    className="size-5 shrink-0 cursor-pointer accent-action-primary"
                  />
                </label>
              );
            })}
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            {index < questions.length - 1 ? (
              <Button onClick={() => setIndex(index + 1)}>السؤال التالي</Button>
            ) : (
              <Button variant="accent" onClick={() => setConfirm(true)}>
                راجع وأرسل الإجابات
              </Button>
            )}
            <Button variant="outline" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
              السابق
            </Button>
            {index < questions.length - 1 && chosen === undefined && (
              <Button variant="text" onClick={() => setIndex(index + 1)}>
                تخطَّ مؤقتًا
              </Button>
            )}
          </div>
        </section>

        <aside aria-label="خريطة الأسئلة وقواعد الاختبار" className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
          <section aria-labelledby="map-title" className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
            <h2 id="map-title" className="type-h3 text-text-primary">
              خريطة الأسئلة
            </h2>
            <ol className="flex flex-wrap gap-2.5">
              {questions.map((x, i) => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`السؤال ${toArabicDigits(i + 1)}${mapState[i] === "answered" ? " — أُجيب عليه" : mapState[i] === "current" ? " — الحالي" : " — لم يُجب بعد"}`}
                    aria-current={mapState[i] === "current" ? "step" : undefined}
                    className={`flex size-12 cursor-pointer items-center justify-center rounded-12 type-h4 focus-ring ${
                      mapState[i] === "current"
                        ? "bg-action-primary text-text-on-brand"
                        : mapState[i] === "answered"
                          ? "border-[1.5px] border-state-success bg-state-success-bg text-state-success"
                          : "border-[1.5px] border-border-default bg-bg-page text-text-secondary"
                    }`}
                  >
                    {toArabicDigits(i + 1)}
                  </button>
                </li>
              ))}
            </ol>
            <ul className="flex flex-col gap-2 type-caption text-text-secondary">
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-3 rounded-full bg-state-success" /> أُجيب عليه
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-3 rounded-full bg-action-primary" /> السؤال الحالي
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-3 rounded-full bg-border-default" /> لم يُجب بعد
              </li>
            </ul>
          </section>
          <section aria-labelledby="rules-title" className="flex flex-col gap-3 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
            <h2 id="rules-title" className="type-h3 text-text-primary">
              قواعد الاختبار
            </h2>
            <ul className="flex flex-col gap-3 type-small text-text-secondary">
              <li className="flex items-center gap-2.5">
                <Glyph icon={Target} size={16} className="text-text-muted" />
                درجة النجاح {formatPercent(passPercent)} — {pluralAr(Math.ceil((passPercent / 100) * questions.length), ["إجابة صحيحة", "إجابتان صحيحتان", "إجابات صحيحة", "إجابة صحيحة"])}
              </li>
              <li className="flex items-center gap-2.5">
                <Glyph icon={RefreshCw} size={16} className="text-text-muted" />
                لديك {pluralAr(maxAttempts, ["محاولة واحدة", "محاولتان", "محاولات", "محاولة"])} · هذه {ORDINAL_F[attemptNo - 1] ?? toArabicDigits(attemptNo)}
              </li>
              <li className="flex items-center gap-2.5">
                <Glyph icon={Hourglass} size={16} className="text-text-muted" />
                {timeLimitMinutes ? `${pluralAr(timeLimitMinutes, ["دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة"])} — المؤقت لا يتوقف عند الخروج` : "لا حدّ زمنيًا لهذا الاختبار"}
              </li>
              <li className="flex items-center gap-2.5">
                <Glyph icon={CircleCheck} size={16} className="text-text-muted" />
                يمكنك مراجعة إجاباتك قبل الإرسال
              </li>
            </ul>
          </section>
          <Button variant="accent" size="l" fullWidth onClick={() => setConfirm(true)}>
            راجع وأرسل الإجابات
          </Button>
        </aside>
      </div>

      <Modal
        open={confirm}
        onClose={() => !pending && setConfirm(false)}
        title="إرسال إجاباتك؟"
        footer={
          <>
            <Button size="s" loading={pending} onClick={send}>
              أرسل الإجابات
            </Button>
            <Button size="s" variant="outline" onClick={() => setConfirm(false)} disabled={pending}>
              تابع الإجابة
            </Button>
          </>
        }
      >
        <p>
          أجبت على {toArabicDigits(answered)} من {toArabicDigits(questions.length)}.
          {answered < questions.length ? ` ${pluralAr(questions.length - answered, ["سؤال واحد بلا إجابة", "سؤالان بلا إجابة", "أسئلة بلا إجابة", "سؤالًا بلا إجابة"])} ويُحتسب خطأً.` : ""}
        </p>
        <p className="mt-2">
          بعد الإرسال تُصحَّح إجاباتك فورًا وتُحتسب هذه {attemptLabel(attemptNo, maxAttempts)}، ولا يمكن تعديلها.
        </p>
      </Modal>
    </div>
  );
}
