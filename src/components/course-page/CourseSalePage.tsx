import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Award, BadgeCheck, CalendarDays, ChevronDown, CircleCheck, CircleDot, CircleQuestionMark, Clock, Eye, FileText, Gauge,
  Layers, ListChecks, MapPin, MonitorPlay, Play, RefreshCw, ShieldCheck, Star, Tag, Users, Video,
} from "lucide-react";
import { PublicBar } from "@/components/course-page/PublicBar";
import { ShareButton } from "@/components/course-page/ShareButton";
import { WaitlistButton } from "@/components/course-page/WaitlistButton";
import { MODES } from "@/components/course/CourseCover";
import { Avatar } from "@/components/ui/Data";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { RatingStars } from "@/components/ui/Rating";
import type { CoursePageView } from "@/lib/data/course-page";
import { env } from "@/lib/env";
import {
  formatClock, formatDate, formatDuration, formatMonthYear, formatNumber, formatPercent, formatPrice, formatRating,
  formatSessionTime, pluralAr, toArabicDigits,
} from "@/lib/format";
import { LEVEL_LABELS } from "@/lib/labels";

/*
 * TRN-CRS-06 · صفحة بيع الدورة (398:18441, free 4159:2) — shared by the public page and the trainer preview
 * TRR-CRS-06 (398:18013), which swaps the bar actions, adds the «وضع المعاينة» strip and disables buying.
 */

export type SalePreview = { exitHref: string; editHref: string };

const ACTIVE_ENROLLMENT = ["pending_payment", "pending_provider", "confirmed", "in_progress", "completed"];

function Chip({ icon, children, tone = "brand" }: { icon: LucideIcon; children: React.ReactNode; tone?: "brand" | "info" }) {
  return (
    <span className={`inline-flex items-center gap-[7px] rounded-full px-3.5 py-[9px] type-subtitle ${tone === "info" ? "bg-state-info-bg text-state-info" : "bg-bg-brand-tint text-text-brand"}`}>
      <Glyph icon={icon} size={20} />
      {children}
    </span>
  );
}

function Stat({ icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Glyph icon={icon} size={20} className="text-text-brand" />
      <div className="flex flex-col gap-px">
        <span className="type-title text-text-primary">{value}</span>
        <span className="type-caption text-text-muted">{label}</span>
      </div>
    </div>
  );
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[30px]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 type-h2 text-text-primary">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function includes(course: CoursePageView): { icon: LucideIcon; text: string }[] {
  const lessons = course.outline.flatMap((m) => m.lessons);
  if (course.mode === "recorded") {
    const videos = lessons.filter((l) => l.kind === "video");
    const seconds = videos.reduce((s, l) => s + l.durationSeconds, 0);
    const files = lessons.filter((l) => l.kind === "file").length;
    const quizzes = lessons.filter((l) => l.kind === "quiz").length;
    return [
      { icon: Video, text: `${pluralAr(videos.length, ["درس مصوَّر واحد", "درسان مصوَّران", "دروس مصوَّرة", "درسًا مصوَّرًا"])} · ${formatDuration(seconds)}` },
      ...(files ? [{ icon: FileText, text: pluralAr(files, ["ملف قابل للتنزيل", "ملفان قابلان للتنزيل", "ملفات قابلة للتنزيل", "ملفًا قابلًا للتنزيل"]) }] : []),
      ...(quizzes ? [{ icon: ListChecks, text: pluralAr(quizzes, ["اختبار قصير", "اختباران قصيران", "اختبارات قصيرة", "اختبارًا قصيرًا"]) }] : []),
      { icon: CircleCheck, text: "وصول دائم بلا انتهاء" },
      { icon: Award, text: "شهادة إتمام قابلة للتحقق" },
      { icon: MonitorPlay, text: "يعمل على الجوال والحاسوب" },
    ];
  }
  return [
    { icon: CalendarDays, text: `${pluralAr(course.sessions.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])}${course.durationHours ? ` · ${formatNumber(course.durationHours)} ساعة` : ""}` },
    ...(course.startsAt ? [{ icon: Clock, text: `تبدأ ${formatDate(course.startsAt)}${course.endsAt ? ` وتنتهي ${formatDate(course.endsAt)}` : ""}` }] : []),
    course.mode === "in_person"
      ? { icon: MapPin, text: [course.venue, course.city].filter(Boolean).join(" · ") || "حضورية" }
      : { icon: Video, text: "جلسات مباشرة عبر المنصة" },
    ...(course.seatsLeft !== null ? [{ icon: Users, text: course.seatsLeft > 0 ? `متبقٍّ ${pluralAr(course.seatsLeft, ["مقعد واحد", "مقعدان", "مقاعد", "مقعدًا"])}` : "اكتملت المقاعد" }] : []),
    { icon: Award, text: course.organization ? `شهادة تصدر باسم ${course.organization.name}` : "شهادة إتمام قابلة للتحقق" },
  ];
}

