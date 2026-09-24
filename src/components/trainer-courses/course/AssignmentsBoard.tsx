"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CircleCheck, FileCheck, Target, Upload } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDayMonth, formatRelative, pluralAr, toArabicDigits } from "@/lib/format";
import { riyadhIso, riyadhParts } from "@/lib/trainer-courses";
import type { AssignmentRow, PendingSubmission } from "@/lib/data/trainer-course-page";
import { deleteAssignment, saveAssignment, type AssignmentInput } from "@/app/(trainer)/trainer/courses/actions";

/* TRR-CRS-05 · ٤ الواجبات (335:13353): the course's assignments with their review state, the grading method,
   the submissions waiting for review and the assignment editor (create / edit / delete). Grading itself is
   TRR-CRS-11 at /assignments/[assignmentId]/submissions. */

type Status = { label: string; tone: string; card: string; number: string };

function statusOf(a: AssignmentRow, now: Date): Status {
  if (a.pending > 0) return { label: `بانتظار تقييمك · ${toArabicDigits(a.pending)}`, tone: "text-state-error", card: "border-2 border-state-error bg-state-error-bg", number: "text-state-error" };
  if (a.opensAt && new Date(a.opensAt) > now) return { label: "لم يُفتح بعد", tone: "text-text-primary", card: "bg-bg-page", number: "text-text-muted" };
  if (a.submitted > 0) return { label: "مقيَّم بالكامل", tone: "text-state-success", card: "bg-bg-page", number: "text-state-success" };
  return { label: "بانتظار التسليم", tone: "text-text-brand", card: "bg-bg-page", number: "text-text-brand" };
}

function Meta({ icon, label, value, tone = "text-text-primary" }: { icon: typeof Upload; label: string; value: string; tone?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Glyph icon={icon} size={16} className="text-text-muted" />
      <span className="type-caption text-text-muted">{label}</span>
      <span className={`type-subtitle ${tone}`}>{value}</span>
    </span>
  );
}

