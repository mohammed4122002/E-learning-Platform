"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { saveTrainerOnboardingStep } from "@/app/(trainer-bare)/trainer/onboarding/actions";
import { initialFormState } from "@/lib/validation/auth";
import { pluralAr } from "@/lib/format";

/** `icon` is a rendered element so options can be built in Server Components. */
export type StepOption = { value: string; title: string; hint?: string; icon: ReactNode };

/*
 * Option card (TRR-ONB-01 · 255:739): r16, px 18 / py 22, gap 10, 52px icon tile, 19 Bold title, 14 muted hint.
 * Default = surface + 1.5px border/default + page tile · Selected = brand-tint + 2px action/primary + brand tile + 26px check.
 */
function OptionCard({ option, type, checked, onChange }: { option: StepOption; type: "checkbox" | "radio"; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`relative flex cursor-pointer flex-col items-center gap-2.5 rounded-16 px-[18px] py-[22px] text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-border-focus ${
        checked
          ? "border-2 border-action-primary bg-bg-brand-tint drop-shadow-button"
          : "border-[1.5px] border-border-default bg-bg-surface drop-shadow-milestone hover:border-action-primary/50"
      }`}
    >
      <input type={type} name="choice" value={option.value} checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span className={`flex size-[52px] items-center justify-center rounded-12 ${checked ? "bg-action-primary text-text-on-brand" : "bg-bg-page text-text-brand"}`}>
        {option.icon}
      </span>
      <span className={`type-title ${checked ? "text-text-brand" : "text-text-primary"}`}>{option.title}</span>
      {option.hint && <span className="type-caption text-text-muted">{option.hint}</span>}
      {checked && (
        <span aria-hidden className="absolute end-2.5 top-2.5 flex size-[26px] items-center justify-center rounded-full bg-action-primary text-text-on-brand">
          <Glyph icon={Check} size={16} />
        </span>
      )}
    </label>
  );
}

type Props = {
  step: number;
  total: number;
  multiple?: boolean;
  columns: 3 | 4;
  options: StepOption[];
  initial: string[];
  countNoun?: [string, string, string, string];
  finalLabel?: string;
  notice?: ReactNode;
};

/** One TRR-ONB-01 step: option grid, optional notice, footer (primary at the inline start, «السابق» after it). */
export function TrainerStepForm({ step, total, multiple = false, columns, options, initial, countNoun, finalLabel = "أنهِ التجهيز", notice }: Props) {
  const [state, action, pending] = useActionState(saveTrainerOnboardingStep, initialFormState);
  const [selected, setSelected] = useState<string[]>(initial);
  const last = step === total;
  const nextLabel = last ? finalLabel : multiple && countNoun && selected.length > 0 ? `التالي · اخترت ${pluralAr(selected.length, countNoun)}` : "التالي";
  return (
    <form action={action} className="flex w-full flex-col items-center gap-8">
      <input type="hidden" name="step" value={step} />
      {state.message && (
        <div className="w-full max-w-[1030px]">
          <Alert tone="error" title={state.message} />
        </div>
      )}
      <fieldset className={`grid w-full max-w-[1030px] grid-cols-1 gap-[18px] min-[420px]:grid-cols-2 ${columns === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        <legend className="sr-only">{multiple ? "اختر خيارًا أو أكثر" : "اختر خيارًا واحدًا"}</legend>
        {options.map((o) => (
          <OptionCard
            key={o.value}
            option={o}
            type={multiple ? "checkbox" : "radio"}
            checked={selected.includes(o.value)}
            onChange={(on) => setSelected((cur) => (multiple ? (on ? [...cur, o.value] : cur.filter((v) => v !== o.value)) : on ? [o.value] : cur))}
          />
        ))}
      </fieldset>
      {notice}
      <div className="flex w-full flex-col items-center justify-center gap-3.5 pt-2 sm:flex-row">
        <Button type="submit" size="l" loading={pending} disabled={selected.length === 0} className="w-full sm:w-[300px]">
          {nextLabel}
        </Button>
        {step > 1 ? (
          <ButtonLink href={`/trainer/onboarding/${step - 1}`} variant="outline" size="l" className="w-full sm:w-[180px]">
            السابق
          </ButtonLink>
        ) : (
          <Button variant="outline" size="l" disabled className="w-full sm:w-[180px]">
            السابق
          </Button>
        )}
      </div>
    </form>
  );
}
