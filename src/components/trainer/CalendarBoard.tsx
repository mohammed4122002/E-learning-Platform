"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState, useTransition } from "react";
import { CircleCheckBig, SquarePen, Trash2, TriangleAlert, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { checkCalendarConflicts, deleteTrainerEvent, moveTrainerEvent, type ConflictCheck } from "@/app/(trainer)/trainer/calendar/actions";
import { formatTimeRange, toArabicDigits } from "@/lib/format";
import {
  KIND_LABEL,
  RECURRENCE_OPTIONS,
  SLOTS,
  TONE_CHIP,
  TONE_DOT,
  WEEKDAYS,
  clockLabel,
  dayLabel,
  dayStart,
  onDay,
  riyadhMinutes,
  shortTime,
  slotLabel,
  slotOf,
  ymdOf,
  type CalEntry,
  type CalView,
} from "@/lib/trainer-calendar";

export type MonthCell = { ymd: string | null; day: number; isToday: boolean };
export type WeekDay = { ymd: string; weekday: string; day: number; isToday: boolean };

type Props = {
  view: CalView;
  monthCells?: MonthCell[];
  weekDays?: WeekDay[];
  entries: CalEntry[];
  conflictKeys?: string[];
  saved?: "added" | "updated" | null;
};

/** TRR-CAL-01 grid (month 254:388 · week/day 254:814) with the appointment dialog and «تعديل سريع» drag-and-drop. */
export function CalendarBoard({ view, monthCells = [], weekDays = [], entries, conflictKeys = [], saved }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<CalEntry | null>(null);
  const [move, setMove] = useState<{ entry: CalEntry; delta: number; startsAt: string; endsAt: string } | null>(null);

  useEffect(() => {
    if (!saved) return;
    toast("success", saved === "added" ? "أُضيف الموعد إلى تقويمك." : "حُفظت تعديلات الموعد.");
    const url = new URL(window.location.href);
    url.searchParams.delete("saved");
    window.history.replaceState(null, "", url);
  }, [saved, toast]);

  const conflicts = new Set(conflictKeys);
  const byKey = new Map(entries.map((e) => [e.key, e]));

  function onDrop(targetYmd: string, slotIndex: number | null, key: string) {
    const entry = byKey.get(key);
    if (!entry || entry.source !== "event") return;
    const fromMinutes = riyadhMinutes(entry.startsAt);
    const dayDelta = Math.round((dayStart(targetYmd).getTime() - dayStart(ymdOf(entry.startsAt)).getTime()) / 60_000);
    const minuteDelta = slotIndex === null || entry.allDay ? 0 : SLOTS[slotIndex].start * 60 - fromMinutes;
    const delta = dayDelta + minuteDelta;
    if (delta === 0) return;
    const shift = delta * 60_000;
    setMove({
      entry,
      delta,
      startsAt: new Date(new Date(entry.startsAt).getTime() + shift).toISOString(),
      endsAt: new Date(new Date(entry.endsAt).getTime() + shift).toISOString(),
    });
  }

  return (
    <>
      {view === "month" ? (
        <MonthGrid cells={monthCells} entries={entries} onOpen={setOpen} />
      ) : (
        <WeekGrid days={weekDays} entries={entries} conflicts={conflicts} onOpen={setOpen} onDrop={onDrop} />
      )}
      <EventDialog
        entry={open}
        onClose={() => setOpen(null)}
        onDeleted={() => {
          setOpen(null);
          toast("success", "حُذف الموعد من تقويمك.");
          router.refresh();
        }}
      />
      <MoveDialog
        move={move}
        onClose={() => setMove(null)}
        onMoved={() => {
          setMove(null);
          toast("success", "نُقل الموعد.");
          router.refresh();
        }}
      />
    </>
  );
}

/** Week-view «تعارض في الجدول» banner (dismissible for this visit). */
export function ConflictBanner({ text }: { text: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <Alert
      tone="error"
      title="تعارض في الجدول"
      action={
        <button type="button" onClick={() => setOpen(false)} aria-label="إخفاء التنبيه" className="cursor-pointer rounded-8 text-text-secondary focus-ring">
          <Glyph icon={X} size={16} />
        </button>
      }
    >
      {text}
    </Alert>
  );
}

/* ─── Month ─────────────────────────────────────────────────────────────────────────────────────────────── */

function MonthGrid({ cells, entries, onOpen }: { cells: MonthCell[]; entries: CalEntry[]; onOpen: (e: CalEntry) => void }) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-16 border border-border-default bg-bg-surface">
      {/* Figma lays the week out Sunday → Saturday from the left. */}
      <div dir="ltr" className="grid grid-cols-7 sm:min-w-[700px]">
        {WEEKDAYS.map((w) => (
          <div key={w} dir="rtl" className="flex h-12 items-center justify-center border-b border-border-default bg-bg-page text-[11px] text-text-secondary sm:type-small">
            {w}
          </div>
        ))}
        {cells.map((c, i) => {
          const list = c.ymd ? entries.filter((e) => onDay(e, c.ymd!)) : [];
          return (
            <div
              key={i}
              dir="rtl"
              className={`relative flex h-[76px] flex-col gap-1.5 overflow-hidden sm:h-[116px] border-b border-r border-border-default p-2 [&:nth-child(7n)]:border-r-0 ${
                c.isToday ? "bg-action-primary" : "bg-bg-surface"
              }`}
            >
              {c.ymd && (
                <span
                  className={`flex self-start ${c.isToday ? "size-6 items-center justify-center rounded-full bg-bg-surface text-text-brand" : "text-text-secondary"} type-caption`}
                  aria-label={dayLabel(c.ymd)}
                >
                  {c.day}
                </span>
              )}
              <div className="hidden flex-col gap-1.5 sm:flex">
                {list.slice(0, 2).map((e) => (
                  <EntryChip key={e.key} entry={e} compact={list.length > 1} onOpen={onOpen} withTime />
                ))}
                {list.length > 2 && <span className={`type-caption ${c.isToday ? "text-text-on-brand" : "text-text-muted"}`}>+{toArabicDigits(list.length - 2)}</span>}
              </div>
              {/* Phones: coloured dots; the whole day opens the daily view. */}
              {c.ymd && (
                <Link href={`/trainer/calendar?view=day&date=${c.ymd}`} aria-label={`${dayLabel(c.ymd)} · ${toArabicDigits(list.length)} مواعيد`} className="absolute inset-0 flex items-end justify-center gap-1 pb-2 focus-ring sm:hidden">
                  {list.slice(0, 4).map((e) => (
                    <span key={e.key} aria-hidden className={`size-2 rounded-full ${c.isToday ? "bg-bg-surface" : TONE_DOT[e.tone]}`} />
                  ))}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Week / day ────────────────────────────────────────────────────────────────────────────────────────── */

function WeekGrid({
  days,
  entries,
  conflicts,
  onOpen,
  onDrop,
}: {
  days: WeekDay[];
  entries: CalEntry[];
  conflicts: Set<string>;
  onOpen: (e: CalEntry) => void;
  onDrop: (ymd: string, slot: number | null, key: string) => void;
}) {
  const [over, setOver] = useState<string | null>(null);
  const cols = { gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))` };
  return (
    <div className="min-w-0 overflow-x-auto rounded-16 border border-border-default bg-bg-surface">
      <div dir="ltr" className={`grid ${days.length > 1 ? "min-w-[700px]" : ""}`} style={cols}>
        <div className="border-b border-r border-border-default bg-bg-page" />
        {days.map((d, di) => (
          <div
            key={d.ymd}
            dir="rtl"
            className={`flex h-[70px] flex-col items-center justify-center gap-1 border-b border-border-default ${di < days.length - 1 ? "border-r" : ""} ${d.isToday ? "bg-bg-brand-tint text-text-brand" : "bg-bg-page text-text-secondary"}`}
          >
            <span className="type-small">{d.weekday}</span>
            <span className={`type-small ${d.isToday ? "text-text-brand" : "text-text-primary"}`}>{toArabicDigits(d.day)}</span>
          </div>
        ))}
        {SLOTS.map((s, si) => (
          <Fragment key={s.start}>
            <div className="flex h-[84px] items-center justify-center border-b border-r border-border-default bg-bg-page type-caption text-text-secondary">{slotLabel(s.start)}</div>
            {days.map((d, di) => {
              const list = entries.filter((e) => onDay(e, d.ymd) && (e.allDay || ymdOf(e.startsAt) !== d.ymd ? si === 0 : slotOf(e.startsAt) === si));
              const cellKey = `${d.ymd}:${si}`;
              const conflicted = list.some((e) => conflicts.has(e.key));
              return (
                <div
                  key={cellKey}
                  dir="rtl"
                  onDragOver={(ev) => {
                    if (!ev.dataTransfer.types.includes("text/calendar-entry")) return;
                    ev.preventDefault();
                    setOver(cellKey);
                  }}
                  onDragLeave={() => setOver((o) => (o === cellKey ? null : o))}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    setOver(null);
                    const key = ev.dataTransfer.getData("text/calendar-entry");
                    if (key) onDrop(d.ymd, si, key);
                  }}
                  className={`flex h-[84px] flex-col gap-1 overflow-hidden border-b border-border-default p-1.5 ${di < days.length - 1 ? "border-r" : ""} ${
                    conflicted ? "outline-2 -outline-offset-2 outline-state-error" : ""
                  } ${over === cellKey ? "bg-bg-brand-tint" : ""}`}
                >
                  {list.slice(0, conflicted ? 1 : 2).map((e) => (
                    <EntryChip key={e.key} entry={e} compact={list.length > 1} onOpen={onOpen} draggable={e.source === "event"} />
                  ))}
                  {conflicted && (
                    <span className="flex items-center gap-1 type-caption text-state-error">
                      <Glyph icon={TriangleAlert} size={16} />
                      تعارض
                    </span>
                  )}
                  {!conflicted && list.length > 2 && <span className="type-caption text-text-muted">+{toArabicDigits(list.length - 2)}</span>}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/* ─── Chip ──────────────────────────────────────────────────────────────────────────────────────────────── */

function EntryChip({
  entry,
  onOpen,
  withTime,
  compact,
  draggable,
}: {
  entry: CalEntry;
  onOpen: (e: CalEntry) => void;
  withTime?: boolean;
  compact?: boolean;
  draggable?: boolean;
}) {
  const text = withTime && !entry.allDay ? `${entry.title} · ${shortTime(entry.startsAt)}` : entry.title;
  const cls = `flex w-full min-w-0 items-start gap-1.5 rounded-8 px-2 py-1 text-start type-caption focus-ring ${TONE_CHIP[entry.tone]}`;
  const inner = (
    <>
      <span className={`${compact ? "line-clamp-1" : "line-clamp-3"} min-w-0 flex-1 break-words`}>{text}</span>
      <span aria-hidden className={`mt-[7px] size-2 shrink-0 rounded-full ${TONE_DOT[entry.tone]}`} />
    </>
  );
  if (entry.source === "session") {
    return (
      <Link href={`/trainer/courses/${entry.courseId}`} className={cls} title={text}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(ev) => {
        ev.dataTransfer.setData("text/calendar-entry", entry.key);
        ev.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(entry)}
      className={`${cls} cursor-pointer ${draggable ? "active:cursor-grabbing" : ""}`}
      title={text}
    >
      {inner}
    </button>
  );
}

/* ─── Dialogs ───────────────────────────────────────────────────────────────────────────────────────────── */

function whenText(e: { startsAt: string; endsAt: string; allDay: boolean }): string {
  const s = ymdOf(e.startsAt);
  const last = ymdOf(new Date(new Date(e.endsAt).getTime() - (e.allDay ? 1 : 0)));
  if (e.allDay) return s === last ? `${dayLabel(s)} · يوم كامل` : `${dayLabel(s)} – ${dayLabel(last)}`;
  return s === last ? `${dayLabel(s)} · ${formatTimeRange(e.startsAt, e.endsAt)}` : `${dayLabel(s)} ${clockLabel(riyadhMinutes(e.startsAt))} – ${dayLabel(last)} ${clockLabel(riyadhMinutes(e.endsAt))}`;
}

function EventDialog({ entry, onClose, onDeleted }: { entry: CalEntry | null; onClose: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const close = () => {
    setConfirm(false);
    setError(null);
    onClose();
  };
  const rec = RECURRENCE_OPTIONS.find((r) => r.value === entry?.recurrence);
  return (
    <Modal
      open={!!entry}
      onClose={close}
      title={confirm ? "احذف الموعد؟" : (entry?.title ?? "")}
      destructive={confirm}
      footer={
        entry?.eventId &&
        (confirm ? (
          <>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteTrainerEvent(entry.eventId!);
                  if (r.ok) {
                    setConfirm(false);
                    onDeleted();
                  } else setError(r.message ?? null);
                })
              }
            >
              احذف الموعد
            </Button>
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={pending}>
              تراجع
            </Button>
          </>
        ) : (
          <>
            <ButtonLink href={`/trainer/calendar/new?event=${entry.eventId}`} icon={<Glyph icon={SquarePen} size={16} />}>
              عدّل الموعد
            </ButtonLink>
            <Button variant="outline" onClick={() => setConfirm(true)} icon={<Glyph icon={Trash2} size={16} />}>
              احذف
            </Button>
          </>
        ))
      }
    >
      {entry && (
        <div className="flex flex-col gap-3">
          {confirm ? (
            <p>{entry.recurrence && entry.recurrence !== "none" ? "سيُحذف الموعد بكل تكراراته، ويعود الوقت متاحًا أمام الجهات." : "سيُحذف الموعد ويعود الوقت متاحًا أمام الجهات."}</p>
          ) : (
            <dl className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span aria-hidden className={`size-2.5 rounded-full ${TONE_DOT[entry.tone]}`} />
                <dt className="sr-only">النوع</dt>
                <dd className="text-text-primary">{entry.kind ? KIND_LABEL[entry.kind] : ""}</dd>
              </div>
              <div>
                <dt className="sr-only">الموعد</dt>
                <dd>{whenText(entry)}</dd>
              </div>
              {rec && rec.value !== "none" && (
                <div>
                  <dt className="sr-only">التكرار</dt>
                  <dd>{rec.label}</dd>
                </div>
              )}
            </dl>
          )}
          {error && <p className="type-small text-state-error">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

function MoveDialog({
  move,
  onClose,
  onMoved,
}: {
  move: { entry: CalEntry; delta: number; startsAt: string; endsAt: string } | null;
  onClose: () => void;
  onMoved: () => void;
}) {
  const [check, setCheck] = useState<ConflictCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!move) return;
    let alive = true;
    checkCalendarConflicts(move.startsAt, move.endsAt, move.entry.eventId).then((r) => alive && setCheck(r));
    return () => {
      alive = false;
      setCheck(null);
      setError(null);
    };
  }, [move]);

  const blocked = !!check?.sessions.length;
  return (
    <Modal
      open={!!move}
      onClose={onClose}
      title="انقل الموعد؟"
      footer={
        <>
          <Button
            loading={pending}
            disabled={!check || blocked}
            onClick={() =>
              start(async () => {
                const r = await moveTrainerEvent(move!.entry.eventId!, move!.delta);
                if (r.ok) onMoved();
                else setError(r.message ?? null);
              })
            }
          >
            انقل الموعد
          </Button>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            إلغاء
          </Button>
        </>
      }
    >
      {move && (
        <div className="flex flex-col gap-3">
          <p>
            «{move.entry.title}» إلى {whenText({ startsAt: move.startsAt, endsAt: move.endsAt, allDay: move.entry.allDay })}
            {move.entry.recurrence && move.entry.recurrence !== "none" ? " — تنتقل كل تكراراته بالفارق نفسه." : "."}
          </p>
          {!check ? (
            <p className="type-small text-text-muted">جارٍ التحقق من التعارض…</p>
          ) : check.error ? (
            <p className="type-small text-state-error">{check.error}</p>
          ) : blocked ? (
            <p className="flex items-start gap-2 type-small text-state-error">
              <Glyph icon={TriangleAlert} size={16} className="mt-1" />
              يتعارض مع جلسة «{check.sessions[0]}». اختر وقتًا آخر.
            </p>
          ) : check.events.length ? (
            <p className="flex items-start gap-2 type-small text-state-warning">
              <Glyph icon={TriangleAlert} size={16} className="mt-1" />
              يتداخل مع «{check.events[0]}» في تقويمك.
            </p>
          ) : (
            <p className="flex items-center gap-2 type-small text-state-success">
              <Glyph icon={CircleCheckBig} size={16} />
              لا تعارض – هذا الوقت خالٍ في تقويمك.
            </p>
          )}
          {error && <p className="type-small text-state-error">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