export function AssignmentsList({
  courseId,
  items,
  trainees,
  modules,
}: {
  courseId: string;
  items: AssignmentRow[];
  trainees: number;
  modules: { id: string; title: string; position: number }[];
}) {
  const [editing, setEditing] = useState<AssignmentRow | "new" | null>(null);
  const now = new Date();
  const weight = items.reduce((s, a) => s + (a.weightPercent ?? 0), 0);
  return (
    <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-[12rem] flex-1 type-h2 text-text-primary">واجبات الدورة</h2>
        <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-brand-tint px-3.5 py-[9px] type-subtitle text-text-brand">
          <Glyph icon={FileCheck} size={20} />
          {pluralAr(items.length, ["واجب واحد", "واجبان", "واجبات", "واجبًا"])} · {toArabicDigits(weight)}٪ من الدرجة
        </span>
      </div>
      {items.length === 0 && <p className="rounded-16 bg-bg-page px-5 py-6 text-center type-body text-text-secondary">لا واجبات في هذه الدورة بعد.</p>}
      {items.map((a, i) => {
        const st = statusOf(a, now);
        const sub = [a.afterSession ? `بعد الجلسة ${toArabicDigits(a.afterSession)}` : null, a.dueAt ? `موعد التسليم ${formatDayMonth(a.dueAt)}` : "بلا موعد تسليم"].filter(Boolean).join(" · ");
        return (
          <article key={a.id} className={`flex flex-col gap-3 rounded-16 px-4 pt-[18px] pb-5 sm:px-5 ${st.card}`}>
            <div className="flex flex-wrap items-center gap-3.5 sm:flex-nowrap">
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface type-h3 ${st.number}`}>{toArabicDigits(i + 1)}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <h3 className="type-title text-text-primary">{a.title}</h3>
                <p className="type-body text-text-muted">{sub}</p>
              </div>
              {a.pending > 0 ? (
                <ButtonLink href={`/trainer/courses/${courseId}/assignments/${a.id}/submissions`} className="w-full sm:w-[120px]">
                  قيّم الآن
                </ButtonLink>
              ) : (
                <Button variant="outline" className="w-full sm:w-[120px]" onClick={() => setEditing(a)}>
                  اعرض
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-12 bg-bg-surface px-3.5 py-3">
              <Meta icon={CircleCheck} label="الحالة:" value={st.label} tone={st.tone} />
              <Meta icon={Target} label="الوزن:" value={a.weightPercent !== null ? `${toArabicDigits(a.weightPercent)}٪` : "—"} />
              <Meta icon={Upload} label="سُلّم:" value={`${toArabicDigits(a.submitted)} من ${toArabicDigits(trainees)}`} />
            </div>
          </article>
        );
      })}
      <Button size="l" variant="outline" fullWidth onClick={() => setEditing("new")}>
        أضف واجبًا لهذه الدورة
      </Button>
      <Modal open={editing !== null} onClose={() => setEditing(null)} size="l" title={editing === "new" ? "واجب جديد" : editing ? `الواجب · ${editing.title}` : ""}>
        {editing && <AssignmentForm key={editing === "new" ? "new" : editing.id} courseId={courseId} assignment={editing === "new" ? null : editing} modules={modules} onDone={() => setEditing(null)} />}
      </Modal>
    </section>
  );
}

function AssignmentForm({
  courseId,
  assignment,
  modules,
  onDone,
}: {
  courseId: string;
  assignment: AssignmentRow | null;
  modules: { id: string; title: string; position: number }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const due = assignment?.dueAt ? riyadhParts(assignment.dueAt) : null;
  const [f, setF] = useState({
    title: assignment?.title ?? "",
    instructions: assignment?.instructions ?? "",
    requirements: (assignment?.requirements ?? []).join("\n"),
    moduleId: assignment?.moduleId ?? "",
    dueDate: due?.date ?? "",
    dueTime: due?.time ?? "23:59",
    maxScore: String(assignment?.maxScore ?? 20),
    passScore: assignment?.passScore !== null && assignment?.passScore !== undefined ? String(assignment.passScore) : "",
    weight: assignment?.weightPercent !== null && assignment?.weightPercent !== undefined ? String(assignment.weightPercent) : "",
    attempts: String(assignment?.maxAttempts ?? 2),
    formats: assignment?.acceptedFormats ?? "PDF · Word",
    maxMb: String(assignment?.maxFileMb ?? 10),
  });
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))));

  const submit = () =>
    start(async () => {
      setError(null);
      const input: AssignmentInput = {
        title: f.title,
        instructions: f.instructions,
        requirements: f.requirements.split("\n").map((r) => r.trim()).filter(Boolean),
        moduleId: f.moduleId || null,
        dueAt: f.dueDate ? riyadhIso(f.dueDate, f.dueTime || "23:59") : null,
        maxScore: num(f.maxScore) ?? 0,
        passScore: num(f.passScore),
        weightPercent: num(f.weight),
        maxAttempts: num(f.attempts) ?? 1,
        acceptedFormats: f.formats,
        maxFileMb: num(f.maxMb) ?? 10,
      };
      const res = await saveAssignment(courseId, assignment?.id ?? null, input);
      if (!res.ok) return setError(res.error);
      toast("success", assignment ? "حُفظ الواجب." : "أُضيف الواجب.");
      onDone();
      router.refresh();
    });

  return (
    <form
      className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pe-1"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Input label="عنوان الواجب" value={f.title} onChange={set("title")} maxLength={200} required />
      <Textarea label="التعليمات" value={f.instructions} onChange={set("instructions")} maxLength={4000} rows={4} />
      <Textarea label="المتطلبات (سطر لكل متطلب)" value={f.requirements} onChange={set("requirements")} rows={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        {modules.length > 0 && (
          <Select
            label="المحور"
            value={f.moduleId}
            onChange={set("moduleId")}
            options={[{ value: "", label: "بلا محور" }, ...modules.map((m) => ({ value: m.id, label: `${toArabicDigits(m.position)} · ${m.title}` }))]}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="موعد التسليم" type="date" value={f.dueDate} onChange={set("dueDate")} />
          <Input label="الساعة" type="time" value={f.dueTime} onChange={set("dueTime")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Input label="الدرجة الكاملة" inputMode="numeric" value={f.maxScore} onChange={set("maxScore")} required />
        <Input label="درجة النجاح" inputMode="numeric" value={f.passScore} onChange={set("passScore")} />
        <Input label="الوزن ٪" inputMode="numeric" value={f.weight} onChange={set("weight")} />
        <Input label="المحاولات" inputMode="numeric" value={f.attempts} onChange={set("attempts")} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="الصيغ المقبولة" value={f.formats} onChange={set("formats")} maxLength={60} required />
        <Input label="أقصى حجم (م.ب)" inputMode="numeric" value={f.maxMb} onChange={set("maxMb")} required />
      </div>
      {error && (
        <p role="alert" className="type-caption text-state-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          {assignment ? "احفظ الواجب" : "أضف الواجب"}
        </Button>
        {assignment && assignment.submitted > 0 && (
          <ButtonLink href={`/trainer/courses/${courseId}/assignments/${assignment.id}/submissions`} variant="outline">
            اعرض التسليمات
          </ButtonLink>
        )}
        {assignment && assignment.submitted === 0 && (
          confirmDelete ? (
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteAssignment(courseId, assignment.id);
                  if (!res.ok) return setError(res.error);
                  toast("success", "حُذف الواجب.");
                  onDone();
                  router.refresh();
                })
              }
            >
              تأكيد الحذف
            </Button>
          ) : (
            <Button variant="ghost" className="text-state-error" onClick={() => setConfirmDelete(true)}>
              احذف الواجب
            </Button>
          )
        )}
        <Button variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

export function PendingReviewCard({ courseId, pending, total }: { courseId: string; pending: PendingSubmission[]; total: number }) {
  if (total === 0) return null;
  const lead =
    total === 1 ? "واجب مسلَّم لم تقيّمه." : total === 2 ? "واجبان مسلَّمان لم تقيّمهما." : `${pluralAr(total, ["", "", "واجبات مسلَّمة", "واجبًا مسلَّمًا"])} لم تقيّمها.`;
  return (
    <section className="flex flex-col gap-3.5 rounded-22 border-2 border-state-error bg-state-error-bg px-[22px] pt-[22px] pb-6">
      <h2 className="type-h2 text-state-error">بانتظار تقييمك</h2>
      <p className="type-body text-text-secondary">{lead} النتائج لا تُعتمد قبل تقييم كل الواجبات.</p>
      {pending.map((p) => (
        <Link
          key={`${p.assignmentId}-${p.traineeName}-${p.submittedAt}`}
          href={`/trainer/courses/${courseId}/assignments/${p.assignmentId}/submissions`}
          className="flex items-center gap-3 rounded-12 bg-bg-surface px-3.5 py-3 focus-ring"
        >
          <Avatar name={p.traineeName} src={p.avatar} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="type-subtitle text-text-primary">{p.traineeName}</span>
            <span className="type-caption text-text-muted" suppressHydrationWarning>سلّم {formatRelative(p.submittedAt)}</span>
          </span>
        </Link>
      ))}
      <ButtonLink href={`/trainer/courses/${courseId}/assignments/${pending[0].assignmentId}/submissions`} size="l" fullWidth>
        ابدأ التقييم
      </ButtonLink>
    </section>
  );
}
