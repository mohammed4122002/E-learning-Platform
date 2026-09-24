"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Award, BadgeCheck, BookOpen, Briefcase, Building2, ChevronLeft, CircleUser, Globe, GraduationCap, Info, Lock, Pencil, Trash2, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Toggle } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { initialFormState } from "@/lib/validation/auth";
import { formatRating, toArabicDigits } from "@/lib/format";
import { setAvatar } from "@/app/(workspace)/trainee/profile/actions";
import {
  cycleVisibility, deleteQualification, deleteTrainerExperience, removeCv, saveQualification, saveTrainerBasics, saveTrainerExperience, setCv, setProgramVisible,
} from "@/app/(trainer)/trainer/profile/actions";

/* TRR-PRF-02 · إدارة الملف المهني (290:7769) — client sections. */

export type EditorQualification = { id: string; kind: "academic" | "professional"; title: string; issuer: string; year: number | null; hasFile: boolean };
export type EditorExperience = { id: string; title: string; organization: string; startMonth: string; endMonth: string | null; isCurrent: boolean };
export type EditorProgram = { id: string; title: string; caption: string; visible: boolean; disabled: boolean };
export type VisibilityRow = { key: "profile" | "credentials" | "experience" | "availability" | "trainees"; label: string; level: "public" | "orgs" | "private" };

const LEVEL = {
  public: { label: "عام — يراه أي زائر", icon: Globe, cls: "text-state-info" },
  orgs: { label: "الجهات — الجهات التدريبية فقط", icon: Building2, cls: "text-state-warning" },
  private: { label: "خاص — لا يراه أحد", icon: Lock, cls: "text-state-success" },
} as const;

const yearOf = (m: string | null) => (m ? toArabicDigits(m.slice(0, 4)) : "");

/** Card shell with the «عام · يراه أي زائر» pill (290:7917). */
export function EditorSection({ id, title, subtitle, icon, level, children }: { id: string; title: string; subtitle: string; icon: LucideIcon; level: VisibilityRow["level"]; children: ReactNode }) {
  const l = LEVEL[level];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex w-full scroll-mt-24 flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <div className="flex w-full flex-wrap items-center gap-3.5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-brand-tint text-text-brand">
          <Glyph icon={icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <h2 id={`${id}-title`} className="type-h2 text-text-primary">
            {title}
          </h2>
          <p className="type-body text-text-muted">{subtitle}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-[7px] rounded-full px-[11px] py-1.5 type-small ${level === "public" ? "bg-state-info-bg" : level === "orgs" ? "bg-state-warning-bg" : "bg-state-success-bg"} ${l.cls}`}>
          <Glyph icon={l.icon} size={16} />
          {level === "public" ? "عام · يراه أي زائر" : level === "orgs" ? "الجهات · التدريبية فقط" : "خاص · لا يراه أحد"}
        </span>
      </div>
      {children}
    </section>
  );
}

function IconButton({ icon, label, onClick, tone = "default", disabled }: { icon: LucideIcon; label: string; onClick: () => void; tone?: "default" | "danger"; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-12 bg-bg-surface focus-ring disabled:cursor-progress disabled:opacity-60 ${tone === "danger" ? "text-state-error hover:bg-state-error-bg" : "text-text-secondary hover:bg-bg-brand-tint"}`}
    >
      <Glyph icon={icon} size={20} />
    </button>
  );
}

/* ── الصورة والنبذة ─────────────────────────────────────────────────────────────────── */

