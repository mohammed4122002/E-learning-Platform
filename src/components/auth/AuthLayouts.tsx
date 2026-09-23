import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Clock, CircleUserRound, Star, TrendingUp, Users } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { RatingStars } from "@/components/ui/Rating";
import { createClient } from "@/lib/supabase/server";

type PanelContent = {
  stats: { icon: string; value: string; label: string }[];
  testimonial: { name: string; role: string; initials: string; rating: number; quote: string };
};

const statIcons: Record<string, LucideIcon> = { users: Users, "trending-up": TrendingUp, clock: Clock, star: Star };

/** Marketing copy of the value panel lives in app_settings ("auth_value_panel") so it can change without a deploy. */
async function getPanelContent(): Promise<PanelContent | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "auth_value_panel").maybeSingle();
  return (data?.value as PanelContent | undefined) ?? null;
}

/*
 * PUB-AUT-01/02/03 shell: 1440 frame, bg/page, px 72 py 64, gap 72.
 * FORM CARD 520px (r22, p 40/40/36/40, gap 22, shadow 0 8 40 @10%) + VALUE PANEL 560px (gap 26).
 * In RTL the value panel sits on the right, the card on the left.
 */
export async function AuthSplitLayout({ children }: { children: ReactNode }) {
  const panel = await getPanelContent();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-page px-4 py-10 md:px-[72px] md:py-16">
      <div className="flex w-full max-w-[1152px] flex-col-reverse items-center gap-10 lg:flex-row lg:justify-center lg:gap-[72px]">
        <aside className="hidden w-full max-w-[560px] flex-col gap-[26px] lg:flex" aria-label="عن المنصة">
          <div className="flex size-16 items-center justify-center rounded-16 bg-action-primary text-text-on-brand shadow-hero">
            <Glyph icon={CircleUserRound} size={32} />
          </div>
          <div className="flex flex-col gap-0.5 type-display">
            <p className="text-text-primary">منصة بوابة التدريب</p>
            <p className="text-text-brand">تعلّم بلا حدود</p>
          </div>
          <p className="type-body-lg text-text-secondary">
            سجّل دوراتك، تابع حضورك ونتائجك، واحصل على شهادات موثّقة قابلة للتحقق — كل ذلك من مكان واحد.
          </p>
          {panel && (
            <>
              <ul className="grid grid-cols-2 gap-x-11 gap-y-[18px]">
                {panel.stats.map((s) => (
                  <li key={s.label} className="flex flex-col gap-1.5 rounded-16 border border-border-default bg-bg-surface px-[18px] pt-4 pb-[18px] shadow-card">
                    <div className="flex items-center gap-2.5">
                      <p className="flex-1 type-title text-text-primary">{s.value}</p>
                      <span className="flex size-9 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
                        <Glyph icon={statIcons[s.icon] ?? Star} size={20} />
                      </span>
                    </div>
                    <p className="type-caption text-text-muted">{s.label}</p>
                  </li>
                ))}
              </ul>
              <figure className="flex flex-col gap-3 rounded-16 border border-border-default bg-bg-surface px-[22px] pt-5 pb-[22px] shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 flex-col">
                    <p className="type-subtitle text-text-primary">{panel.testimonial.name}</p>
                    <p className="type-caption text-text-muted">{panel.testimonial.role}</p>
                  </div>
                  <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-action-primary type-caption text-text-on-brand">
                    {panel.testimonial.initials}
                  </span>
                </div>
                <RatingStars value={panel.testimonial.rating} />
                <blockquote className="type-body text-text-secondary">{panel.testimonial.quote}</blockquote>
              </figure>
            </>
          )}
        </aside>
        <section className="flex w-full max-w-[520px] flex-col gap-[22px] rounded-22 border border-border-default bg-bg-surface px-6 pt-10 pb-9 shadow-float sm:px-10">
          {children}
        </section>
      </div>
    </main>
  );
}

/*
 * PUB-AUT-04 / PUB-CTX-01 shell: centred, 64px icon tile, 36 Bold title + 18 Regular subtitle, gap 32.
 */
export function AuthCenteredLayout({
  icon,
  title,
  subtitle,
  children,
  wide = false,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-bg-page px-4 py-10 md:px-[72px] md:py-16">
      <div className="flex size-16 items-center justify-center rounded-16 bg-action-primary text-text-on-brand shadow-hero">
        <Glyph icon={icon} size={32} />
      </div>
      <div className="flex flex-col items-center gap-2.5 text-center">
        <h1 className="text-[28px] font-bold leading-[1.2] text-text-primary md:text-[36px]">{title}</h1>
        <p className="type-body-lg text-text-secondary">{subtitle}</p>
      </div>
      <div className={`w-full ${wide ? "max-w-[1032px]" : "max-w-[640px]"}`}>{children}</div>
    </main>
  );
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-6 rounded-22 border border-border-default bg-bg-surface px-6 pt-10 pb-9 shadow-float sm:px-10">
      {children}
    </section>
  );
}

export function AuthTitle({ title, subtitle, badge }: { title: string; subtitle: ReactNode; badge?: ReactNode }) {
  return (
    <header className="flex flex-col items-start gap-2">
      <h1 className="type-h2 text-text-primary">{title}</h1>
      <p className="type-body text-text-secondary">{subtitle}</p>
      {badge}
    </header>
  );
}

export function SuccessPill({ icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[7px] rounded-full bg-state-success-bg px-3 py-[5px] type-caption text-state-success">
      <Glyph icon={icon} size={16} />
      {children}
    </span>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3.5" aria-hidden>
      <span className="h-px flex-1 bg-border-divider" />
      <span className="type-caption text-text-muted">أو</span>
      <span className="h-px flex-1 bg-border-divider" />
    </div>
  );
}

export function LegalLinks() {
  return (
    <nav aria-label="روابط قانونية" className="flex flex-wrap items-center justify-center gap-[18px] type-caption">
      <Link href="/terms#privacy" className="text-text-brand hover:underline focus-ring">سياسة الخصوصية</Link>
      <span aria-hidden className="text-text-muted">·</span>
      <Link href="/terms" className="text-text-brand hover:underline focus-ring">الشروط والأحكام</Link>
      <span aria-hidden className="text-text-muted">·</span>
      <Link href="/help" className="text-text-brand hover:underline focus-ring">الدعم الفني</Link>
    </nav>
  );
}

export function BackToLogin() {
  return (
    <Link href="/login" className="flex items-center justify-center gap-2 self-center rounded-8 type-caption text-text-muted hover:text-text-primary focus-ring">
      <Glyph icon={ChevronRight} size={16} />
      العودة إلى تسجيل الدخول
    </Link>
  );
}

export const RECOVERY_STEPS = ["أدخل بريدك", "أدخل رمز التحقق", "كلمة مرور جديدة"];

export { Stepper } from "@/components/ui/Stepper";
