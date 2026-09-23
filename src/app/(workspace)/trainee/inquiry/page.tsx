import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronLeft, MessageCircleQuestion } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { Select } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { PageHeading, SectionCard } from "@/components/ui/PageHeading";
import { InquiryForm } from "@/components/support/InquiryForm";
import { requireTrainee } from "@/lib/auth";
import { getHelpArticlesByCategory } from "@/lib/data/help";
import { getInquirableCourses, getInquiryCourse, getMyInquiries, type InquiryCourse, type MyInquiry } from "@/lib/data/support";
import { formatDayMonth, formatNumber, formatRelative } from "@/lib/format";
import { INQUIRY_TOPICS } from "@/lib/validation/engagement";

export const metadata: Metadata = { title: "استفسار قبل التسجيل", description: "اسأل الجهة أو المدرب عن البرنامج قبل أن تسجّل." };

function Steps({ source }: { source: string }) {
  const steps = [
    { title: "يصل للمقدّم فورًا", hint: source },
    { title: "يردّ خلال يوم عمل عادةً", hint: "متوسط ردّ المقدّمين على المنصة" },
    { title: "يظهر الرد في «استفساراتي»", hint: "ويصلك إشعار عند الرد" },
    { title: "يمكنك التسجيل مباشرة", hint: "السؤال لا يحجز مقعدًا" },
  ];
  return (
    <SectionCard title="ما الذي يحدث بعد الإرسال؟" titleId="after-title">
      <ol className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex w-full items-start gap-3">
            <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bg-brand-tint type-caption text-text-brand">
              {formatNumber(i + 1)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="type-small text-text-primary">{s.title}</span>
              <span className="type-caption text-text-muted">{s.hint}</span>
            </span>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

function CourseSummary({ course }: { course: InquiryCourse }) {
  const meta = [
    course.sourceName,
    course.durationHours ? `${formatNumber(course.durationHours)} ساعة` : null,
    course.startsAt ? `دورة ${formatDayMonth(course.startsAt)}${course.city ? ` في ${course.city}` : ""}` : course.mode === "recorded" ? "مسجَّلة — ابدأ متى شئت" : null,
  ].filter(Boolean);
  return (
    <SectionCard title="عن أي برنامج تسأل؟" titleId="course-title">
      <Link href={`/courses/${course.slug}`} className="flex w-full items-center gap-3.5 rounded-12 bg-bg-page px-4 py-3.5 hover:bg-bg-brand-tint focus-ring">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
          <Glyph icon={BookOpen} size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="type-subtitle text-text-primary">{course.title}</span>
          <span className="type-caption text-text-muted">{meta.join(" · ")}</span>
        </span>
      </Link>
    </SectionCard>
  );
}

function InquiryList({ items }: { items: MyInquiry[] }) {
  return (
    <SectionCard title="استفساراتي" titleId="my-inquiries" className="scroll-mt-28">
      {items.length ? (
        <ul className="flex flex-col gap-4">
          {items.map((i) => (
            <li key={i.id} className="flex w-full flex-col gap-2.5 rounded-12 bg-bg-page px-4 py-3.5">
              <div className="flex w-full flex-wrap items-center gap-2">
                <span className="rounded-full bg-bg-surface px-2.5 py-1 type-caption text-text-secondary">{i.topic === "other" ? "أخرى" : INQUIRY_TOPICS[i.topic]}</span>
                <span className={`rounded-full px-2.5 py-1 type-caption ${i.answer ? "bg-state-success-bg text-state-success" : "bg-state-warning-bg text-state-warning"}`}>
                  {i.answer ? "تمّ الرد" : "بانتظار الرد"}
                </span>
                <span className="ms-auto type-caption text-text-muted">{formatRelative(i.createdAt)}</span>
              </div>
              {i.courseTitle && <p className="type-caption text-text-muted">{i.courseTitle}</p>}
              <p className="type-body text-text-primary">{i.question}</p>
              {i.answer && (
                <div className="flex flex-col gap-1 rounded-12 border-s-[3px] border-action-primary bg-bg-surface px-3.5 py-3">
                  <p className="type-caption text-text-brand">رد المقدّم{i.answeredAt ? ` · ${formatRelative(i.answeredAt)}` : ""}</p>
                  <p className="type-body whitespace-pre-line text-text-secondary">{i.answer}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-small text-text-muted">لم ترسل أي استفسار عن هذا البرنامج بعد.</p>
      )}
    </SectionCard>
  );
}

/** TRN-INQ-01 · استفسار قبل التسجيل — Figma 223:13280. `?course=<slug>`. */
export default async function InquiryPage({ searchParams }: PageProps<"/trainee/inquiry">) {
  const sp = await searchParams;
  const slug = typeof sp.course === "string" ? sp.course : "";
  const user = await requireTrainee(`/trainee/inquiry${slug ? `?course=${encodeURIComponent(slug)}` : ""}`);
  const course = slug ? await getInquiryCourse(slug) : null;

  if (!course) {
    const [courses, mine] = await Promise.all([getInquirableCourses(), getMyInquiries(user.id)]);
    return (
      <>
        <TopBar title="استفسار قبل التسجيل" subtitle="اسأل قبل أن تسجّل" />
        <PageBody className="gap-6">
          <PageHeading title="استفسر قبل التسجيل" description="اختر البرنامج الذي تسأل عنه ليصل سؤالك إلى الجهة أو المدرب مباشرة." />
          {slug && (
            <Alert tone="warning" title="لم نعثر على هذا البرنامج">
              ربما أُغلق أو تغيّر رابطه. اختر برنامجًا من القائمة.
            </Alert>
          )}
          <SectionCard title="عن أي برنامج تسأل؟" titleId="pick-title">
            {courses.length ? (
              <form action="/trainee/inquiry" method="get" className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <Select
                  name="course"
                  label="البرنامج"
                  required
                  defaultValue=""
                  placeholder="اختر برنامجًا"
                  options={courses.map((c) => ({ value: c.slug, label: `${c.title} — ${c.sourceName}` }))}
                  className="flex-1"
                />
                <Button type="submit" icon={<Glyph icon={ChevronLeft} size={16} />}>
                  متابعة
                </Button>
              </form>
            ) : (
              <EmptyState icon={BookOpen} title="لا برامج مفتوحة حاليًا" description="تصفّح الدورات لاحقًا أو اطّلع على مركز المساعدة." />
            )}
          </SectionCard>
          {mine.length > 0 ? (
            <InquiryList items={mine} />
          ) : (
            <EmptyState icon={MessageCircleQuestion} title="لا استفسارات سابقة" description="استفساراتك وردود المقدّمين عليها تظهر هنا." />
          )}
        </PageBody>
      </>
    );
  }

  const [mine, articles] = await Promise.all([getMyInquiries(user.id, course.id), course.faq.length ? Promise.resolve([]) : getHelpArticlesByCategory("enrollment", 3)]);
  const quick = course.faq.length
    ? course.faq.map((f) => ({ title: f.q, href: `/courses/${course.slug}#faq` }))
    : articles.map((a) => ({ title: a.title, href: `/trainee/help/${a.slug}` }));

  return (
    <>
      <TopBar title="استفسار قبل التسجيل" subtitle={course.title} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: course.title, href: `/courses/${course.slug}` }, { label: "استفسار قبل التسجيل" }]} />
        <PageHeading title="استفسر قبل التسجيل" description={`سؤالك يذهب إلى ${course.sourceName} مباشرة، ويظهر الرد في «استفساراتي» أسفل الصفحة.`} />
        {sp.sent === "1" && (
          <Alert tone="success" title="أُرسل استفسارك">
            وصل سؤالك إلى {course.sourceName}. يصلك إشعار عند الرد، ويظهر في «استفساراتي».
          </Alert>
        )}
        <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
            <CourseSummary course={course} />
            <InquiryForm courseId={course.id} />
            <InquiryList items={mine} />
          </div>
          <aside aria-label="معلومات" className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
            <Steps source={course.sourceName} />
            {quick.length > 0 && (
              <SectionCard title="ربما تجد إجابتك هنا" titleId="quick-title">
                <ul className="flex flex-col gap-4">
                  {quick.map((q) => (
                    <li key={q.title}>
                      <Link href={q.href} className="flex w-full items-center gap-2.5 rounded-8 bg-bg-page px-3 py-2.5 hover:bg-bg-brand-tint focus-ring">
                        <span className="min-w-0 flex-1 type-small text-text-primary">{q.title}</span>
                        <Glyph icon={ChevronLeft} size={16} className="text-text-brand" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </aside>
        </div>
      </PageBody>
    </>
  );
}
