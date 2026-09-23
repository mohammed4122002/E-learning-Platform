import { GraduationCap } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { formatPercent } from "@/lib/format";
import type { DashboardView } from "@/lib/data/dashboard";

/** Figma hero ring: 88px, accent arc starting at 12 o'clock, clockwise (≈9.7px stroke), label centred. */
function ProgressRing({ percent }: { percent: number }) {
  const r = 39;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative flex size-[110px] shrink-0 items-center justify-center" role="img" aria-label={`نسبة الإنجاز ${formatPercent(v)}`}>
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden className="-rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgb(255 255 255 / 0.16)" strokeWidth="9.7" />
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-action-accent)" strokeWidth="9.7" strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <span className="absolute type-body text-bg-sidebar-hover">{formatPercent(v)}</span>
    </div>
  );
}

export function HeroCard({ hero }: { hero: DashboardView["hero"] }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="flex flex-col-reverse items-start gap-6 overflow-hidden rounded-22 bg-action-primary px-5 py-6 shadow-hero sm:flex-row sm:items-center sm:gap-8 sm:px-9 sm:py-8"
    >
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-3">
        {hero.track && (
          <p className="flex items-center gap-2 rounded-full bg-bg-brand-tint px-3 py-[5px] type-caption text-text-brand">
            <Glyph icon={GraduationCap} size={16} />
            <span className="whitespace-nowrap">مسارك: {hero.track}</span>
          </p>
        )}
        <h2 id="hero-title" className="w-full text-[34px] leading-[1.15] font-bold text-text-on-brand sm:type-display">
          {hero.greeting} 👋
        </h2>
        <p className="w-full type-body-lg text-bg-brand-tint">{hero.summary}</p>
        <div className="flex w-full flex-wrap items-center gap-3">
          <ButtonLink href={hero.primaryHref} variant="accent" size="l">
            {hero.hasEnrollments ? "ابدأ التعلم" : "اكتشف دورة"}
          </ButtonLink>
          <ButtonLink href="/trainee/trainings" variant="ghost-on-brand" size="l">
            اعرض خطتي
          </ButtonLink>
        </div>
      </div>
      <ProgressRing percent={hero.percent} />
    </section>
  );
}
