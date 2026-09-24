"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlignRight,
  ChevronDown,
  CircleCheck,
  ClipboardCheck,
  CircleHelp,
  Copy,
  FileText,
  GripVertical,
  Info,
  LoaderCircle,
  Lock,
  Pencil,
  Plus,
  Puzzle,
  Trash2,
  TriangleAlert,
  Video,
  X,
} from "lucide-react";
import { deleteItem, deleteUnit, reorderUnits, saveItem, saveUnit, type ActionResult } from "@/app/(trainer)/trainer/programs/actions";
import { announceSaved } from "@/components/trainer-programs/SavedIndicator";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { toArabicDigits } from "@/lib/format";
import { ITEM_KIND_LABELS, hoursWord, lessonsWord, unitsWord } from "@/lib/trainer-programs";

export type CurriculumItem = {
  id: string;
  kind: "video" | "file" | "text" | "quiz" | "assignment";
  title: string;
  summary: string | null;
  minutes: number | null;
  maxScore: number | null;
  weight: number | null;
  dueNote: string | null;
};
export type CurriculumUnit = { id: string; kind: "module" | "chapter"; title: string; summary: string | null; minutes: number; lessons: number; items: CurriculumItem[] };

type DialogKind = "unit" | "chapter" | "lesson" | "assignment";
type DialogState =
  | { mode: "form"; kind: DialogKind; unitId?: string; editUnit?: CurriculumUnit; editItem?: CurriculumItem }
  | { mode: "success"; kind: DialogKind; id: string; title: string; unitId?: string };

const ORDINALS = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];

const DIALOG_META: Record<DialogKind, { add: string; edit: string; subtitle: string; icon: LucideIcon; tile: string; titleLabel: string; success: string }> = {
  unit: { add: "أضف وحدة جديدة", edit: "تعديل الوحدة", subtitle: "الوحدة تجمع دروسًا مترابطة تحت عنوان واحد.", icon: Puzzle, tile: "bg-text-primary text-text-on-brand", titleLabel: "عنوان الوحدة", success: "أضيفت الوحدة بنجاح" },
  chapter: { add: "أضف فصلًا", edit: "تعديل الفصل", subtitle: "الفصل يقسّم محتوى البرنامج إلى مراحل كبرى.", icon: Copy, tile: "bg-state-success-bg text-state-success", titleLabel: "عنوان الفصل", success: "أضيف الفصل بنجاح" },
  lesson: { add: "أضف درسًا", edit: "تعديل الدرس", subtitle: "الدرس أصغر وحدة تعليمية — فيديو أو ملف أو نص.", icon: AlignRight, tile: "bg-state-info-bg text-state-info", titleLabel: "عنوان الدرس", success: "أضيف الدرس بنجاح" },
  assignment: { add: "أضف واجبًا", edit: "تعديل الواجب", subtitle: "الواجب تسليم يقيّمه المدرب ويدخل في الدرجة.", icon: ClipboardCheck, tile: "bg-state-warning-bg text-state-warning", titleLabel: "عنوان الواجب", success: "أضيف الواجب بنجاح" },
};

const LESSON_KINDS: { value: CurriculumItem["kind"]; label: string; icon: LucideIcon }[] = [
  { value: "video", label: "فيديو", icon: Video },
  { value: "file", label: "ملف", icon: FileText },
  { value: "text", label: "نص", icon: AlignRight },
  { value: "quiz", label: "اختبار", icon: CircleHelp },
];

function Pill({ required }: { required?: boolean }) {
  return required ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-state-error-bg px-[11px] py-1.5 type-caption text-state-error">
      <Glyph icon={TriangleAlert} size={16} />
      مطلوب
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-disabled px-[11px] py-1.5 type-caption text-text-muted">
      <Glyph icon={Info} size={16} />
      اختياري
    </span>
  );
}

