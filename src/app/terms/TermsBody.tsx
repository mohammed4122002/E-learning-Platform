"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, LoaderCircle, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/Choice";
import { Glyph } from "@/components/ui/Icon";
import { acceptTerms, declineTerms } from "./actions";
import { TERMS_SECTIONS } from "./content";

function AcceptButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      aria-busy={pending || undefined}
      className="inline-flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-12 bg-action-primary px-8 type-body-lg text-text-on-brand shadow-hero hover:bg-action-primary-hover focus-ring disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled disabled:shadow-none"
    >
      {pending && <LoaderCircle aria-hidden className="size-5 animate-[tg-spin_0.9s_linear_infinite]" />}
      أوافق ومتابعة
    </button>
  );
}

/** GEN-TRM-01 body: scrollable clauses + consent. Accept stays disabled until the box is ticked (BR-U2). */
export function TermsBody({ next }: { next: string }) {
  const [agree, setAgree] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  return (
    <>
      <div
        tabIndex={0}
        role="region"
        aria-label="بنود الشروط والأحكام"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setAtEnd(true);
        }}
        className="max-h-[min(640px,60vh)] overflow-y-auto px-5 focus-ring sm:px-8"
      >
        {TERMS_SECTIONS.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className={`flex scroll-mt-6 flex-col gap-2 py-6 ${i > 0 ? "border-t border-border-divider" : ""}`}>
            <h2 id={`${s.id}-title`} className="type-title text-text-primary">
              {s.n} {s.title}
            </h2>
            <p className="type-body text-text-secondary">{s.body}</p>
          </section>
        ))}
      </div>
      <div className={`flex items-center justify-center gap-2 bg-bg-page py-3 type-caption text-text-muted ${atEnd ? "invisible" : ""}`} aria-hidden>
        مرّر لقراءة بقية البنود
        <Glyph icon={ChevronDown} size={16} />
      </div>
      <form action={acceptTerms} className="flex flex-col gap-5 px-5 pt-5 pb-6 sm:px-8">
        <input type="hidden" name="next" value={next} />
        <Checkbox name="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)}>
          قرأت الشروط والأحكام وسياسة الخصوصية وأوافق عليها
        </Checkbox>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="submit"
            formAction={declineTerms}
            formNoValidate
            className="inline-flex h-14 flex-1 cursor-pointer items-center justify-center rounded-12 px-8 type-body-lg text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-brand-tint focus-ring"
          >
            رفض والخروج
          </button>
          <AcceptButton enabled={agree} />
        </div>
        <p className="flex items-center justify-between gap-3 type-caption text-text-muted">
          تُسجَّل موافقتك مع رقم النسخة والختم الزمني وهوية المُقِرّ.
          <Glyph icon={ShieldCheck} size={16} />
        </p>
      </form>
    </>
  );
}
