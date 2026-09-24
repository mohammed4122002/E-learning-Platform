"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, ChevronDown, CircleAlert, CircleCheck, CircleX, Clock, FileText, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { saveAttendance } from "@/lib/actions/trainer-ops";
import { toArabicDigits } from "@/lib/format";
import type { Mark, RegisterRow } from "@/lib/data/trainer-attendance";
import { MiniPill, toneText, type OpsTone } from "./parts";

/*
 * TRR-ATT-01 · رصد الحضور (272:4961): hero with «حدّد الكل حاضر», search + sort, legend, one row per trainee with the
 * four status buttons (272:5143), «احفظ الحضور واعتمده» / «احفظ كمسودة».
 */

const STATUSES: { key: Mark; label: string; legend: string; icon: LucideIcon; tone: OpsTone; solid: string }[] = [
  { key: "absent", label: "غائب", legend: "غائب", icon: CircleX, tone: "error", solid: "bg-state-error border-state-error" },
  { key: "excused", label: "بعذر", legend: "غائب بعذر", icon: FileText, tone: "info", solid: "bg-state-info border-state-info" },
  { key: "late", label: "متأخر", legend: "متأخر", icon: Clock, tone: "warning", solid: "bg-state-warning border-state-warning" },
  { key: "present", label: "حاضر", legend: "حاضر", icon: CircleCheck, tone: "success", solid: "bg-state-success border-state-success" },
];

type Sort = "recent" | "name" | "unmarked";

