import { CircleCheckBig, CircleUser } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";

/** TRR-ONB-01 WIZARD BAR (255:707): surface, bottom divider, px 48 / py 24, brand block + step counter + 600px bar. */
export function TrainerWizardBar({ step, total }: { step: number; total: number }) {
  const current = Math.min(step, total);
  const percent = Math.round((current / total) * 100);
  return (
    <header className="flex w-full items-center gap-5 border-b border-border-divider bg-bg-surface px-4 py-6 sm:px-12">
      <div className="flex shrink-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-action-primary text-text-on-brand">
          <Glyph icon={CircleUser} size={20} />
        </span>
        <div className="hidden flex-col sm:flex">
          <p className="type-subtitle text-text-primary">بوابة التدريب</p>
          <p className="type-caption text-text-muted">تجهيز مساحة المدرب</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <div className="flex w-full max-w-[600px] items-center gap-2.5">
          <p className="flex items-center gap-1.5 type-caption text-state-success">
            <Glyph icon={CircleCheckBig} size={16} />
            <span className="hidden sm:inline">تُحفظ إجاباتك تلقائيًا</span>
          </p>
          <p className="min-w-0 flex-1 text-end type-caption text-text-muted sm:text-start">
            الخطوة {toArabicDigits(current)} من {toArabicDigits(total)}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="تقدّم تجهيز مساحة المدرب"
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