export function PhotoAndBio({ userId, fullName, avatarSrc, headline, bio, suggestion, level }: { userId: string; fullName: string; avatarSrc: string | null; headline: string; bio: string; suggestion: string | null; level: VisibilityRow["level"] }) {
  const toast = useToast();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [bioValue, setBioValue] = useState(suggestion ?? bio);
  const [saving, startSaving] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const saved = useRef({ headline, bio });

  const save = (field: "headline" | "bio", value: string) => {
    if (saved.current[field] === value) return;
    startSaving(async () => {
      const res = await saveTrainerBasics(field, value);
      toast(res.ok ? "success" : "error", res.message);
      if (res.ok) {
        saved.current[field] = value;
        router.refresh();
      }
    });
  };

  const upload = async (file: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      toast("error", "اختر صورة JPG أو PNG أو WEBP بحجم لا يتجاوز ٥ م.ب.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient().storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const res = await setAvatar(path);
      toast(res.status === "success" ? "success" : "error", res.message ?? "");
      router.refresh();
    } catch {
      toast("error", "تعذّر رفع الصورة. تحقّق من اتصالك ثم أعد المحاولة.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <EditorSection id="photo" title="الصورة والنبذة" subtitle="أول ما تراه الجهة" icon={CircleUser} level={level}>
      <div className="flex flex-wrap items-center gap-5 rounded-16 bg-bg-page p-5 sm:flex-nowrap">
        <Avatar name={fullName} src={avatarSrc} size="l" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="type-title text-text-primary">صورتك الشخصية</p>
          <p className="type-body text-text-muted">صورة واضحة لوجهك · الملفات ذات الصور تتلقّى عروضًا أكثر بمرتين</p>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <Button variant="outline" size="l" loading={uploading} onClick={() => fileRef.current?.click()} className="w-full px-4 sm:w-auto">
          غيّر الصورة
        </Button>
      </div>
      <Input label="عنوانك المهني" name="headline" defaultValue={headline} maxLength={120} placeholder="مثال: مدرب إدارة مشاريع ومالية · ٥ سنوات خبرة" onBlur={(e) => save("headline", e.target.value.trim())} />
      <div id="bio" className="scroll-mt-24">
        <Textarea
          label="نبذة عنك"
          name="bio"
          rows={3}
          maxLength={1200}
          value={bioValue}
          onChange={(e) => setBioValue(e.target.value)}
          onBlur={(e) => save("bio", e.target.value.trim())}
          hint={suggestion ? "اقترحنا نبذة من إجاباتك في التسجيل — راجعها وعدّلها، وتُحفظ عند مغادرة الحقل." : saving ? "جارٍ الحفظ…" : undefined}
        />
      </div>
    </EditorSection>
  );
}

/* ── الاعتمادات والمؤهلات ─────────────────────────────────────────────────────────── */

function QualificationForm({ userId, initial, onDone }: { userId: string; initial: EditorQualification | null; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveQualification, initialFormState);
  const [filePath, setFilePath] = useState("");
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  useEffect(() => {
    if (state.status === "success") {
      toast("success", state.message ?? "");
      onDone();
    }
  }, [state, toast, onDone]);
  const upload = async (file: File) => {
    if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      toast("error", "ارفع ملف PDF أو صورة بحجم لا يتجاوز ١٠ م.ب.");
      return;
    }
    setUploading(true);
    const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("trainer-media").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) toast("error", "تعذّر رفع المستند. أعد المحاولة.");
    else setFilePath(path);
  };
  const v = state.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={initial?.id ?? ""} />
      <input type="hidden" name="filePath" value={filePath} />
      {state.message && state.status === "error" && <Alert tone="error" title={state.message} />}
      <Select
        name="kind"
        label="نوع المؤهل"
        defaultValue={v.kind ?? initial?.kind ?? "professional"}
        options={[
          { value: "professional", label: "اعتماد مهني" },
          { value: "academic", label: "مؤهل أكاديمي" },
        ]}
        error={state.fieldErrors?.kind}
      />
      <Input name="title" label="اسم المؤهل" defaultValue={v.title ?? initial?.title ?? ""} maxLength={160} required error={state.fieldErrors?.title} placeholder="مثال: PMP — إدارة مشاريع احترافية" />
      <Input name="issuer" label="الجهة المانحة" defaultValue={v.issuer ?? initial?.issuer ?? ""} maxLength={160} required error={state.fieldErrors?.issuer} placeholder="مثال: معهد PMI" />
      <Input name="year" label="سنة الحصول عليه" inputMode="numeric" defaultValue={v.year ?? (initial?.year ? String(initial.year) : "")} maxLength={4} error={state.fieldErrors?.year} placeholder="٢٠١٩" dir="ltr" />
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-16 border-[1.5px] border-dashed border-border-default bg-bg-page p-5 text-center focus-within:border-action-primary">
        <Glyph icon={Upload} size={24} className="text-text-brand" />
        <span className="type-subtitle text-text-brand">{uploading ? "جارٍ رفع المستند…" : filePath ? "أُرفق المستند" : initial?.hasFile ? "مستند مرفق — ارفع مستندًا جديدًا لاستبداله" : "أرفق المستند (اختياري)"}</span>
        <span className="type-caption text-text-muted">PDF أو صورة · حتى ١٠ م.ب · إرفاق المستند يضاعف ثقة الجهة بك</span>
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onDone}>
          إلغاء
        </Button>
        <Button type="submit" loading={pending} disabled={uploading}>
          {initial ? "احفظ التعديل" : "أضف المؤهل"}
        </Button>
      </div>
    </form>
  );
}

