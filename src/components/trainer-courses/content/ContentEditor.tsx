"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FileText,
  Puzzle,
  ListChecks,
  Menu,
  SquarePen,
  Plus,
  Trash2,
  Type,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatClock, formatDuration, pluralAr, toArabicDigits } from "@/lib/format";
import { formatSize } from "@/lib/trainer-courses";
import type { TrainerLesson, TrainerModule } from "@/lib/data/trainer-courses";
import { addModule, createLesson, deleteLesson, deleteModule, moveLesson, moveModule, renameModule } from "@/app/(trainer)/trainer/courses/actions";
import { LessonEditor } from "./LessonEditor";

/* «الوحدات والدروس» (395:16485 · Trainer / Recorded · Module Group 733:58058): modules → lessons → materials. */

const ORDINALS = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];
export const moduleLabel = (i: number) => `الوحدة ${ORDINALS[i] ?? toArabicDigits(i + 1)}`;

export const KIND: Record<TrainerLesson["kind"], { label: string; icon: LucideIcon }> = {
  video: { label: "فيديو", icon: Video },
  text: { label: "نص", icon: Type },
  file: { label: "ملف", icon: FileText },
  quiz: { label: "اختبار", icon: ListChecks },
};

function lessonMeta(l: TrainerLesson): string {
  if (l.kind === "video") return l.mediaPath ? `فيديو · ${formatClock(l.durationSeconds)}` : "فيديو · لم يُرفع بعد";
  if (l.kind === "file") return l.mediaPath ? `ملف · ${formatSize(l.mediaSize ?? 0)}` : "ملف · لم يُرفع بعد";
  if (l.kind === "quiz") return l.quiz?.questions.length ? `اختبار · ${pluralAr(l.quiz.questions.length, ["سؤال واحد", "سؤالان", "أسئلة", "سؤالًا"])}` : "اختبار · بلا أسئلة بعد";
  return l.body?.trim() ? "نص مكتوب" : "نص · لم يُكتب بعد";
}

