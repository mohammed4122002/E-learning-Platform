"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  ChevronLeft,
  CircleCheck,
  CircleX,
  Hourglass,
  Info,
  LoaderCircle,
  Mail,
  Minus,
  Plus,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Avatar } from "@/components/ui/Data";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Navigation";
import { Glyph } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { grantWaitlistSeat, releaseUnpaidHold, updateCapacity } from "@/lib/actions/trainer-ops";
import { formatDayMonth, formatTime, toArabicDigits } from "@/lib/format";
import type { SeatsView } from "@/lib/data/trainer-roster";
import { BroadcastDialog } from "./BroadcastDialog";
import { AccentBar, Banner, TagPill, toneText, type OpsTone } from "./parts";

/*
 * TRR-CRS-03 · المقاعد وقائمة الانتظار — empty 462:31676 · full + waitlist 462:31905 · after upgrade 462:32214 ·
 * increase 462:32510 · decrease allowed 462:32850 · decrease forbidden 462:33128 · saving 462:33421 · success 462:33712 ·
 * failure 462:33978. Counter = "Trainer / Seats · Counter" (460:4822), dialog = "Trainer / Seats · Edit Dialog" (460:5129).
 */

type DialogState = "edit" | "processing" | "success" | "failed";

const n = toArabicDigits;
const seatsWord = (k: number) => (k === 1 ? "مقعد واحد" : k === 2 ? "مقعدان" : `${n(k)} ${k >= 3 && k <= 10 ? "مقاعد" : "مقعدًا"}`);
const toInt = (v: string) => Number.parseInt(v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))), 10);

function CounterCard({ view, onEdit, disabled }: { view: SeatsView; onEdit: () => void; disabled: boolean }) {
  const { capacity, taken, waiting } = view;
  const ratio = capacity ? taken / capacity : 0;
  const state: "Available" | "AlmostFull" | "Full" = taken >= capacity ? "Full" : ratio >= 0.9 ? "AlmostFull" : "Available";
  const tone: OpsTone = state === "Full" ? "error" : state === "AlmostFull" ? "warning" : "success";
  const chip = {
    Available: { icon: CircleCheck, label: "مقاعد متاحة" },
    AlmostFull: { icon: TriangleAlert, label: "قاربت الامتلاء" },
    Full: { icon: CircleX, label: "ممتلئة" },
  }[state];
  const border = { success: "border-state-success", warning: "border-state-warning", error: "border-state-error" }[tone as "success"];
  const tint = { success: "bg-state-success-bg", warning: "bg-state-warning-bg", error: "bg-state-error-bg" }[tone as "success"];
  return (
    <section aria-labelledby="seats-counter" className={`flex w-full flex-col gap-[18px] rounded-22 border-2 bg-bg-card px-5 pt-[26px] pb-7 drop-shadow-milestone sm:px-[26px] ${border}`}>
      <div className="flex items-center gap-3">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 ${tint} ${toneText[tone]}`}>
          <Armchair aria-hidden size={24} strokeWidth={1.5} absoluteStrokeWidth />
        </span>
        <h2 id="seats-counter" className="min-w-0 flex-1 type-h3 text-text-primary">
          المقاعد
        </h2>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-[11px] py-1.5 type-caption ${tint} ${toneText[tone]}`}>
          <Glyph icon={chip.icon} size={16} />
          {chip.label}
        </span>
      </div>
      <p className="flex items-baseline gap-2.5 whitespace-nowrap">
        <span className={`text-[52px] leading-[1.15] font-bold ${toneText[tone]}`}>{n(taken)}</span>
        <span className="type-h3 text-text-muted">من {n(capacity)} مقعدًا</span>
      </p>
      <AccentBar percent={ratio * 100} start={`${n(taken)} مسجَّلًا`} end={`${n(Math.round(ratio * 100))}٪`} label="نسبة المقاعد المحجوزة" />
      <div className="flex gap-3 text-center">
        <div className="flex flex-1 flex-col items-center gap-1 rounded-12 bg-bg-page pt-4 pb-[18px]">
          <span className={`type-h2 ${toneText[tone]}`}>{n(taken)}</span>
          <span className="type-caption text-text-muted">محجوزة</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-12 bg-bg-page pt-4 pb-[18px]">
          <span className={`type-h2 ${state === "Full" ? "text-text-muted" : "text-state-success"}`}>{n(Math.max(capacity - taken, 0))}</span>
          <span className="type-caption text-text-muted">متبقية</span>
        </div>
      </div>
      {state === "Full" && waiting > 0 && (
        <div className="flex items-center gap-2.5 rounded-12 bg-state-info-bg px-4 pt-3.5 pb-[15px] text-state-info">
          <Glyph icon={Hourglass} size={20} />
          <p className="min-w-0 flex-1 type-subtitle">{waiting === 1 ? "متدرب واحد في قائمة الانتظار" : `${n(waiting)} متدربين في قائمة الانتظار`}</p>
        </div>
      )}
      <Button variant="outline" size="l" fullWidth onClick={onEdit} disabled={disabled}>
        عدّل عدد المقاعد
      </Button>
    </section>
  );
}

