"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BellOff,
  CircleCheck,
  CircleX,
  EyeOff,
  Landmark,
  ShieldCheck,
  TriangleAlert,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Input, Select } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import {
  checkCalendarConflicts,
  saveTrainerEvent,
  type ConflictCheck,
} from "@/app/(trainer)/trainer/calendar/actions";
import {
  RECURRENCE_OPTIONS,
  addDays,
  dayLabel,
  isYmd,
  type EventKind,
  type Recurrence,
} from "@/lib/trainer-calendar";
import type { FormState } from "@/lib/validation/auth";

export type EventDraft = {
  id?: string;
  kind: EventKind;
  title: string;
  allDay: boolean;
  fromDate: string;
  toDate: string;
  fromTime: string;
  toTime: string;
  recurrence: Recurrence;
};

/** Type cards in the Figma visual order (right → left). */
const KINDS: {
  value: EventKind;
  title: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    value: "personal",
    title: "ارتباط شخصي",
    hint: "اجتماع · سفر · مناسبة",
    icon: User,
  },
  { value: "leave", title: "إجازة", hint: "يوم كامل أو أكثر", icon: BellOff },
  {
    value: "external",
    title: "تدريب خارج المنصة",
    hint: "مع جهة لا تمر عبر المنصة",
    icon: Landmark,
  },
];

function rangeOf(d: EventDraft): { starts: string; ends: string } | null {
  if (!isYmd(d.fromDate) || !isYmd(d.toDate)) return null;
  if (d.allDay)
    return {
      starts: `${d.fromDate}T00:00:00+03:00`,
      ends: `${addDays(d.toDate, 1)}T00:00:00+03:00`,
    };
  if (!/^\d{2}:\d{2}$/.test(d.fromTime) || !/^\d{2}:\d{2}$/.test(d.toTime))
    return null;
  return {
    starts: `${d.fromDate}T${d.fromTime}:00+03:00`,
    ends: `${d.toDate}T${d.toTime}:00+03:00`,
  };
}

