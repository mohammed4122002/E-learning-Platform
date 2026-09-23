import Image from "next/image";
import { hero } from "@/lib/dashboard-data";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Figma "Data / Progress" — the yellow arc is the exported ring vector (65%). */
function ProgressRing({ label }: { label: string }) {
  return (
    <div className="relative flex size-[110px] shrink-0 items-center justify-center" role="img" aria-label={`نسبة الإنجاز ${label}`}>
      <div className="relative size-[88px]">
        <Image src="/assets/icons/progress-ring.svg" alt="" width={80} height={88} className="absolute top-0 right-0" />
      </div>
      <span className="absolute top-[38px] left-[54.5px] -translate-x-1/2 whitespace-nowrap text-center type-body text-bg-sidebar-hover">
        {label}
      </span>
    </div>
  );
}

export function HeroCard() {
  return (
    <section
      aria-labelledby="hero-title"
      className="flex flex-col-reverse items-start gap-6 overflow-hidden rounded-22 bg-action-primary px-5 py-6 shadow-hero sm:flex-row sm:items-center sm:gap-8 sm:px-9 sm:py-8"
    >
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-3">
        <p className="flex items-center gap-2 rounded-full bg-bg-brand-tint px-3 py-[5px] type-caption text-text-brand">
          <Icon src="/assets/icons/graduation-cap-brand.svg" size={16} />
          <span className="whitespace-nowrap">{hero.track}</span>
        </p>
        <h2 id="hero-title" className="w-full type-display text-text-on-brand">
          {hero.greeting}
        </h2>
        <p className="w-full type-body-lg text-bg-brand-tint">{hero.summary}</p>
        <div className="flex w-full items-center gap-3">
          <Button variant="accent">{hero.primaryCta}</Button>
          <Button variant="ghost-on-brand">{hero.secondaryCta}</Button>
        </div>
      </div>
      <ProgressRing label={hero.progressLabel} />
    </section>
  );
}
