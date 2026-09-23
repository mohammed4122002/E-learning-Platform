"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleCheck,
  Download,
  Eye,
  FileText,
  Gauge,
  ListChecks,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  TriangleAlert,
  VideoOff,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { formatClock, formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import { COMPLETE_AT } from "@/lib/learning";
import { ConnectionStatus } from "./ConnectionStatus";
import { useProgressSaver } from "./useProgressSaver";

export type PlayerLesson = {
  id: string;
  kind: "video" | "text" | "file" | "quiz";
  title: string;
  durationSeconds: number;
  positionSeconds: number;
  done: boolean;
  body: string | null;
  mediaUrl: string | null;
  downloadHref: string | null;
  quiz: { id: string; questionCount: number; passPercent: number; passed: boolean; attemptsUsed: number; maxAttempts: number } | null;
};

export type NextLesson = { title: string; href: string; durationSeconds: number; kind: string } | null;

const SAVE_EVERY = 15; // seconds of playback between throttled saves
const SPEEDS = [1, 1.25, 1.5, 2];

function Frame({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "done" | "error" | "muted" }) {
  const border =
    tone === "done" ? "border-2 border-state-success" : tone === "error" ? "border-2 border-state-error" : "border border-border-default";
  return <section aria-label="مشغّل الدرس" className={`flex w-full flex-col overflow-hidden rounded-22 bg-bg-card shadow-card ${border}`}>{children}</section>;
}

function Unavailable({ title, description, icon = VideoOff }: { title: string; description: string; icon?: typeof VideoOff }) {
  return (
    <Frame tone="muted">
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-bg-page px-6 text-center">
        <span className="flex size-[68px] items-center justify-center rounded-full bg-bg-surface text-text-muted shadow-card">
          <Glyph icon={icon} size={32} />
        </span>
        <p className="type-h4 text-text-primary">{title}</p>
        <p className="max-w-md type-small text-text-secondary">{description}</p>
      </div>
    </Frame>
  );
}

function NextBar({ next }: { next: NextLesson }) {
  if (!next) {
    return (
      <p className="mx-4 mb-4 flex items-center gap-2 rounded-12 bg-state-success-bg px-4 py-3.5 type-small text-state-success sm:mx-[18px]">
        <Glyph icon={CircleCheck} size={20} />
        هذا آخر درس في الدورة.
      </p>
    );
  }
  return (
    <div className="mx-4 mb-4 flex flex-wrap items-center gap-3 rounded-12 bg-state-success-bg px-4 py-3 sm:mx-[18px]">
      <p className="min-w-0 flex-1 type-small text-state-success">
        الدرس التالي: {next.title}
        {next.kind === "video" && next.durationSeconds > 0 ? ` · ${formatClock(next.durationSeconds)}` : ""}
      </p>
      <ButtonLink href={next.href} size="s">
        الدرس التالي
      </ButtonLink>
    </div>
  );
}

/** Figma "Trainee / Recorded · Video Player" (401:4128): gradient stage, resume overlay, watched bar, controls. */
function VideoPlayer({ lesson, next }: { lesson: PlayerLesson; next: NextLesson }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const duration = lesson.durationSeconds;
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(lesson.positionSeconds);
  const [frontier, setFrontier] = useState(lesson.positionSeconds);
  const [realDuration, setRealDuration] = useState(duration);
  const [speed, setSpeed] = useState(1);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(lesson.done);
  const lastReported = useRef(lesson.positionSeconds);
  const frontierRef = useRef(lesson.positionSeconds);
  const lastTime = useRef(lesson.positionSeconds);

  const onCompleted = useCallback(() => {
    setDone(true);
    router.refresh();
  }, [router]);
  const saver = useProgressSaver(lesson.id, onCompleted);

  const total = realDuration || duration || 1;
  const watchedPct = done ? 100 : Math.min(100, Math.round((frontier / total) * 100));

  // Watching is progress (BR-L11): only continuous playback moves the frontier; seeking ahead does not.
  const onTime = () => {
    const v = video.current;
    if (!v) return;
    const t = v.currentTime;
    setCurrent(t);
    const delta = t - lastTime.current;
    lastTime.current = t;
    if (delta > 0 && delta < 2.5 && t > frontierRef.current) {
      frontierRef.current = t;
      setFrontier(t);
    }
    if (frontierRef.current - lastReported.current >= SAVE_EVERY) {
      lastReported.current = frontierRef.current;
      saver.report(frontierRef.current);
    }
  };
  const saveNow = useCallback(() => {
    if (frontierRef.current > lastReported.current) {
      lastReported.current = frontierRef.current;
      saver.report(frontierRef.current);
    }
  }, [saver]);

  useEffect(() => {
    const hide = () => document.visibilityState === "hidden" && saveNow();
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", saveNow);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", saveNow);
      saveNow();
    };
  }, [saveNow]);

  const start = async () => {
    const v = video.current;
    if (!v) return;
    setStarted(true);
    if (v.currentTime < 1 && lesson.positionSeconds > 0 && !lesson.done) {
      v.currentTime = Math.min(lesson.positionSeconds, Math.max(0, (v.duration || duration) - 2));
    }
    lastTime.current = v.currentTime;
    try {
      await v.play();
    } catch {
      /* autoplay blocked — the native controls stay available */
    }
  };
  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (!started) return void start();
    if (v.paused) void v.play();
    else v.pause();
  };
  const seek = (value: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = value;
    lastTime.current = value;
    setCurrent(value);
  };
  const cycleSpeed = () => {
    const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(nextSpeed);
    if (video.current) video.current.playbackRate = nextSpeed;
  };
  const fullscreen = () => {
    const el = video.current;
    if (el?.requestFullscreen) void el.requestFullscreen();
  };

  if (failed) {
    return (
      <Frame tone="error">
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-state-error-bg px-6 text-center">
          <span className="flex size-[68px] items-center justify-center rounded-full bg-bg-surface text-state-error">
            <Glyph icon={TriangleAlert} size={32} />
          </span>
          <p className="type-h4 text-text-primary">تعذّر تشغيل الفيديو</p>
          <p className="max-w-md type-small text-text-secondary">تحقّق من اتصالك ثم أعد المحاولة. تقدّمك السابق محفوظ.</p>
          <button type="button" onClick={() => { setFailed(false); router.refresh(); }} className="flex h-11 cursor-pointer items-center gap-2 rounded-12 bg-bg-surface px-[18px] type-small text-text-primary focus-ring">
            <Glyph icon={RotateCcw} size={16} />
            أعد تحميل الفيديو
          </button>
        </div>
      </Frame>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <Frame tone={done ? "done" : "default"}>
        <div className="relative aspect-video w-full overflow-hidden bg-linear-to-br from-action-primary to-state-info">
          <video
            ref={video}
            src={lesson.mediaUrl ?? undefined}
            preload="metadata"
            playsInline
            controls={false}
            aria-label={`فيديو الدرس: ${lesson.title}`}
            className={`absolute inset-0 size-full bg-black object-contain ${started ? "opacity-100" : "opacity-0"}`}
            onLoadedMetadata={(e) => setRealDuration(Math.round(e.currentTarget.duration) || duration)}
            onTimeUpdate={onTime}
            onPlay={() => setPlaying(true)}
            onPause={() => {
              setPlaying(false);
              saveNow();
            }}
            onEnded={() => {
              setPlaying(false);
              frontierRef.current = Math.max(frontierRef.current, realDuration || duration);
              setFrontier(frontierRef.current);
              saveNow();
            }}
            onError={() => setFailed(true)}
            onClick={toggle}
          />
          {!started && (
            <button
              type="button"
              onClick={start}
              className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4 text-text-on-brand focus-ring"
            >
              <span className="flex size-[68px] items-center justify-center rounded-full bg-bg-surface text-text-brand shadow-float">
                <Glyph icon={done ? CircleCheck : Play} size={32} className={done ? "text-state-success" : ""} />
              </span>
              <span className="type-h3">
                {done ? "أكملت هذا الدرس" : lesson.positionSeconds > 0 ? `استأنف من ${formatClock(lesson.positionSeconds)}` : "ابدأ الدرس"}
              </span>
            </button>
          )}
        </div>
        <div className="flex flex-col gap-4 px-4 pt-4 pb-4 sm:px-[18px]">
          <div className="relative flex h-4 w-full items-center">
            <input
              id={`seek-${lesson.id}`}
              type="range"
              min={0}
              max={total}
              step={1}
              value={Math.min(current, total)}
              onChange={(e) => seek(Number(e.target.value))}
              disabled={!started}
              aria-label="موضع التشغيل"
              aria-valuetext={`${formatClock(current)} من ${formatClock(total)}`}
              className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-default"
            />
            <div className="relative h-2 w-full rounded-full bg-border-divider peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-border-focus">
              <div className={`absolute inset-y-0 start-0 rounded-full ${done ? "bg-state-success" : "bg-action-primary"}`} style={{ width: `${watchedPct}%` }} />
              {started && (
                <div aria-hidden className="absolute top-1/2 size-3.5 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-bg-surface bg-action-primary shadow-knob" style={{ insetInlineStart: `${Math.min(100, (current / total) * 100)}%` }} />
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "إيقاف مؤقت" : "تشغيل"}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-12 bg-bg-page text-text-brand focus-ring"
            >
              <Glyph icon={playing ? Pause : Play} size={20} />
            </button>
            <span className="type-small tabular-nums text-text-secondary" dir="ltr">
              {formatClock(total)} / {formatClock(current)}
            </span>
            <span className="flex-1" />
            <ConnectionStatus state={saver.state === "failed" || saver.state === "offline" ? "idle" : saver.state} onRetry={saver.retry} compact />
            {done ? (
              <span className="flex items-center gap-1.5 rounded-full bg-state-success-bg px-3 py-1.5 type-caption text-state-success">
                <Glyph icon={CircleCheck} size={16} />
                مكتمل
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-bg-brand-tint px-3 py-1.5 type-caption text-text-brand">
                <Glyph icon={Eye} size={16} />
                شوهد {formatPercent(watchedPct)} · يكتمل عند {formatPercent(COMPLETE_AT * 100)}
              </span>
            )}
            <button
              type="button"
              onClick={cycleSpeed}
              aria-label={`سرعة التشغيل ${toArabicDigits(speed)}×`}
              className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-12 bg-bg-page px-3 text-text-primary focus-ring"
            >
              <Glyph icon={Gauge} size={20} />
              <span className="type-caption tabular-nums">{toArabicDigits(speed)}×</span>
            </button>
            <button type="button" onClick={fullscreen} aria-label="ملء الشاشة" className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-12 bg-bg-page text-text-primary focus-ring">
              <Glyph icon={Maximize} size={20} />
            </button>
          </div>
        </div>
        {done && <NextBar next={next} />}
      </Frame>
      <ConnectionStatus state={saver.state === "failed" || saver.state === "offline" ? saver.state : "idle"} message={saver.message} onRetry={saver.retry} />
    </div>
  );
}

/** Text / file lessons count as done once opened (BR-L11). */
function OpenedLesson({ lesson, next }: { lesson: PlayerLesson; next: NextLesson }) {
  const router = useRouter();
  const [done, setDone] = useState(lesson.done);
  const onCompleted = useCallback(() => {
    setDone(true);
    router.refresh();
  }, [router]);
  const saver = useProgressSaver(lesson.id, onCompleted);
  const canComplete = lesson.kind === "text" ? Boolean(lesson.body) : Boolean(lesson.downloadHref);
  const reported = useRef(false);
  useEffect(() => {
    if (!lesson.done && canComplete && lesson.kind === "text" && !reported.current) {
      reported.current = true;
      saver.report(0);
    }
  }, [lesson.done, lesson.kind, canComplete, saver]);

  if (!canComplete) {
    return (
      <Unavailable
        icon={lesson.kind === "file" ? FileText : VideoOff}
        title="لم تُرفع مادة هذا الدرس بعد"
        description="سيصلك إشعار حين يرفعها المدرب. لن يُحتسب الدرس في تقدّمك قبل أن تفتحه."
      />
    );
  }
  return (
    <div className="flex w-full flex-col gap-3">
      <Frame tone={done ? "done" : "default"}>
        {lesson.kind === "text" ? (
          <article className="flex flex-col gap-4 px-5 py-6 sm:px-7">
            <h2 className="type-h3 text-text-primary">نص الدرس</h2>
            <div className="whitespace-pre-line type-body-lg text-text-secondary">{lesson.body}</div>
          </article>
        ) : (
          <div className="flex flex-wrap items-center gap-3 px-5 py-6 sm:px-7">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-state-error-bg text-state-error">
              <Glyph icon={FileText} size={24} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="type-title text-text-primary">{lesson.title}</p>
              <p className="type-caption text-text-muted">يُحتسب الدرس مكتملًا عند فتح الملف.</p>
            </div>
            <a
              href={lesson.downloadHref!}
              onClick={() => setTimeout(() => router.refresh(), 1500)}
              className="inline-flex h-11 items-center gap-2 rounded-12 px-[18px] type-small text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-brand-tint focus-ring"
            >
              <Glyph icon={Download} size={16} />
              نزّل الملف
            </a>
          </div>
        )}
        {done && <NextBar next={next} />}
      </Frame>
      <ConnectionStatus state={saver.state === "failed" || saver.state === "offline" ? saver.state : "idle"} message={saver.message} onRetry={saver.retry} />
    </div>
  );
}

function QuizLesson({ lesson }: { lesson: PlayerLesson }) {
  const q = lesson.quiz;
  if (!q) {
    return <Unavailable icon={ListChecks} title="لم يُنشر هذا الاختبار بعد" description="سيضيفه المدرب قريبًا، وسيصلك إشعار حين يُفتح." />;
  }
  const left = Math.max(0, q.maxAttempts - q.attemptsUsed);
  return (
    <Frame tone={q.passed ? "done" : "default"}>
      <div className="flex flex-col items-center gap-4 bg-bg-brand-tint px-6 py-10 text-center">
        <span className="flex size-[68px] items-center justify-center rounded-full bg-bg-surface text-text-brand shadow-card">
          <Glyph icon={q.passed ? CircleCheck : ListChecks} size={32} className={q.passed ? "text-state-success" : ""} />
        </span>
        <p className="type-h3 text-text-primary">{q.passed ? "اجتزت هذا الاختبار" : lesson.title}</p>
        <p className="type-small text-text-secondary">
          {pluralAr(q.questionCount, ["سؤال واحد", "سؤالان", "أسئلة", "سؤالًا"])} · درجة النجاح {formatPercent(q.passPercent)} · {q.passed ? "أحسنت!" : `متبقٍّ ${pluralAr(left, ["محاولة واحدة", "محاولتان", "محاولات", "محاولة"])}`}
        </p>
        <Link
          href={`/trainee/learn/quiz/${q.id}`}
          className="inline-flex h-12 items-center justify-center rounded-12 bg-action-primary px-6 type-button text-text-on-brand shadow-hero hover:bg-action-primary-hover focus-ring"
        >
          {q.passed || left === 0 ? "اعرض نتيجتك" : q.attemptsUsed > 0 ? "أعد المحاولة" : "ابدأ الاختبار"}
        </Link>
      </div>
    </Frame>
  );
}

/** TRN-LRN-06 player: video (resume + throttled progress), text/file (complete on open) or quiz entry. */
export function LessonPlayer({ lesson, next }: { lesson: PlayerLesson; next: NextLesson }) {
  if (lesson.kind === "quiz") return <QuizLesson lesson={lesson} />;
  if (lesson.kind === "video") {
    if (!lesson.mediaUrl) {
      return (
        <Unavailable
          title="لم تُرفع مادة هذا الدرس بعد"
          description="سيصلك إشعار حين يرفع المدرب الفيديو. لا يُحتسب الدرس في تقدّمك قبل مشاهدته."
        />
      );
    }
    return <VideoPlayer lesson={lesson} next={next} />;
  }
  return <OpenedLesson lesson={lesson} next={next} />;
}