function Field({ id, label, required, error, children, pill = true }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode; pill?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="min-w-0 flex-1 text-[16px] leading-[1.5] text-text-primary">
          {label}
        </label>
        {pill && <Pill required={required} />}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="type-caption text-state-error">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (error?: string) =>
  `h-12 w-full rounded-12 border-[1.5px] bg-bg-surface px-4 type-body text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary ${error ? "border-2 border-state-error" : "border-border-default"}`;

/** Figma "Trainer / Program Builder · Add Item Dialog": 640px, r22, page-tint header and footer. */
function BuilderDialog({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[640px] overflow-y-auto rounded-22 border border-border-default bg-bg-surface p-0 text-text-primary shadow-[0px_12px_48px_0px_rgba(17,17,17,0.14)] backdrop:bg-scrim"
    >
      {children}
    </dialog>
  );
}

/** TRR-PRG-07 · محاور البرنامج — add / edit / delete units, chapters, lessons and assignments (452:24487…452:28104). */
export function CurriculumEditor({ programId, units, locked, initialAdd, initialEdit }: { programId: string; units: CurriculumUnit[]; locked: boolean; initialAdd?: DialogKind | null; initialEdit?: string | null }) {
  const router = useRouter();
  const [order, setOrder] = useState(units.map((u) => u.id));
  const [dialog, setDialog] = useState<DialogState | null>(() => {
    if (locked) return null;
    if (initialAdd) return { mode: "form", kind: initialAdd };
    const u = initialEdit ? units.find((x) => x.id === initialEdit) : null;
    return u ? { mode: "form", kind: u.kind === "chapter" ? "chapter" : "unit", editUnit: u } : null;
  });
  const [open, setOpen] = useState<Record<string, boolean>>(() => (initialEdit ? { [initialEdit]: true } : {}));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirm, setConfirm] = useState<{ type: "unit" | "item"; id: string; title: string; count?: number } | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [fresh, setFresh] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [lessonKind, setLessonKind] = useState<CurriculumItem["kind"]>("video");
  const formId = useId();

  const [syncedUnits, setSyncedUnits] = useState(units);
  if (syncedUnits !== units) {
    setSyncedUnits(units);
    setOrder(units.map((u) => u.id));
  }
  const byId = new Map(units.map((u) => [u.id, u]));
  const list = order.map((id) => byId.get(id)).filter((u): u is CurriculumUnit => !!u);
  const lastTitle = list[list.length - 1]?.title;

  function openForm(kind: DialogKind, extra: Partial<Extract<DialogState, { mode: "form" }>> = {}) {
    if (locked) return setForbidden(true);
    setResult(null);
    const item = extra.editItem;
    setLessonKind(item && item.kind !== "assignment" ? item.kind : "video");
    setDialog({ mode: "form", kind, ...extra });
  }
  const close = () => {
    if (saving) return;
    setDialog(null);
    setResult(null);
  };

  async function submit(fd: FormData) {
    if (!dialog || dialog.mode !== "form") return;
    setSaving(true);
    setResult(null);
    const isUnit = dialog.kind === "unit" || dialog.kind === "chapter";
    fd.set("programId", programId);
    let res: ActionResult;
    if (isUnit) {
      fd.set("kind", dialog.kind === "chapter" ? "chapter" : "module");
      if (dialog.editUnit) fd.set("unitId", dialog.editUnit.id);
      res = await saveUnit(fd);
    } else {
      fd.set("unitId", dialog.unitId ?? "");
      if (dialog.kind === "assignment") fd.set("kind", "assignment");
      else fd.set("kind", lessonKind);
      if (dialog.editItem) fd.set("itemId", dialog.editItem.id);
      res = await saveItem(fd);
    }
    setSaving(false);
    if (!res.ok) {
      setResult(res);
      if (res.code === "program_locked") setForbidden(true);
      return;
    }
    announceSaved(new Date().toISOString());
    router.refresh();
    const title = String(fd.get("title") ?? "");
    if (dialog.editUnit || dialog.editItem) {
      setDialog(null);
      return;
    }
    if (isUnit) setFresh(res.id ?? null);
    if (!isUnit && dialog.unitId) setOpen((o) => ({ ...o, [dialog.unitId!]: true }));
    setDialog({ mode: "success", kind: dialog.kind, id: res.id ?? "", title, unitId: dialog.unitId });
  }

  function doDelete() {
    if (!confirm) return;
    const c = confirm;
    startDelete(async () => {
      const res = c.type === "unit" ? await deleteUnit(programId, c.id) : await deleteItem(programId, c.id);
      if (!res.ok) {
        if (res.code === "program_locked") setForbidden(true);
        setResult(res);
      } else announceSaved(new Date().toISOString());
      setConfirm(null);
      setDialog(null);
      router.refresh();
    });
  }

  async function persistOrder(next: string[]) {
    const prev = order;
    setOrder(next);
    setReorderError(null);
    const res = await reorderUnits(programId, next);
    if (!res.ok) {
      setOrder(prev);
      setReorderError(res.message);
      if (res.code === "program_locked") setForbidden(true);
    } else {
      announceSaved(new Date().toISOString());
      router.refresh();
    }
  }
  function move(id: string, delta: number) {
    const i = order.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    void persistOrder(next);
  }

  const d = dialog;
  const meta = d ? DIALOG_META[d.kind] : null;
  const editing = d?.mode === "form" && (d.editUnit || d.editItem);
  const fe = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const newUnitIndex = d?.mode === "success" ? order.indexOf(d.id) : -1;

  return (
    <>
      <section className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="min-w-0 flex-1 type-h2 text-text-primary">المحاور</h2>
          <span className={`inline-flex items-center gap-[7px] rounded-full px-3.5 py-[9px] text-[16px] leading-[1.5] ${list.length ? "bg-bg-brand-tint text-text-brand" : "bg-state-warning-bg text-state-warning"}`}>
            <Glyph icon={Puzzle} size={20} />
            {list.length ? unitsWord(list.length) : "لا محاور بعد"}
          </span>
        </div>

        {locked && (
          <Alert tone="warning" title="البرنامج مقفل للتعديل">
            لا يمكن إضافة المحاور أو حذفها أثناء المراجعة أو بعد النشر. اسحب الطلب أو أنشئ نسخة جديدة لتعديل المحتوى.
          </Alert>
        )}
        {reorderError && <Alert tone="error" title={reorderError} />}
        {result && !result.ok && !d && <Alert tone="error" title={result.message} />}

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-16 bg-bg-page px-6 py-9 text-center">
            <span className="flex size-[66px] items-center justify-center rounded-16 bg-bg-surface text-text-secondary">
              <Glyph icon={Puzzle} size={24} />
            </span>
            <p className="type-title text-text-primary">لا محاور في هذا البرنامج بعد</p>
            <p className="type-small text-text-secondary">المحور يجمع دروسًا مترابطة. ابدأ بمحور واحد وأضف دروسه.</p>
            <Button size="l" onClick={() => openForm("unit")} disabled={locked} className="min-w-[216px]">
              أضف أول محور
            </Button>
          </div>
        ) : (
          <ol className="flex flex-col gap-4">
            {list.map((u, i) => {
              const isOpen = !!open[u.id];
              const isFresh = fresh === u.id;
              return (
                <li
                  key={u.id}
                  draggable={!locked}
                  onDragStart={() => setDragId(u.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!dragId || dragId === u.id) return;
                    const next = order.filter((x) => x !== dragId);
                    next.splice(next.indexOf(u.id) + (order.indexOf(dragId) < order.indexOf(u.id) ? 1 : 0), 0, dragId);
                    setDragId(null);
                    void persistOrder(next);
                  }}
                  className={`flex flex-col gap-3 rounded-16 bg-bg-page px-[18px] pt-4 pb-[18px] ${isFresh ? "border-2 border-state-success" : ""} ${dragId === u.id ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-3.5 sm:flex-nowrap">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-[20px] leading-[1.4] text-text-brand">{toArabicDigits(i + 1)}</span>
                    <button type="button" onClick={() => setOpen({ ...open, [u.id]: !isOpen })} aria-expanded={isOpen} className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1 rounded-8 text-start focus-ring">
                      <span className="type-title text-text-primary">{u.title}</span>
                      <span className={`type-body ${isFresh && u.lessons === 0 ? "text-state-success" : "text-text-muted"}`}>
                        {lessonsWord(u.lessons)}
                        {u.minutes ? ` · ${hoursWord(Math.round((u.minutes / 60) * 10) / 10)}` : isFresh ? " · أضف دروسها" : ""}
                      </span>
                    </button>
                    {isFresh && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-bg-surface px-2.5 py-1 type-caption text-state-success">
                        <Glyph icon={Plus} size={16} />
                        جديد
                      </span>
                    )}
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => openForm(u.kind === "chapter" ? "chapter" : "unit", { editUnit: u })} aria-label={`عدّل ${u.title}`} className="flex size-10 cursor-pointer items-center justify-center rounded-8 bg-bg-surface text-text-primary focus-ring">
                        <Glyph icon={Pencil} size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => (locked ? setForbidden(true) : setConfirm({ type: "unit", id: u.id, title: u.title, count: u.items.length }))}
                        aria-label={`احذف ${u.title}`}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-8 bg-bg-surface text-state-error focus-ring"
                      >
                        <Glyph icon={Trash2} size={20} />
                      </button>
                      <button
                        type="button"
                        aria-label={`رتّب ${u.title} — استخدم الأسهم للأعلى والأسفل`}
                        disabled={locked}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            move(u.id, -1);
                          }
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            move(u.id, 1);
                          }
                        }}
                        className="flex size-10 cursor-grab items-center justify-center rounded-8 bg-bg-surface text-text-secondary focus-ring disabled:cursor-not-allowed"
                      >
                        <Glyph icon={GripVertical} size={20} />
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="flex flex-col gap-2.5 ps-0 sm:ps-[62px]">
                      {u.summary && <p className="type-small text-text-secondary">{u.summary}</p>}
                      {u.items.length === 0 && <p className="type-small text-text-muted">لا دروس في هذا المحور بعد.</p>}
                      <ul className="flex flex-col gap-2">
                        {u.items.map((it) => (
                          <li key={it.id} className="flex items-center gap-3 rounded-12 bg-bg-surface px-3.5 py-2.5">
                            <Glyph icon={it.kind === "assignment" ? ClipboardCheck : LESSON_KINDS.find((k) => k.value === it.kind)?.icon ?? AlignRight} size={16} className="text-text-muted" />
                            <span className="min-w-0 flex-1 type-small text-text-primary">{it.title}</span>
                            <span className="shrink-0 type-caption text-text-muted">
                              {ITEM_KIND_LABELS[it.kind]}
                              {it.minutes ? ` · ${toArabicDigits(it.minutes)} دقيقة` : ""}
                            </span>
                            <button type="button" onClick={() => openForm(it.kind === "assignment" ? "assignment" : "lesson", { unitId: u.id, editItem: it })} aria-label={`عدّل ${it.title}`} className="flex size-8 cursor-pointer items-center justify-center rounded-8 bg-bg-page focus-ring">
                              <Glyph icon={Pencil} size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => (locked ? setForbidden(true) : setConfirm({ type: "item", id: it.id, title: it.title }))}
                              aria-label={`احذف ${it.title}`}
                              className="flex size-8 cursor-pointer items-center justify-center rounded-8 bg-bg-page text-state-error focus-ring"
                            >
                              <Glyph icon={Trash2} size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-2.5">
                        <Button size="s" variant="outline" icon={<Glyph icon={Plus} size={16} />} onClick={() => openForm("lesson", { unitId: u.id })} disabled={locked}>
                          أضف درسًا
                        </Button>
                        <Button size="s" variant="outline" icon={<Glyph icon={Plus} size={16} />} onClick={() => openForm("assignment", { unitId: u.id })} disabled={locked}>
                          أضف واجبًا
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {list.length > 0 && (
          <button
            type="button"
            onClick={() => openForm("unit")}
            disabled={locked}
            className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-16 border-2 border-dashed border-action-primary bg-bg-surface py-[18px] text-[20px] leading-[1.4] text-text-brand focus-ring disabled:cursor-not-allowed disabled:border-border-default disabled:text-text-disabled"
          >
            <Glyph icon={Plus} size={24} />
            أضف محورًا جديدًا
          </button>
        )}
      </section>

      {/* Add / edit / success dialog */}
      <BuilderDialog open={!!d} onClose={close} label={meta ? (d?.mode === "success" ? meta.success : editing ? meta.edit : meta.add) : ""}>
        {d && meta && d.mode === "form" && (
          <form
            id={formId}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit(new FormData(e.currentTarget));
            }}
          >
            <div className="flex items-start gap-4 bg-bg-page px-5 py-6 sm:px-7">
              <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-16 ${meta.tile}`}>
                <Glyph icon={meta.icon} size={24} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="type-h2 text-text-primary">{editing ? meta.edit : meta.add}</h2>
                <p className="type-body text-text-secondary">{meta.subtitle}</p>
              </div>
              <button type="button" onClick={close} aria-label="إغلاق" className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-12 bg-bg-surface text-text-secondary focus-ring">
                <Glyph icon={X} size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-5 px-5 py-[26px] sm:px-7">
              <Field id={`${formId}-title`} label={meta.titleLabel} required error={fe.title}>
                <input id={`${formId}-title`} name="title" required maxLength={160} defaultValue={d.editUnit?.title ?? d.editItem?.title ?? ""} placeholder="مثال: مؤشرات الإنذار المبكر" aria-invalid={!!fe.title || undefined} className={inputCls(fe.title)} />
              </Field>
              <Field id={`${formId}-summary`} label="وصف مختصر" error={fe.summary}>
                <textarea id={`${formId}-summary`} name="summary" rows={3} maxLength={600} defaultValue={d.editUnit?.summary ?? d.editItem?.summary ?? ""} placeholder="سطر أو سطران يشرحان ما يغطيه" className={`min-h-24 w-full resize-y rounded-12 border-[1.5px] border-border-default bg-bg-surface px-4 py-3.5 type-body text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary`} />
              </Field>

              {(d.kind === "unit" || d.kind === "chapter") && (
                <Field id={`${formId}-place`} label="الموضع" pill={false}>
                  <div className="relative">
                    <select id={`${formId}-place`} name="place" defaultValue={d.editUnit ? "keep" : "end"} className={`${inputCls()} cursor-pointer appearance-none pe-11`}>
                      {d.editUnit && <option value="keep">بلا تغيير</option>}
                      <option value="end">{lastTitle ? `في النهاية — بعد «${lastTitle}»` : "في النهاية"}</option>
                      <option value="start">في البداية</option>
                      {list
                        .filter((u) => u.id !== d.editUnit?.id)
                        .slice(0, -1)
                        .map((u) => (
                          <option key={u.id} value={`after:${u.id}`}>
                            بعد «{u.title}»
                          </option>
                        ))}
                    </select>
                    <ChevronDown aria-hidden size={16} strokeWidth={1.25} absoluteStrokeWidth className="pointer-events-none absolute end-4 top-4 text-text-secondary" />
                  </div>
                </Field>
              )}

              {d.editUnit && d.editUnit.items.length > 0 && (
                <p className="flex items-center gap-3 rounded-12 bg-state-warning-bg px-4 py-3.5 type-body text-state-warning">
                  <Glyph icon={TriangleAlert} size={20} />
                  {d.editUnit.items.length === 1
                    ? "هذه الوحدة تحوي درسًا واحدًا. حذفها يحذفه معها — وسيُطلب تأكيدك."
                    : d.editUnit.items.length === 2
                      ? "هذه الوحدة تحوي درسين. حذفها يحذفهما معًا — وسيُطلب تأكيدك."
                      : `هذه الوحدة تحوي ${lessonsWord(d.editUnit.items.length)}. حذفها يحذفها جميعًا — وسيُطلب تأكيدك.`}
                </p>
              )}

              {d.kind === "lesson" && (
                <>
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-[16px] leading-[1.5] text-text-primary">نوع الدرس</legend>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {LESSON_KINDS.map((k) => {
                        const on = lessonKind === k.value;
                        return (
                          <label key={k.value} className={`flex cursor-pointer flex-col items-center gap-2 rounded-12 pt-4 pb-[18px] ${on ? "border-2 border-action-primary bg-bg-brand-tint" : "border-[1.5px] border-border-default bg-bg-page"}`}>
                            <input type="radio" name="lessonKind" value={k.value} checked={on} onChange={() => setLessonKind(k.value)} className="sr-only" />
                            <span className={`flex size-9 items-center justify-center rounded-8 ${on ? "bg-action-primary text-text-on-brand" : "bg-bg-surface text-text-secondary"}`}>
                              <Glyph icon={k.icon} size={20} />
                            </span>
                            <span className={`type-caption ${on ? "text-text-brand" : "text-text-secondary"}`}>{k.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <Field id={`${formId}-minutes`} label="المدة بالدقائق" error={fe.minutes}>
                    <input id={`${formId}-minutes`} name="minutes" inputMode="numeric" defaultValue={d.editItem?.minutes ?? ""} placeholder="١٢" className={inputCls(fe.minutes)} />
                  </Field>
                </>
              )}

              {d.kind === "assignment" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id={`${formId}-weight`} label="الوزن من الدرجة" pill={false} error={fe.weight}>
                      <input id={`${formId}-weight`} name="weight" inputMode="numeric" defaultValue={d.editItem?.weight ?? ""} placeholder="١٥٪" className={inputCls(fe.weight)} />
                    </Field>
                    <Field id={`${formId}-max`} label="الدرجة الكاملة" pill={false} error={fe.maxScore}>
                      <input id={`${formId}-max`} name="maxScore" inputMode="numeric" defaultValue={d.editItem?.maxScore ?? ""} placeholder="٢٠" className={inputCls(fe.maxScore)} />
                    </Field>
                  </div>
                  <Field id={`${formId}-due`} label="موعد التسليم" error={fe.dueNote}>
                    <input id={`${formId}-due`} name="dueNote" maxLength={160} defaultValue={d.editItem?.dueNote ?? ""} placeholder="بعد الجلسة السادسة بأسبوع" className={inputCls(fe.dueNote)} />
                  </Field>
                </>
              )}

              {saving && (
                <p role="status" className="flex items-center gap-3 rounded-12 bg-state-info-bg px-4 py-4 type-body text-state-info">
                  <LoaderCircle aria-hidden size={20} strokeWidth={1.4} absoluteStrokeWidth className="animate-[tg-spin_0.9s_linear_infinite]" />
                  جارٍ الحفظ — لا تغلق النافذة.
                </p>
              )}
              {result && !result.ok && <Alert tone="error" title={result.message} />}
            </div>
            <div className="flex flex-wrap items-center gap-3.5 bg-bg-page px-5 pt-[22px] pb-6 sm:px-7">
              <Button type="submit" size="l" loading={saving}>
                {saving ? "جارٍ الحفظ…" : editing ? "احفظ التعديل" : "احفظ وأضف"}
              </Button>
              <Button variant="text" size="l" onClick={close} disabled={saving}>
                إلغاء
              </Button>
              {d.editUnit && (
                <Button variant="text" size="l" className="ms-auto !text-state-error" onClick={() => setConfirm({ type: "unit", id: d.editUnit!.id, title: d.editUnit!.title, count: d.editUnit!.items.length })} disabled={saving}>
                  {d.kind === "chapter" ? "احذف الفصل" : "احذف الوحدة"}
                </Button>
              )}
              {d.editItem && (
                <Button variant="text" size="l" className="ms-auto !text-state-error" onClick={() => setConfirm({ type: "item", id: d.editItem!.id, title: d.editItem!.title })} disabled={saving}>
                  احذف
                </Button>
              )}
            </div>
          </form>
        )}

        {d && meta && d.mode === "success" && (
          <div>
            <div className="flex items-start gap-4 bg-state-success-bg px-5 py-6 sm:px-7">
              <span className="flex size-[52px] shrink-0 items-center justify-center rounded-16 bg-action-primary text-text-on-brand">
                <Glyph icon={CircleCheck} size={24} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="type-h2 text-text-primary">{meta.success}</h2>
                <p className="type-body text-text-secondary">تجدها الآن في مكانها داخل البرنامج.</p>
              </div>
              <button type="button" onClick={close} aria-label="إغلاق" className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-12 bg-bg-surface text-text-secondary focus-ring">
                <Glyph icon={X} size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-3.5 px-5 py-[26px] sm:px-7">
              <div className="flex items-center gap-3.5 rounded-16 bg-state-success-bg px-4 py-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-[20px] text-text-brand">{toArabicDigits(Math.max(1, newUnitIndex + 1))}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="type-title text-text-primary">{d.title}</span>
                  <span className="type-caption text-state-success">
                    {d.kind === "unit" || d.kind === "chapter"
                      ? `${d.kind === "chapter" ? "الفصل" : "الوحدة"} ${ORDINALS[newUnitIndex] ?? toArabicDigits(newUnitIndex + 1)} · ٠ دروس · أضف دروسها الآن`
                      : `أضيف إلى «${byId.get(d.unitId ?? "")?.title ?? ""}»`}
                  </span>
                </span>
              </div>
              {(d.kind === "unit" || d.kind === "chapter") && (
                <p className="flex items-center gap-2.5 rounded-12 bg-bg-page px-4 py-3.5 type-small text-text-secondary">
                  <Glyph icon={Info} size={20} />
                  أُضيفت في موضعها من قائمة المحاور — يمكنك سحبها لأي موضع.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3.5 bg-bg-page px-5 pt-[22px] pb-6 sm:px-7">
              <Button size="l" onClick={() => openForm(d.kind, { unitId: d.unitId })}>
                {d.kind === "lesson" ? "أضف درسًا آخر" : d.kind === "assignment" ? "أضف واجبًا آخر" : d.kind === "chapter" ? "أضف فصلًا آخر" : "أضف وحدة أخرى"}
              </Button>
              <Button variant="outline" size="l" onClick={close}>
                تم — أغلق
              </Button>
            </div>
          </div>
        )}
      </BuilderDialog>

      {/* Delete confirmation */}
      <Modal
        open={!!confirm}
        onClose={() => !deleting && setConfirm(null)}
        destructive
        size="s"
        title={confirm?.type === "unit" ? "تحذف هذه الوحدة؟" : "تحذف هذا العنصر؟"}
        footer={
          <>
            <Button variant="danger" loading={deleting} onClick={doDelete}>
              نعم — احذف
            </Button>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={deleting}>
              تراجع
            </Button>
          </>
        }
      >
        {confirm?.type === "unit"
          ? `«${confirm.title}»${confirm.count ? ` وما فيها من ${lessonsWord(confirm.count)}` : ""} ستُحذف من البرنامج نهائيًا. لا يمكن التراجع بعد الحذف.`
          : `«${confirm?.title ?? ""}» سيُحذف من المحور نهائيًا.`}
      </Modal>

      {/* Delete / edit forbidden (program under review or published) */}
      <Modal
        open={forbidden}
        onClose={() => setForbidden(false)}
        size="s"
        title="لا يمكن التعديل الآن"
        footer={
          <Button variant="outline" onClick={() => setForbidden(false)}>
            حسنًا
          </Button>
        }
      >
        <span className="flex items-start gap-2.5">
          <Glyph icon={Lock} size={20} className="mt-1 text-state-warning" />
          البرنامج قيد المراجعة أو منشور، ومحتواه مقفل. اسحب الطلب للتعديل، أو أنشئ نسخة جديدة من البرنامج المنشور.
        </span>
      </Modal>
    </>
  );
}
