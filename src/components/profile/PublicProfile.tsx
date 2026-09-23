import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, Briefcase, CircleCheck, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { SectionCard } from "./bits";
import { ProfileCertificateCard } from "./ProfileCertificateCard";
import { experienceDuration, experienceYears, hoursLabel } from "./format";
import { pluralAr } from "@/lib/format";
import type { PublicProfileView } from "@/lib/data/profile";

function Chip({ icon, className, children }: { icon: LucideIcon; className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[5px] type-caption ${className}`}>
      <Glyph icon={icon} size={16} />
      {children}
    </span>
  );
}

/**
 * TRN-PRF-01 · الملف العام (242:15479) — exactly what visitors see at /u/[id].
 * `aside` holds the owner-only cards in the preview (hidden data, sharing).
 */
export function PublicProfile({ profile, aside, headingLevel = "h2" }: { profile: PublicProfileView; aside?: ReactNode; headingLevel?: "h1" | "h2" }) {
  const Heading = headingLevel;
  const main = (
    <div className="flex min-w-0 flex-col gap-6">
      {profile.bio && (
        <SectionCard title="نبذة" titleId="pub-bio">
          <p className="type-body whitespace-pre-line text-text-secondary">{profile.bio}</p>
        </SectionCard>
      )}

      {profile.showLearningRecord && profile.skills.length > 0 && (
        <SectionCard title="المهارات الموثّقة" titleId="pub-skills">
          <p className="type-caption text-state-success">مستخرجة من دورات مكتملة على المنصة — موثوقة ولا تُدخل يدويًا.</p>
          <ul className="flex flex-wrap items-center gap-2.5">
            {profile.skills.map((s) => (
              <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-state-success-bg px-3 py-2 type-small text-state-success">
                <Glyph icon={CircleCheck} size={16} />
                {s}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {profile.experiences.length > 0 && (
        <SectionCard title="الخبرات المهنية" titleId="pub-exp">
          <p className="type-caption text-text-muted">يُدخلها صاحب الملف بنفسه — غير متحقَّق منها من المنصة.</p>
          <ul className="flex flex-col gap-4">
            {profile.experiences.map((e, i) => (
              <li key={`${e.title}-${i}`} className="flex items-center gap-3.5 rounded-12 bg-bg-page px-4 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-secondary">
                  <Glyph icon={Briefcase} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="type-subtitle text-text-primary">{e.title}</p>
                  <p className="type-caption text-text-muted">
                    {e.organization} · {experienceYears(e)}
                  </p>
                </div>
                <span className="shrink-0 type-caption text-text-muted">{experienceDuration(e)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {profile.showCertificates && profile.certificates.length > 0 && (
        <SectionCard title="الشهادات" titleId="pub-certs">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {profile.certificates.map((c) => (
              <ProfileCertificateCard key={c.code} title={c.title} traineeName={c.traineeName} issuedAt={c.issuedAt} code={c.code} />
            ))}
          </div>
        </SectionCard>
      )}

      {!profile.bio && profile.experiences.length === 0 && profile.certificates.length === 0 && profile.skills.length === 0 && (
        <SectionCard title="لا تفاصيل بعد" titleId="pub-empty">
          <p className="type-body text-text-secondary">لم يضف صاحب الملف نبذة أو خبرات أو شهادات عامة بعد.</p>
        </SectionCard>
      )}
    </div>
  );

  return (
    <>
      <section aria-labelledby="pub-name" className="flex flex-col gap-6 rounded-22 border border-border-default bg-bg-surface px-5 py-6 shadow-card sm:flex-row sm:items-center sm:gap-[26px] sm:px-[30px] sm:py-7">
        <Avatar name={profile.fullName || "؟"} src={profile.avatarUrl} size="l" />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <Heading id="pub-name" className="text-[34px] font-bold leading-[1.15] text-text-primary sm:type-display">
            {profile.fullName}
          </Heading>
          {profile.headline && <p className="type-body-lg text-text-secondary">{profile.headline}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {profile.showCertificates && profile.certificateCount !== null && profile.certificateCount > 0 && (
              <Chip icon={Award} className="bg-state-warning-bg text-state-warning">
                {pluralAr(profile.certificateCount, ["شهادة واحدة", "شهادتان", "شهادات", "شهادة"])} قابلة للتحقق
              </Chip>
            )}
            {profile.showLearningRecord && profile.hours !== null && profile.hours > 0 && (
              <Chip icon={Clock} className="bg-bg-brand-tint text-text-brand">
                {hoursLabel(profile.hours)} تدريب موثّقة
              </Chip>
            )}
            {profile.verified && (
              <Chip icon={CircleCheck} className="bg-state-success-bg text-state-success">
                هوية موثَّقة من المنصة
              </Chip>
            )}
          </div>
        </div>
      </section>

      {aside ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {main}
          <aside aria-label="خيارات المعاينة" className="flex min-w-0 flex-col gap-5">
            {aside}
          </aside>
        </div>
      ) : (
        main
      )}
    </>
  );
}
