import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { LucideIcon } from "lucide-react";
import { Award, BookOpen, ChevronLeft, CircleCheck, Compass, Play, Star, Trophy, Wallet } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { IconPill, StatusHero } from "@/components/ui/InfoBlocks";
import { SectionCard } from "@/components/ui/PageHeading";
import { CourseCard } from "@/components/course/CourseCard";
import { RatingForm } from "@/components/ratings/RatingForm";
import { ReviewCard } from "@/components/ratings/ReviewCard";
import { requireTrainee } from "@/lib/auth";
import { getNextCourses, getRatingContext, type RatingContext } from "@/lib/data/ratings";
import { pluralAr } from "@/lib/format";

export const metadata: Metadata = { title: "تقييم الدورة", description: "قيّم المحتوى والمدرب والتنظيم — يُرسل مرة واحدة." };

function NextBlock({ icon, title, hint, children }: { icon: LucideIcon; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-12 bg-bg-page p-3.5">
      <div className="flex w-full items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
          <Glyph icon={icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="type-subtitle text-text-primary">{title}</p>
          <p className="type-caption text-text-muted">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

const JOURNEY: { icon: LucideIcon; label: string }[] = [
  { icon: Wallet, label: "اشتريت" },
  { icon: Play, label: "تعلّمت" },
  { icon: Trophy, label: "أكملت" },
  { icon: Award, label: "شهادتك" },
  { icon: Star, label: "قيّمت" },
];

async function SubmittedView({ ctx, userId, authorName }: { ctx: RatingContext; userId: string; authorName: string }) {
  const next = await getNextCourses(userId, ctx.categoryId, ctx.courseId);
  const to = ctx.organizationName ? `إلى ${ctx.organizationName} وإلى ${ctx.trainerName}` : `إلى ${ctx.trainerName}`;
  const steps = JOURNEY.filter((s) => (s.label === "شهادتك" ? !!ctx.certificateId : s.label === "أكملت" ? ctx.completed : true));
  return (
    <>
      <section className="flex w-full flex-col items-center gap-[18px] rounded-22 bg-state-success-bg px-5 py-10 text-center sm:px-10">
        <span className="flex size-[76px] items-center justify-center rounded-full bg-bg-surface text-state-success">
          <Glyph icon={CircleCheck} size={32} />
        </span>
        <h2 className="text-[32px] leading-[1.15] font-bold text-text-primary sm:text-[48px]">شكرًا — وصل تقييمك</h2>
        <p className="max-w-3xl type-body-lg text-text-secondary">نُشر تقييمك على صفحة البرنامج، ووصل {to}. قد يردّ عليه المقدّم ردًّا واحدًا.</p>
      </section>

      <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
          {ctx.existing && (
            <SectionCard
              title="تقييمك المنشور"
              titleId="published-title"
              aside={
                <IconPill icon={CircleCheck} tone="success">
                  منشور باسمك
                </IconPill>
              }
            >
              <ReviewCard rating={ctx.existing} authorName={authorName} />
            </SectionCard>
          )}
          <SectionCard title={ctx.completed ? "أنهيت رحلة هذه الدورة بالكامل" : "رحلتك في هذه الدورة"} titleId="journey-title">
            <ol className="flex w-full flex-wrap items-stretch gap-y-3 sm:flex-nowrap">
              {steps.map((s, i) => (
                <li key={s.label} className="flex min-w-[30%] flex-1 items-start sm:min-w-0">
                  <div className="flex w-full flex-col items-center gap-2 rounded-12 bg-state-success-bg py-3.5">
                    <span className="flex size-[38px] items-center justify-center rounded-8 bg-bg-surface text-state-success">
                      <Glyph icon={s.icon} size={20} />
                    </span>
                    <span className="type-caption text-state-success">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <span aria-hidden className="hidden w-[30px] shrink-0 justify-center pt-[26px] text-text-muted sm:flex">
                      <Glyph icon={ChevronLeft} size={16} />
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <p className="type-body text-text-secondary">
              {ctx.certificateId ? "كل مراحل الدورة مكتملة. شهادتك محفوظة في «الشهادات» وسجلك محدّث في «ملف التدريب»." : "سجلك محدّث في «ملف التدريب»، وتصدر شهادتك فور استيفاء شروطها."}
            </p>
          </SectionCard>
          {next.length > 0 && (
            <SectionCard title={`أكمل مسارك — ${pluralAr(next.length, ["دورة مقترحة", "دورتان مقترحتان", "دورات مقترحة", "دورة مقترحة"])}`} titleId="next-courses-title">
              <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {next.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        <aside aria-label="ما التالي" className="flex w-full shrink-0 flex-col lg:w-[380px]">
          <SectionCard title="ما التالي؟" titleId="whats-next-title">
            {ctx.certificateId && (
              <NextBlock icon={Award} title="اعرض شهادتك" hint="نزّلها أو انسخ رابط التحقق">
                <ButtonLink href={`/trainee/certificates/${ctx.certificateId}`} fullWidth>
                  اعرض شهادتك
                </ButtonLink>
              </NextBlock>
            )}
            <NextBlock icon={Compass} title="اكتشف دورة جديدة" hint={next.length ? `${pluralAr(next.length, ["دورة واحدة", "دورتان", "دورات", "دورة"])} تكمل مسارك` : "برامج جديدة كل أسبوع"}>
              <ButtonLink href="/trainee/discover" variant="outline" fullWidth>
                اكتشف دورة جديدة
              </ButtonLink>
            </NextBlock>
            <NextBlock icon={BookOpen} title="عد لملف التدريب" hint="سجلك محدّث بالإنجاز الجديد">
              <ButtonLink href="/trainee/trainings" variant="ghost" fullWidth>
                عد لملف التدريب
              </ButtonLink>
            </NextBlock>
          </SectionCard>
        </aside>
      </div>
    </>
  );
}

/** TRN-RTG-01 · تقييم الدورة — Figma 206:11731 (النموذج) · 206:11990 (تم الإرسال). */
export default async function NewRatingPage({ searchParams }: PageProps<"/trainee/ratings/new">) {
  const sp = await searchParams;
  const enrollment = typeof sp.enrollment === "string" ? sp.enrollment : "";
  const user = await requireTrainee(`/trainee/ratings/new?enrollment=${encodeURIComponent(enrollment)}`);
  if (!z.uuid().safeParse(enrollment).success) notFound();
  const ctx = await getRatingContext(user.id, enrollment);
  if (!ctx) notFound();

  const submitted = !!ctx.existing;
  return (
    <>
      <TopBar title="تقييم الدورة" subtitle={submitted ? "تم الإرسال" : ctx.courseTitle} />
      <PageBody className="gap-6">
        {submitted ? (
          <SubmittedView ctx={ctx} userId={user.id} authorName={user.fullName || user.email} />
        ) : !ctx.eligible ? (
          <>
            <Breadcrumb items={[{ label: "التقييمات", href: "/trainee/ratings" }, { label: ctx.courseTitle }]} />
            <EmptyState
              icon={Star}
              title={ctx.windowClosed ? "انتهت مهلة تقييم هذه الدورة" : "التقييم غير متاح بعد"}
              description={ctx.windowClosed ? "التقييم متاح ٣٠ يومًا بعد انتهاء الدورة ويُرسل مرة واحدة فقط." : "يمكنك تقييم الدورة بعد بدء حضورها أو مشاهدة دروسها."}
              action={<ButtonLink href="/trainee/ratings">عد إلى تقييماتي</ButtonLink>}
            />
          </>
        ) : (
          <>
            <Breadcrumb items={[{ label: "التقييمات", href: "/trainee/ratings" }, { label: ctx.courseTitle }]} />
            <StatusHero
              tone="brand"
              icon={Star}
              square
              title="كيف كانت تجربتك؟"
              eyebrow={
                <>
                  {ctx.completed && (
                    <IconPill icon={CircleCheck} tone="surface-success">
                      أتممت الدورة
                    </IconPill>
                  )}
                  {ctx.certificateId && (
                    <IconPill icon={Award} tone="surface-brand">
                      شهادتك صادرة
                    </IconPill>
                  )}
                </>
              }
            >
              تقييمك يساعد متدربين آخرين على الاختيار، ويصل {ctx.organizationName ? "للجهة التدريبية والمدرب" : "للمدرب"}. يُرسل مرة واحدة ولا يمكن تعديله بعد الإرسال.
            </StatusHero>
            <RatingForm enrollmentId={ctx.enrollmentId} isProvider={ctx.isProvider} trainerName={ctx.trainerName} trainerHeadline={ctx.trainerHeadline} trainerAvatar={ctx.trainerAvatar} />
          </>
        )}
      </PageBody>
    </>
  );
}