const ENTRY: Record<SeatsView["entries"][number]["status"], { label: string; tone: OpsTone }> = {
  waiting: { label: "ينتظر دوره", tone: "info" },
  invited: { label: "رُقّي لمقعد", tone: "success" },
  accepted: { label: "رُقّي لمقعد", tone: "success" },
  left: { label: "انسحب", tone: "neutral" },
  expired: { label: "تُجووز لعدم الرد", tone: "warning" },
};

/** "Trainer / Seats · Waitlist Row" (460:4901): bg/page r16, 44px info position disc, avatar, 19 Bold + 17 muted, status pill, CTA. */
function WaitRow({ entry, position, canGrant, onGrant, pending }: { entry: SeatsView["entries"][number]; position: number | null; canGrant: boolean; onGrant: () => void; pending: boolean }) {
  const s = ENTRY[entry.status];
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-16 bg-bg-page px-5 pt-[18px] pb-5">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full type-h3 ${position ? "bg-state-info text-text-on-brand" : "bg-bg-disabled text-text-muted"}`}>
        {position ? n(position) : "—"}
      </span>
      <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
        <Avatar name={entry.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p className="truncate type-title text-text-primary">{entry.name}</p>
          <p className="type-body text-text-muted">
            دخل الانتظار {formatDayMonth(entry.joinedAt)} · {formatTime(entry.joinedAt)}
          </p>
        </div>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg-surface px-[11px] py-1.5 type-caption ${toneText[s.tone]}`}>
        <Glyph icon={entry.status === "waiting" ? Hourglass : entry.status === "left" ? X : entry.status === "expired" ? TriangleAlert : CircleCheck} size={16} />
        {s.label}
      </span>
      {canGrant && (
        <Button className="w-[120px]" onClick={onGrant} loading={pending}>
          امنحه مقعدًا
        </Button>
      )}
    </li>
  );
}

function DialogRow({ tone, icon, children }: { tone: OpsTone; icon: LucideIcon; children: React.ReactNode }) {
  const tint = { success: "bg-state-success-bg", warning: "bg-state-warning-bg", error: "bg-state-error-bg", info: "bg-state-info-bg", brand: "bg-bg-brand-tint", neutral: "bg-bg-page" }[tone];
  return (
    <div className={`flex w-full items-start gap-3 rounded-12 px-4 pt-[13px] pb-3.5 ${tint}`}>
      <Glyph icon={icon} size={20} className={`mt-1 ${toneText[tone]}`} />
      <p className="min-w-0 flex-1 type-body text-text-primary">{children}</p>
    </div>
  );
}

/** "Trainer / Seats · Edit Dialog" (460:5129) — Increase · Decrease · Blocked · Processing · Success · Failed. */
function SeatsDialog({
  open,
  onClose,
  view,
  courseId,
  onDone,
  onValueChange,
}: {
  open: boolean;
  onClose: () => void;
  view: SeatsView;
  courseId: string;
  onDone: (res: { capacity: number; promoted: number }) => void;
  onValueChange: (v: number | null) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [raw, setRaw] = useState(String(view.capacity));
  const [phase, setPhase] = useState<DialogState>("edit");
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<{ capacity: number; promoted: number } | null>(null);
  const [failure, setFailure] = useState("");
  const [, start] = useTransition();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setRaw(n(view.capacity));
      setPhase("edit");
      setResult(null);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, view.capacity]);

  const value = toInt(raw);
  const valid = Number.isFinite(value) && value >= 1 && value <= 1000;
  const min = view.taken;
  const current = view.capacity;
  const mode: "Increase" | "Decrease" | "Blocked" | "Same" = !valid || value === current ? "Same" : value < min ? "Blocked" : value < current ? "Decrease" : "Increase";
  const promote = mode === "Increase" ? Math.min(value - current, view.waiting) : 0;

  useEffect(() => {
    onValueChange(open && phase === "edit" && mode === "Increase" ? promote : null);
  }, [open, phase, mode, promote, onValueChange]);

  const submit = (target: number) =>
    start(async () => {
      setPhase("processing");
      setStep(2);
      const res = await updateCapacity(courseId, target);
      if (!res.ok) {
        setFailure(res.message);
        setPhase("failed");
        return;
      }
      setStep(3);
      setResult(res.data ?? { capacity: target, promoted: 0 });
      setPhase("success");
      onDone(res.data ?? { capacity: target, promoted: 0 });
    });

  const shown = phase === "edit" ? (mode === "Same" ? "Increase" : mode) : phase === "processing" ? "Processing" : phase === "success" ? "Success" : "Failed";
  const tone: OpsTone = { Increase: "success", Decrease: "warning", Blocked: "error", Processing: "info", Success: "success", Failed: "error" }[shown] as OpsTone;
  const headIcon: LucideIcon = { Increase: Plus, Decrease: Minus, Blocked: CircleX, Processing: LoaderCircle, Success: CircleCheck, Failed: CircleX }[shown] as LucideIcon;
  const border = { success: "border-state-success", warning: "border-state-warning", error: "border-state-error", info: "border-state-info" }[tone as "success"];
  const tint = { success: "bg-state-success-bg", warning: "bg-state-warning-bg", error: "bg-state-error-bg", info: "bg-state-info-bg" }[tone as "success"];

  const title = { Increase: "زيادة المقاعد", Decrease: "تقليل المقاعد", Blocked: "لا يمكن تقليل المقاعد", Processing: "جارٍ حفظ التعديل…", Success: "حُدِّث عدد المقاعد", Failed: "تعذّر حفظ التعديل" }[shown];
  const subtitle =
    shown === "Increase" || shown === "Decrease"
      ? mode === "Same"
        ? `${seatsWord(current)} حاليًا — أدخل العدد الجديد`
        : `من ${n(current)} إلى ${n(value)} مقعدًا`
      : shown === "Blocked"
        ? `${n(min)} متدربًا مسجّلون بالفعل — لا يمكن النزول تحت هذا العدد`
        : shown === "Processing"
          ? "لحظات — نحدّث المقاعد وقائمة الانتظار."
          : shown === "Success"
            ? `أصبحت ${n(result?.capacity ?? value)} مقعدًا${result?.promoted ? ` · رُقّي ${n(result.promoted)} من قائمة الانتظار` : ""}`
            : "لم يتغيّر شيء وعدد المقاعد كما هو.";

  return (
    <dialog
      ref={ref}
      aria-labelledby="seats-dialog-title"
      onClose={onClose}
      onCancel={(e) => {
        if (phase === "processing") e.preventDefault();
      }}
      className={`m-auto w-[calc(100%-32px)] max-w-[620px] overflow-hidden rounded-22 border-2 bg-bg-card p-0 text-text-primary shadow-[0_12px_48px_0_rgba(17,17,17,0.14)] backdrop:bg-scrim ${border}`}
    >
      <div className={`flex flex-col items-center gap-3.5 px-6 pt-[30px] pb-6 text-center sm:px-[30px] ${tint}`}>
        <span className={`flex size-[68px] items-center justify-center rounded-16 bg-bg-surface ${toneText[tone]}`}>
          <Glyph icon={headIcon} size={32} className={shown === "Processing" ? "animate-[tg-spin_0.9s_linear_infinite]" : ""} />
        </span>
        <h2 id="seats-dialog-title" className="type-h2 text-text-primary">
          {title}
        </h2>
        <p className="type-body-lg text-text-secondary">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-3.5 px-6 pt-6 pb-2 sm:px-[30px]">
        {phase === "edit" && (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="seats-input" className="type-small text-text-secondary">
                عدد المقاعد الجديد
              </label>
              <input
                id="seats-input"
                inputMode="numeric"
                autoFocus
                value={raw}
                onChange={(e) => setRaw(e.currentTarget.value)}
                aria-invalid={mode === "Blocked" || undefined}
                aria-describedby={mode === "Blocked" ? "seats-input-error" : undefined}
                className={`h-12 w-full rounded-12 bg-bg-surface px-4 type-body outline-none focus:border-2 focus:border-action-primary ${
                  mode === "Blocked" ? "border-2 border-state-error text-text-muted" : "border-[1.5px] border-border-default text-text-primary"
                }`}
              />
              {mode === "Blocked" && (
                <p id="seats-input-error" role="alert" className="type-caption text-state-error">
                  الحد الأدنى {n(min)} — عدد المسجّلين حاليًا
                </p>
              )}
            </div>
            {mode !== "Same" && (
              <>
                <div className="flex items-center">
                  <div className="flex flex-1 flex-col items-center gap-1.5 rounded-12 bg-bg-page px-4 pt-3.5 pb-4 text-text-muted">
                    <span className="type-caption">الآن</span>
                    <span className="type-h3">{n(current)} مقعدًا</span>
                  </div>
                  <span className="flex w-10 justify-center text-text-muted">
                    <Glyph icon={ChevronLeft} size={20} />
                  </span>
                  <div className={`flex flex-1 flex-col items-center gap-1.5 rounded-12 px-4 pt-3.5 pb-4 ${tint}`}>
                    <span className="type-caption text-text-muted">بعد التعديل</span>
                    <span className={`type-h3 ${toneText[tone]}`}>{n(value)} مقعدًا</span>
                  </div>
                </div>
                {mode === "Increase" && (
                  <>
                    <DialogRow tone="success" icon={CircleCheck}>
                      {seatsWord(value - current)} {value - current === 1 ? "جديد يُفتح" : "جديدة تُفتح"}
                    </DialogRow>
                    {promote > 0 && (
                      <>
                        <DialogRow tone="info" icon={Hourglass}>
                          يُرقّى {n(promote)} من قائمة الانتظار تلقائيًا
                        </DialogRow>
                        <DialogRow tone="info" icon={Mail}>
                          يصلهم إشعار ولديهم ٤٨ ساعة للدفع
                        </DialogRow>
                      </>
                    )}
                  </>
                )}
                {mode === "Decrease" && (
                  <>
                    <DialogRow tone="warning" icon={TriangleAlert}>
                      {seatsWord(value - min)} {value - min === 1 ? "متاح فقط" : "متاحة فقط"} بعد التعديل
                    </DialogRow>
                    <DialogRow tone="success" icon={CircleCheck}>
                      المسجّلون الـ{n(view.enrolled)} لا يتأثرون
                    </DialogRow>
                    <DialogRow tone="info" icon={Info}>
                      قائمة الانتظار تبقى كما هي
                    </DialogRow>
                  </>
                )}
                {mode === "Blocked" && (
                  <>
                    <DialogRow tone="error" icon={CircleX}>
                      {n(min)} مسجّلًا &gt; {n(value)} مقعدًا مطلوبًا
                    </DialogRow>
                    <DialogRow tone="success" icon={CircleCheck}>
                      لا يمكن إلغاء تسجيل أحد لتقليل المقاعد
                    </DialogRow>
                    <DialogRow tone="info" icon={Info}>
                      أقل عدد ممكن الآن: {n(min)} مقعدًا
                    </DialogRow>
                  </>
                )}
              </>
            )}
          </>
        )}
        {phase === "processing" && (
          <div className="flex flex-col gap-2.5" role="status" aria-live="polite">
            <div className="flex items-center justify-between type-caption text-text-secondary">
              <span>{step === 2 ? "خطوتان من ثلاث" : "خطوة من ثلاث"}</span>
              <span>{n(Math.round((step / 3) * 100))}٪</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-border-default">
              <div className="h-full rounded-full bg-action-accent transition-[width]" style={{ width: `${(step / 3) * 100}%` }} />
            </div>
          </div>
        )}
        {phase === "success" && result && (
          <>
            <DialogRow tone="success" icon={CircleCheck}>
              المقاعد الآن {n(result.capacity)}
            </DialogRow>
            {result.promoted > 0 && (
              <>
                <DialogRow tone="info" icon={Hourglass}>
                  رُقّي {n(result.promoted)} من قائمة الانتظار
                </DialogRow>
                <DialogRow tone="success" icon={Mail}>
                  أُرسلت إشعاراتهم
                </DialogRow>
              </>
            )}
          </>
        )}
        {phase === "failed" && (
          <>
            <DialogRow tone="success" icon={ShieldCheck}>
              لم يتغيّر عدد المقاعد
            </DialogRow>
            <DialogRow tone="warning" icon={TriangleAlert}>
              سبب الفشل: {failure}
            </DialogRow>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 px-6 pt-[22px] pb-7 sm:px-[30px]">
        {phase === "edit" && (
          <>
            {mode === "Blocked" ? (
              <Button size="l" fullWidth onClick={() => setRaw(n(min))}>
                اجعلها {n(min)} — أقل عدد ممكن
              </Button>
            ) : (
              <Button size="l" fullWidth disabled={mode === "Same"} onClick={() => submit(value)}>
                {mode === "Decrease" ? `أكّد التقليل إلى ${n(value)}` : mode === "Increase" ? `أكّد الزيادة إلى ${n(value)}` : "أدخل عددًا مختلفًا"}
              </Button>
            )}
            <Button size="l" variant="ghost" fullWidth onClick={onClose}>
              إلغاء
            </Button>
          </>
        )}
        {phase === "processing" && <p className="text-center type-caption text-state-info">لا تغلق النافذة حتى اكتمال العملية.</p>}
        {phase === "success" && (
          <>
            <Button
              size="l"
              fullWidth
              onClick={() => {
                onClose();
                document.getElementById("waitlist-panel")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              اعرض قائمة الانتظار
            </Button>
            <Button size="l" variant="outline" fullWidth onClick={onClose}>
              تم — أغلق
            </Button>
          </>
        )}
        {phase === "failed" && (
          <>
            <Button size="l" fullWidth onClick={() => submit(value)}>
              أعد المحاولة
            </Button>
            <Button size="l" variant="ghost" fullWidth onClick={onClose}>
              إلغاء
            </Button>
          </>
        )}
      </div>
    </dialog>
  );
}

export function SeatsManager({ view, courseId, runLabel, editable }: { view: SeatsView; courseId: string; runLabel: string; editable: boolean }) {
  const [open, setOpen] = useState(false);
  const [promoting, setPromoting] = useState<number | null>(null);
  const [granted, setGranted] = useState<{ name: string; next: string | null } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const full = view.taken >= view.capacity;
  const waitingRows = view.entries.filter((e) => e.status === "waiting");
  const history = view.entries.filter((e) => e.status !== "waiting");
  const listed = [...waitingRows, ...history];
  const nextName = waitingRows[0]?.name ?? null;

  const grant = () =>
    start(async () => {
      const res = await grantWaitlistSeat(courseId);
      if (!res.ok) {
        toast("error", res.message);
        return;
      }
      setGranted({ name: nextName ?? "", next: waitingRows[1]?.name ?? null });
      router.refresh();
    });

  const release = (enrollmentId: string) =>
    start(async () => {
      const res = await releaseUnpaidHold(courseId, enrollmentId);
      if (!res.ok) {
        toast("error", res.message);
        return;
      }
      toast("success", "أُخرج المتدرب وفُتح مقعده للتالي في القائمة.");
      router.refresh();
    });

  const subtitle = open ? "تعديل المقاعد" : granted ? `رُقّي ${granted.name}` : view.waiting ? `${n(view.waiting)} ينتظرون` : "لا أحد ينتظر";

  return (
    <>
      <TopBar title="المقاعد وقائمة الانتظار" subtitle={subtitle} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel, href: `/trainer/courses/${courseId}/trainees` }, { label: "المقاعد" }]} />
        {granted && (
          <Banner
            tone="success"
            icon={CircleCheck}
            title={`مُنح المقعد لـ${granted.name}`}
            action={
              <button type="button" aria-label="إخفاء" onClick={() => setGranted(null)} className="cursor-pointer rounded-8 text-text-secondary focus-ring">
                <X aria-hidden size={16} strokeWidth={1.25} absoluteStrokeWidth />
              </button>
            }
          >
            لديه ٤٨ ساعة لإتمام الدفع.{granted.next ? ` إن لم يدفع يعود المقعد تلقائيًا لـ${granted.next} التالي في القائمة.` : ""}
          </Banner>
        )}
        <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
          <div className="w-full shrink-0 lg:w-[420px]">
            <CounterCard view={view} onEdit={() => setOpen(true)} disabled={!editable} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <section id="waitlist-panel" aria-labelledby="wl-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="wl-title" className="min-w-0 flex-1 type-h2 text-text-primary">
                  قائمة الانتظار
                </h2>
                {view.waiting ? (
                  <TagPill icon={Hourglass} tone="info">
                    {view.waiting === 1 ? "ينتظر واحد" : view.waiting === 2 ? "٢ ينتظران" : `${n(view.waiting)} ينتظرون`}
                  </TagPill>
                ) : (
                  <TagPill icon={Hourglass} tone="neutral">
                    لا أحد ينتظر
                  </TagPill>
                )}
              </div>
              <p className="type-body text-text-muted">
                {promoting
                  ? `سيُرقّى ${n(promoting)} منهم فور تأكيد الزيادة.`
                  : granted
                    ? "تغيّر الترتيب بعد الترقية — والمنسحبون والمتجاوَزون يبقون في السجل."
                    : view.waiting
                      ? "مرتَّبون حسب وقت الدخول. المقعد الشاغر يُمنح يدويًا منك — لا آليًا."
                      : full
                        ? "المقاعد ممتلئة — ينضم المتدربون الجدد إلى القائمة تلقائيًا."
                        : `${seatsWord(Math.max(view.capacity - view.taken, 0))} ما زالت متاحة — لا حاجة لقائمة انتظار بعد.`}
              </p>
              {listed.length === 0 ? (
                <>
                  <div className="flex flex-col items-center gap-4 rounded-16 bg-bg-page px-6 pt-11 pb-[46px] text-center">
                    <span className="flex size-20 items-center justify-center rounded-22 bg-bg-surface text-text-muted">
                      <Glyph icon={Hourglass} size={32} />
                    </span>
                    <p className="type-h3 text-text-primary">لا أحد في قائمة الانتظار</p>
                    <p className="type-body text-text-muted">تمتلئ القائمة تلقائيًا حين تُحجز كل المقاعد ويحاول متدرب جديد التسجيل.</p>
                  </div>
                  <div className="flex items-start gap-3 rounded-16 bg-state-info-bg px-[18px] pt-[15px] pb-4 text-state-info">
                    <Info aria-hidden size={24} strokeWidth={1.5} absoluteStrokeWidth className="mt-0.5 shrink-0" />
                    <p className="min-w-0 flex-1 type-body-lg">القائمة تفتح تلقائيًا عند امتلاء المقاعد. الترقية يدوية — أنت من يمنح المقعد.</p>
                  </div>
                </>
              ) : (
                <>
                  <ol className="flex flex-col gap-3">
                    {listed.map((e) => {
                      const pos = e.status === "waiting" ? waitingRows.indexOf(e) + 1 : null;
                      return <WaitRow key={e.id} entry={e} position={pos} canGrant={editable && pos === 1 && view.free > 0} onGrant={grant} pending={pending} />;
                    })}
                  </ol>
                  {granted && (
                    <div className="flex items-start gap-3 rounded-16 bg-state-info-bg px-[18px] pt-[15px] pb-4 text-state-info">
                      <Info aria-hidden size={24} strokeWidth={1.5} absoluteStrokeWidth className="mt-0.5 shrink-0" />
                      <p className="min-w-0 flex-1 type-body-lg">المتجاوَز لا يُحذف — يمكنك منحه مقعدًا مرة أخرى إن شغر.</p>
                    </div>
                  )}
                </>
              )}
            </section>

            {full && view.waiting > 0 && !granted ? (
              <section aria-labelledby="free-seat-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
                <h2 id="free-seat-title" className="type-h2 text-text-primary">
                  كيف تُفرِج عن مقعد؟
                </h2>
                <p className="type-body text-text-muted">ثلاث طرق — كل واحدة لها أثر مختلف.</p>
                <div className="flex flex-col gap-2">
                  <Button size="l" fullWidth onClick={() => setOpen(true)} disabled={!editable}>
                    زد عدد المقاعد
                  </Button>
                  <p className="type-caption text-text-muted">أسرع طريقة — يُرقّى المنتظرون بالترتيب</p>
                </div>
                <div className="flex flex-col gap-2">
                  <ReleaseHoldButton holds={view.holds} onRelease={release} pending={pending} disabled={!editable} />
                  <p className="type-caption text-text-muted">يفتح مقعده للتالي في القائمة</p>
                </div>
                <div className="flex flex-col gap-2">
                  <BroadcastDialog
                    variant="ghost"
                    size="l"
                    fullWidth
                    courseId={courseId}
                    audience="waitlist"
                    recipientsLabel="كل من في قائمة الانتظار"
                    title="رسالة إلى قائمة الانتظار"
                    label="راسل قائمة الانتظار"
                  />
                  <p className="type-caption text-text-muted">أخبرهم بموعد الدورة القادمة</p>
                </div>
              </section>
            ) : (
              <section aria-labelledby="seat-actions-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
                <h2 id="seat-actions-title" className="type-h2 text-text-primary">
                  إجراءات المقاعد
                </h2>
                {view.waiting > 0 && (
                  <div className="flex flex-col gap-2">
                    <Button size="l" fullWidth onClick={grant} loading={pending} disabled={!editable || view.free === 0}>
                      امنح مقعدًا للتالي
                    </Button>
                    <p className="type-caption text-text-muted">
                      {nextName}
                      {view.free === 0 ? " — لكن لا مقاعد شاغرة الآن" : " — يصله إشعار ولديه ٤٨ ساعة للدفع"}
                    </p>
                  </div>
                )}
                <Button size="l" variant="outline" fullWidth onClick={() => setOpen(true)} disabled={!editable}>
                  عدّل عدد المقاعد
                </Button>
                <p className="type-caption text-text-muted">
                  {n(view.capacity)} مقعدًا حاليًا · {n(view.taken)} مسجَّلًا
                </p>
                <BroadcastDialog variant="ghost" size="l" fullWidth courseId={courseId} audience="enrolled" recipientsLabel="كل المسجّلين" title="رسالة إلى المسجّلين" label="راسل المسجّلين" />
              </section>
            )}
          </div>
        </div>
      </PageBody>
      <SeatsDialog
        open={open}
        onClose={() => setOpen(false)}
        view={view}
        courseId={courseId}
        onValueChange={setPromoting}
        onDone={() => router.refresh()}
      />
    </>
  );
}

/** «أخرج متدربًا لم يدفع»: lists the unexpired seat holds; disabled (with the reason) when there is none. */
function ReleaseHoldButton({ holds, onRelease, pending, disabled }: { holds: SeatsView["holds"]; onRelease: (id: string) => void; pending: boolean; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  if (holds.length === 0)
    return (
      <Button size="l" variant="outline" fullWidth disabled>
        أخرج متدربًا لم يدفع — لا حجوزات معلّقة
      </Button>
    );
  return (
    <div className="flex flex-col gap-2">
      <Button size="l" variant="outline" fullWidth onClick={() => setOpen((v) => !v)} disabled={disabled} aria-expanded={open}>
        أخرج متدربًا لم يدفع
      </Button>
      {open && (
        <ul className="flex flex-col gap-2">
          {holds.map((h) => (
            <li key={h.enrollmentId} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3">
              <span className="min-w-0 flex-1 type-small text-text-primary">
                {h.name}
                {h.expiresAt && <span className="text-text-muted"> · ينتهي الحجز {formatTime(h.expiresAt)}</span>}
              </span>
              <Button size="s" variant="danger" loading={pending} onClick={() => onRelease(h.enrollmentId)}>
                أخرجه
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
