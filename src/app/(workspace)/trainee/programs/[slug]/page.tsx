import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CircleCheck,
  Clock,
  Gauge,
  Info,
  Languages,
  ListChecks,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { Avatar, Badge, Card } from "@/components/ui/Data";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { RatingStars } from "@/components/ui/Rating";
import { CourseCover } from "@/components/course/CourseCover";
import { FavoriteButton, InquiryButton, ShareButton } from "@/components/programs/ProgramActions";
import { requireTrainee } from "@/lib/auth";
import { getProgram, getProgramTitle } from "@/lib/data/programs";
import { LEVEL_LABELS } from "@/lib/labels";
import { formatDayMonth, formatNumber, formatPrice, formatRating, formatSessionTime, pluralAr, toArabicDigits } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/trainee/programs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const title = await getProgramTitle(slug);
  return { title: title ?? "البرنامج غير موجود", description: "تفاصيل البرنامج" };
}

function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="flex w-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex-1 type-h3 text-text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Row({ icon, children, tone = "text-text-brand" }: { icon: typeof Info; children: ReactNode; tone?: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <Glyph icon={icon} size={20} className={`mt-1 ${tone}`} />
      <span className="min-w-0 flex-1 type-body text-text-secondary">{children}</span>
    </li>
  );
}

/**
 * TRN-DSC-02 · صفحة البرنامج (مسجَّل) — Figma 108:1968; content blocks also cover 450:25274 (TRN-PRG-06 · كما يراها المتدرب):
 * program + current program_versions snapshot (objectives / audience / requirements / skills) + trainer/organization + its courses.
 */
