"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { BookOpen, CircleAlert, CircleCheck, CircleX, Lightbulb, Menu, Plus, SquarePen, Trash2, X } from "lucide-react";
import { autosaveProgram, saveGoals } from "@/app/(trainer)/trainer/programs/actions";
import { announceSaved, announceSaving } from "@/components/trainer-programs/SavedIndicator";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";
import { initialFormState } from "@/lib/validation/auth";

export type GoalsUnit = { id: string; title: string; meta: string };
export type Criterion = { title: string; description: string; tone: "success" | "error" | "neutral" };

const SUGGESTED_AUDIENCE = ["مبتدئون", "موظفون جدد", "قادة فرق", "مديرو إدارات", "رواد أعمال", "طلاب جامعيون"];

function Card({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  return (
    <section
      className={`flex w-full flex-col gap-4 rounded-16 p-5 sm:p-6 ${tone === "error" ? "border-2 border-state-error bg-state-error-bg pb-[26px]" : "border border-border-default bg-bg-card shadow-card"}`}
    >
      {children}
    </section>
  );
}

/** TRR-PRG-02 · ٢ الأهداف والمحتوى (360:13893). */
export function GoalsForm({
  programId,
  initial,
  units,
  unitsBadge,
  criteria,
  flagged,
  needsChanges,
  canResubmit,
}: {
  programId: string;
  initial: { objectives: string[]; audience: string[]; prerequisites: string };
  units: GoalsUnit[];
  unitsBadge: string;
  criteria: Criterion[];
  /** Reviewer findings: field → note (from the latest «يحتاج تعديل» decision). */
  flagged: Record<string, string>;
  needsChanges: boolean;
  canResubmit: boolean;
}) {
  const [state, action, pending] = useActionState(saveGoals, initialFormState);
  const fe = state.fieldErrors ?? {};
  const [objectives, setObjectives] = useState<string[]>(initial.objectives);
  const [draft, setDraft] = useState<string | null>(null);
  const [audience, setAudience] = useState<string[]>(initial.audience);
  const [audienceDraft, setAudienceDraft] = useState<string | null>(null);
  const [, startAutosave] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  function scheduleAutosave() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!formRef.current) return;
      const fd = new FormData(formRef.current);
      fd.set("step", "goals");
      announceSaving();
      startAutosave(async () => {
        const res = await autosaveProgram(fd);
        if (res.ok && res.savedAt) announceSaved(res.savedAt);
        else window.dispatchEvent(new CustomEvent("program-saved", { detail: null }));
      });
    }, 1200);
  }
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scheduleAutosave();
  }, [objectives, audience]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const objectivesFlag = flagged.objectives;
  const isBad = (o: string) => !!objectivesFlag && objectivesFlag.includes(o);
  const chips = Array.from(new Set([...audience, ...SUGGESTED_AUDIENCE]));

  function addObjective() {
    const t = (draft ?? "").trim();
    if (t && !objectives.includes(t) && objectives.length < 12) setObjectives([...objectives, t.slice(0, 240)]);
    setDraft(null);
  }
  function addAudience() {
    const t = (audienceDraft ?? "").trim();
    if (t && !audience.includes(t) && audience.length < 12) setAudience([...audience, t.slice(0, 60)]);
    setAudienceDraft(null);
  }

  return (
    <form ref={formRef} action={action} onChange={scheduleAutosave} noValidate className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <input type="hidden" name="id" value={programId} />
      <input type="hidden" name="objectives" value={JSON.stringify(objectives)} />
      <input type="hidden" name="audience" value={JSON.stringify(audience)} />

      {/* MAIN */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Card tone={objectivesFlag ? "error" : undefined}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="objectives" className="min-w-0 flex-1 type-h3 text-text-primary">
              الأهداف التعليمية
            </h2>
            {objectivesFlag && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-error">
                <Glyph icon={CircleAlert} size={16} />
                يحتاج تعديلك
              </span>
            )}
          </div>
          <p className="type-body text-text-secondary">ما الذي سيقدر المتدرب على فعله بعد البرنامج؟ اكتب أهدافًا قابلة للقياس تبدأ بفعل واضح.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2.5 rounded-12 bg-state-success-bg px-4 pt-4 pb-[18px]">
              <p className="flex items-center gap-2 text-[16px] leading-[1.5] text-state-success">
                <Glyph icon={CircleCheck} size={20} />
                صياغة معتمدة
              </p>
              <div className="type-body text-text-secondary">
                <p>«بناء مصفوفة مخاطر لمشروع حقيقي خلال ٤٥ دقيقة»</p>
                <p>«حساب القيمة النقدية المتوقعة لثلاثة سيناريوهات»</p>
              </div>
            </div>
            <div className={`flex flex-col gap-2.5 rounded-12 px-4 pt-4 pb-[18px] ${objectivesFlag ? "bg-bg-surface/0" : "bg-state-error-bg"}`}>
              <p className="flex items-center gap-2 text-[16px] leading-[1.5] text-state-error">
                <Glyph icon={CircleX} size={20} />
                صياغة مرفوضة
              </p>
              <div className="type-body text-text-secondary">
                <p>«فهم مبادئ إدارة المخاطر»</p>
                <p>«الإلمام بأدوات التحليل»</p>
              </div>
            </div>
          </div>
          {objectives.length === 0 && draft === null && (
            <p className="rounded-12 border-[1.5px] border-dashed border-border-default bg-bg-surface px-4 py-5 text-center type-small text-text-muted">لم تُضف أهدافًا بعد — الأهداف إلزامية قبل الإرسال.</p>
          )}
          <ol className="flex flex-col gap-4">
            {objectives.map((o, i) => {
              const bad = isBad(o);
              return (
                <li key={o} className={`flex items-center gap-3 rounded-12 bg-bg-surface px-3.5 py-[13px] ${bad ? "border-[1.5px] border-state-error" : ""}`}>
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full type-caption ${bad ? "bg-state-error-bg text-state-error" : "bg-state-success-bg text-state-success"}`}>{toArabicDigits(i + 1)}</span>
                  <span className={`flex min-w-0 flex-1 flex-col gap-[3px] ${bad ? "text-state-error" : "text-text-primary"}`}>
                    <span className="type-body">{o}</span>
                    {bad && <span className="type-caption">غير قابل للقياس — استبدله بفعل ونتيجة ومدة.</span>}
                  </span>
                  <button type="button" onClick={() => setObjectives(objectives.filter((x) => x !== o))} aria-label={`احذف الهدف ${toArabicDigits(i + 1)}`} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-page text-state-error focus-ring">
                    <Glyph icon={Trash2} size={16} />
                  </button>
                </li>
              );
            })}
            {draft !== null && (
              <li className="flex items-center gap-3 rounded-12 border-[1.5px] border-action-primary bg-bg-surface px-3.5 py-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-brand-tint type-caption text-text-brand">{toArabicDigits(objectives.length + 1)}</span>
                <label htmlFor="objective-draft" className="sr-only">
                  هدف جديد
                </label>
                <input
                  id="objective-draft"
                  autoFocus
                  value={draft}
                  maxLength={240}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addObjective();
                    }
                    if (e.key === "Escape") setDraft(null);
                  }}
                  placeholder="فعل + نتيجة + مدة — مثال: بناء خطة مشروع كاملة خلال ساعتين"
                  className="h-10 min-w-0 flex-1 bg-transparent type-body text-text-primary outline-none placeholder:text-text-muted"
                />
                <Button size="s" onClick={addObjective}>
                  أضف
                </Button>
              </li>
            )}
          </ol>
          {fe.objectives && <p className="type-caption text-state-error">{fe.objectives}</p>}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setDraft("")} disabled={draft !== null || objectives.length >= 12} icon={<Glyph icon={Plus} size={16} />}>
              أضف هدفًا
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="type-h3 text-text-primary">الجمهور المستهدف</h2>
          <ul className="flex flex-wrap gap-2.5">
            {chips.map((a) => {
              const on = audience.includes(a);
              return (
                <li key={a}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAudience(on ? audience.filter((x) => x !== a) : [...audience, a])}
                    className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 type-small focus-ring ${on ? "border-[1.5px] border-action-primary bg-bg-brand-tint ps-3.5 pe-2 text-text-brand" : "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-brand-tint"}`}
                  >
                    {a}
                    {on && <Glyph icon={X} size={20} />}
                  </button>
                </li>
              );
            })}
            <li>
              {audienceDraft === null ? (
                <button type="button" onClick={() => setAudienceDraft("")} className="inline-flex h-9 cursor-pointer items-center rounded-full border border-border-default bg-bg-surface px-3.5 type-small text-text-primary hover:bg-bg-brand-tint focus-ring">
                  + أضف فئة
                </button>
              ) : (
                <span className="inline-flex h-9 items-center gap-1 rounded-full border-[1.5px] border-action-primary bg-bg-surface ps-3.5 pe-1.5">
                  <label htmlFor="audience-draft" className="sr-only">
                    فئة جديدة
                  </label>
                  <input
                    id="audience-draft"
                    autoFocus
                    value={audienceDraft}
                    maxLength={60}
                    onChange={(e) => setAudienceDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAudience();
                      }
                      if (e.key === "Escape") setAudienceDraft(null);
                    }}
                    onBlur={addAudience}
                    placeholder="اكتب الفئة ثم Enter"
                    className="w-36 bg-transparent type-small text-text-primary outline-none"
                  />
                  <Glyph icon={Plus} size={16} className="text-text-brand" />
                </span>
              )}
            </li>
          </ul>
          {fe.audience && <p className="type-caption text-state-error">{fe.audience}</p>}
          <Textarea name="prerequisites" label="المتطلبات المسبقة" rows={3} defaultValue={state.values?.prerequisites ?? initial.prerequisites} error={fe.prerequisites} maxLength={1500} placeholder="مثال: خبرة سنة على الأقل في بيئة مشاريع." />
        </Card>

        <Card tone={flagged.units ? "error" : undefined}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="min-w-0 flex-1 type-h3 text-text-primary">محتوى البرنامج</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-brand-tint px-2.5 py-[5px] type-caption text-text-brand">
              <Glyph icon={BookOpen} size={16} />
              {unitsBadge}
            </span>
          </div>
          {flagged.units && <Alert tone="error" title={flagged.units} />}
          <p className="flex items-start gap-2.5 rounded-8 bg-state-info-bg px-3 py-2.5 type-caption text-state-info">
            <Glyph icon={Lightbulb} size={16} className="mt-0.5" />
            هذا هيكل المحتوى فقط. رفع الملفات والفيديوهات في الخطوة التالية «المواد» — والإنتاج يتم خارج المنصة.
          </p>
          {units.length === 0 && <p className="rounded-12 border-[1.5px] border-dashed border-border-default px-4 py-5 text-center type-small text-text-muted">لا فصول بعد — أضف أول فصل وقسّم المحتوى إلى مراحل.</p>}
          <ol className="flex flex-col gap-3">
            {units.map((u, i) => (
              <li key={u.id} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint type-subtitle !font-normal text-text-brand">{toArabicDigits(i + 1)}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[16px] leading-[1.5] text-text-primary">{u.title}</span>
                  <span className="type-caption text-text-muted">{u.meta}</span>
                </span>
                <Link href={`/trainer/programs/${programId}/curriculum?edit=${u.id}`} aria-label={`عدّل ${u.title}`} className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-primary focus-ring">
                  <Glyph icon={SquarePen} size={16} />
                </Link>
                <Link href={`/trainer/programs/${programId}/curriculum`} aria-label={`رتّب ${u.title}`} className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-primary focus-ring">
                  <Glyph icon={Menu} size={16} />
                </Link>
              </li>
            ))}
          </ol>
          <ButtonLink href={`/trainer/programs/${programId}/curriculum?add=chapter`} variant="outline" fullWidth>
            أضف فصلًا
          </ButtonLink>
        </Card>
      </div>

      {/* ASIDE */}
      <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
        <section className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
          <h2 className="type-h3 text-text-primary">ما الذي يراجعه فريق المنصة؟</h2>
          <ul className="flex flex-col gap-4">
            {criteria.map((c) => (
              <li key={c.title} className={`flex items-start gap-2.5 rounded-12 px-3 py-2.5 ${c.tone === "success" ? "bg-state-success-bg" : c.tone === "error" ? "bg-state-error-bg" : "bg-bg-page"}`}>
                <Glyph icon={c.tone === "error" ? CircleAlert : CircleCheck} size={16} className={`mt-1 ${c.tone === "success" ? "text-state-success" : c.tone === "error" ? "text-state-error" : "text-text-muted"}`} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={`type-small ${c.tone === "success" ? "text-state-success" : c.tone === "error" ? "text-state-error" : "text-text-primary"}`}>{c.title}</span>
                  <span className="type-caption text-text-muted">{c.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
          <h2 className="type-h3 text-text-primary">حفظ ومتابعة</h2>
          {needsChanges && !canResubmit && <p className="type-caption text-state-error">لا يمكن إعادة الإرسال قبل تصحيح الحقل المطلوب.</p>}
          {state.status === "error" && <Alert tone="error" title={state.message ?? "تحقّق من الحقول المظلّلة."} />}
          <Button type="submit" name="intent" value="next" size="l" fullWidth loading={pending}>
            التالي · المواد
          </Button>
          <Button type="submit" name="intent" value="later" variant="outline" size="l" fullWidth disabled={pending}>
            احفظ وأكمل لاحقًا
          </Button>
          {needsChanges && (
            <ButtonLink href={`/trainer/programs/${programId}/preview`} size="l" fullWidth disabled={!canResubmit}>
              أعد الإرسال للمراجعة
            </ButtonLink>
          )}
        </section>
      </aside>
    </form>
  );
}