export function AttendanceRegister({
  courseId,
  sessionId,
  rows,
  approved,
  canEdit,
  hero,
  aside,
  top,
}: {
  courseId: string;
  sessionId: string;
  rows: RegisterRow[];
  approved: boolean;
  canEdit: boolean;
  hero: { title: string; body: string; chips: { icon: "calendar" | "alert" | "check"; label: string; tone: OpsTone | "secondary" }[] };
  aside: ReactNode;
  /** Import / QR block shown above the hero (4253:2, 4253:585, 4253:1077). */
  top?: ReactNode;
}) {
  const initial = useMemo(() => Object.fromEntries(rows.map((r) => [r.traineeId, r.mark ?? (r.checkedIn ? "present" : null)])) as Record<string, Mark | null>, [rows]);
  const [marks, setMarks] = useState<Record<string, Mark | null>>(initial);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [error, setError] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"approve" | "draft" | null>(null);
  const toast = useToast();
  const router = useRouter();

  const list = useMemo(() => {
    const needle = q.trim();
    const filtered = needle ? rows.filter((r) => r.name.includes(needle)) : rows;
    const copy = [...filtered];
    if (sort === "recent") copy.sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
    if (sort === "name") copy.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    if (sort === "unmarked") copy.sort((a, b) => Number(Boolean(marks[a.traineeId])) - Number(Boolean(marks[b.traineeId])));
    return copy;
  }, [rows, q, sort, marks]);

  const unmarked = rows.filter((r) => !marks[r.traineeId]).length;

  const submit = (approve: boolean, why?: string) =>
    start(async () => {
      setError(null);
      setMode(approve ? "approve" : "draft");
      const payload = Object.fromEntries(Object.entries(marks).filter(([, v]) => v)) as Record<string, Mark>;
      const res = await saveAttendance({ courseId, sessionId, marks: payload, approve, reason: why });
      setMode(null);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setReasonOpen(false);
      setReason("");
      toast("success", approve ? "اعتُمد الحضور وظهر للمتدربين." : "حُفظ الرصد كمسودة.");
      router.refresh();
    });

  const onApprove = () => {
    if (unmarked > 0) {
      setError(`حدّد حالة كل متدرب قبل الاعتماد — ${toArabicDigits(unmarked)} بلا حالة.`);
      return;
    }
    if (approved) setReasonOpen(true);
    else submit(true);
  };

  const chipIcon = { calendar: CalendarDays, alert: CircleAlert, check: CircleCheck };

  return (
    <div className="flex flex-col gap-6">
      {top}
      <section className="flex w-full flex-col items-start gap-4 rounded-22 border-2 border-state-warning bg-state-warning-bg px-5 py-6 sm:flex-row sm:items-center sm:gap-6 sm:px-7">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-16 bg-bg-surface text-state-warning">
          <Glyph icon={CircleCheck} size={32} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {hero.chips.map((c) => (
              <MiniPill key={c.label} icon={chipIcon[c.icon]} tone={c.tone}>
                {c.label}
              </MiniPill>
            ))}
          </div>
          <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{hero.title}</h2>
          <p className="type-body-lg text-text-secondary">{hero.body}</p>
        </div>
        <Button size="l" className="w-full shrink-0 sm:w-auto" disabled={!canEdit} onClick={() => setMarks(Object.fromEntries(rows.map((r) => [r.traineeId, "present"])))}>
          حدّد الكل حاضر
        </Button>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div id="register" className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="reg-q" className="sr-only">
                ابحث باسم المتدرب
              </label>
              <Glyph icon={Search} size={16} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="reg-q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.currentTarget.value)}
                placeholder="ابحث باسم المتدرب"
                className="h-12 w-full rounded-12 border-[1.5px] border-border-default bg-bg-surface ps-11 pe-4 type-body text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary"
              />
            </div>
            <div className="relative flex w-full items-center sm:w-[220px]">
              <label htmlFor="reg-sort" className="sr-only">
                الترتيب
              </label>
              <select
                id="reg-sort"
                value={sort}
                onChange={(e) => setSort(e.currentTarget.value as Sort)}
                className="h-12 w-full cursor-pointer appearance-none rounded-12 border-[1.5px] border-border-default bg-bg-surface ps-4 pe-11 type-body text-text-primary outline-none focus:border-2 focus:border-action-primary"
              >
                <option value="recent">الأحدث أولًا</option>
                <option value="name">حسب الاسم</option>
                <option value="unmarked">غير المحدّدين أولًا</option>
              </select>
              <ChevronDown aria-hidden size={16} strokeWidth={1.25} absoluteStrokeWidth className="pointer-events-none absolute end-4 text-text-secondary" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-12 bg-bg-page px-4 py-3.5" aria-hidden>
            {STATUSES.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 type-caption text-text-secondary">
                <Glyph icon={s.icon} size={16} className={toneText[s.tone]} />
                {s.legend}
              </span>
            ))}
            <span className="type-caption text-text-secondary">الحالات:</span>
          </div>

          {error && <Alert tone="error" title={error} />}

          <ul className="overflow-hidden rounded-16 border border-border-divider bg-bg-card" aria-label="سجل حضور الجلسة">
            {list.length === 0 && <li className="px-5 py-6 text-center type-small text-text-muted">{rows.length ? "لا نتائج مطابقة." : "لا متدربين مسجّلين في الدورة."}</li>}
            {list.map((r) => (
              <li key={r.traineeId} className="flex flex-wrap items-center gap-4 border-b border-border-divider px-[18px] py-3.5 last:border-b-0">
                <div className="flex min-w-0 flex-1 basis-40 items-center gap-3">
                  <Avatar name={r.name} />
                  <span className="min-w-0 flex-1 truncate type-subtitle text-text-primary">{r.name}</span>
                </div>
                <div role="radiogroup" aria-label={`حالة ${r.name}`} className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => {
                    const on = marks[r.traineeId] === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={!canEdit}
                        onClick={() => setMarks((m) => ({ ...m, [r.traineeId]: s.key }))}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-12 border-[1.5px] px-3.5 py-[11px] type-caption transition-colors focus-ring disabled:cursor-not-allowed ${
                          on ? `${s.solid} text-text-on-brand` : "border-border-default bg-bg-page text-text-secondary hover:bg-bg-brand-tint"
                        }`}
                      >
                        <Glyph icon={s.icon} size={16} className={on ? "" : toneText[s.tone]} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 type-caption text-text-muted">بعد الاعتماد يظهر الحضور للمتدرب مباشرة. التعديل بعده يتطلب سببًا مسجَّلًا.</p>
            <Button size="l" variant="outline" disabled={!canEdit || approved} loading={pending && mode === "draft"} onClick={() => submit(false)}>
              احفظ كمسودة
            </Button>
            <Button size="l" disabled={!canEdit} loading={pending && mode === "approve"} onClick={onApprove}>
              احفظ الحضور واعتمده
            </Button>
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[360px]">{aside}</div>
      </div>

      <Modal
        open={reasonOpen}
        onClose={() => setReasonOpen(false)}
        title="سبب تعديل الحضور المعتمد"
        footer={
          <>
            <Button onClick={() => submit(true, reason)} loading={pending} disabled={reason.trim().length < 5}>
              احفظ التعديل
            </Button>
            <Button variant="ghost" onClick={() => setReasonOpen(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="type-small text-text-secondary">اعتُمد حضور هذه الجلسة مسبقًا. يُسجَّل سبب التعديل مع الرصد الجديد.</p>
          {error && <Alert tone="error" title={error} />}
          <Textarea label="سبب التعديل" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.currentTarget.value)} />
        </div>
      </Modal>
    </div>
  );
}