export default async function ProgramPage({ params }: PageProps<"/trainee/programs/[slug]">) {
  const { slug } = await params;
  const user = await requireTrainee(`/trainee/programs/${slug}`);
  const program = await getProgram(slug, user.id);
  if (!program) notFound();

  const coursesHref = `/trainee/programs/${program.slug}/courses`;
  const s = program.snapshot;
  const rating = program.rating;

  return (
    <>
      <TopBar title="تفاصيل البرنامج" subtitle={program.title} />
      <PageBody className="!gap-7">
        <Breadcrumb
          items={[
            { label: "الاكتشاف", href: "/trainee/discover" },
            ...(program.category ? [{ label: program.category.name, href: `/trainee/discover?cat=${program.category.slug}` }] : []),
            { label: program.title },
          ]}
        />

        {/* HERO (108:1968 · r22, float shadow, 280px cover, body px 32 pt 26 pb 28 gap 18) */}
        <section aria-labelledby="program-title" className="flex w-full flex-col overflow-hidden rounded-22 border border-border-default bg-bg-card shadow-float">
          <CourseCover cover={program.cover} mode={program.mode} height={280} priority />
          <div className="flex flex-col gap-[18px] px-5 pt-[26px] pb-7 sm:px-8">
            <div className="flex flex-wrap items-center gap-2.5">
              {program.mostEnrolled && (
                <Badge tone="accent" solid className="px-2.5" icon={<Glyph icon={TrendingUp} size={16} />}>
                  الأكثر تسجيلًا
                </Badge>
              )}
              {program.verifiedProvider && (
                <Badge tone="success" className="px-2.5" icon={<Glyph icon={BadgeCheck} size={16} />}>
                  برنامج معتمد
                </Badge>
              )}
              {program.category && (
                <Badge tone="brand" className="px-2.5">
                  {program.category.name}
                </Badge>
              )}
            </div>
            <h1 id="program-title" className="text-[32px] leading-[1.15] font-bold text-text-primary sm:type-display">
              {program.title}
            </h1>
            {program.summary && <p className="type-body-lg text-text-secondary">{program.summary}</p>}
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 text-text-secondary">
              <li className="flex items-center gap-2">
                {rating.count > 0 ? (
                  <>
                    <RatingStars value={rating.average} />
                    <span className="type-subtitle text-text-primary">{formatRating(rating.average)}</span>
                    <span className="type-caption text-text-muted">({pluralAr(rating.count, ["تقييم واحد", "تقييمان", "تقييمات", "تقييمًا"])})</span>
                  </>
                ) : (
                  <>
                    <Glyph icon={Star} size={16} />
                    <span className="type-small">لا تقييمات بعد</span>
                  </>
                )}
              </li>
              <li className="flex items-center gap-1.5">
                <Glyph icon={Users} size={16} />
                <span className="type-small">{program.learners > 0 ? `${formatNumber(program.learners)} متدربًا` : "كن أول المسجّلين"}</span>
              </li>
              {program.hours ? (
                <li className="flex items-center gap-1.5">
                  <Glyph icon={Clock} size={16} />
                  <span className="type-small">{formatNumber(program.hours)} ساعة تدريبية</span>
                </li>
              ) : null}
              <li className="flex items-center gap-1.5">
                <Glyph icon={Gauge} size={16} />
                <span className="type-small">مستوى {LEVEL_LABELS[program.level]}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Glyph icon={Languages} size={16} />
                <span className="type-small">العربية</span>
              </li>
            </ul>
            <div className="flex items-center gap-3">
              <Avatar name={program.provider.name} src={program.provider.avatar} />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="type-subtitle text-text-primary">{program.provider.name}</p>
                <p className="type-caption text-text-muted">{program.provider.meta}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <ShareButton title={program.title} />
                {program.favorite && <FavoriteButton courseId={program.favorite.courseId} saved={program.favorite.saved} programSlug={program.slug} />}
              </div>
            </div>
          </div>
        </section>

        <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
          {/* PRIMARY */}
          <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
            {s.objectives.length > 0 && (
              <SectionCard title="ماذا ستكتسب من هذا البرنامج">
                <ul className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2">
                  {s.objectives.map((o) => (
                    <Row key={o} icon={CircleCheck} tone="text-state-success">
                      {o}
                    </Row>
                  ))}
                </ul>
              </SectionCard>
            )}

            {(s.requirements.length > 0 || s.audience.length > 0) && (
              <SectionCard title="المتطلبات المسبقة والفئة المستهدفة">
                <ul className="flex flex-col gap-3">
                  {s.requirements.map((r) => (
                    <Row key={`r-${r}`} icon={Info}>
                      {r}
                    </Row>
                  ))}
                  {s.audience.map((a) => (
                    <Row key={`a-${a}`} icon={Users}>
                      مناسب لـ: {a}
                    </Row>
                  ))}
                </ul>
              </SectionCard>
            )}

            {program.outline.length > 0 && (
              <SectionCard
                title="محتوى البرنامج"
                action={
                  <Badge tone="brand" className="px-2.5" icon={<Glyph icon={ListChecks} size={16} />}>
                    {pluralAr(program.outline.length, ["محور واحد", "محوران", "محاور", "محورًا"])} ·{" "}
                    {pluralAr(
                      program.outline.reduce((a, m) => a + m.lessons, 0),
                      ["درس واحد", "درسان", "دروس", "درسًا"],
                    )}
                  </Badge>
                }
              >
                <ol className="flex flex-col gap-3">
                  {program.outline.map((m, i) => (
                    <li key={`${m.title}-${i}`} className="flex items-center gap-3 rounded-12 border border-border-default bg-bg-page px-4 py-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint type-subtitle text-text-brand">{toArabicDigits(i + 1)}</span>
                      <span className="min-w-0 flex-1 type-body text-text-primary">{m.title}</span>
                      <span className="shrink-0 type-caption text-text-muted">
                        {pluralAr(m.lessons, ["درس واحد", "درسان", "دروس", "درسًا"])}
                        {m.minutes > 0 ? ` · ${toArabicDigits(m.minutes)} دقيقة` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </SectionCard>
            )}

            {program.trainer && (
              <SectionCard title="عن المدرب">
                <div className="flex items-start gap-4">
                  <Avatar name={program.trainer.name} src={program.trainer.avatar} size="l" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <p className="type-title text-text-primary">{program.trainer.name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {program.trainer.rating !== null && (
                        <Badge tone="accent" solid className="px-2.5" icon={<Glyph icon={Star} size={16} />}>
                          {formatRating(program.trainer.rating)} متوسط تقييم
                        </Badge>
                      )}
                      {program.trainer.headline && (
                        <Badge tone="neutral" className="px-2.5">
                          {program.trainer.headline}
                        </Badge>
                      )}
                      {program.trainer.verified && (
                        <Badge tone="success" className="px-2.5" icon={<Glyph icon={BadgeCheck} size={16} />}>
                          مدرب موثَّق
                        </Badge>
                      )}
                    </div>
                    {program.trainer.bio && <p className="type-body text-text-secondary">{program.trainer.bio}</p>}
                    <p className="flex items-center gap-2 rounded-8 bg-state-warning-bg px-3 py-2 type-caption text-state-warning">
                      <Glyph icon={Info} size={16} />
                      المؤهلات والخبرات مُدخَلة من صاحبها — لم تتحقق منها المنصة.
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            <SectionCard
              title="تقييمات المتدربين"
              action={
                program.nextRun && rating.count > 0 ? (
                  <Link href={`/courses/${program.nextRun.slug}#ratings`} className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
                    كل التقييمات
                  </Link>
                ) : undefined
              }
            >
              {rating.count === 0 ? (
                <p className="rounded-16 border-[1.5px] border-dashed border-border-divider bg-bg-page px-6 py-8 text-center type-small text-text-secondary">
                  لا تقييمات بعد — تظهر تقييمات المتدربين هنا بعد انتهاء أول دورة من البرنامج.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-3.5 rounded-16 border border-border-default bg-bg-card p-[18px] drop-shadow-milestone">
                    <h3 className="type-title text-text-primary">متوسط التقييم</h3>
                    {[
                      { label: "المحتوى", value: rating.content },
                      { label: "الأداء", value: rating.trainer },
                      ...(rating.organization !== null ? [{ label: "التنظيم", value: rating.organization }] : []),
                    ].map((axis) => (
                      <div key={axis.label} className="flex items-center justify-between gap-3">
                        <span className="type-body text-text-secondary">{axis.label}</span>
                        <RatingStars value={axis.value} />
                      </div>
                    ))}
                    <p className="type-caption text-text-muted">بناءً على {pluralAr(rating.count, ["تقييم واحد", "تقييمين", "تقييمات", "تقييمًا"])}</p>
                  </div>
                  {rating.reviews.map((r) => (
                    <article key={r.id} className="flex flex-col gap-3.5 rounded-16 border border-border-default bg-bg-card p-[18px] drop-shadow-milestone">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.name} src={r.avatar} />
                        <p className="min-w-0 flex-1 type-body text-text-primary">{r.name}</p>
                        <RatingStars value={r.stars} />
                      </div>
                      <p className="type-small text-text-secondary">{r.comment}</p>
                    </article>
                  ))}
                </>
              )}
            </SectionCard>
          </div>

          {/* SIDE (360) */}
          <aside aria-label="التسجيل والتفاصيل" className="flex w-full shrink-0 flex-col gap-5 max-lg:order-first lg:w-[360px]">
            <Card className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1">
                <p className="type-caption text-text-muted">{program.openRuns > 1 ? "السعر يبدأ من" : "السعر"}</p>
                <p className="text-[40px] leading-[1.15] font-bold text-text-primary sm:type-display">
                  {program.priceFrom ? (program.priceFrom.amount === 0 ? "مجانية" : formatPrice(program.priceFrom.amount, program.priceFrom.currency)) : "—"}
                </p>
                {program.priceFrom && program.priceFrom.amount > 0 && <p className="type-caption text-text-muted">السعر لا يشمل ضريبة القيمة المضافة (١٥٪).</p>}
              </div>
              <div aria-hidden className="h-px w-full bg-border-divider" />
              {program.nextRun ? (
                <div className="flex items-center gap-2.5 rounded-12 bg-bg-brand-tint p-3">
                  <Glyph icon={CalendarDays} size={20} className="text-text-brand" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="type-caption text-text-muted">{program.nextRun.mode === "recorded" ? "متاحة الآن" : "أقرب دورة متاحة"}</p>
                    <p className="type-subtitle text-text-primary">
                      {program.nextRun.startsAt
                        ? `${formatSessionTime(program.nextRun.startsAt).split(" · ")[0]} · ${program.nextRun.place.split(" · ")[0]}`
                        : program.nextRun.place}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-12 bg-bg-page p-3">
                  <Glyph icon={CalendarDays} size={20} className="text-text-muted" />
                  <p className="type-small text-text-secondary">لا توجد دورات مجدولة حاليًا.</p>
                </div>
              )}
              <ButtonLink href={coursesHref} size="l" fullWidth>
                {program.openRuns > 0 ? "اعرض الدورات المتاحة" : "اعرض الدورات"}
              </ButtonLink>
              <InquiryButton courseId={program.nextRun?.courseId ?? null} programTitle={program.title} />
              <p className="flex items-center gap-2 type-caption text-text-secondary">
                <Glyph icon={ShieldCheck} size={16} className="text-state-success" />
                {program.refund}
              </p>
            </Card>

            <Card className="flex flex-col gap-4 p-6">
              <h2 className="type-title text-text-primary">التخصصات والمهارات</h2>
              <ul className="flex flex-wrap gap-2">
                {(s.skills.length ? s.skills : [program.category?.name ?? "عام"]).map((skill) => (
                  <li key={skill} className="flex h-9 items-center rounded-full border border-border-default bg-bg-surface px-3.5 type-small text-text-primary">
                    {skill}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="flex flex-col gap-4 p-6">
              <p className="type-caption text-text-muted">معرّف البرنامج</p>
              <p dir="ltr" className="text-end font-mono text-[14px] text-text-primary">
                {program.reference}
              </p>
            </Card>

            {program.openRuns > 0 && (
              <p className="flex items-center gap-2 px-1 type-caption text-text-muted">
                <Glyph icon={BookOpen} size={16} />
                {pluralAr(program.openRuns, ["دورة واحدة متاحة", "دورتان متاحتان", "دورات متاحة", "دورة متاحة"])}
                {program.nextRun?.startsAt ? ` · أقربها ${formatDayMonth(program.nextRun.startsAt)}` : ""}
              </p>
            )}
          </aside>
        </div>
      </PageBody>
    </>
  );
}