export function QualificationsSection({ userId, verified, verifiedLabel, items, level }: { userId: string; verified: boolean; verifiedLabel: string; items: EditorQualification[]; level: VisibilityRow["level"] }) {
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<EditorQualification | "new" | null>(null);
  const [confirm, setConfirm] = useState<EditorQualification | null>(null);
  const [pending, start] = useTransition();
  return (
    <EditorSection id="qualifications" title="الاعتمادات والمؤهلات" subtitle="ما يبني ثقة الجهة بك" icon={Award} level={level}>
      <p className="flex items-start gap-2.5 rounded-12 bg-state-warning-bg px-4 py-[13px] type-body text-state-warning">
        <Glyph icon={Info} size={20} className="mt-1" />
        <span className="flex-1">المنصة لا تتحقق من مؤهلاتك — تُعرض للجهات موسومة «مُدخَل من صاحبه». إرفاق المستند يضاعف ثقة الجهة بك.</span>
      </p>
      <ul className="flex flex-col gap-[18px]">
        {verified && (
          <li className="flex items-center gap-3.5 rounded-16 bg-state-success-bg px-[18px] py-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-success">
              <Glyph icon={BadgeCheck} size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="type-title text-text-primary">اعتماد بوابة التدريب</span>
              <span className="type-body text-text-muted">{verifiedLabel}</span>
            </span>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-success" title="لا يُعدَّل">
              <Glyph icon={Lock} size={20} />
            </span>
          </li>
        )}
        {items.map((q) => (
          <li key={q.id} className="flex items-center gap-3.5 rounded-16 bg-bg-page px-[18px] py-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
              <Glyph icon={q.kind === "academic" ? GraduationCap : Award} size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="type-title text-text-primary">{q.title}</span>
              <span className="type-body text-text-muted">{[q.issuer, q.year ? toArabicDigits(q.year) : null, q.hasFile ? "مستند مرفق" : null].filter(Boolean).join(" · ")}</span>
            </span>
            <IconButton icon={Trash2} label={`احذف ${q.title}`} tone="danger" onClick={() => setConfirm(q)} />
            <IconButton icon={Pencil} label={`عدّل ${q.title}`} onClick={() => setEditing(q)} />
          </li>
        ))}
      </ul>
      <Button variant="outline" size="l" fullWidth onClick={() => setEditing("new")}>
        أضف مؤهلًا أو اعتمادًا
      </Button>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "أضف مؤهلًا أو اعتمادًا" : "عدّل المؤهل"}>
        {editing !== null && (
          <QualificationForm
            key={editing === "new" ? "new" : editing.id}
            userId={userId}
            initial={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        destructive
        size="s"
        title="حذف المؤهل؟"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              تراجع
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteQualification(confirm!.id);
                  toast(res.ok ? "success" : "error", res.message);
                  setConfirm(null);
                  router.refresh();
                })
              }
            >
              احذف
            </Button>
          </>
        }
      >
        سيختفي «{confirm?.title}» من ملفك العام فورًا.
      </Modal>
    </EditorSection>
  );
}

/* ── الخبرات والأعمال + السيرة الذاتية ─────────────────────────────────────────────── */

function ExperienceForm({ initial, onDone }: { initial: EditorExperience | null; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveTrainerExperience, initialFormState);
  const [current, setCurrent] = useState(initial?.isCurrent ?? false);
  const toast = useToast();
  useEffect(() => {
    if (state.status === "success") {
      toast("success", state.message ?? "");
      onDone();
    }
  }, [state, toast, onDone]);
  const v = state.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={initial?.id ?? ""} />
      {state.message && state.status === "error" && <Alert tone="error" title={state.message} />}
      <Input name="title" label="المسمى الوظيفي" defaultValue={v.title ?? initial?.title ?? ""} maxLength={120} required error={state.fieldErrors?.title} />
      <Input name="organization" label="الجهة" defaultValue={v.organization ?? initial?.organization ?? ""} maxLength={120} required error={state.fieldErrors?.organization} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="startMonth" type="month" label="من" defaultValue={v.startMonth ?? initial?.startMonth ?? ""} required error={state.fieldErrors?.startMonth} />
        <Input name="endMonth" type="month" label="إلى" defaultValue={v.endMonth ?? initial?.endMonth ?? ""} disabled={current} error={state.fieldErrors?.endMonth} />
      </div>
      <Checkbox name="isCurrent" checked={current} onChange={(e) => setCurrent(e.target.checked)}>
        ما زلت أعمل هنا
      </Checkbox>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onDone}>
          إلغاء
        </Button>
        <Button type="submit" loading={pending}>
          {initial ? "احفظ التعديل" : "أضف الخبرة"}
        </Button>
      </div>
    </form>
  );
}

