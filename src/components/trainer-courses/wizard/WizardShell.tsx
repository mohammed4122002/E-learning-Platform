"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, ChevronLeft, CircleAlert, CircleCheck, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";
import { STEP_LABELS } from "@/lib/trainer-courses";
import { saveCourseSetup, type SetupPatch } from "@/app/(trainer)/trainer/courses/actions";

/* TRR-CRS-02 wizard chrome: «Trainer / Save Status» (389:3905) with Saved · Saving · Offline states and local
   backup (BR-S1/BR-S2), «Trainer / Course Stepper» (389:4096), «Trainer / Source Program Lock» (389:3859),
   the offline banner (390:15460) and «تخرج قبل إكمال الدورة؟» (390:16021). */

type Status = "saved" | "saving" | "offline" | "idle";

type Ctx = {
  courseId: string | null;
  status: Status;
  lastSavedAt: number | null;
  /** Queue a setup patch (debounced autosave). */
  save: (patch: SetupPatch) => void;
  /** Run any server call with the same saved/offline bookkeeping. Returns the action's error text, if any. */
  run: <T extends { ok: boolean; error?: string }>(task: () => Promise<T>) => Promise<T | null>;
  flush: () => Promise<boolean>;
  markDirty: (dirty: boolean) => void;
  requestExit: (href: string) => void;
  error: string | null;
  setError: (e: string | null) => void;
};

const WizardContext = createContext<Ctx | null>(null);

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside <WizardShell>");
  return ctx;
}

function ago(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return "آخر حفظ الآن";
  if (s < 60) return s <= 10 ? "آخر حفظ قبل ثوانٍ" : `آخر حفظ قبل ${toArabicDigits(s)} ثانية`;
  const m = Math.round(s / 60);
  if (m === 1) return "آخر حفظ قبل دقيقة";
  if (m === 2) return "آخر حفظ قبل دقيقتين";
  return `آخر حفظ قبل ${toArabicDigits(m)} دقائق`;
}

export function SaveStatus() {
  const { status, lastSavedAt, flush } = useWizard();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  if (status === "offline") {
    return (
      <div role="status" className="flex w-full items-center gap-3 rounded-12 border-2 border-state-error bg-state-error-bg px-[18px] pt-[15px] pb-4 lg:w-[620px]">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-error">
          <Glyph icon={CircleAlert} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p className="type-subtitle text-state-error">لم يُحفظ — انقطع الاتصال</p>
          <p className="type-caption text-text-muted">عملك محفوظ محليًا · سنعيد المحاولة تلقائيًا</p>
        </div>
        <Button size="s" variant="outline" className="w-[120px]" onClick={() => void flush()}>
          أعد المحاولة
        </Button>
      </div>
    );
  }
  if (status === "idle") return <div className="hidden lg:block lg:w-[620px]" />;
  return (
    <div role="status" aria-live="polite" className="flex w-full items-center gap-3 rounded-12 bg-state-success-bg px-[18px] pt-[15px] pb-4 lg:w-[620px]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-success">
        <Glyph icon={status === "saving" ? LoaderCircle : CircleCheck} size={20} className={status === "saving" ? "animate-[tg-spin_0.9s_linear_infinite]" : ""} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <p className="type-subtitle text-state-success">{status === "saving" ? "جارٍ حفظ المسودة…" : "حُفظت المسودة تلقائيًا"}</p>
        <p className="type-caption text-text-muted">{lastSavedAt ? ago(lastSavedAt, now) : "كل تغيير يُحفظ تلقائيًا"}</p>
      </div>
    </div>
  );
}

/** Offline banner under the header (390:15460, dismissible). */
function OfflineAlert() {
  const { status } = useWizard();
  const [dismissed, setDismissed] = useState(false);
  const [lastStatus, setLastStatus] = useState(status);
  if (status !== lastStatus) {
    setLastStatus(status);
    if (status === "offline") setDismissed(false);
  }
  if (status !== "offline" || dismissed) return null;
  return (
    <div role="alert" className="flex w-full items-start gap-3 rounded-12 border-[1.5px] border-state-warning bg-state-warning-bg px-4 py-3.5">
      <Glyph icon={TriangleAlert} size={20} className="mt-1 text-state-warning" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="type-body text-state-warning">لم يُحفظ آخر تغيير — انقطع الاتصال</p>
        <p className="type-small text-text-secondary">عملك محفوظ في متصفحك ولن يضيع. سنعيد المحاولة تلقائيًا فور عودة الاتصال، أو اضغط «أعد المحاولة».</p>
      </div>
      <button type="button" onClick={() => setDismissed(true)} aria-label="إخفاء التنبيه" className="cursor-pointer rounded-8 text-text-secondary focus-ring">
        <Glyph icon={X} size={16} />
      </button>
    </div>
  );
}

