import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck, BadgePlus, BookOpen, CalendarDays, CircleCheckBig, CircleUser, Clock, Compass, Contact, Download, FileText, Info, MapPin, OctagonX, Shield, Star, Users,
} from "lucide-react";
import Link from "next/link";
import { CourseCard } from "@/components/course/CourseCard";
import { ReviewCard } from "@/components/ratings/ReviewCard";
import { CopyButton } from "@/components/profile/CopyButton";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { RatingStars } from "@/components/ui/Rating";
import { PreviewButton } from "@/components/trainer/PreviewButton";
import { avatarUrl } from "@/lib/storage";
import { trainerMediaUrl } from "@/lib/trainer-media";
import { env } from "@/lib/env";
import { formatDate, formatDayMonth, formatPercent, formatRating, pluralAr, toArabicDigits } from "@/lib/format";
import { EXPERIENCE_BANDS, fieldTitle } from "@/lib/trainer";
import type { PublicProfileData } from "@/lib/data/trainer-profile";

const PREVIEW = "هذه معاينة لملفك كما تراه الجهات — يعمل هذا الزر لدى الجهة عند زيارة ملفك.";

/** Section card of PRF-01 (289:7471): surface, 1px border, r22, px32 pt30 pb32, gap20, header with a 48px tone tile. */
function Section({ id, title, subtitle, icon, tone, children, aside, highlight }: { id: string; title: string; subtitle?: string; icon: LucideIcon; tone: string; children: ReactNode; aside?: ReactNode; highlight?: boolean }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`flex w-full flex-col gap-5 rounded-22 bg-bg-card px-5 pt-[30px] pb-8 shadow-card sm:px-8 ${highlight ? "border-2 border-state-success" : "border border-border-default"}`}
    >
      <div className="flex w-full items-center gap-3.5">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 ${tone}`}>
          <Glyph icon={icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <h2 id={`${id}-title`} className="type-h2 text-text-primary">
            {title}
          </h2>
          {subtitle && <p className="type-body text-text-muted">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

const yearsOf = (start: string, end: string | null) => {
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (365.25 * 86_400_000)));
};
const yearAr = (d: string) => toArabicDigits(new Date(d).getUTCFullYear());

function Bar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div className="h-3 w-full max-w-[400px] overflow-hidden rounded-full bg-border-default" aria-hidden>
      <div className="h-full rounded-full bg-state-rating" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** TRR-PRF-01 · الملف المهني — the public view as organizations see it (289:7405). */
export function PublicProfileView({ data, userId }: { data: PublicProfileData; userId: string }) {
  const { o, visibility, courses, publishedPrograms, totalTrainees, reviews, days, portfolio } = data;
  const s = o.stats;
  const verified = o.identityStatus === "verified";
  const band = EXPERIENCE_BANDS.find((b) => b.value === o.profile?.experience_band);
  const show = (k: keyof typeof visibility) => visibility[k] !== "private";
  const totalYears = o.experiences.reduce((sum, e) => sum + yearsOf(e.startDate, e.isCurrent ? null : e.endDate), 0);
  const materials = portfolio.filter((p) => p.kind === "material" && p.imagePaths.length > 0);
  const free = days.filter((d) => !d.busy);
  const next = free.filter((d) => d.day > days[0]?.day);
  const monthDays = days.slice(0, 30);
  const busyPct = monthDays.length ? (monthDays.filter((d) => d.busy).length / monthDays.length) * 100 : 0;
  const week = days.slice(0, 7);
  const weekday = (d: string) => new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { weekday: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const dayNum = (d: string) => toArabicDigits(Number(d.slice(8, 10)));
  const dayLabel = (d: string) => `${weekday(d)} ${formatDayMonth(`${d}T12:00:00+03:00`)}`;

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page">
      <header className="flex w-full items-center gap-5 border-b border-border-divider bg-bg-surface px-4 py-5 sm:px-12">
        <Link href="/trainer" className="flex items-center gap-3 rounded-12 focus-ring">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-action-primary text-text-on-brand">
            <Glyph icon={CircleUser} size={20} />
          </span>
          <span className="flex flex-col">
            <span className="type-subtitle text-text-primary">بوابة التدريب</span>
            <span className="type-caption text-text-muted">ملف مدرب معتمد</span>
          </span>
        </Link>
        <span className="flex-1" />
        <CopyButton value={`${env.siteUrl}/u/${userId}`} share className="inline-flex h-12 w-[120px] items-center justify-center rounded-12 border-[1.5px] border-border-default type-button text-text-primary hover:bg-bg-brand-tint focus-ring">
          شارك الملف
        </CopyButton>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-[1100px] flex-col gap-7 px-4 pt-9 pb-16 sm:px-6">
        {/* HERO (289:7423) */}
        <section className="overflow-hidden rounded-22 border border-border-default bg-bg-card shadow-float">
          <div className="h-[140px] w-full bg-gradient-to-r from-action-primary to-[#8b67f6]" aria-hidden />
          <div className="flex flex-col gap-3.5 px-5 pt-6 pb-8 sm:px-9">
            <div className="flex items-center gap-4">
              <Avatar name={o.account.fullName} src={avatarUrl(o.account.avatarPath)} size="l" />
              <h1 className="min-w-0 flex-1 text-[34px] leading-[1.15] font-bold text-text-primary sm:text-[52px]">{o.account.fullName}</h1>
            </div>
            {verified && (
              <div className="flex items-center gap-3 rounded-16 border-2 border-state-success bg-state-success-bg px-[18px] py-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-surface text-state-success">
                  <Glyph icon={BadgeCheck} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="type-h3 text-state-success">⭐ مدرب معتمد من بوابة التدريب</p>
                  <p className="type-body text-text-secondary">
                    معتمد في: {(o.profile?.specialties ?? []).map(fieldTitle).join(" · ") || "—"}
                    {o.identityVerifiedAt ? `  ·  منذ ${formatDate(o.identityVerifiedAt)}` : ""}
                  </p>
                </div>
              </div>
            )}
            <ul className="flex flex-wrap gap-2.5" aria-label="نبذة سريعة">
              {show("trainees") && (
                <li className="inline-flex items-center gap-[7px] rounded-full bg-bg-brand-tint px-3.5 py-[9px] type-subtitle text-text-brand">
                  <Glyph icon={Users} size={20} />
                  {pluralAr(totalTrainees, ["متدرب واحد", "متدربان", "متدربين", "متدربًا"])}
                </li>
              )}
              <li className="inline-flex items-center gap-[7px] rounded-full bg-state-warning-bg px-3.5 py-[9px] type-subtitle text-state-warning">
                <Glyph icon={Star} size={20} />
                {s.ratingTrainer === null ? "لا تقييمات بعد" : `${formatRating(s.ratingTrainer)} من ${pluralAr(s.ratingCount, ["تقييم واحد", "تقييمين", "تقييمات", "تقييمًا"])}`}
              </li>
              {o.account.city && (
                <li className="inline-flex items-center gap-[7px] rounded-full bg-bg-page px-3.5 py-[9px] type-subtitle text-text-secondary">
                  <Glyph icon={MapPin} size={20} />
                  {o.account.city}
                </li>
              )}
              {band && (
                <li className="inline-flex items-center gap-[7px] rounded-full bg-bg-page px-3.5 py-[9px] type-subtitle text-text-secondary">
                  <Glyph icon={Clock} size={20} />
                  {band.title} تدريب
                </li>
              )}
            </ul>
            <div className="flex flex-col gap-3.5 pt-1 sm:flex-row">
              <PreviewButton message={PREVIEW} className="w-full sm:w-[280px]">
                اطلب عرضًا تدريبيًا
              </PreviewButton>
              <PreviewButton message={PREVIEW} variant="outline" className="w-full sm:w-[200px]">
                راسل المدرب
              </PreviewButton>
            </div>
          </div>
        </section>

        {show("profile") && o.account.bio && (
          <Section id="bio" title="نبذة عن المدرب" subtitle="بقلمه" icon={Contact} tone="bg-bg-brand-tint text-text-brand">
            <p className="type-body-lg whitespace-pre-line text-text-secondary">{o.account.bio}</p>
          </Section>
        )}

        {show("credentials") && (verified || o.qualifications.length > 0) && (
          <Section
            id="credentials"
            title="الاعتمادات والمؤهلات"
            subtitle={pluralAr(o.qualifications.length + (verified ? 1 : 0), ["مُدخَل واحد", "مُدخَلان", "مُدخَلات", "مُدخَلًا"])}
            icon={BadgePlus}
            tone="bg-state-warning-bg text-state-warning"
          >
            <p className="flex items-start gap-2.5 rounded-12 bg-state-info-bg px-4 py-[13px] type-body text-state-info">
              <Glyph icon={Info} size={20} className="mt-1" />
              <span className="flex-1">ما تراه بعلامة ✓ خضراء تحقّقت منه المنصة. الباقي أدخله المدرب بنفسه — يمكنك طلب المستند منه قبل التعاقد.</span>
            </p>
            <ul className="grid gap-4 md:grid-cols-2">
              {verified && (
                <li className="flex items-center gap-3 rounded-16 border-2 border-state-success bg-state-success-bg px-5 pt-5 pb-[22px]">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-success">
                    <Glyph icon={BadgeCheck} size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="type-title text-text-primary">اعتماد بوابة التدريب</span>
                    <span className="type-body text-text-muted">المنصة{o.identityVerifiedAt ? ` · ${formatDate(o.identityVerifiedAt)}` : ""}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-[7px] rounded-full bg-bg-surface px-[11px] py-1.5 type-small text-state-success">
                    <Glyph icon={CircleCheckBig} size={16} />
                    متحقَّق منه
                  </span>
                </li>
              )}
              {o.qualifications.map((q) => (
                <li key={q.id} className={`flex items-center gap-3 rounded-16 px-5 pt-5 pb-[22px] ${q.verified ? "border-2 border-state-success bg-state-success-bg" : "bg-bg-page"}`}>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
                    <Glyph icon={q.kind === "academic" ? CircleUser : BadgePlus} size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="type-title text-text-primary">{q.title}</span>
                    <span className="type-body text-text-muted">
                      {q.issuer}
                      {q.year ? ` · ${toArabicDigits(q.year)}` : ""}
                    </span>
                  </span>
                  <span className={`inline-flex shrink-0 items-center gap-[7px] rounded-full bg-bg-surface px-[11px] py-1.5 type-small ${q.verified ? "text-state-success" : "text-state-warning"}`}>
                    <Glyph icon={q.verified ? CircleCheckBig : Info} size={16} />
                    {q.verified ? "متحقَّق منه" : q.hasFile ? "مُدخَل من صاحبه · مستند مرفق" : "مُدخَل من صاحبه"}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {show("experience") && (o.experiences.length > 0 || o.profile?.cv_path) && (
          <Section
            id="experience"
            title="الخبرات والأعمال"
            subtitle={totalYears > 0 ? `${pluralAr(totalYears, ["سنة واحدة", "سنتان", "سنوات", "سنة"])} خبرة عملية` : undefined}
            icon={Compass}
            tone="bg-state-info-bg text-state-info"
            aside={o.profile?.cv_path ? <a href="#cv" className="shrink-0 rounded-8 type-subtitle text-text-brand hover:underline focus-ring">السيرة الذاتية ↓</a> : undefined}
          >
            <ul className="flex flex-col gap-5">
              {o.experiences.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-4 rounded-12 bg-bg-page px-[18px] py-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
                    <Glyph icon={Compass} size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="type-title text-text-primary">{e.title}</span>
                    <span className="type-body text-text-secondary">{e.organization}</span>
                  </span>
                  <span className="type-body text-text-muted">
                    {yearAr(e.startDate)} – {e.isCurrent || !e.endDate ? "الآن" : yearAr(e.endDate)} · {pluralAr(Math.max(1, yearsOf(e.startDate, e.isCurrent ? null : e.endDate)), ["سنة واحدة", "سنتان", "سنوات", "سنة"])}
                  </span>
                </li>
              ))}
            </ul>
            {(o.profile?.cv_path || materials.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                {o.profile?.cv_path && (
                  <a id="cv" href={trainerMediaUrl(o.profile.cv_path) ?? "#"} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5 hover:bg-bg-brand-tint focus-ring">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-state-error-bg text-state-error">
                      <Glyph icon={FileText} size={20} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="type-subtitle text-text-primary">السيرة الذاتية</span>
                      <span className="type-caption text-text-muted">PDF{o.profile.cv_size ? ` · ${formatRating(o.profile.cv_size / 1_048_576)} م.ب` : ""}</span>
                    </span>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
                      <Glyph icon={Download} size={20} />
                    </span>
                  </a>
                )}
                {materials.slice(0, 1).map((m) => (
                  <a key={m.id} href={trainerMediaUrl(m.imagePaths[0]) ?? "#"} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5 hover:bg-bg-brand-tint focus-ring">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-state-error-bg text-state-error">
                      <Glyph icon={FileText} size={20} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="type-subtitle text-text-primary">{m.title}</span>
                      <span className="type-caption text-text-muted">{[m.fileFormat, m.pageCount ? `${toArabicDigits(m.pageCount)} صفحة` : null].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
                      <Glyph icon={Download} size={20} />
                    </span>
                  </a>
                ))}
              </div>
            )}
          </Section>
        )}

        {courses.length > 0 && (
          <Section
            id="courses"
            title="الدورات والبرامج"
            subtitle={publishedPrograms ? pluralAr(publishedPrograms, ["برنامج منشور واحد", "برنامجان منشوران", "برامج منشورة", "برنامجًا منشورًا"]) : undefined}
            icon={BookOpen}
            tone="bg-bg-brand-tint text-text-brand"
            aside={<Link href="/trainer/courses" className="shrink-0 rounded-8 type-subtitle text-text-brand hover:underline focus-ring">اعرض الكل</Link>}
          >
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <li key={c.id} className="flex">
                  <CourseCard course={c} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section id="reviews" title="التقييمات والسمعة" subtitle="من متدربين أكملوا دوراته فعلًا" icon={Star} tone="bg-state-warning-bg text-state-warning">
          {s.ratingCount === 0 ? (
            <p className="rounded-12 bg-bg-page px-4 py-6 text-center type-body text-text-muted">لا تقييمات بعد — تظهر هنا بعد أن يكمل المتدربون دوراته.</p>
          ) : (
            <>
              <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center">
                <div className="flex shrink-0 flex-col items-center gap-2 rounded-16 bg-state-warning-bg/20 px-8 py-6">
                  <p className="text-[64px] leading-[1.15] font-bold text-state-rating">{formatRating(s.ratingTrainer ?? 0)}</p>
                  <RatingStars value={s.ratingTrainer ?? 0} size="m" />
                  <p className="type-body text-text-muted">{pluralAr(s.ratingCount, ["تقييم واحد", "تقييمان", "تقييمات", "تقييمًا"])}</p>
                </div>
                <dl className="flex min-w-0 flex-1 flex-col gap-3">
                  {[
                    { label: "جودة المحتوى", v: s.ratingContent },
                    { label: "أداء المدرب", v: s.ratingTrainer },
                    { label: "التنظيم والالتزام بالوقت", v: s.ratingOrganization },
                  ]
                    .filter((a) => a.v !== null)
                    .map((a) => (
                      <div key={a.label} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                          <dt className="min-w-0 flex-1 type-body-lg text-text-secondary">{a.label}</dt>
                          <dd className="type-title text-state-warning">{formatRating(a.v ?? 0)}</dd>
                        </div>
                        <Bar value={a.v ?? 0} />
                      </div>
                    ))}
                </dl>
              </div>
              {reviews.map((r) => (
                <ReviewCard key={r.rating.id} rating={r.rating} authorName={r.authorName} />
              ))}
            </>
          )}
        </Section>

        {show("availability") && days.length > 0 && (
          <Section id="availability" title="متى يكون المدرب متاحًا؟" subtitle="محدَّث تلقائيًا من تقويمه — لا يحتاج تأكيدًا منه" icon={CalendarDays} tone="bg-state-success-bg text-state-success" highlight>
            {next.length > 0 && (
              <div className="flex flex-col gap-4 rounded-16 bg-state-success-bg px-5 py-[18px] sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="type-h3 text-state-success">أقرب موعد متاح: {dayLabel(next[0].day)}</p>
                  <p className="type-body text-text-secondary">
                    {next.length > 1 ? `ثم ${next.slice(1, 4).map((d) => dayNum(d.day)).join(" و")} ${new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { month: "long", timeZone: "UTC" }).format(new Date(`${next[1].day}T00:00:00Z`))} · ` : ""}
                    إشغاله هذا الشهر {formatPercent(busyPct)}
                  </p>
                </div>
                <PreviewButton message={PREVIEW} className="w-full font-bold sm:w-auto">
                  احجز هذا الموعد
                </PreviewButton>
              </div>
            )}
            <ul className="grid grid-cols-4 gap-2.5 sm:grid-cols-7">
              {week.map((d) => (
                <li key={d.day} className={`flex flex-col items-center gap-2 rounded-12 py-4 ${d.busy ? "bg-bg-disabled" : "bg-state-success-bg"}`}>
                  <span className="type-body text-text-secondary">{weekday(d.day)}</span>
                  <span className={`type-h3 ${d.busy ? "text-text-disabled" : "text-state-success"}`}>{dayNum(d.day)}</span>
                  <span className={`inline-flex items-center gap-[5px] type-caption ${d.busy ? "text-text-disabled" : "text-state-success"}`}>
                    <Glyph icon={d.busy ? OctagonX : CircleCheckBig} size={16} />
                    {d.busy ? "غير متاح" : "متاح"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="flex items-start gap-2.5 rounded-12 bg-bg-page px-4 py-[13px] type-body text-text-secondary">
              <Glyph icon={Shield} size={20} className="mt-1" />
              <span className="flex-1">«غير متاح» قد يعني دورة قائمة أو ارتباطًا شخصيًا — لا نكشف السبب حفاظًا على خصوصية المدرب.</span>
            </p>
          </Section>
        )}

        <section className="flex flex-col gap-6 rounded-22 bg-bg-brand-tint px-5 pt-[30px] pb-8 sm:flex-row sm:items-center sm:px-8">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="type-h2 text-text-primary">هل يناسبك هذا المدرب؟</h2>
            <p className="type-body-lg text-text-secondary">أرسل طلب عرض تدريبي وحدّد احتياجك والتواريخ — يصلك رده خلال ٤٨ ساعة عمل. الطلب مجاني ولا يُلزمك بشيء.</p>
          </div>
          <PreviewButton message={PREVIEW} className="w-full sm:w-[300px]">
            اطلب عرضًا تدريبيًا
          </PreviewButton>
        </section>
      </main>
    </div>
  );
}