function PrimaryAction({ course, preview }: { course: CoursePageView; preview?: SalePreview }) {
  if (preview) {
    return (
      <span aria-disabled="true" className="inline-flex h-14 w-full items-center justify-center rounded-12 bg-action-primary px-8 type-body-lg text-text-on-brand shadow-[0_6px_18px_0_rgba(91,60,196,0.28)]">
        سجّل في الدورة (معاينة)
      </span>
    );
  }
  const v = course.viewer;
  if (v.enrollmentId && v.enrollmentStatus && ACTIVE_ENROLLMENT.includes(v.enrollmentStatus)) {
    return v.enrollmentStatus === "pending_payment" ? (
      <ButtonLink href={`/checkout/${v.enrollmentId}/pay`} size="l" fullWidth>
        أكمل الدفع
      </ButtonLink>
    ) : (
      <ButtonLink href={`/trainee/trainings/${v.enrollmentId}`} size="l" fullWidth>
        أنت مسجّل — انتقل إلى الدورة
      </ButtonLink>
    );
  }
  const open = course.status === "open" || (course.mode === "recorded" && course.status === "in_progress");
  if (!open) {
    return (
      <Button size="l" fullWidth disabled>
        التسجيل مغلق حاليًا
      </Button>
    );
  }
  if (course.seatsLeft === 0) {
    if (!v.signedIn) {
      return (
        <ButtonLink href={`/login?next=/courses/${course.slug}`} size="l" fullWidth>
          سجّل الدخول للانضمام لقائمة الانتظار
        </ButtonLink>
      );
    }
    return v.waitlisted ? (
      <ButtonLink href="/trainee/waitlist" variant="secondary" size="l" fullWidth>
        أنت في قائمة الانتظار
      </ButtonLink>
    ) : (
      <WaitlistButton courseId={course.id} slug={course.slug} />
    );
  }
  const label = course.price === 0 ? "سجّل مجانًا الآن" : "سجّل في الدورة الآن";
  // BR-U3: visitors start the purchase without an account; the account is created right before payment.
  return (
    <ButtonLink href={v.signedIn ? `/checkout/${course.slug}` : `/register?next=${encodeURIComponent(`/checkout/${course.slug}`)}`} size="l" fullWidth>
      {label}
    </ButtonLink>
  );
}

