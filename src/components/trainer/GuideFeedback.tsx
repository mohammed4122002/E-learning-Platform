"use client";

import { useState, useTransition } from "react";
import { CircleCheckBig } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { rateTrainerGuide } from "@/app/(trainer)/trainer/help/actions";

/** «هل أفادك هذا الدليل؟» (TRR-HLP-02): نعم / لا, saved per user; the answer can be changed. */
export function GuideFeedback({ articleId, initial }: { articleId: string; initial: boolean | null }) {
  const [value, setValue] = useState<boolean | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const answer = (helpful: boolean) =>
    start(async () => {
      setError(null);
      const prev = value;
      setValue(helpful);
      const r = await rateTrainerGuide(articleId, helpful);
      if (!r.ok) {
        setValue(prev);
        setError(r.message ?? null);
      }
    });

  return (
    <section aria-labelledby="guide-feedback" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-6 shadow-card">
      <h2 id="guide-feedback" className="type-h3 text-text-primary">
        هل أفادك هذا الدليل؟
      </h2>
      <div className="flex gap-3" role="group" aria-label="تقييم الدليل">
        <Button variant={value === true ? "secondary" : "outline"} aria-pressed={value === true} disabled={pending} onClick={() => answer(true)} className="flex-1">
          نعم
        </Button>
        <Button variant={value === false ? "secondary" : "ghost"} aria-pressed={value === false} disabled={pending} onClick={() => answer(false)} className="flex-1">
          لا
        </Button>
      </div>
      {value !== null && !error && (
        <p role="status" className="flex items-center gap-2 type-small text-state-success">
          <Glyph icon={CircleCheckBig} size={16} />
          {value ? "شكرًا — يسعدنا أن الدليل أفادك." : "شكرًا — سنحسّن هذا الدليل. يمكنك سؤال الدعم مباشرة."}
        </p>
      )}
      {error && (
        <p role="alert" className="type-small text-state-error">
          {error}
        </p>
      )}
    </section>
  );
}
