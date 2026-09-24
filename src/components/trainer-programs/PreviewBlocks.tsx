import type { ReactNode } from "react";
import { AlignRight, ChevronDown, CircleCheck, CircleHelp, ClipboardCheck, Clock, FileText, TrendingUp, Video } from "lucide-react";
import { ProgramModePill } from "@/components/trainer-programs/bits";
import { Glyph } from "@/components/ui/Icon";
import type { ProgramDetail } from "@/lib/data/trainer-programs";
import { formatPrice, pluralAr, toArabicDigits } from "@/lib/format";
import { LEVEL_LABELS } from "@/lib/labels";
import { hoursWord, lessonsWord } from "@/lib/trainer-programs";

/* Content blocks of «معاينة البرنامج» (TRR-PRG-03 · 298:8553): what the trainee will see. */

export function PreviewCard({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px] ${className ?? ""}`}>
      {title && <h2 className="type-h2 text-text-primary">{title}</h2>}
      {children}
    </section>
  );
}

const ITEM_ICON = { video: Video, file: FileText, text: AlignRight, quiz: CircleHelp, assignment: ClipboardCheck } as const;

export function ProgramHero({ p, cta }: { p: ProgramDetail; cta: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card px-5 pt-[30px] pb-8 shadow-card sm:px-[30px]">
      <div className="flex flex-wrap items-center gap-2">
        {p.courses.mode && <ProgramModePill mode={p.courses.mode} />}
        <span className="inline-flex items-center gap-[7px] rounded-full bg-state-warning-bg px-3.5 py-[9px] text-[16px] leading-[1.5] text-state-warning">
          <Glyph icon={TrendingUp} size={20} />
          مستوى {LEVEL_LABELS[p.level]}
        </span>
        <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-brand-tint px-3.5 py-[9px] text-[16px] leading-[1.5] text-text-brand">
          <Glyph icon={Clock} size={20} />
          {[p.hours ? hoursWord(p.hours) : null, p.units.length ? pluralAr(p.units.length, ["فصل واحد", "فصلان", "فصول", "فصلًا"]) : null].filter(Boolean).join(" · ") || "المدة لم تُحدَّد"}
        </span>
      </div>
      <h1 className="text-[32px] leading-[1.2] font-bold text-text-primary sm:text-[44px]">{p.title}</h1>
      {p.summary ? <p className="type-body-lg text-text-secondary">{p.summary}</p> : <p className="type-body-lg text-state-error">لم يُكتب وصف البرنامج بعد — يظهر هذا الفراغ للمتدرب.</p>}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center">
        {cta}
        <div className="flex flex-col gap-0.5 sm:ms-auto sm:items-end">
          <p className="text-[32px] leading-[1.2] font-bold text-text-primary sm:text-[40px]">{p.price === null ? "لم يُحدَّد السعر" : formatPrice(p.price)}</p>
          <p className="type-caption text-text-muted">غير شامل الضريبة · للمتدرب الواحد</p>
        </div>
      </div>
    </section>
  );
}

export function ObjectivesCard({ p }: { p: ProgramDetail }) {
  return (
    <PreviewCard title="ماذا ستقدر على فعله بعد البرنامج؟">
      {p.objectives.length === 0 ? (
        <p className="rounded-16 border-[1.5px] border-dashed border-state-error bg-state-error-bg px-5 py-6 text-center type-body text-state-error">لم تُضف أهداف تعليمية — المتدرب لن يعرف ما سيتعلمه.</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {p.objectives.map((o) => (
            <li key={o} className="flex items-center gap-3.5 rounded-16 bg-state-success-bg px-[18px] py-4">
              <Glyph icon={CircleCheck} size={20} className="text-state-success" />
              <span className="type-body-lg text-text-primary">{o}</span>
            </li>
          ))}
        </ul>
      )}
    </PreviewCard>
  );
}

export function ContentCard({ p, title = "محتوى البرنامج", badge }: { p: ProgramDetail; title?: string; badge?: ReactNode }) {
  return (
    <PreviewCard>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 flex-1 type-h2 text-text-primary">{title}</h2>
        {badge}
      </div>
      {p.units.length === 0 ? (
        <p className="rounded-16 border-[1.5px] border-dashed border-border-default px-5 py-6 text-center type-body text-text-muted">لا فصول في البرنامج بعد.</p>
      ) : (
        <ol className="flex flex-col gap-3.5">
          {p.units.map((u, i) => (
            <li key={u.id}>
              <details className="group rounded-16 bg-bg-page">
                <summary className="flex cursor-pointer list-none items-center gap-4 rounded-16 px-[18px] py-4 focus-ring [&::-webkit-details-marker]:hidden">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-brand-tint text-[20px] leading-[1.4] text-text-brand">{toArabicDigits(i + 1)}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="type-title text-text-primary">{u.title}</span>
                    <span className="type-body text-text-muted">{[u.minutes ? hoursWord(Math.round((u.minutes / 60) * 10) / 10) : null, lessonsWord(u.lessons)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <Glyph icon={ChevronDown} size={20} className="text-text-secondary transition-transform group-open:rotate-180" />
                </summary>
                {u.items.length > 0 && (
                  <ul className="flex flex-col gap-2 px-[18px] pb-4">
                    {u.items.map((it) => (
                      <li key={it.id} className="flex items-center gap-3 rounded-12 bg-bg-surface px-3.5 py-3">
                        <Glyph icon={ITEM_ICON[it.kind]} size={16} className="text-text-muted" />
                        <span className="min-w-0 flex-1 type-small text-text-primary">{it.title}</span>
                        {it.minutes ? <span className="type-caption text-text-muted">{toArabicDigits(it.minutes)} دقيقة</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </li>
          ))}
        </ol>
      )}
    </PreviewCard>
  );
}
