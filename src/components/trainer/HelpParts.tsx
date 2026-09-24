import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, BookOpen, ChevronLeft, Compass, Library, Wallet } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";
import type { TrainerGuide, TrainerHelpCategory } from "@/lib/data/trainer-help";

export const HELP_BASE = "/trainer/help";
export const SUPPORT_HREF = "/messages?f=support";

export const CATEGORY_STYLE: Record<TrainerHelpCategory, { icon: LucideIcon; tile: string; guide: string }> = {
  trainer_programs: { icon: BookOpen, tile: "bg-bg-inverse text-text-on-brand", guide: "text-text-brand" },
  trainer_courses: { icon: Library, tile: "bg-state-info-bg text-state-info", guide: "text-state-info" },
  trainer_opportunities: { icon: Compass, tile: "bg-state-warning-bg text-state-warning", guide: "text-state-warning" },
  trainer_finance: { icon: Wallet, tile: "bg-state-success-bg text-state-success", guide: "text-state-success" },
  trainer_profile: { icon: BadgeCheck, tile: "bg-state-info-bg text-state-info", guide: "text-state-info" },
};

/** "٥ دقائق" · "٢ دقيقة" (Figma copy). */
export function minutesText(n: number | null): string {
  if (!n) return "";
  return n >= 3 && n <= 10 ? `${toArabicDigits(n)} دقائق` : `${toArabicDigits(n)} دقيقة`;
}

export function guidesWord(n: number): string {
  if (n === 1) return "دليل واحد";
  if (n === 2) return "دليلان";
  return `${toArabicDigits(n)} ${n >= 3 && n <= 10 ? "أدلة" : "دليلًا"}`;
}

/** Guide row (468:36150): TG/AI/Guide (book-open) · title Type/Title + meta 14 muted · chevron-left. The top guide gets «اقرأ الدليل». */
export function GuideRow({ guide, lead }: { guide: TrainerGuide; lead?: boolean }) {
  const meta = [lead ? `${minutesText(guide.readMinutes)} قراءة` : minutesText(guide.readMinutes), guide.featured ? "الأكثر قراءة" : ""].filter(Boolean).join(" · ");
  return (
    <li>
      <Link href={`${HELP_BASE}/${guide.slug}`} className="group flex w-full items-center gap-3.5 rounded-16 bg-bg-page px-[18px] pt-[15px] pb-4 hover:bg-bg-brand-tint focus-ring">
        <Glyph icon={BookOpen} size={20} className={CATEGORY_STYLE[guide.category].guide} />
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          {lead && <span className="mb-1 self-start rounded-8 bg-action-primary px-[18px] py-2 text-[14px] leading-none font-bold text-text-on-brand">اقرأ الدليل</span>}
          <span className="type-title text-text-primary">{guide.title}</span>
          {meta && <span className="type-caption text-text-muted">{meta}</span>}
        </span>
        <Glyph icon={ChevronLeft} size={20} className="text-text-secondary" />
      </Link>
    </li>
  );
}

/** «لم تجد إجابتك؟» (468:36332) — green-bordered support card. */
export function SupportCard() {
  return (
    <section aria-labelledby="no-answer" className="flex flex-col gap-4 rounded-22 border-2 border-state-success bg-state-success-bg/40 p-[26px]">
      <h2 id="no-answer" className="type-h3 text-state-success">
        لم تجد إجابتك؟
      </h2>
      <p className="type-body text-text-secondary">فريق دعم المدربين يردّ خلال ٤ ساعات عمل.</p>
      <ButtonLink href={SUPPORT_HREF} size="l" fullWidth>
        تواصل مع دعم المدربين
      </ButtonLink>
      <ButtonLink href={SUPPORT_HREF} size="l" variant="outline" fullWidth className="bg-bg-surface/60">
        أبلغ عن مشكلة تقنية
      </ButtonLink>
    </section>
  );
}

/** «الأكثر قراءة» (468:36341): numbered rows. */
export function MostRead({ guides }: { guides: TrainerGuide[] }) {
  if (!guides.length) return null;
  return (
    <section aria-labelledby="most-read" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-7 shadow-card">
      <h2 id="most-read" className="type-h3 text-text-primary">
        الأكثر قراءة
      </h2>
      <ol className="flex flex-col gap-5">
        {guides.map((g, i) => (
          <li key={g.slug}>
            <Link href={`${HELP_BASE}/${g.slug}`} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px] hover:bg-bg-brand-tint focus-ring">
              <span aria-hidden className="flex size-[30px] shrink-0 items-center justify-center rounded-8 bg-bg-surface type-small text-text-secondary">
                {toArabicDigits(i + 1)}
              </span>
              <span className="flex-1 type-body text-text-primary">{g.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
