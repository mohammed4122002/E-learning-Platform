"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, CircleAlert, CircleCheck, Clock, Layers, Pencil, Play } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatSessionTime, formatTime, pluralAr, toArabicDigits } from "@/lib/format";
import { riyadhIso, riyadhParts } from "@/lib/trainer-courses";
import { updateSession } from "@/app/(trainer)/trainer/courses/actions";

/* TRR-CRS-05 · ٢ المحاور والمحتوى (334:12859): modules with their sessions, per-session state, and the
   «عدّل جلسة قادمة» modal (update_course_session notifies every current trainee). */

export type BoardSession = {
  id: string;
  number: number;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  moduleId: string | null;
  state: "ended" | "today" | "upcoming" | "cancelled";
};

const CHIP: Record<BoardSession["state"], { label: string; icon: LucideIcon; className: string }> = {
  ended: { label: "انتهت", icon: CircleCheck, className: "bg-state-success-bg text-state-success" },
  today: { label: "اليوم", icon: Play, className: "bg-bg-surface text-state-warning" },
  upcoming: { label: "قادمة", icon: Clock, className: "bg-bg-page text-text-muted" },
  cancelled: { label: "أُلغيت", icon: CircleAlert, className: "bg-state-error-bg text-state-error" },
};

function when(s: { startsAt: string; endsAt: string }) {
  return `${formatSessionTime(s.startsAt).replace(/\s?[صم]$/, "")} – ${formatTime(s.endsAt)}`;
}

