import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Award, BadgeCheck, Briefcase, CalendarDays, CircleCheck, Clock, Link2, Shield } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Navigation";
import { EmptyState } from "@/components/ui/Feedback";
import { SectionCard, VisibilityPill, type Visibility } from "./bits";
import { CopyButton } from "./CopyButton";
import { ProfileCertificateCard } from "./ProfileCertificateCard";
import { ExternalCertificatesSection } from "./ExternalCertificatesSection";
import { experienceDuration, experienceYears, hoursLabel } from "./format";
import { formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import { env } from "@/lib/env";
import type { MyProfileView } from "@/lib/data/profile";

export const PROFILE_TABS = [
  { href: "/trainee/profile", label: "ملفي" },
  { href: "/trainee/profile?tab=preview", label: "الملف العام — معاينة" },
];

function HeroChip({ icon, className, children }: { icon: LucideIcon; className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-bg-surface px-2.5 py-[5px] type-caption ${className}`}>
      <Glyph icon={icon} size={16} />
      {children}
    </span>
  );
}

function EditLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
      تحرير
    </Link>
  );
}

export function memberSinceLabel(iso: string) {
  return `عضو منذ ${new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { month: "long", year: "numeric", timeZone: "Asia/Riyadh" }).format(new Date(iso))}`;
}

/** TRN-PRF-01 · الملف الشخصي · ملفي (242:15093) + تبويب شهادات خارجية (4146:1616). */
export function MyProfile({ profile }: { profile: MyProfileView }) {
  const verified = profile.identityStatus === "verified";
  const publicPath = `/u/${profile.id}`;
  const publicHost = env.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const pct = Math.round((profile.completion.done / profile.completion.total) * 100);
  const learningVisibility: Visibility = profile.isPublic && profile.showLearningRecord ? "public" : "private";
  const certsVisibility: Visibility = profile.isPublic && profile.showCertificates ? "public" : "private";
  const profileVisibility: Visibility = profile.isPublic ? "public" : "private";

  const whoSees: { title: string; caption: string; value: Visibility; label?: string }[] = [
    { title: "نبذتي ومهاراتي", caption: profile.isPublic ? "يراه أي شخص عبر الرابط" : "ملفك خاص — لا يراه أحد", value: profileVisibility },
    { title: "شهاداتي", caption: certsVisibility === "public" ? "يراه أي شخص عبر الرابط" : "لا يراه أحد غيرك", value: certsVisibility },
    { title: "خبراتي", caption: profile.isPublic ? "يراه أي شخص عبر الرابط" : "ملفك خاص — لا يراه أحد", value: profileVisibility },
    {
      title: "ساعاتي التدريبية",
      caption: learningVisibility === "public" ? "يراه أي شخص عبر الرابط" : "تراه الجهات التي سجّلت لديها فقط",
      value: learningVisibility === "public" ? "public" : "providers",
    },
    { title: "درجاتي ونتائجي", caption: "لا يراه أحد غيرك", value: "private" },
    { title: "مدفوعاتي", caption: "لا يراه أحد غيرك", value: "private" },
  ];

  return (
    <>
      {profile.externalCertificates.length > 0 && (
        <ExternalCertificatesSection platform={profile.certificates[0] ?? null} external={profile.externalCertificates[0]} />
      )}

      <div className="flex flex-col items-start gap-4 rounded-12 bg-bg-brand-tint px-5 py-[18px] sm:flex-row sm:items-center">
        <Glyph icon={Shield} size={20} className="hidden text-text-brand sm:block" />
        <p className="flex-1 type-body text-text-brand">
          هذا ملفك المهني — ما تختار مشاركته مع الآخرين. بيانات حسابك الخاصة (البريد · الهاتف · المدفوعات) في «إعدادات الحساب» ولا تظهر هنا إطلاقًا.
        </p>
        <ButtonLink href="/account" variant="outline">
          إعدادات الحساب
        </ButtonLink>
      </div>

      <Tabs tabs={PROFILE_TABS} active="/trainee/profile" label="أقسام الملف الشخصي" />

      <section aria-labelledby="profile-name" className="flex flex-col gap-6 rounded-22 bg-bg-brand-tint px-5 py-6 sm:flex-row sm:items-start sm:gap-[26px] sm:px-[30px] sm:py-7">
        <Avatar name={profile.fullName || "؟"} src={profile.avatarUrl} size="l" />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <h2 id="profile-name" className="text-[34px] font-bold leading-[1.15] text-text-primary sm:type-display">
            {profile.fullName || "أضف اسمك"}
          </h2>
          <p className="type-body-lg text-text-secondary">{profile.headline || "أضف عنوانًا مهنيًا يعرّف بك"}</p>
          <div className="flex flex-wrap items-center gap-2">
            {verified ? (
              <HeroChip icon={BadgeCheck} className="text-state-success">هوية موثَّقة</HeroChip>
            ) : (
              <Link href="/trainee/verification" className="rounded-full focus-ring">
                <HeroChip icon={BadgeCheck} className="text-text-muted">هوية غير موثّقة</HeroChip>
              </Link>
            )}
            <HeroChip icon={Clock} className="text-text-brand">{hoursLabel(profile.hours)} موثّقة</HeroChip>
            <HeroChip icon={Award} className="text-state-warning">
              {profile.certificates.length === 0 ? "لا شهادات بعد" : pluralAr(profile.certificates.length, ["شهادة واحدة", "شهادتان", "شهادات", "شهادة"])}
            </HeroChip>
            <HeroChip icon={CalendarDays} className="text-text-secondary">{memberSinceLabel(profile.memberSince)}</HeroChip>
          </div>
          <div className="flex min-w-0 items-center gap-2.5 rounded-12 bg-bg-surface px-3.5 py-2.5">
            <Glyph icon={Link2} size={16} className="text-text-brand" />
            <span dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-[14px] leading-normal text-text-brand">
              {publicHost}
              {publicPath}
            </span>
            <CopyButton value={publicPath} className="flex h-11 w-[88px] shrink-0 cursor-pointer items-center justify-center rounded-12 type-small text-text-brand hover:bg-bg-brand-tint focus-ring sm:w-[120px]">
              نسخ
            </CopyButton>
          </div>
          {!profile.isPublic && (
            <p className="type-caption text-state-warning">
              ملفك خاص حاليًا — الرابط لا يعمل لغيرك. غيّر ذلك من <Link href="/account/privacy" className="underline">الخصوصية والبيانات</Link>.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-row gap-2.5 sm:flex-col">
          <ButtonLink href="/trainee/profile/edit" className="w-[120px]">
            حرّر ملفي
          </ButtonLink>
          <CopyButton
            value={publicPath}
            share
            className="flex h-12 w-[120px] cursor-pointer items-center justify-center rounded-12 type-button text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-surface focus-ring"
          >
            شارك الملف
          </CopyButton>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="نبذة عني" titleId="bio-title" aside={<><VisibilityPill value={profileVisibility} /><EditLink href="/trainee/profile/edit#bio" label="تحرير النبذة" /></>}>
            <p className="type-body whitespace-pre-line text-text-secondary">{profile.bio || "لم تكتب نبذة بعد. عرّف بنفسك في سطرين أو ثلاثة: ما تعمل عليه، وما تتعلّمه، وما تبحث عنه."}</p>
          </SectionCard>

          <SectionCard title="المهارات" titleId="skills-title" aside={<><VisibilityPill value={learningVisibility} /><EditLink href="/trainee/discover" label="اكتشف دورات تضيف مهارات" /></>}>
            <p className="type-caption text-text-muted">
              المهارات المميّزة بعلامة ✓ مستخرجة آليًا من دوراتك المكتملة — لا يمكن إضافتها يدويًا، وهذا ما يجعل ملفك موثوقًا.
            </p>
            {profile.skills.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-2.5">
                {profile.skills.map((s) => (
                  <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-state-success-bg px-3 py-2 type-small text-state-success">
                    <Glyph icon={CircleCheck} size={16} />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="type-small text-text-secondary">أكمل أول دورة لتظهر مهاراتك الموثّقة هنا.</p>
            )}
          </SectionCard>

          <SectionCard
            title="الاهتمامات والتخصصات المتابَعة"
            titleId="interests-title"
            aside={<><VisibilityPill value={profileVisibility} /><EditLink href="/trainee/following" label="تحرير الاهتمامات" /></>}
          >
            {profile.interests.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-2.5">
                {profile.interests.map((s) => (
                  <li key={s} className="flex h-9 items-center rounded-full border border-border-default bg-bg-surface px-3.5 type-small text-text-primary">
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="type-small text-text-secondary">لم تختر اهتمامات بعد.</p>
            )}
          </SectionCard>

          <SectionCard title="الخبرات المهنية" titleId="exp-title" aside={<><VisibilityPill value={profileVisibility} /><EditLink href="/trainee/profile/experience" label="تحرير الخبرات" /></>}>
            <p className="type-caption text-text-muted">تُدخلها بنفسك ولا تتحقق منها المنصة — تُعرض موسومة للآخرين.</p>
            {profile.experiences.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {profile.experiences.map((e) => (
                  <li key={e.id} className="flex items-center gap-3.5 rounded-12 bg-bg-page px-4 py-3.5">
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
            ) : (
              <EmptyState
                icon={Briefcase}
                title="لا توجد خبرات بعد"
                description="أضف خبرتك الأولى لتكتمل صورة ملفك المهني."
                action={<ButtonLink href="/trainee/profile/experience?mode=add" size="s">أضف خبرتك الأولى</ButtonLink>}
              />
            )}
          </SectionCard>

          <SectionCard title="الشهادات والدورات المكتملة" titleId="certs-title" aside={<VisibilityPill value={certsVisibility} />}>
            <p className="type-caption text-text-muted">تُضاف تلقائيًا عند إتمام أي دورة — لا تحتاج إدخالًا يدويًا، ولها روابط تحقق عامة.</p>
            {profile.certificates.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {profile.certificates.map((c) => (
                  <ProfileCertificateCard key={c.id} title={c.title} traineeName={c.traineeName} issuedAt={c.issuedAt} code={c.code} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Award} title="لا شهادات بعد" description="تظهر شهاداتك هنا تلقائيًا عند إتمام أول دورة." />
            )}
          </SectionCard>
        </div>

        <aside aria-label="الخصوصية واكتمال الملف" className="flex min-w-0 flex-col gap-5">
          <SectionCard title="من يرى ماذا" titleId="who-sees-title">
            <ul className="flex flex-col gap-4">
              {whoSees.map((r) => (
                <li key={r.title} className="flex items-center gap-2.5 rounded-12 bg-bg-page px-3 py-[11px]">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="type-small text-text-primary">{r.title}</p>
                    <p className="type-caption text-text-muted">{r.caption}</p>
                  </div>
                  <VisibilityPill value={r.value} />
                </li>
              ))}
            </ul>
            <ButtonLink href="/trainee/profile?tab=preview" variant="secondary" fullWidth>
              عاين ملفي كما يراه الآخرون
            </ButtonLink>
          </SectionCard>

          <SectionCard title="اكتمال ملفك" titleId="completion-title">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between type-caption text-text-secondary">
                <span>
                  {toArabicDigits(profile.completion.done)} من {toArabicDigits(profile.completion.total)} أقسام مكتملة
                </span>
                <span>{formatPercent(pct)}</span>
              </div>
              <div
                role="progressbar"
                aria-label="اكتمال الملف"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2.5 w-full overflow-hidden rounded-full bg-border-default"
              >
                <div className="h-full rounded-full bg-action-accent" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <p className="type-body text-text-secondary">
              {profile.completion.missing.length === 0
                ? "ملفك مكتمل. الملفات المكتملة تظهر أعلى في نتائج الجهات التدريبية."
                : profile.completion.missing.length === 1
                  ? `يبقى قسم واحد: ${profile.completion.missing[0]} ليكتمل ملفك. الملفات المكتملة تظهر أعلى في نتائج الجهات التدريبية.`
                  : `ما زال ينقصك: ${profile.completion.missing.join(" · ")}. الملفات المكتملة تظهر أعلى في نتائج الجهات التدريبية.`}
            </p>
            {profile.completion.missing.length > 0 && (
              <ButtonLink href={profile.avatarPath ? "/trainee/profile/edit" : "/trainee/profile/photo"} variant="outline" fullWidth>
                {profile.avatarPath ? "أكمل ملفك" : "أضف صورتك"}
              </ButtonLink>
            )}
          </SectionCard>
        </aside>
      </div>
    </>
  );
}
