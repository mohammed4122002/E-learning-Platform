"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Input, Select } from "@/components/ui/Field";
import { saveOnboardingStep } from "@/app/onboarding/actions";
import { initialFormState } from "@/lib/validation/auth";
import { pluralAr } from "@/lib/format";

/** `icon` is a rendered element (e.g. `<Glyph icon={…} size={20} />`) so options can come from Server Components. */
export type CardOption = { value: string; title: string; hint?: string; icon: ReactNode };

/*
 * Option card (TRN-ONB-01): 16px radius, p 22/18, gap 10. Default = surface + 1.5px border/default + page tile.
 * Selected = brand-tint + 2px action/primary + brand tile + 26px check badge.
 */
function OptionCard({ option, name, type, checked, onChange }: { option: CardOption; name: string; type: "checkbox" | "radio"; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`relative flex min-h-[133px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-16 px-[18px] py-[22px] text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-border-focus ${
        checked ? "border-2 border-action-primary bg-bg-brand-tint" : "border-[1.5px] border-border-default bg-bg-surface hover:border-action-primary/50"
      }`}
    >
      <input type={type} name={name} value={option.value} checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span className={`flex size-[52px] items-center justify-center rounded-12 ${checked ? "bg-action-primary text-text-on-brand" : "bg-bg-page text-text-secondary"}`}>
        {option.icon}
      </span>
      <span className={`type-title ${checked ? "text-text-brand" : "text-text-primary"}`}>{option.title}</span>
      {option.hint && <span className="type-caption text-text-muted">{option.hint}</span>}
      {checked && (
        <span aria-hidden className="flex size-[26px] items-center justify-center rounded-full bg-action-primary text-text-on-brand">
          <Glyph icon={Check} size={16} />
        </span>
      )}
    </label>
  );
}

function Footer({ step, pending, nextLabel, disabled }: { step: number; pending: boolean; nextLabel: string; disabled?: boolean }) {
  return (
    <div className="flex w-full flex-col-reverse items-center justify-center gap-3.5 pt-2.5 sm:flex-row">
      {step > 1 ? (
        <ButtonLink href={`/onboarding/${step - 1}`} variant="outline" size="l" className="w-full sm:w-[180px]">
          السابق
        </ButtonLink>
      ) : (
        <Button variant="outline" size="l" disabled className="w-full sm:w-[180px]">
          السابق
        </Button>
      )}
      <Button type="submit" size="l" loading={pending} disabled={disabled} className="w-full sm:w-[280px]">
        {nextLabel}
      </Button>
    </div>
  );
}

type ChoiceStepProps = {
  step: number;
  name: string;
  multiple?: boolean;
  options: CardOption[];
  initial: string[];
  columns: 3 | 4;
  countNoun?: [string, string, string, string];
};

/** Steps 1–5: a grid of option cards (multi-select for fields, single-select otherwise). */
export function ChoiceStep({ step, name, multiple = false, options, initial, columns, countNoun }: ChoiceStepProps) {
  const [state, action, pending] = useActionState(saveOnboardingStep, initialFormState);
  const [selected, setSelected] = useState<string[]>(initial);
  const nextLabel = multiple && countNoun && selected.length > 0 ? `التالي · اخترت ${pluralAr(selected.length, countNoun)}` : "التالي";
  return (
    <form action={action} className="flex w-full flex-col items-center gap-[34px]">
      <input type="hidden" name="step" value={step} />
      {state.message && (
        <div className="w-full max-w-[1030px]">
          <Alert tone="error" title={state.message} />
        </div>
      )}
      <fieldset className={`grid w-full max-w-[1030px] grid-cols-2 gap-[18px] ${columns === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        <legend className="sr-only">اختر</legend>
        {options.map((o) => (
          <OptionCard
            key={o.value}
            option={o}
            name={name}
            type={multiple ? "checkbox" : "radio"}
            checked={selected.includes(o.value)}
            onChange={(on) =>
              setSelected((cur) => (multiple ? (on ? [...cur, o.value] : cur.filter((v) => v !== o.value)) : on ? [o.value] : cur))
            }
          />
        ))}
      </fieldset>
      <Footer step={step} pending={pending} nextLabel={nextLabel} disabled={selected.length === 0} />
    </form>
  );
}

/** Step 6: optional professional data (job title, years of experience, skills chips). */
export function ProfessionalStep({
  initial,
  years,
  suggested,
  notice,
}: {
  initial: { jobTitle: string; experienceYears: string; skills: string[] };
  years: { value: string; label: string }[];
  suggested: string[];
  notice: ReactNode;
}) {
  const [state, action, pending] = useActionState(saveOnboardingStep, initialFormState);
  const [skills, setSkills] = useState<string[]>(initial.skills);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const pool = [...new Set([...suggested, ...skills])];
  const toggle = (s: string) => setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const add = () => {
    const v = draft.trim();
    if (v.length >= 2 && v.length <= 40 && !skills.includes(v) && skills.length < 20) setSkills((cur) => [...cur, v]);
    setDraft("");
    setAdding(false);
  };
  return (
    <form action={action} className="flex w-full flex-col items-center gap-[34px]">
      <input type="hidden" name="step" value={6} />
      {skills.map((s) => (
        <input key={s} type="hidden" name="skills" value={s} />
      ))}
      <div className="flex w-full max-w-[720px] flex-col gap-[18px] rounded-22 border border-border-default bg-bg-surface px-5 pt-[30px] pb-8 sm:px-8">
        {state.message && <Alert tone="error" title={state.message} />}
        <Input name="jobTitle" label="وظيفتك الحالية" placeholder="مثال: منسّق مشاريع" defaultValue={initial.jobTitle} maxLength={120} />
        <Select name="experienceYears" label="سنوات الخبرة" placeholder="اختر المدة" defaultValue={initial.experienceYears} options={years} />
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 type-subtitle text-text-primary">مهاراتك الحالية</legend>
          <div className="flex flex-wrap gap-2.5">
            {pool.map((s) => {
              const on = skills.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(s)}
                  className={`flex h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 type-small focus-ring ${
                    on ? "border-[1.5px] border-action-primary bg-bg-brand-tint text-text-brand" : "border border-border-default bg-bg-surface text-text-primary"
                  }`}
                >
                  {s}
                  {on && <Glyph icon={X} size={16} />}
                </button>
              );
            })}
            {adding ? (
              <span className="flex h-9 items-center gap-1 rounded-full border border-action-primary bg-bg-surface ps-3.5 pe-1">
                <input
                  autoFocus
                  aria-label="مهارة جديدة"
                  value={draft}
                  maxLength={40}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add();
                    }
                    if (e.key === "Escape") setAdding(false);
                  }}
                  className="w-32 bg-transparent type-small outline-none"
                />
                <button type="button" onClick={add} className="cursor-pointer rounded-full px-2 type-caption text-text-brand focus-ring">
                  إضافة
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setAdding(true)} className="flex h-9 cursor-pointer items-center gap-1 rounded-full border border-border-default bg-bg-surface px-3.5 type-small text-text-primary focus-ring">
                <Glyph icon={Plus} size={16} />
                أضف مهارة
              </button>
            )}
          </div>
        </fieldset>
        {notice}
      </div>
      <Footer step={6} pending={pending} nextLabel="أنهِ التخصيص" />
    </form>
  );
}