export function ExperienceSection({ userId, items, cv, level }: { userId: string; items: EditorExperience[]; cv: { name: string; size: number } | null; level: VisibilityRow["level"] }) {
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<EditorExperience | "new" | null>(null);
  const [confirm, setConfirm] = useState<EditorExperience | null>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const uploadCv = async (file: File) => {
    if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) {
      toast("error", "ارفع سيرتك الذاتية بصيغة PDF وبحجم لا يتجاوز ١٠ م.ب.");
      return;
    }
    setUploading(true);
    const path = `${userId}/${crypto.randomUUID()}.pdf`;
    const { error } = await createClient().storage.from("trainer-media").upload(path, file, { contentType: "application/pdf" });
    if (error) {
      setUploading(false);
      toast("error", "تعذّر رفع الملف. تحقّق من اتصالك ثم أعد المحاولة.");
      return;
    }
    const res = await setCv(path, file.name, file.size);
    setUploading(false);
    toast(res.ok ? "success" : "error", res.message);
    router.refresh();
  };
  const period = (e: EditorExperience) => `${yearOf(e.startMonth)} – ${e.isCurrent || !e.endMonth ? "الآن" : yearOf(e.endMonth)}`;
  return (
    <EditorSection id="experience" title="الخبرات والأعمال" subtitle="خبرتك العملية وسيرتك الذاتية" icon={Briefcase} level={level}>
      <ul className="flex flex-col gap-[18px]">
        {items.map((e) => (
          <li key={e.id} className="flex items-center gap-3.5 rounded-16 bg-bg-page px-[18px] py-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
              <Glyph icon={Briefcase} size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="type-title text-text-primary">{e.title}</span>
              <span className="type-body text-text-muted">
                {e.organization} · {period(e)}
              </span>
            </span>
            <IconButton icon={Trash2} label={`احذف ${e.title}`} tone="danger" onClick={() => setConfirm(e)} />
            <IconButton icon={Pencil} label={`عدّل ${e.title}`} onClick={() => setEditing(e)} />
          </li>
        ))}
      </ul>
      <div className={`relative flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-16 border-[1.5px] p-6 text-center ${cv ? "border-state-success bg-state-success-bg" : "border-dashed border-border-default bg-bg-page"}`}>
        <Glyph icon={Upload} size={24} className={cv ? "text-state-success" : "text-text-brand"} />
        <p className={`type-subtitle ${cv ? "text-state-success" : "text-text-brand"}`}>{uploading ? "جارٍ رفع السيرة الذاتية…" : cv ? "السيرة الذاتية — مرفوعة" : "ارفع سيرتك الذاتية"}</p>
        <p className="type-caption text-text-muted">{cv ? `${cv.name} · ${formatRating(cv.size / 1_048_576)} م.ب · تظهر للجهات للتنزيل` : "PDF · حتى ١٠ م.ب · تظهر للجهات للتنزيل"}</p>
        <div className="flex gap-3">
          <label className="cursor-pointer rounded-8 type-caption text-text-brand underline-offset-4 hover:underline focus-within:outline-2 focus-within:outline-border-focus">
            {cv ? "استبدل الملف" : "اختر ملفًا"}
            <input type="file" accept="application/pdf" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadCv(e.target.files[0])} />
          </label>
          {cv && (
            <button
              type="button"
              className="cursor-pointer rounded-8 type-caption text-state-error hover:underline focus-ring"
              onClick={() =>
                start(async () => {
                  const res = await removeCv();
                  toast(res.ok ? "success" : "error", res.message);
                  router.refresh();
                })
              }
            >
              احذف
            </button>
          )}
        </div>
      </div>
      <Button variant="outline" size="l" fullWidth onClick={() => setEditing("new")}>
        أضف خبرة
      </Button>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "أضف خبرة" : "عدّل الخبرة"}>
        {editing !== null && (
          <ExperienceForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        destructive
        size="s"
        title="حذف الخبرة؟"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              تراجع
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteTrainerExperience(confirm!.id);
                  toast(res.ok ? "success" : "error", res.message);
                  setConfirm(null);
                  router.refresh();
                })
              }
            >
              احذف
            </Button>
          </>
        }
      >
        ستُحذف «{confirm?.title}» من ملفك المهني وملف المتدرب إن وُجد.
      </Modal>
    </EditorSection>
  );
}

/* ── الدورات الظاهرة في ملفك ───────────────────────────────────────────────────────── */

