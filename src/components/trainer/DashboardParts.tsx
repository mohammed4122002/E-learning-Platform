import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, ChevronLeft, CircleCheck, CircleDot, CircleQuestionMark, FileText, Hourglass, Archive } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { formatRelative, pluralAr, toArabicDigits } from "@/lib/format";
import type { TrainerProgram } from "@/lib/data/trainer";

/* Building blocks of TRR-DSH-01 (256:848 · 296:8159 · 296:8468). Values from the Figma frames; tokens only. */

/** Card shell used by the dashboard / journey side cards: surface, 1px border, r16 or r22, card shadow. */
export function DashCard({ children, className, radius = 16, labelledBy }: { children: ReactNode; className?: string; radius?: 16 | 22; labelledBy?: string }) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`flex w-full flex-col gap-4 border border-border-default bg-bg-card shadow-card ${radius === 22 ? "rounded-22 p-5 sm:p-[26px]" : "rounded-16 p-5 sm:p-6"} ${className ?? ""}`}
    >
      {children}
    </section>
  );
}

/** Section title (26 Bold + 15 muted) with a "see all" link at the inline end (chevron-left). */
export function DashSectionHeader({ id, title, subtitle, link }: { id: string; title: string; subtitle?: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex w-full items-center gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id={id} className="type-h2 text-text-primary">
          {title}
        </h2>
        {subtitle && <p className="type-small text-text-muted">{subtitle}</p>}
      </div>
      {link && (
        <Link href={link.href} className="flex shrink-0 items-center gap-1.5 rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
          {link.label}
          <Glyph icon={ChevronLeft} size={16} />
        </Link>
      )}
    </div>
  );
}

/** Pill on the hero cards (px 10 · py 5 · 14 Regular · 16px icon) on a surface background. */
export function HeroPill({ icon, tone, children }: { icon: LucideIcon; tone: "success" | "brand" | "warning" | "secondary"; children: ReactNode }) {
  const tones = { success: "text-state-success", brand: "text-text-brand", warning: "text-state-warning", secondary: "text-text-secondary" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption ${tones[tone]}`}>
      <Glyph icon={icon} size={16} />
      {children}
    </span>
  );
}

/** Stage pill of the hero ("إنشاء الحساب" done = success tint, others = surface + circle-dot / current hourglass). */
export function StagePill({ label, state }: { label: string; state: "done" | "current" | "todo" }) {
  const cls = state === "done" ? "bg-state-success-bg text-state-success" : "bg-bg-surface text-text-secondary";
  const icon = state === "done" ? CircleCheck : state === "current" ? Hourglass : CircleDot;
  return (
    <li className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 type-caption ${cls}`}>
      <Glyph icon={icon} size={16} />
      {label}
    </li>
  );
}

/** Row with a 44/48px surface tile, title + caption, and an action at the inline end (296:8664 / 296:8347). */
export function ActionRow({
  icon,
  title,
  caption,
  action,
  highlight = false,
  tileTone = "surface",
  titleClass = "type-title",
  size = "m",
}: {
  icon: LucideIcon;
  title: ReactNode;
  caption?: ReactNode;
  action?: ReactNode;
  highlight?: boolean;
  tileTone?: "surface" | "brand";
  titleClass?: string;
  size?: "m" | "l";
}) {
  return (
    <li
      className={`flex w-full flex-wrap items-center gap-4 rounded-16 sm:flex-nowrap ${size === "l" ? "p-5" : "px-[18px] py-4"} ${
        highlight ? "border-2 border-action-primary bg-bg-brand-tint" : "bg-bg-page"
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center ${size === "l" ? "size-16 rounded-16" : "size-12 rounded-12"} ${
          tileTone === "brand" ? "bg-action-primary text-text-on-brand" : "bg-bg-surface text-text-brand"
        }`}
      >
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className={`${titleClass} text-text-primary`}>{title}</span>
        {caption && <span className="type-body text-text-muted">{caption}</span>}
      </span>
      {action}
    </li>
  );
}