function IconBtn({ icon, label, onClick, disabled, tone = "default" }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-12 bg-bg-surface focus-ring disabled:cursor-not-allowed disabled:opacity-40 ${tone === "danger" ? "text-state-error" : "text-text-secondary"}`}
    >
      <Glyph icon={icon} size={20} />
    </button>
  );
}

export function ContentEditor({
  courseId,
  modules,
  published,
  totals,
  allowModuleEdits = true,
}: {
  courseId: string;
  modules: TrainerModule[];
  published: boolean;
  totals: { modules: number; lessons: number; seconds: number };
  allowModuleEdits?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [newModule, setNewModule] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ moduleId: string; kind: TrainerLesson["kind"]; title: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "module" | "lesson"; id: string; title: string } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void, okMsg?: string) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? null);
        toast("error", res.error ?? "تعذّر الحفظ");
        return;
      }
      done?.();
      if (okMsg) toast("success", okMsg);
      router.refresh();
    });

  const editingLesson = modules.flatMap((m) => m.lessons).find((l) => l.id === editing) ?? null;

  return (
    <section aria-labelledby="modules-title" className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="modules-title" className="min-w-[12rem] flex-1 type-h2 text-text-primary">
          الوحدات والدروس
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-brand-tint px-[11px] py-1.5 type-caption text-text-brand">
          {pluralAr(totals.modules, ["وحدة واحدة", "وحدتان", "وحدات", "وحدة"])} · {pluralAr(totals.lessons, ["درس واحد", "درسان", "دروس", "درسًا"])}
          {totals.seconds > 0 && ` · ${formatDuration(totals.seconds)}`}
          <Glyph icon={Puzzle} size={16} />
        </span>
      </div>
      {error && (
        <p role="alert" className="rounded-12 bg-state-error-bg px-4 py-3 type-small text-state-error">
          {error}
        </p>
      )}
      {modules.length === 0 && (
        <p className="rounded-16 border-[1.5px] border-dashed border-border-default bg-bg-page px-6 py-8 text-center type-body text-text-muted">لا وحدات بعد — أضف أول وحدة ثم ابنِ دروسها.</p>
      )}

      {modules.map((m, i) => {
        const open = !collapsed.includes(m.id);
        const seconds = m.lessons.reduce((s, l) => s + l.durationSeconds, 0);
        const previews = m.lessons.filter((l) => l.isPreview).length;
        const videos = m.lessons.filter((l) => l.kind === "video").length;
        return (
          <div key={m.id} className="flex flex-col gap-4 rounded-16 bg-bg-page px-4 pt-5 pb-[22px] sm:px-[22px]">
            {renaming?.id === m.id ? (
              <form
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  act(() => renameModule(courseId, m.id, renaming.title), () => setRenaming(null));
                }}
              >
                <Input label="عنوان الوحدة" value={renaming.title} onChange={(e) => setRenaming({ id: m.id, title: e.target.value })} autoFocus maxLength={200} />
                <Button type="submit" loading={pending}>
                  احفظ
                </Button>
                <Button variant="ghost" onClick={() => setRenaming(null)}>
                  إلغاء
                </Button>
              </form>
            ) : (
              <p className="flex min-h-[60px] items-center justify-center rounded-12 bg-bg-brand-tint px-4 py-3 text-center type-h3 text-text-brand">
                {moduleLabel(i)} · {m.title}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <p className="type-title text-text-primary">{pluralAr(m.lessons.length, ["درس واحد", "درسان", "دروس", "درسًا"])}</p>
              <p className="flex flex-wrap items-center gap-x-3.5 gap-y-2 type-body text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Glyph icon={Eye} size={16} />
                  {previews > 0 ? "درس معاينة مجاني" : "بلا درس معاينة"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Glyph icon={Clock} size={16} />
                  {seconds > 0 ? formatDuration(seconds) : "—"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Glyph icon={Video} size={16} />
                  {pluralAr(videos, ["فيديو واحد", "فيديوان", "فيديوهات", "فيديو"])}
                </span>
              </p>
            </div>

            {open && (
              <ol className="flex flex-col gap-2.5">
                {m.lessons.map((l, li) => {
                  const k = KIND[l.kind];
                  return (
                    <li key={l.id} className={`flex flex-wrap items-center gap-3 rounded-12 px-3.5 py-3 sm:flex-nowrap ${l.hasMaterial ? "bg-bg-surface" : "border-[1.5px] border-state-warning bg-state-warning-bg"}`}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
                        <Glyph icon={k.icon} size={20} />
                      </span>
                      <button type="button" onClick={() => setEditing(l.id)} className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 rounded-8 text-start focus-ring">
                        <span className="type-subtitle text-text-primary">{l.title}</span>
                        <span className={`type-caption ${l.hasMaterial ? "text-text-muted" : "text-state-warning"}`}>{lessonMeta(l)}</span>
                      </button>
                      <span className="flex flex-wrap items-center gap-2">
                        {l.isPreview && <span className="inline-flex items-center gap-1.5 rounded-full bg-state-success-bg px-2.5 py-1 type-caption text-state-success">معاينة مجانية</span>}
                        {published && !l.publishedAt && <span className="inline-flex items-center gap-1.5 rounded-full bg-state-warning-bg px-2.5 py-1 type-caption text-state-warning">مسودة — لم يُنشر</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        <button type="button" aria-label={`انقل «${l.title}» لأعلى`} disabled={li === 0 || pending} onClick={() => act(() => moveLesson(courseId, l.id, "up"))} className="flex size-9 cursor-pointer items-center justify-center rounded-8 text-text-secondary hover:bg-bg-page focus-ring disabled:opacity-30">
                          <Glyph icon={ArrowUp} size={16} />
                        </button>
                        <button type="button" aria-label={`انقل «${l.title}» لأسفل`} disabled={li === m.lessons.length - 1 || pending} onClick={() => act(() => moveLesson(courseId, l.id, "down"))} className="flex size-9 cursor-pointer items-center justify-center rounded-8 text-text-secondary hover:bg-bg-page focus-ring disabled:opacity-30">
                          <Glyph icon={ArrowDown} size={16} />
                        </button>
                        <button type="button" aria-label={`عدّل «${l.title}»`} onClick={() => setEditing(l.id)} className="flex size-9 cursor-pointer items-center justify-center rounded-8 text-text-secondary hover:bg-bg-page focus-ring">
                          <Glyph icon={SquarePen} size={16} />
                        </button>
                        <button type="button" aria-label={`احذف «${l.title}»`} onClick={() => setConfirm({ kind: "lesson", id: l.id, title: l.title })} className="flex size-9 cursor-pointer items-center justify-center rounded-8 text-state-error hover:bg-state-error-bg focus-ring">
                          <Glyph icon={Trash2} size={16} />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start">
              {adding?.moduleId === m.id ? (
                <form
                  className="flex w-full flex-col gap-3 rounded-12 bg-bg-surface p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(
                      () => createLesson(courseId, m.id, adding.kind, adding.title),
                      () => setAdding(null),
                      published ? "أُضيف الدرس كمسودة — انشره من «نشر المحتوى الجديد»." : "أُضيف الدرس.",
                    );
                  }}
                >
                  <div role="radiogroup" aria-label="نوع الدرس" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(Object.keys(KIND) as TrainerLesson["kind"][]).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        role="radio"
                        aria-checked={adding.kind === kind}
                        onClick={() => setAdding({ ...adding, kind })}
                        className={`flex cursor-pointer items-center justify-center gap-2 rounded-12 border-[1.5px] px-3 py-2.5 type-subtitle focus-ring ${
                          adding.kind === kind ? "border-action-primary bg-bg-brand-tint text-text-brand" : "border-border-default bg-bg-page text-text-secondary"
                        }`}
                      >
                        {KIND[kind].label}
                        <Glyph icon={KIND[kind].icon} size={16} />
                      </button>
                    ))}
                  </div>
                  <Input label="عنوان الدرس" value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} autoFocus maxLength={200} required />
                  <div className="flex gap-3">
                    <Button type="submit" loading={pending}>
                      أضف الدرس
                    </Button>
                    <Button variant="ghost" onClick={() => setAdding(null)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding({ moduleId: m.id, kind: "video", title: "" })}
                  className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-12 border-[1.5px] border-dashed border-border-default bg-bg-surface px-4 type-body text-text-muted hover:border-action-primary hover:text-text-brand focus-ring sm:w-[281px]"
                >
                  <Glyph icon={Plus} size={16} />
                  ضع بطاقات الدروس هنا
                </button>
              )}
              {adding?.moduleId !== m.id && (
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <button
                      type="button"
                      aria-label="ترتيب الوحدة"
                      aria-expanded={menu === m.id}
                      onClick={() => setMenu(menu === m.id ? null : m.id)}
                      className="flex size-11 cursor-pointer items-center justify-center rounded-12 bg-bg-surface text-text-secondary focus-ring"
                    >
                      <Glyph icon={Menu} size={20} />
                    </button>
                    {menu === m.id && (
                      <div className="absolute end-0 top-12 z-10 flex w-44 flex-col rounded-12 border border-border-default bg-bg-surface p-1.5 shadow-float">
                        <button type="button" disabled={i === 0} onClick={() => { setMenu(null); act(() => moveModule(courseId, m.id, "up")); }} className="cursor-pointer rounded-8 px-3 py-2 text-start type-small hover:bg-bg-page disabled:opacity-40">
                          انقل الوحدة لأعلى
                        </button>
                        <button type="button" disabled={i === modules.length - 1} onClick={() => { setMenu(null); act(() => moveModule(courseId, m.id, "down")); }} className="cursor-pointer rounded-8 px-3 py-2 text-start type-small hover:bg-bg-page disabled:opacity-40">
                          انقل الوحدة لأسفل
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <IconBtn icon={Trash2} label="احذف الوحدة" tone="danger" disabled={m.fromProgram || !allowModuleEdits} onClick={() => setConfirm({ kind: "module", id: m.id, title: m.title })} />
                    <IconBtn icon={SquarePen} label="عدّل عنوان الوحدة" disabled={m.fromProgram || !allowModuleEdits} onClick={() => setRenaming({ id: m.id, title: m.title })} />
                    <IconBtn icon={open ? ChevronUp : ChevronDown} label={open ? "اطوِ الوحدة" : "افتح الوحدة"} onClick={() => setCollapsed((c) => (open ? [...c, m.id] : c.filter((x) => x !== m.id)))} />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {allowModuleEdits &&
        (newModule === null ? (
          <Button variant="outline" size="l" icon={<Glyph icon={Plus} size={20} />} onClick={() => setNewModule("")}>
            أضف وحدة
          </Button>
        ) : (
          <form
            className="flex flex-col gap-3 rounded-16 bg-bg-page p-4 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => addModule(courseId, newModule), () => setNewModule(null), "أُضيفت الوحدة.");
            }}
          >
            <Input label="عنوان الوحدة الجديدة" value={newModule} onChange={(e) => setNewModule(e.target.value)} autoFocus maxLength={200} required />
            <Button type="submit" loading={pending}>
              أضف
            </Button>
            <Button variant="ghost" onClick={() => setNewModule(null)}>
              إلغاء
            </Button>
          </form>
        ))}

      {published && modules.some((m) => m.lessons.some((l) => !l.publishedAt)) && (
        <Link href={`/trainer/courses/${courseId}/content/publish`} className="rounded-12 bg-state-warning-bg px-4 py-3 text-center type-subtitle text-state-warning hover:underline focus-ring">
          لديك دروس جديدة لم تُنشر — راجع أثرها وانشرها
        </Link>
      )}

      {editingLesson && <LessonEditor key={editingLesson.id} courseId={courseId} lesson={editingLesson} onClose={() => setEditing(null)} />}

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        destructive
        title={confirm?.kind === "module" ? "حذف الوحدة؟" : "حذف الدرس؟"}
        footer={
          <>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => {
                const c = confirm!;
                act(() => (c.kind === "module" ? deleteModule(courseId, c.id) : deleteLesson(courseId, c.id)), () => setConfirm(null), "حُذف.");
              }}
            >
              احذف نهائيًا
            </Button>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              إلغاء
            </Button>
          </>
        }
      >
        {confirm?.kind === "module"
          ? `تُحذف «${confirm.title}» وكل دروسها وموادها المرفوعة. لا يمكن التراجع.`
          : `يُحذف «${confirm?.title}» ومادته المرفوعة. لا يمكن حذف درس بدأه المتدربون.`}
      </Modal>
    </section>
  );
}