export function ProgramsVisibility({ programs, level }: { programs: EditorProgram[]; level: VisibilityRow["level"] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <EditorSection id="programs" title="الدورات الظاهرة في ملفك" subtitle="اختر ما تريد عرضه" icon={BookOpen} level={level}>
      {programs.length === 0 ? (
        <p className="rounded-12 bg-bg-page px-4 py-6 text-center type-body text-text-muted">تظهر هنا برامجك بعد إنشائها — وتختار منها ما يُعرض في ملفك.</p>
      ) : (
        <ul className="flex flex-col gap-[18px]">
          {programs.map((p) => (
            <li key={p.id} className={`flex flex-wrap items-center gap-3.5 rounded-16 px-[18px] py-4 sm:flex-nowrap ${p.disabled ? "bg-bg-disabled" : "bg-bg-page"}`}>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
                <Glyph icon={BookOpen} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className={`type-title ${p.disabled ? "text-text-muted" : "text-text-primary"}`}>{p.title}</span>
                <span className="type-body text-text-muted">{p.caption}</span>
              </span>
              <Toggle
                checked={p.visible}
                disabled={p.disabled || pending}
                onChange={(e) =>
                  start(async () => {
                    const res = await setProgramVisible(p.id, e.target.checked);
                    toast(res.ok ? "success" : "error", res.message);
                    router.refresh();
                  })
                }
                className="shrink-0"
              >
                <span className="sr-only">إظهار {p.title} في ملفك</span>
              </Toggle>
            </li>
          ))}
        </ul>
      )}
    </EditorSection>
  );
}

/* ── من يرى ماذا؟ ────────────────────────────────────────────────────────────────── */

export function VisibilityCard({ rows }: { rows: VisibilityRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const locked: { label: string; text: string; tone: "info" | "success" }[] = [
    { label: "التقييمات", text: "عام · ثابت — يراه أي زائر", tone: "info" },
    { label: "أسعارك وإيراداتك", text: "خاص · ثابت — لا يراه أحد", tone: "success" },
    { label: "بريدك وهاتفك", text: "خاص · ثابت — لا يراه أحد", tone: "success" },
  ];
  const editable = (r: VisibilityRow) => {
    const l = LEVEL[r.level];
    return (
      <li key={r.key}>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await cycleVisibility(r.key);
              toast(res.ok ? "success" : "error", res.message);
              router.refresh();
            })
          }
          className="flex w-full cursor-pointer items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5 text-start hover:bg-bg-brand-tint focus-ring disabled:cursor-progress"
          aria-label={`${r.label}: ${l.label} — اضغط لتغيير مستوى الظهور`}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="type-subtitle text-text-primary">{r.label}</span>
            <span className={`flex items-center gap-1.5 type-caption ${l.cls}`}>
              <Glyph icon={l.icon} size={16} />
              {l.label}
            </span>
          </span>
          <Glyph icon={ChevronLeft} size={20} className="text-text-muted" />
        </button>
      </li>
    );
  };
  return (
    <section aria-labelledby="vis-title" className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <h2 id="vis-title" className="type-h2 text-text-primary">
        من يرى ماذا؟
      </h2>
      <p className="type-body text-text-muted">اضغط أي بند لتغيير مستوى ظهوره.</p>
      <ul className="flex flex-col gap-[18px]">
        {rows.slice(0, 3).map(editable)}
        <li className="flex items-center gap-3 rounded-12 bg-state-info-bg px-4 py-3.5">
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="type-subtitle text-text-primary">{locked[0].label}</span>
            <span className="flex items-center gap-1.5 type-caption text-state-info">
              <Glyph icon={Globe} size={16} />
              {locked[0].text}
            </span>
          </span>
          <Glyph icon={Lock} size={20} className="text-state-info" />
        </li>
        {rows.slice(3).map(editable)}
        {locked.slice(1).map((l) => (
          <li key={l.label} className="flex items-center gap-3 rounded-12 bg-state-success-bg px-4 py-3.5">
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="type-subtitle text-text-primary">{l.label}</span>
              <span className="flex items-center gap-1.5 type-caption text-state-success">
                <Glyph icon={Lock} size={16} />
                {l.text}
              </span>
            </span>
            <Glyph icon={Lock} size={20} className="text-state-success" />
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2.5 rounded-12 bg-bg-page px-3.5 py-3 type-caption text-text-secondary">
        <Glyph icon={Info} size={16} className="mt-0.5" />
        <span className="flex-1">البنود المقفلة ثابتة: التقييمات عامة دائمًا حفاظًا على مصداقية المنصة، وبياناتك المالية خاصة دائمًا.</span>
      </p>
    </section>
  );
}