/** TRR-CAL-02 · إضافة موعد (303:9062): type, date & time with a live conflict check, private title, privacy card. */
export function EventForm({ initial }: { initial: EventDraft }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveTrainerEvent,
    { status: "idle" },
  );
  const [d, setD] = useState<EventDraft>(initial);
  const [check, setCheck] = useState<ConflictCheck | "checking" | null>(null);
  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));
  const fe = state.fieldErrors ?? {};

  const range = rangeOf(d);
  const startsKey = range?.starts ?? "";
  const endsKey = range?.ends ?? "";
  useEffect(() => {
    if (!startsKey || !endsKey) return;
    let alive = true;
    const t = setTimeout(() => {
      setCheck("checking");
      checkCalendarConflicts(startsKey, endsKey, initial.id).then(
        (r) => alive && setCheck(r),
      );
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [startsKey, endsKey, initial.id]);

  const status = check === "checking" || check === null ? null : check;
  const blocked = !!status?.sessions.length || !!status?.error;
  const editing = !!initial.id;

  return (
    <form
      action={action}
      className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6"
      noValidate
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {state.status === "error" && state.message && (
          <Alert tone="error" title={state.message} />
        )}

        <fieldset className="rounded-22 border border-border-default bg-bg-card p-6 shadow-card">
          <legend className="float-start w-full type-h3 text-text-primary">
            نوع الموعد
          </legend>
          <div className="clear-both flex flex-col gap-5 pt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {KINDS.map((k) => {
                const on = d.kind === k.value;
                return (
                  <label
                    key={k.value}
                    className={`flex cursor-pointer flex-col items-center gap-3 rounded-16 px-4 pt-5 pb-6 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus ${
                      on
                        ? "border-2 border-action-primary bg-bg-brand-tint"
                        : "border border-border-default bg-bg-page hover:bg-bg-brand-tint/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="kind"
                      value={k.value}
                      checked={on}
                      onChange={() =>
                        setD((p) => ({
                          ...p,
                          kind: k.value,
                          allDay: k.value === "leave" ? true : p.allDay,
                        }))
                      }
                      className="sr-only"
                    />
                    <span
                      className={`flex size-12 items-center justify-center rounded-12 ${on ? "bg-action-primary text-text-on-brand" : "bg-bg-surface text-text-brand"}`}
                    >
                      <Glyph icon={k.icon} size={20} />
                    </span>
                    <span
                      className={`type-subtitle ${on ? "text-text-brand" : "text-text-primary"}`}
                    >
                      {k.title}
                    </span>
                    <span className="type-small text-text-secondary">
                      {k.hint}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-22 border border-border-default bg-bg-card p-6 shadow-card">
          <legend className="float-start w-full type-h3 text-text-primary">
            التاريخ والوقت
          </legend>
          <div className="clear-both flex flex-col gap-5 pt-5">
            <div className="rounded-16 bg-bg-page px-4 py-3">
              <Toggle
                name="all_day"
                value="1"
                checked={d.allDay}
                onChange={(e) => set("allDay", e.target.checked)}
                description="يحجب اليوم بأكمله بلا تحديد ساعات"
              >
                <span className="type-subtitle">يوم كامل</span>
              </Toggle>
            </div>
            {/* Figma places «من» on the left and «إلى» on the right; the LTR grid keeps that while tabbing من → إلى. */}
            <div dir="ltr" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div dir="rtl">
                <Input
                  label="من تاريخ"
                  type="date"
                  name="from_date"
                  required
                  value={d.fromDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setD((p) => ({
                      ...p,
                      fromDate: v,
                      toDate:
                        isYmd(v) && (!isYmd(p.toDate) || p.toDate < v)
                          ? v
                          : p.toDate,
                    }));
                  }}
                  error={fe.from_date}
                />
              </div>
              <div dir="rtl">
                <Input
                  label="إلى تاريخ"
                  type="date"
                  name="to_date"
                  required
                  min={d.fromDate}
                  value={d.toDate}
                  onChange={(e) => set("toDate", e.target.value)}
                  error={fe.to_date}
                />
              </div>
              {!d.allDay && (
                <>
                  <div dir="rtl">
                    <Input
                      label="من الساعة"
                      type="time"
                      name="from_time"
                      required
                      value={d.fromTime}
                      onChange={(e) => set("fromTime", e.target.value)}
                      error={fe.from_time}
                    />
                  </div>
                  <div dir="rtl">
                    <Input
                      label="إلى الساعة"
                      type="time"
                      name="to_time"
                      required
                      value={d.toTime}
                      onChange={(e) => set("toTime", e.target.value)}
                      error={fe.to_time}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-3 rounded-16 bg-bg-page px-4 py-3.5 sm:flex-row sm:items-center">
              <div className="flex flex-1 flex-col gap-0.5">
                <label
                  htmlFor="recurrence"
                  className="type-subtitle text-text-primary"
                >
                  التكرار
                </label>
                <p className="type-small text-text-secondary">
                  مثال: كل أحد · كل أسبوعين · شهريًا
                </p>
              </div>
              <Select
                id="recurrence"
                name="recurrence"
                value={d.recurrence}
                onChange={(e) =>
                  set("recurrence", e.target.value as Recurrence)
                }
                options={RECURRENCE_OPTIONS}
                className="sm:w-[230px]"
              />
            </div>
            <ConflictRow check={check} hasRange={!!range} />
          </div>
        </fieldset>

        <section
          aria-labelledby="event-title"
          className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-6 shadow-card"
        >
          <h2 id="event-title" className="type-h3 text-text-primary">
            عنوان الموعد – لك وحدك
          </h2>
          <Input
            aria-labelledby="event-title"
            name="title"
            value={d.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="اجتماع عائلي"
            maxLength={120}
            error={fe.title}
          />
        </section>
      </div>

      <aside className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
        <section
          aria-labelledby="privacy-title"
          className="flex flex-col gap-5 rounded-22 border-2 border-state-success bg-bg-page p-6"
        >
          <div className="flex items-center gap-3">
            <h2
              id="privacy-title"
              className="flex-1 text-[22px] font-bold leading-[1.3] text-state-success"
            >
              خصوصيتك محفوظة
            </h2>
            <span className="flex size-11 items-center justify-center rounded-12 bg-bg-surface text-state-success">
              <Glyph icon={ShieldCheck} size={20} />
            </span>
          </div>
          <p className="type-small text-text-secondary">
            هكذا يظهر هذا الموعد للجهات التدريبية:
          </p>
          <div className="flex flex-col gap-3 rounded-16 bg-bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <p className="type-subtitle text-text-primary">
                  {isYmd(d.fromDate) ? dayLabel(d.fromDate) : "—"}
                </p>
                <p className="type-body text-text-secondary">غير متاح</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-12 bg-bg-page text-text-muted">
                <Glyph icon={CircleX} size={20} />
              </span>
            </div>
            <p className="type-small text-state-success">
              هذا كل ما تراه الجهة. لا العنوان ولا النوع ولا السبب.
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {["لا ترى العنوان", "لا ترى نوع الموعد", "لا ترى السبب"].map(
              (t) => (
                <li
                  key={t}
                  className="flex items-center gap-2 rounded-12 bg-bg-surface px-4 py-3 type-small text-text-primary"
                >
                  <Glyph
                    icon={EyeOff}
                    size={16}
                    className="text-state-success"
                  />
                  {t}
                </li>
              ),
            )}
            <li className="flex items-center gap-2 rounded-12 bg-bg-surface px-4 py-3 type-small text-text-primary">
              <Glyph
                icon={CircleCheck}
                size={16}
                className="text-state-success"
              />
              ترى أن الوقت محجوز فقط
            </li>
          </ul>
        </section>

        <section
          aria-labelledby="save-title"
          className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-6 shadow-card"
        >
          <h2 id="save-title" className="type-h3 text-text-primary">
            حفظ الموعد
          </h2>
          <Button
            type="submit"
            size="l"
            fullWidth
            loading={pending}
            disabled={pending || blocked || check === "checking"}
          >
            {editing ? "احفظ التعديلات" : "أضف الموعد"}
          </Button>
          <Link
            href="/trainer/calendar"
            className="self-center rounded-8 px-2 py-1 type-body text-text-brand underline-offset-4 hover:underline focus-ring"
          >
            إلغاء
          </Link>
          <p className="type-caption text-text-secondary">
            يمكنك تعديل الموعد أو حذفه في أي وقت من تقويمك.
          </p>
        </section>
      </aside>
    </form>
  );
}

function ConflictRow({
  check,
  hasRange,
}: {
  check: ConflictCheck | "checking" | null;
  hasRange: boolean;
}) {
  const base = "flex items-center gap-2 rounded-16 px-4 py-4 type-body";
  if (!hasRange) return null;
  if (check === null || check === "checking")
    return (
      <p role="status" className={`${base} bg-bg-page text-text-muted`}>
        جارٍ التحقق من التعارض…
      </p>
    );
  if (check.error)
    return (
      <p role="alert" className={`${base} bg-state-error-bg text-state-error`}>
        <Glyph icon={CircleX} size={20} />
        {check.error}
      </p>
    );
  if (check.sessions.length)
    return (
      <p role="alert" className={`${base} bg-state-error-bg text-state-error`}>
        <Glyph icon={TriangleAlert} size={20} />
        يتعارض مع جلسة «{check.sessions[0]}» — اختر وقتًا آخر.
      </p>
    );
  if (check.events.length)
    return (
      <p
        role="status"
        className={`${base} bg-state-warning-bg text-state-warning`}
      >
        <Glyph icon={TriangleAlert} size={20} />
        يتداخل مع «{check.events[0]}» في تقويمك.
      </p>
    );
  return (
    <p
      role="status"
      className={`${base} bg-state-success-bg text-state-success`}
    >
      <Glyph icon={CircleCheck} size={20} />
      لا تعارض – هذا الوقت خالٍ في تقويمك.
    </p>
  );
}
