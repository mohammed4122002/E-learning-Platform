"use client";

import Link from "next/link";
import { Fragment, useActionState, useState, type ReactNode } from "react";
import { Check, CircleCheck, ShieldCheck } from "lucide-react";
import { submitForReview } from "@/app/(trainer)/trainer/programs/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";
import { initialFormState } from "@/lib/validation/auth";

const CLAUSES = [
  { key: "content_ownership", title: "ملكية المحتوى", body: "المواد التي رفعتها من إنتاجك أو تملك حق استخدامها وتوزيعها. أي مطالبة بحقوق ملكية تقع عليك." },
  { key: "accuracy", title: "صحة الوصف والأهداف", body: "ما وصفته يطابق ما سيحصل عليه المتدرب فعلًا. الفجوة بين الوصف والواقع أشيع أسباب البلاغات." },
  { key: "credentials", title: "صحة ادعاءاتك المهنية", body: "المؤهلات والاعتمادات المعروضة في ملفك صحيحة وقابلة للإثبات عند الطلب." },
  { key: "delivery", title: "الالتزام بالتنفيذ", body: "تنفيذ الدورات المجدولة من هذا البرنامج في مواعيدها. الإلغاء المتكرر يؤثر على تقييمك واعتمادك." },
] as const;

/**
 * TRR-DEC-01 (268:3104): the two-column body. The four responsibility clauses (main column) belong to the
 * confirmation form in the side column through the `form` attribute. Server-rendered blocks come in as slots.
 */
export function DeclarationForm({
  programId,
  missing,
  editorHref,
  record,
  history,
  summary,
  after,
}: {
  programId: string;
  missing: string[];
  editorHref: string;
  record: ReactNode;
  history: ReactNode;
  summary: ReactNode;
  after: ReactNode;
}) {
  const [state, action, pending] = useActionState(submitForReview, initialFormState);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [final, setFinal] = useState(false);
  const all = CLAUSES.every((c) => checked[c.key]);
  const ready = all && final && missing.length === 0;

  const responsibilities = (
    <section className="flex w-full flex-col gap-4 rounded-16 border-2 border-state-warning bg-state-warning-bg px-5 pt-6 pb-[26px] sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 flex-1 type-h3 text-state-warning">ما تتحمّل مسؤوليته</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-warning">
          <Glyph icon={ShieldCheck} size={16} />
          {toArabicDigits(CLAUSES.length)} بنود
        </span>
      </div>
      <p className="type-body text-text-secondary">راجع كل بند قبل التأشير. إقرارك يعني قبولك الكامل بهذه المسؤوليات.</p>
      <ol className="flex flex-col gap-3">
        {CLAUSES.map((c, i) => (
          <li key={c.key} className="flex items-start gap-3.5 rounded-12 bg-bg-surface px-4 py-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-state-warning-bg type-caption text-state-warning">{toArabicDigits(i + 1)}</span>
            <label htmlFor={`clause-${c.key}`} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1">
              <span className="text-[16px] leading-[1.5] text-text-primary">{c.title}</span>
              <span className="type-body text-text-secondary">{c.body}</span>
            </label>
            <span className="relative mt-3 flex size-[22px] shrink-0 items-center justify-center">
              <input
                id={`clause-${c.key}`}
                form="declaration-form"
                type="checkbox"
                name={c.key}
                checked={!!checked[c.key]}
                onChange={(e) => setChecked({ ...checked, [c.key]: e.target.checked })}
                className="peer absolute inset-0 cursor-pointer appearance-none rounded-8 border-[1.5px] border-border-default bg-bg-surface checked:border-0 checked:bg-action-primary focus-ring"
              />
              <Check aria-hidden size={16} strokeWidth={1.75} absoluteStrokeWidth className="pointer-events-none relative text-text-on-brand opacity-0 peer-checked:opacity-100" />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );

  const confirm = (
    <form id="declaration-form" action={action} className="flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
      <input type="hidden" name="id" value={programId} />
      <h2 className="type-h3 text-text-primary">التأكيد النهائي</h2>
      {missing.length > 0 && (
        <Alert tone="error" title="البرنامج ناقص — لا يمكن إرساله بعد">
          أكمل: {missing.join("، ")}.{" "}
          <Link href={editorHref} className="text-text-brand underline">
            افتح المحرّر
          </Link>
        </Alert>
      )}
      <Checkbox name="final" checked={final} onChange={(e) => setFinal(e.target.checked)}>
        أقرّ بصحة كل ما ورد أعلاه وأتحمّل مسؤوليته
      </Checkbox>
      {!all && final && <p className="type-caption text-state-warning">أشّر على البنود الأربعة في «ما تتحمّل مسؤوليته» أولًا.</p>}
      {state.status === "error" && <Alert tone="error" title={state.message ?? state.fieldErrors?.final ?? state.fieldErrors?.clauses ?? "تعذّر الإرسال."} />}
      <Button type="submit" size="l" fullWidth disabled={!ready} loading={pending}>
        أقرّ وأرسل للمراجعة
      </Button>
      <ButtonLink href={editorHref} variant="outline" size="l" fullWidth>
        ارجع للمحرّر وعدّل
      </ButtonLink>
      <ButtonLink href="/trainer/programs" variant="text" size="l" fullWidth>
        احفظ كمسودة وأرسل لاحقًا
      </ButtonLink>
      <p className="flex items-start gap-2.5 rounded-8 bg-state-success-bg px-3 py-[11px] type-caption text-state-success">
        <Glyph icon={CircleCheck} size={16} className="mt-0.5" />
        لا شيء يُرسل حتى تضغط «أقرّ وأرسل». الرجوع للمحرّر لا يفقدك أي تعديل.
      </p>
    </form>
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Fragment key="summary">{summary}</Fragment>
        <Fragment key="responsibilities">{responsibilities}</Fragment>
        <Fragment key="after">{after}</Fragment>
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
        <Fragment key="record">{record}</Fragment>
        <Fragment key="confirm">{confirm}</Fragment>
        <Fragment key="history">{history}</Fragment>
      </aside>
    </div>
  );
}