export function CourseStepper({ current, title = "دورة جديدة", hrefs }: { current: number; title?: string; hrefs?: Record<number, string> }) {
  return (
    <section aria-label="خطوات إنشاء الدورة" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card px-4 pt-[26px] pb-7 drop-shadow-milestone sm:px-8">
      <div className="flex items-center gap-3">
        <h2 className="min-w-0 flex-1 type-h3 text-text-primary">{title}</h2>
        <p className="type-subtitle whitespace-nowrap text-text-brand">
          الخطوة {toArabicDigits(current)} من {toArabicDigits(STEP_LABELS.length)}
        </p>
      </div>
      <ol className="flex w-full items-start">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const state = n < current ? "done" : n === current ? "current" : "todo";
          const href = state === "done" ? (hrefs?.[n] ?? null) : null;
          const marker = (
            <span
              className={`flex size-11 items-center justify-center rounded-full sm:size-14 ${
                state === "done"
                  ? "border-2 border-state-success bg-state-success-bg text-state-success"
                  : state === "current"
                    ? "bg-action-primary text-text-on-brand"
                    : "border-2 border-border-default bg-bg-page text-text-disabled"
              }`}
            >
              {state === "done" ? <Glyph icon={CircleCheck} size={20} /> : <span className="type-h3">{toArabicDigits(n)}</span>}
            </span>
          );
          const tone = state === "done" ? "text-state-success" : state === "current" ? "text-text-brand" : "text-text-disabled";
          return (
            <li key={label} className="flex min-w-0 flex-1 items-start" aria-current={state === "current" ? "step" : undefined}>
              {i > 0 && <span aria-hidden className={`mt-5 h-1 min-w-2 flex-1 rounded-full sm:mt-[26px] ${n <= current ? "bg-state-success" : "bg-border-default"}`} />}
              <div className="flex min-w-0 flex-[2] flex-col items-center gap-2.5 text-center">
                {href ? (
                  <Link href={href} className="rounded-full focus-ring" aria-label={`ارجع إلى ${label}`}>
                    {marker}
                  </Link>
                ) : (
                  marker
                )}
                <span className={`type-caption sm:type-subtitle ${tone}`}>{label}</span>
                <span className={`hidden type-caption sm:block ${tone}`}>{state === "done" ? "مكتملة" : state === "current" ? "أنت هنا" : "لاحقًا"}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function SourceProgramLock({ title, version, latest, changeHref }: { title: string; version: string; latest: boolean; changeHref?: string | null }) {
  return (
    <section className="flex w-full flex-col gap-4 rounded-16 bg-bg-brand-tint px-6 pt-5 pb-[22px] sm:flex-row sm:items-center">
      <span className="hidden size-[52px] shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand sm:flex">
        <Glyph icon={BookOpen} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="min-w-0 flex-1 type-title text-text-primary">البرنامج المصدر: {title}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-[11px] py-1.5 type-caption text-text-brand">
            <span dir="ltr">{version}</span> · {latest ? "الأحدث" : "مجمَّدة"}
            <Glyph icon={CircleCheck} size={16} />
          </span>
        </div>
        <p className="type-body text-text-secondary">المحتوى والأهداف والمحاور تُورَّث من البرنامج · تُجمَّد لحظة النشر ولا تتغير بعدها.</p>
      </div>
      {changeHref && (
        <Link href={changeHref} className="flex h-12 w-[120px] shrink-0 items-center justify-center rounded-12 type-button text-text-brand hover:bg-bg-surface focus-ring">
          غيّر البرنامج
        </Link>
      )}
    </section>
  );
}

/** «تخرج قبل إكمال الدورة؟» (390:16021). */
function ExitPanel({ href, onStay, onDiscard, onSaveExit, saving }: { href: string; onStay: () => void; onDiscard: () => void; onSaveExit: () => void; saving: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    ref.current?.focus();
  }, [href]);
  return (
    <section ref={ref} tabIndex={-1} role="alertdialog" aria-labelledby="exit-title" className="flex w-full flex-col gap-[18px] rounded-22 border-[3px] border-state-warning bg-state-warning-bg px-5 pt-[30px] pb-8 outline-none sm:px-8">
      <div className="flex items-center gap-3.5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-16 bg-bg-surface text-state-warning">
          <Glyph icon={TriangleAlert} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <h2 id="exit-title" className="type-h2 text-text-primary">
            تخرج قبل إكمال الدورة؟
          </h2>
          <p className="type-body-lg text-text-secondary">عملك محفوظ كمسودة. تجدها في «دوراتي» تحت حالة «مسودة» وتكمل من نفس الخطوة.</p>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-center">
        <Button size="l" onClick={onStay}>
          ابقَ وأكمل
        </Button>
        <Button size="l" variant="ghost" onClick={onDiscard}>
          اخرج بلا حفظ
        </Button>
        <Button size="l" variant="outline" loading={saving} onClick={onSaveExit}>
          احفظ كمسودة واخرج
        </Button>
      </div>
      <p className="type-caption text-state-error">«اخرج بلا حفظ» يحذف ما أدخلته في هذه الجلسة — لا يمكن استرجاعه.</p>
    </section>
  );
}

type ShellProps = {
  courseId: string | null;
  heading: string;
  description: string;
  breadcrumb: string;
  step: number;
  stepHrefs?: Record<number, string>;
  program?: { title: string; version: string; latest: boolean; changeHref?: string | null } | null;
  initialSavedAt?: string | null;
  children: ReactNode;
  /** Extra content placed between the header and the stepper (e.g. published hours card). */
  beforeStepper?: ReactNode;
};

export function WizardShell({ courseId, heading, description, breadcrumb, step, stepHrefs, program, initialSavedAt, children, beforeStepper }: ShellProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialSavedAt ? "saved" : "idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(initialSavedAt ? Date.parse(initialSavedAt) : null);
  const [error, setError] = useState<string | null>(null);
  const [exitHref, setExitHref] = useState<string | null>(null);
  const [exitSaving, setExitSaving] = useState(false);
  const pending = useRef<SetupPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const backupKey = courseId ? `tg-course-draft-${courseId}` : null;

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    if (!courseId) return true;
    const patch = pending.current;
    if (Object.keys(patch).length === 0) return true;
    pending.current = {};
    setStatus("saving");
    try {
      const res = await saveCourseSetup(courseId, patch);
      if (!res.ok) {
        setError(res.error);
        setStatus("saved");
        return false;
      }
      setError(null);
      setStatus("saved");
      setLastSavedAt(Date.now());
      dirty.current = false;
      try {
        if (backupKey) localStorage.removeItem(backupKey);
      } catch {}
      router.refresh();
      return true;
    } catch {
      // Network failure: keep the patch, back it up locally and retry.
      pending.current = { ...patch, ...pending.current };
      try {
        if (backupKey) localStorage.setItem(backupKey, JSON.stringify(pending.current));
      } catch {}
      setStatus("offline");
      if (retry.current) clearTimeout(retry.current);
      retry.current = setTimeout(() => void flush(), 8000);
      return false;
    }
  }, [courseId, backupKey, router]);

  // Restore a local backup left by an offline session.
  useEffect(() => {
    if (!backupKey) return;
    try {
      const raw = localStorage.getItem(backupKey);
      if (raw) {
        pending.current = { ...JSON.parse(raw), ...pending.current };
        void flush();
      }
    } catch {}
  }, [backupKey, flush]);

  useEffect(() => {
    const online = () => void flush();
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || Object.keys(pending.current).length > 0) e.preventDefault();
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", beforeUnload);
      if (timer.current) clearTimeout(timer.current);
      if (retry.current) clearTimeout(retry.current);
    };
  }, [flush]);

  const save = useCallback(
    (patch: SetupPatch) => {
      pending.current = { ...pending.current, ...patch };
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 700);
    },
    [flush],
  );

  const run = useCallback(async <T extends { ok: boolean; error?: string }>(task: () => Promise<T>): Promise<T | null> => {
    setStatus("saving");
    try {
      const res = await task();
      if (!res.ok) {
        setError(res.error ?? null);
        setStatus("saved");
        return res;
      }
      setError(null);
      setStatus("saved");
      setLastSavedAt(Date.now());
      return res;
    } catch {
      setStatus("offline");
      return null;
    }
  }, []);

  const ctx: Ctx = {
    courseId,
    status,
    lastSavedAt,
    save,
    run,
    flush,
    markDirty: (d) => (dirty.current = d),
    requestExit: (href) => {
      if (!courseId) return router.push(href);
      setExitHref(href);
    },
    error,
    setError,
  };

  return (
    <WizardContext.Provider value={ctx}>
      <div className="flex flex-col gap-[26px]">
        <nav aria-label="مسار التنقل">
          <ol className="flex flex-wrap items-center gap-2 type-small">
            <li>
              <a
                href="/trainer/courses"
                onClick={(e) => {
                  e.preventDefault();
                  ctx.requestExit("/trainer/courses");
                }}
                className="rounded-8 text-text-brand hover:underline focus-ring"
              >
                دوراتي
              </a>
            </li>
            <li aria-hidden className="text-text-muted">
              <Glyph icon={ChevronLeft} size={16} />
            </li>
            <li aria-current="page" className="text-text-primary">
              {breadcrumb}
            </li>
          </ol>
        </nav>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{heading}</h2>
            {description && <p className="type-body-lg text-text-secondary">{description}</p>}
          </div>
          <SaveStatus />
        </div>
        <OfflineAlert />
        {error && (
          <p role="alert" className="rounded-12 border-[1.5px] border-state-error bg-state-error-bg px-4 py-3 type-small text-state-error">
            {error}
          </p>
        )}
        {beforeStepper}
        <CourseStepper current={step} hrefs={stepHrefs} />
        {program && <SourceProgramLock {...program} />}
        {children}
        {exitHref && (
          <ExitPanel
            href={exitHref}
            saving={exitSaving}
            onStay={() => setExitHref(null)}
            onDiscard={() => {
              pending.current = {};
              dirty.current = false;
              try {
                if (backupKey) localStorage.removeItem(backupKey);
              } catch {}
              router.push(exitHref);
            }}
            onSaveExit={async () => {
              setExitSaving(true);
              const ok = await flush();
              setExitSaving(false);
              if (ok) router.push(exitHref);
            }}
          />
        )}
      </div>
    </WizardContext.Provider>
  );
}
