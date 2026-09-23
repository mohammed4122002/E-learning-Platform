import { CircleCheck, GraduationCap } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";

/** TRN-ONB-01 WIZARD BAR: 93px, surface, bottom divider, step counter + 600px progress, brand block. */
export function WizardBar({ step, total }: { step: number; total: number }) {
  const percent = Math.round((Math.min(step, total) / total) * 100);
  return (
    <header className="flex w-full items-center gap-5 border-b border-border-divider bg-bg-surface px-4 py-6 sm:px-12">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-action-primary text-text-on-brand">
          <Glyph icon={GraduationCap} size={20} />
        </span>
        <div className="flex flex-col">
          <p className="type-subtitle text-text-primary">بوابة التدريب</p>
          <p className="type-caption text-text-muted">تخصيص تجربتك</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center gap-2">
        <div className="flex w-full max-w-[600px] items-center gap-2.5">
          <p className="flex-1 type-caption text-text-muted">
            الخطوة {toArabicDigits(Math.min(step, total))} من {toArabicDigits(total)}
          </p>
          <p className="hidden items-center gap-1.5 type-caption text-state-success sm:flex">
            <Glyph icon={CircleCheck} size={16} />
            تُحفظ إجاباتك تلقائيًا
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="تقدّم التخصيص"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full max-w-[600px] overflow-hidden rounded-full bg-border-default"
        >
          <div className="h-full rounded-full bg-action-primary" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </header>
  );
}
