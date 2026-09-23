import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Award, Brain, Milestone, Target, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { AchievementView, CertificateView } from "@/lib/data/dashboard";

const BADGE_ICONS: Record<string, LucideIcon> = { "path-complete": Brain, "five-courses": Target, "first-certificate": Trophy, "ten-courses": Milestone };

/** Figma "Card / Certificate": 6px ribbon (accent = platform, warning = uploaded), title 18 Medium. */
export function CertificateCard({ certificate }: { certificate: CertificateView }) {
  const { title, meta, kind, status, href, verifyCode } = certificate;
  return (
    <article className="flex w-full min-w-0 flex-col items-start gap-3 overflow-hidden rounded-16 bg-bg-card p-4 shadow-card inner-stroke">
      <div className={`h-1.5 w-full shrink-0 rounded-full ${kind === "platform" ? "bg-action-accent" : "bg-state-warning"}`} />
      <h3 className="w-full type-h4 text-text-primary">
        <Link href={href} className="rounded-8 hover:text-text-brand focus-ring">
          {title}
        </Link>
      </h3>
      <p className="w-full type-caption text-text-secondary">{meta}</p>
      <Badge tone={status.tone} className="max-w-full px-2.5 py-[3px]">
        <span className="truncate">{status.label}</span>
      </Badge>
      {verifyCode ? (
        <Link href={`/verify/${verifyCode}`} className="w-full rounded-8 type-caption text-text-brand hover:underline focus-ring">
          رابط التحقق العام
        </Link>
      ) : (
        <p className="w-full type-caption text-text-muted">لا يوجد رابط تحقق</p>
      )}
    </article>
  );
}

/**
 * "الوسائم" card. The badge row reproduces the Figma frame: a 94px high clipped flex-wrap row
 * (the fourth badge wraps out of view, as in the design).
 */
function AchievementsCard({ achievements }: { achievements: AchievementView[] }) {
  const heights: Record<string, number> = { "path-complete": 94, "five-courses": 85, "first-certificate": 94, "ten-courses": 10 };
  return (
    <article className="flex h-[177px] w-full shrink-0 flex-col items-start gap-3.5 overflow-hidden rounded-16 bg-bg-card px-[22px] pt-5 pb-[22px] shadow-card inner-stroke xl:w-[360px]">
      <h3 className="w-full type-title text-text-primary">الوسائم</h3>
      <ul className="flex h-[94px] w-full flex-wrap content-center items-center justify-center gap-4 overflow-hidden">
        {achievements.map(({ id, label, earned }) => (
          <li key={id} className="flex w-[70px] shrink-0 flex-col items-center gap-2 overflow-hidden" style={{ height: heights[id] ?? 94 }}>
            <span className={`flex size-14 shrink-0 items-center justify-center rounded-full ${earned ? "bg-state-warning-bg text-state-warning" : "bg-bg-disabled text-text-disabled"}`}>
              <Glyph icon={BADGE_ICONS[id] ?? Award} size={20} />
            </span>
            <span className={`w-full text-center type-caption ${earned ? "text-text-primary" : "text-text-disabled"}`}>
              {label}
              <span className="sr-only">{earned ? " — مكتسب" : " — لم يُكتسب بعد"}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function CertificatesSection({ certificates, achievements }: { certificates: CertificateView[]; achievements: AchievementView[] }) {
  return (
    <section aria-labelledby="certificates-title" className="flex flex-col gap-[18px]">
      <SectionHeader id="certificates-title" title="شهاداتك وإنجازاتك" link={{ label: "أرشيف الشهادات", href: "/trainee/certificates" }} />
      <div className="flex w-full flex-col items-start gap-5 xl:flex-row">
        <AchievementsCard achievements={achievements} />
        {certificates.length > 0 ? (
          <div className="grid w-full min-w-0 flex-1 grid-cols-1 items-start gap-5 md:grid-cols-2">
            {certificates.map((c) => (
              <CertificateCard key={c.id} certificate={c} />
            ))}
          </div>
        ) : (
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-2 self-stretch rounded-16 border-[1.5px] border-border-divider bg-bg-page p-8 text-center">
            <p className="type-title text-text-primary">لا شهادات بعد</p>
            <p className="type-small text-text-secondary">أكمل دورتك الأولى لتحصل على شهادة موثّقة برابط تحقق عام.</p>
          </div>
        )}
      </div>
    </section>
  );
}