/** Muted bg/page row with a 36px surface tile (queue preview / opportunities, 256:1194). */
export function MiniRow({ icon, iconClass, title, caption, href }: { icon: LucideIcon; iconClass?: string; title: ReactNode; caption?: ReactNode; href?: string }) {
  const body = (
    <>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${iconClass ?? "text-text-brand"}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-small text-text-primary">{title}</span>
        {caption && <span className="type-caption text-text-muted">{caption}</span>}
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="flex w-full items-start gap-2.5 rounded-12 bg-bg-page px-3 py-[11px] hover:bg-bg-brand-tint focus-ring">
          {body}
        </Link>
      ) : (
        <div className="flex w-full items-start gap-2.5 rounded-12 bg-bg-page px-3 py-[11px]">{body}</div>
      )}
    </li>
  );
}

/** Starter FAQ (296:8431 «أسئلة البداية»). */
export function FaqCard({ title, items, action }: { title: string; items: { q: string; a: string }[]; action?: ReactNode }) {
  return (
    <DashCard radius={22} labelledBy="faq-title" className="gap-[18px]">
      <h2 id="faq-title" className="type-h2 text-text-primary">
        {title}
      </h2>
      <ul className="flex flex-col gap-[18px]">
        {items.map((f) => (
          <li key={f.q} className="flex flex-col gap-1.5 rounded-16 bg-bg-page px-4 pt-3.5 pb-4">
            <p className="flex items-center gap-2.5 type-subtitle text-text-primary">
              <Glyph icon={CircleQuestionMark} size={20} className="text-text-brand" />
              <span className="flex-1">{f.q}</span>
            </p>
            <p className="type-body text-text-muted">{f.a}</p>
          </li>
        ))}
      </ul>
      {action}
    </DashCard>
  );
}

const PROGRAM_STATUS: Record<string, { label: string; icon: LucideIcon; cls: string }> = {
  draft: { label: "مسودة", icon: FileText, cls: "bg-bg-disabled text-text-muted" },
  published: { label: "منشور", icon: CircleCheck, cls: "bg-state-success-bg text-state-success" },
  archived: { label: "مؤرشف", icon: Archive, cls: "bg-bg-disabled text-text-muted" },
};
const REVIEW = { label: "قيد المراجعة", icon: Hourglass, cls: "bg-bg-surface text-state-warning" };

/** Program row of «برامجي» (256:1112): r12 bg/page (in review = warning tint + 1.5px border), status pill, «اعرض». */
export function ProgramRow({ program }: { program: TrainerProgram }) {
  const s = PROGRAM_STATUS[program.status] ?? REVIEW;
  const review = !PROGRAM_STATUS[program.status];
  const caption =
    program.status === "draft"
      ? `لم يُرسل بعد · محفوظ ${formatRelative(program.updatedAt)}`
      : review
        ? `أُرسل ${formatRelative(program.updatedAt)}`
        : `${pluralAr(program.coursesCount, ["دورة واحدة", "دورتان", "دورات", "دورة"])} · ${toArabicDigits(program.learners)} مسجّلًا`;
  return (
    <li className={`flex w-full items-center gap-3.5 rounded-12 px-4 py-3.5 ${review ? "border-[1.5px] border-state-warning bg-state-warning-bg" : "bg-bg-page"}`}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
        <Glyph icon={BookOpen} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2.5">
          <span className="min-w-0 flex-1 type-subtitle text-text-primary">{program.title}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] type-caption ${s.cls}`}>
            <Glyph icon={s.icon} size={16} />
            {s.label}
          </span>
        </span>
        <span className="type-caption text-text-muted">{caption}</span>
      </span>
      <ButtonLink href={`/trainer/programs/${program.id}`} variant="ghost" size="s" className="w-[72px] sm:w-[120px]">
        اعرض
      </ButtonLink>
    </li>
  );
}

const money2Fmt = new Intl.NumberFormat("ar-SA-u-nu-arab", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** "٤٬٣٢٠٫٠٠ ر.س" — balances always show two decimals (256:1227). */
export function money2(amount: number): string {
  return `${money2Fmt.format(Math.round(amount * 100) / 100)} ر.س`;
}
