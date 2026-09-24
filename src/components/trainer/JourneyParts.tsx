import type { ReactNode } from "react";
import { CircleCheck, CircleQuestionMark, Lock, Play } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { formatDayMonth, toArabicDigits } from "@/lib/format";
import type { Stage, TrainerOverview } from "@/lib/data/trainer";

/** CTA of the current stage (TRR-JRN-01 · 253:240 «أكمل المؤهلات»). */
export function stageAction(stage: Stage, o: TrainerOverview): { label: string; href: string } {
  const draft = o.programs.find((p) => p.status === "draft");
  const review = o.programs.find((p) => !["draft", "published", "archived"].includes(p.status));
  switch (stage.key) {
    case "account":
      return { label: "ابدأ", href: "/account" };
    case "identity":
      return { label: o.identityPendingSince ? "تتبّع التوثيق" : "وثّق هويتي", href: "/account" };
    case "profile":
      return { label: "أكمل ملفي", href: "/trainer/profile/edit" };
    case "qualifications":
      return { label: "أكمل المؤهلات", href: "/trainer/profile/edit#qualifications" };
    case "program":
      return draft ? { label: "أكمل المسودة", href: `/trainer/programs/${draft.id}` } : { label: "ابدأ برنامجك الأول", href: "/trainer/programs" };
    case "review":
      return { label: "تتبّع الطلب", href: review ? `/trainer/programs/${review.id}` : "/trainer/programs" };
    case "course":
      return { label: "أنشئ أول دورة", href: "/trainer/courses" };
    case "trainees":
      return { label: "اعرض دوراتي", href: "/trainer/courses" };
    case "revenue":
      return { label: "اعرض رصيدي", href: "/trainer/finance" };
  }
}

/**
 * Stage row (253:189 done · 253:240 current · 253:254 next · 253:269 locked): 64px number tile, 19 Bold title + status
 * pill, 17 secondary description, action column (120px).
 */
export function StageCard({ stage, o, next }: { stage: Stage; o: TrainerOverview; next: boolean }) {
  const current = stage.state === "current";
  const done = stage.state === "done";
  const action = stageAction(stage, o);
  let pill: ReactNode;
  if (done) {
    pill = (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-state-success-bg px-2.5 py-[5px] type-caption text-state-success">
        <Glyph icon={CircleCheck} size={16} />
        {stage.doneAt ? `مكتمل · ${formatDayMonth(stage.doneAt)}` : "مكتمل"}
      </span>
    );
  } else if (current) {
    pill = (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-warning">
        <Glyph icon={Play} size={16} />
        {["qualifications", "identity", "review"].includes(stage.key) || stage.note === "مسودة" ? stage.note || "ابدأ من هنا" : "ابدأ من هنا"}
      </span>
    );
  } else {
    pill = (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-disabled px-2.5 py-[5px] type-caption text-text-muted">
        <Glyph icon={Lock} size={16} />
        {stage.note || "بعد المرحلة السابقة"}
      </span>
    );
  }
  return (
    <li
      aria-current={current ? "step" : undefined}
      className={`flex w-full flex-wrap items-center gap-[18px] rounded-16 px-5 py-[18px] sm:flex-nowrap ${
        current ? "border-2 border-state-warning bg-state-warning-bg shadow-card" : `border border-border-default bg-bg-card ${done || next ? "shadow-card" : ""}`
      }`}
    >
      <span
        className={`flex size-16 shrink-0 items-center justify-center rounded-16 ${
          done ? "bg-state-success text-text-on-brand" : current ? "bg-action-primary text-text-on-brand" : "bg-bg-disabled text-text-disabled"
        }`}
      >
        {done ? <Glyph icon={CircleCheck} size={20} /> : <span className="type-h2">{toArabicDigits(stage.n)}</span>}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2.5">
          <span className={`min-w-0 flex-1 type-title ${done || current ? "text-text-primary" : "text-text-muted"}`}>{stage.title}</span>
          {pill}
        </span>
        <span className="type-body text-text-secondary">{stage.description}</span>
      </span>
      <span className="flex w-full shrink-0 justify-end sm:w-auto">
        {done ? (
          <ButtonLink href={stage.href} variant="ghost" className="w-[120px]">
            اعرض
          </ButtonLink>
        ) : current || next ? (
          <ButtonLink href={action.href} className="min-w-[120px]">
            {action.label}
          </ButtonLink>
        ) : (
          <span aria-disabled className="flex min-h-12 w-[120px] items-center justify-center rounded-12 bg-bg-disabled px-3 py-1.5 text-center type-caption text-text-disabled">
            يُفتح بعد الخطوة السابقة
          </span>
        )}
      </span>
    </li>
  );
}

/** Side card with a 20 Medium title (253:329 · 253:350 · 253:376), r16 p24 gap16. */
export function SideCard({ title, id, children, className }: { title: string; id: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={`flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card ${className ?? ""}`}>
      <h2 id={id} className="type-h3 text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Compact FAQ rows of «أسئلة المدرب الجديد» (253:679): 15 Regular question + 16px icon, 14 muted answer. */
export function CompactFaq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((f) => (
        <li key={f.q} className="flex flex-col gap-[5px] rounded-12 bg-bg-page px-3 pt-[11px] pb-3">
          <p className="flex items-center gap-2 type-small text-text-primary">
            <Glyph icon={CircleQuestionMark} size={16} className="text-text-brand" />
            <span className="flex-1">{f.q}</span>
          </p>
          <p className="type-caption text-text-muted">{f.a}</p>
        </li>
      ))}
    </ul>
  );
}