export function CourseSalePage({ course, preview }: { course: CoursePageView; preview?: SalePreview }) {
  const lessons = course.outline.flatMap((m) => m.lessons);
  const totalSeconds = lessons.reduce((s, l) => s + l.durationSeconds, 0);
  const totalRatings = course.breakdown.reduce((s, b) => s + b.count, 0);
  const mode = MODES[course.mode];
  const url = `${env.siteUrl}/courses/${course.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.summary ?? undefined,
    inLanguage: "ar",
    provider: { "@type": "Organization", name: course.organization?.name ?? course.trainer.name },
    offers: { "@type": "Offer", price: course.price, priceCurrency: course.currency, availability: "https://schema.org/InStock" },
    ...(course.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: course.rating, ratingCount: course.ratingCount } } : {}),
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page">
      {!preview && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <PublicBar
        subtitle={course.mode === "recorded" ? "دورة مسجَّلة" : mode.label === "حضورية" ? "دورة حضورية" : "دورة مباشرة عن بُعد"}
        actions={
          preview ? (
            <div className="flex items-center gap-3 sm:gap-5">
              <ButtonLink href={preview.exitHref}>اخرج من المعاينة</ButtonLink>
              <span className="hidden sm:contents">
                <ButtonLink href={preview.editHref} variant="outline">
                  حرّر الدورة
                </ButtonLink>
              </span>
            </div>
          ) : undefined
        }
      />
      {preview && (
        <p className="flex items-center gap-4 bg-state-info-bg px-4 py-4 type-body-lg text-state-info sm:px-12">
          <Glyph icon={Eye} size={20} />
          <span className="flex-1">وضع المعاينة — هذا بالضبط ما يراه المتدرب قبل الشراء. راجعه بعينه قبل النشر.</span>
        </p>
      )}
      <main id="main" className="flex flex-col">
        <div className="bg-bg-surface px-4 py-8 sm:px-8 lg:px-14 lg:py-11">
          <div className="mx-auto flex max-w-[1328px] flex-col-reverse gap-9 lg:flex-row lg:items-start">
            {/* Purchase card (left in RTL). Sticky on desktop so it stays next to the long content. */}
            <aside aria-label="التسجيل في الدورة" className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[400px]">
              <div className="flex flex-col overflow-hidden rounded-22 border border-border-default bg-bg-card shadow-float">
                <div className="relative flex h-[225px] items-center justify-center overflow-hidden bg-[linear-gradient(143deg,#5b3cc4_0%,#268ca6_71%)]">
                  {course.cover && <Image src={course.cover} alt="" fill priority sizes="400px" className="object-cover opacity-90" />}
                  {course.previewLessonId && preview ? (
                    <span className="relative flex items-center gap-2.5 rounded-full bg-bg-surface px-5 py-3.5 type-subtitle text-text-brand shadow-card">
                      <Glyph icon={Play} size={20} />
                      شاهد درس المعاينة مجانًا
                    </span>
                  ) : course.previewLessonId && (
                    <Link
                      href={`/courses/${course.slug}/preview`}
                      className="relative flex items-center gap-2.5 rounded-full bg-bg-surface px-5 py-3.5 type-subtitle text-text-brand shadow-card focus-ring"
                    >
                      <Glyph icon={Play} size={20} />
                      شاهد درس المعاينة مجانًا
                    </Link>
                  )}
                </div>
                <div className="flex flex-col gap-[18px] px-6 pt-[26px] pb-[30px] sm:px-7">
                  <div className="flex flex-col gap-1">
                    <p className="text-[44px] leading-[1.15] font-bold text-text-primary">{course.price === 0 ? "مجانية" : formatPrice(course.price, course.currency)}</p>
                    <p className="type-body text-text-muted">
                      {course.mode === "recorded"
                        ? "دفعة واحدة · وصول دائم بلا انتهاء"
                        : `دفعة واحدة · ${pluralAr(course.sessions.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])}`}
                    </p>
                    {course.price > 0 && (
                      <p className="type-caption text-text-muted">لا يشمل ضريبة القيمة المضافة ({toArabicDigits(course.vatRate)}٪) — تظهر في ملخص الطلب.</p>
                    )}
                  </div>
                  <PrimaryAction course={course} preview={preview} />
                  {course.price > 0 && (
                    <p className="flex items-start gap-2.5 rounded-12 bg-state-success-bg px-3.5 pt-3 pb-[13px] type-body text-state-success">
                      <Glyph icon={ShieldCheck} size={20} className="mt-1" />
                      <span className="flex-1">استرداد كامل خلال ١٤ يومًا إن لم تناسبك الدورة.</span>
                    </p>
                  )}
                  {course.requiresProviderApproval && (
                    <p className="rounded-12 bg-state-info-bg px-3.5 py-3 type-small text-state-info">
                      يُؤكَّد التسجيل بعد موافقة {course.organization?.name ?? "الجهة التدريبية"} — نُبلغك فور صدورها.
                    </p>
                  )}
                  <hr className="border-border-divider" />
                  <h2 className="type-subtitle text-text-primary">تشمل الدورة</h2>
                  <ul className="flex flex-col gap-[18px]">
                    {includes(course).map((i) => (
                      <li key={i.text} className="flex items-center gap-2.5">
                        <Glyph icon={i.icon} size={20} className="text-text-brand" />
                        <span className="flex-1 type-body text-text-primary">{i.text}</span>
                      </li>
                    ))}
                  </ul>
                  <ShareButton title={course.title} url={url} />
                </div>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-[7px] rounded-full px-3 py-1.5 type-subtitle ${mode.className}`}>
                  <Glyph icon={mode.icon} size={16} />
                  {mode.label}
                </span>
                {course.category && <Chip icon={Tag}>{course.category}</Chip>}
                <Chip icon={Gauge} tone="info">
                  مستوى {LEVEL_LABELS[course.level]}
                </Chip>
              </div>
              <h1 className="text-[34px] leading-[1.15] font-bold text-text-primary md:text-[52px]">{course.title}</h1>
              {course.summary && <p className="text-[20px] leading-[1.4] font-medium text-text-secondary">{course.summary}</p>}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Stat icon={Star} value={course.ratingCount > 0 ? formatRating(course.rating) : "—"} label={course.ratingCount > 0 ? `من ${pluralAr(course.ratingCount, ["تقييم واحد", "تقييمين", "تقييمات", "تقييمًا"])}` : "لا تقييمات بعد"} />
                <Stat icon={Users} value={formatNumber(course.learners)} label="متدربًا" />
                {course.mode === "recorded" ? (
                  <Stat icon={Clock} value={formatDuration(totalSeconds)} label="مدة المشاهدة" />
                ) : course.startsAt ? (
                  <Stat icon={CalendarDays} value={formatDate(course.startsAt)} label="تاريخ البدء" />
                ) : null}
                <Stat icon={RefreshCw} value="آخر تحديث" label={formatMonthYear(course.updatedAt)} />
              </div>
              <div className="flex flex-wrap items-center gap-3.5 rounded-16 border border-border-default bg-bg-card px-5 py-[18px]">
                <Avatar name={course.trainer.name} src={course.trainer.avatarUrl} size="l" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="type-title text-text-primary">{course.trainer.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <span className="inline-flex items-center gap-[7px] rounded-full bg-state-success-bg px-[11px] py-1.5 type-caption text-state-success">
                      <Glyph icon={BadgeCheck} size={16} />
                      {course.trainer.headline ?? "مدرب"}
                    </span>
                    <span className="type-body text-text-muted">
                      {course.trainer.ratings > 0 ? `${formatRating(course.trainer.rating)} من ${pluralAr(course.trainer.ratings, ["تقييم", "تقييمين", "تقييمات", "تقييمًا"])} · ` : ""}
                      {formatNumber(course.trainer.learners)} متدربًا · {pluralAr(course.trainer.courses, ["دورة واحدة", "دورتان", "دورات", "دورة"])}
                    </span>
                  </div>
                  {course.organization && <p className="type-caption text-text-muted">تُقدَّم عبر {course.organization.name}</p>}
                </div>
                <ButtonLink href={`/u/${course.trainer.id}`} variant="outline">
                  ملف المدرب
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pt-8 pb-16 sm:px-8 lg:px-14 lg:pt-11">
          <div className="mx-auto flex max-w-[1328px] gap-9">
            <div aria-hidden className="hidden w-[400px] shrink-0 lg:block" />
            <div className="flex min-w-0 flex-1 flex-col gap-7">
              {course.objectives.length > 0 && (
                <Section title="ماذا ستتعلّم؟">
                  <ul className="grid gap-4 md:grid-cols-2">
                    {course.objectives.map((o) => (
                      <li key={o} className="flex items-start gap-3 rounded-16 bg-state-success-bg px-[18px] pt-4 pb-[18px]">
                        <Glyph icon={CircleCheck} size={20} className="mt-1.5 text-state-success" />
                        <span className="flex-1 type-body-lg text-text-primary">{o}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {course.outline.length > 0 ? (
                <Section
                  title="محتوى الدورة"
                  aside={
                    <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-brand-tint px-3.5 py-[9px] type-subtitle text-text-brand">
                      <Glyph icon={Layers} size={20} />
                      {pluralAr(course.outline.length, ["وحدة واحدة", "وحدتان", "وحدات", "وحدة"])} · {pluralAr(lessons.length, ["درس واحد", "درسان", "دروس", "درسًا"])}
                      {totalSeconds > 0 && ` · ${formatDuration(totalSeconds)}`}
                    </span>
                  }
                >
                  <div className="flex flex-col gap-3">
                    {course.outline.map((m, i) => {
                      const seconds = m.lessons.reduce((s, l) => s + l.durationSeconds, 0);
                      return (
                        <details key={m.id} open={i === 0} className="group rounded-16 bg-bg-page px-[22px] pt-5 pb-[22px]">
                          <summary className="flex cursor-pointer list-none items-center gap-3.5 rounded-12 focus-ring [&::-webkit-details-marker]:hidden">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-brand-tint text-[20px] font-medium text-text-brand">{toArabicDigits(m.position)}</span>
                            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                              <span className="type-title text-text-primary">{m.title}</span>
                              <span className="type-body text-text-muted">
                                {pluralAr(m.lessons.length, ["درس واحد", "درسان", "دروس", "درسًا"])}
                                {seconds > 0 && ` · ${formatDuration(seconds)}`}
                              </span>
                            </span>
                            <Glyph icon={ChevronDown} size={20} className="text-text-secondary transition-transform group-open:rotate-180" />
                          </summary>
                          <ul className="mt-3 flex flex-col gap-3">
                            {m.lessons.map((l) => (
                              <li key={l.id} className={`flex items-center gap-3 rounded-12 px-4 pt-[13px] pb-3.5 ${l.isPreview ? "bg-state-success-bg" : "bg-bg-surface"}`}>
                                <span className="flex-1 type-body text-text-primary">{l.title}</span>
                                {l.isPreview && (
                                  <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-surface px-[11px] py-1.5 type-caption text-state-success">
                                    <Glyph icon={Eye} size={16} />
                                    معاينة مجانية
                                  </span>
                                )}
                                <Glyph icon={l.kind === "quiz" ? ListChecks : l.kind === "file" || l.kind === "text" ? FileText : Play} size={20} className="text-text-brand" />
                                <span className="w-12 shrink-0 text-end type-caption text-text-muted">
                                  {l.kind === "file" ? "PDF" : l.kind === "quiz" ? "اختبار" : l.durationSeconds > 0 ? formatClock(l.durationSeconds) : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      );
                    })}
                  </div>
                </Section>
              ) : course.sessions.length > 0 ? (
                <Section title="جدول الجلسات">
                  <ol className="flex flex-col gap-3">
                    {course.sessions.map((s, i) => (
                      <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-brand-tint type-subtitle text-text-brand">{toArabicDigits(i + 1)}</span>
                        <span className="flex-1 type-body text-text-primary">{s.title}</span>
                        <span className="type-small text-text-secondary">{formatSessionTime(s.startsAt)}</span>
                        {s.location && <span className="w-full type-caption text-text-muted sm:w-auto">{s.location}</span>}
                      </li>
                    ))}
                  </ol>
                </Section>
              ) : null}

              {(course.audience.length > 0 || course.requirements.length > 0) && (
                <Section title="لمن هذه الدورة؟">
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { title: "الجمهور المستهدف", icon: Users, items: course.audience },
                      { title: "المتطلبات المسبقة", icon: CircleCheck, items: course.requirements },
                    ].map((b) => (
                      <div key={b.title} className="flex flex-col gap-3 rounded-16 bg-bg-page px-5 pt-5 pb-[22px]">
                        <p className="flex items-center gap-2.5 type-title text-text-primary">
                          <Glyph icon={b.icon} size={20} className="text-text-brand" />
                          {b.title}
                        </p>
                        <ul className="flex flex-col gap-3">
                          {b.items.map((it) => (
                            <li key={it} className="flex items-start gap-2.5 type-body text-text-secondary">
                              <Glyph icon={CircleDot} size={16} className="mt-2 text-text-muted" />
                              {it}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              <Section title="تقييمات المتدربين">
                {totalRatings === 0 ? (
                  <p className="rounded-16 bg-bg-page px-5 py-6 text-center type-body text-text-secondary">
                    لا تقييمات بعد — يقيّم المتدربون الدورة بعد بدء حضورها.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center">
                      <div className="flex flex-col items-center gap-2 rounded-16 bg-state-warning-bg px-[30px] pt-[22px] pb-6">
                        <p className="text-[52px] leading-[1.15] font-bold text-state-warning">{formatRating(course.rating)}</p>
                        <RatingStars value={course.rating} size="m" />
                        <p className="type-caption text-text-muted">{pluralAr(totalRatings, ["تقييم واحد", "تقييمان", "تقييمات", "تقييمًا"])}</p>
                      </div>
                      <ul className="flex flex-1 flex-col gap-2">
                        {course.breakdown.map((b) => {
                          const pct = totalRatings ? (b.count / totalRatings) * 100 : 0;
                          return (
                            <li key={b.stars} className="flex items-center gap-3">
                              <span className="flex w-8 items-center gap-[5px] type-body text-text-muted">
                                {toArabicDigits(b.stars)}
                                <Glyph icon={Star} size={16} className="fill-state-rating text-state-rating" />
                              </span>
                              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-border-default" aria-hidden>
                                <span className="block h-full rounded-full bg-state-warning" style={{ width: `${pct}%` }} />
                              </span>
                              <span className="w-10 type-caption text-text-muted">{formatPercent(pct)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    {course.reviews.map((r) => (
                      <article key={r.id} className="flex flex-col gap-3.5 rounded-16 border border-border-default bg-bg-card p-[18px] drop-shadow-milestone">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.name} />
                          <p className="flex-1 type-body text-text-primary">{r.name}</p>
                          <RatingStars value={r.score} />
                        </div>
                        <p className="type-small text-text-secondary">{r.comment}</p>
                      </article>
                    ))}
                  </>
                )}
              </Section>

              {course.faq.length > 0 && (
                <Section title="أسئلة شائعة">
                  <div className="flex flex-col gap-3">
                    {course.faq.map((f) => (
                      <div key={f.q} className="flex flex-col gap-2 rounded-16 bg-bg-page px-5 pt-[18px] pb-5">
                        <p className="flex items-center gap-2.5 type-title text-text-primary">
                          <Glyph icon={CircleQuestionMark} size={20} className="text-text-brand" />
                          {f.q}
                        </p>
                        <p className="type-body-lg text-text-secondary">{f.a}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {course.viewer.signedIn && !preview && (
                <p className="flex flex-wrap items-center justify-center gap-4 type-small text-text-secondary">
                  <Link href={`/trainee/inquiry?course=${course.slug}`} className="rounded-8 text-text-brand hover:underline focus-ring">
                    لديك سؤال قبل التسجيل؟
                  </Link>
                  <span aria-hidden>·</span>
                  <Link href={`/trainee/report?type=course&id=${course.id}`} className="rounded-8 text-text-muted hover:underline focus-ring">
                    الإبلاغ عن مخالفة
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