export function SessionsBoard({
  courseId,
  modules,
  sessions,
  inPerson,
}: {
  courseId: string;
  modules: { id: string; title: string; position: number }[];
  sessions: BoardSession[];
  inPerson: boolean;
}) {
  const [editing, setEditing] = useState<BoardSession | null>(null);
  const hours = (list: BoardSession[]) => Math.round(list.reduce((s, x) => s + (Date.parse(x.endsAt) - Date.parse(x.startsAt)) / 3_600_000, 0));
  const groups = [
    ...modules.map((m) => ({ key: m.id, number: m.position, title: m.title, sessions: sessions.filter((s) => s.moduleId === m.id) })),
    ...(sessions.some((s) => !s.moduleId || !modules.some((m) => m.id === s.moduleId))
      ? [{ key: "none", number: modules.length + 1, title: "جلسات بلا محور", sessions: sessions.filter((s) => !s.moduleId || !modules.some((m) => m.id === s.moduleId)) }]
      : []),
  ];

  return (
    <>
      <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="min-w-[12rem] flex-1 type-h2 text-text-primary">المحاور والجلسات</h2>
          <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-brand-tint px-3.5 py-[9px] type-subtitle text-text-brand">
            <Glyph icon={Layers} size={20} />
            {pluralAr(modules.length, ["محور واحد", "محوران", "محاور", "محورًا"])} · {pluralAr(sessions.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])}
          </span>
        </div>
        {sessions.length === 0 && (
          <p className="rounded-16 bg-bg-page px-5 py-6 text-center type-body text-text-secondary">لا جلسات مجدولة بعد — حدّد المواعيد من إعداد الدورة.</p>
        )}
        {groups.map((g, gi) => (
          <details key={g.key} open={gi === 0 || g.sessions.some((s) => s.state === "today")} className="group flex flex-col rounded-16 bg-bg-page px-4 pt-[18px] pb-5 sm:px-5">
            <summary className="flex cursor-pointer list-none items-center gap-3.5 rounded-12 focus-ring [&::-webkit-details-marker]:hidden">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-brand-tint type-h3 text-text-brand">{toArabicDigits(g.number)}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="type-title text-text-primary">{g.title}</span>
                <span className="type-body text-text-muted">
                  {pluralAr(g.sessions.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])} · {pluralAr(hours(g.sessions), ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"])}
                </span>
              </span>
              <Glyph icon={ChevronDown} size={20} className="text-text-secondary transition-transform group-open:rotate-180" />
            </summary>
            <ul className="mt-3 flex flex-col gap-3">
              {g.sessions.map((s) => {
                const chip = CHIP[s.state];
                const editable = s.state === "upcoming";
                return (
                  <li
                    key={s.id}
                    className={`flex items-center gap-3 rounded-12 px-3.5 py-3 ${s.state === "today" ? "border-[1.5px] border-state-warning bg-state-warning-bg" : "bg-bg-surface"}`}
                  >
                    <button
                      type="button"
                      disabled={!editable}
                      onClick={() => setEditing(s)}
                      aria-label={`عدّل «الجلسة ${toArabicDigits(s.number)}»`}
                      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-page text-text-secondary focus-ring hover:text-text-brand disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Glyph icon={Pencil} size={16} />
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="type-subtitle text-text-primary">
                        الجلسة {toArabicDigits(s.number)} · {s.title}
                      </p>
                      <p className="type-caption text-text-muted">
                        {when(s)}
                        {s.location ? ` · ${s.location}` : ""}
                      </p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-[7px] rounded-full px-[11px] py-1.5 type-small ${chip.className}`}>
                      <Glyph icon={chip.icon} size={16} />
                      {chip.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </section>
      <EditSessionModal courseId={courseId} session={editing} modules={modules} inPerson={inPerson} onClose={() => setEditing(null)} />
    </>
  );
}

/** «تعديل الجلسات» side card (334:13299) — opens the next upcoming session. */
export function EditSessionsCard({
  courseId,
  next,
  trainees,
  modules,
  inPerson,
}: {
  courseId: string;
  next: BoardSession | null;
  trainees: number;
  modules: { id: string; title: string; position: number }[];
  inPerson: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <h2 className="type-h2 text-text-primary">تعديل الجلسات</h2>
      <p className="type-body text-text-secondary">يمكنك تغيير موعد أو قاعة أي جلسة قادمة. الجلسات المنتهية لا تُعدَّل.</p>
      <p className="flex items-start gap-2.5 rounded-12 bg-state-warning-bg px-3.5 pt-3 pb-[13px] type-body text-state-warning">
        <Glyph icon={CircleAlert} size={20} className="mt-1" />
        <span className="flex-1">أي تعديل يرسل إشعارًا فوريًا لكل المسجّلين الـ{toArabicDigits(trainees)}.</span>
      </p>
      <Button size="l" variant="outline" fullWidth disabled={!next} onClick={() => setOpen(true)}>
        عدّل جلسة قادمة
      </Button>
      <EditSessionModal courseId={courseId} session={open ? next : null} modules={modules} inPerson={inPerson} onClose={() => setOpen(false)} />
    </section>
  );
}

function EditSessionModal({
  courseId,
  session,
  modules,
  inPerson,
  onClose,
}: {
  courseId: string;
  session: BoardSession | null;
  modules: { id: string; title: string; position: number }[];
  inPerson: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={session !== null} onClose={onClose} title={session ? `تعديل الجلسة ${toArabicDigits(session.number)}` : ""}>
      {session && <EditSessionForm key={session.id} courseId={courseId} session={session} modules={modules} inPerson={inPerson} onDone={onClose} />}
    </Modal>
  );
}

function EditSessionForm({
  courseId,
  session,
  modules,
  inPerson,
  onDone,
}: {
  courseId: string;
  session: BoardSession;
  modules: { id: string; title: string; position: number }[];
  inPerson: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const start0 = riyadhParts(session.startsAt);
  const [title, setTitle] = useState(session.title);
  const [date, setDate] = useState(start0.date);
  const [from, setFrom] = useState(start0.time);
  const [to, setTo] = useState(riyadhParts(session.endsAt).time);
  const [location, setLocation] = useState(session.location ?? "");
  const [moduleId, setModuleId] = useState(session.moduleId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      const startsAt = riyadhIso(date, from);
      const endsAt = riyadhIso(date, to);
      if (Date.parse(endsAt) <= Date.parse(startsAt)) return setError("وقت النهاية يجب أن يكون بعد وقت البداية.");
      if (Date.parse(startsAt) <= Date.now()) return setError("اختر موعدًا قادمًا — الجلسات لا تُنقل إلى الماضي.");
      const res = await updateSession({ sessionId: session.id, courseId, title, startsAt, endsAt, location, moduleId: moduleId || null });
      if (!res.ok) return setError(res.error);
      toast("success", "حُفظ تعديل الجلسة وأُبلغ المسجّلون.");
      onDone();
      router.refresh();
    });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Input label="عنوان الجلسة" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="التاريخ" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input label="من" type="time" value={from} onChange={(e) => setFrom(e.target.value)} required />
        <Input label="إلى" type="time" value={to} onChange={(e) => setTo(e.target.value)} required />
      </div>
      {inPerson && <Input label="القاعة" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />}
      {modules.length > 0 && (
        <Select
          label="المحور"
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
          options={[{ value: "", label: "بلا محور" }, ...modules.map((m) => ({ value: m.id, label: `${toArabicDigits(m.position)} · ${m.title}` }))]}
        />
      )}
      {error && (
        <p role="alert" className="type-caption text-state-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={pending}>
          احفظ وأبلغ المسجّلين
        </Button>
        <Button variant="outline" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
