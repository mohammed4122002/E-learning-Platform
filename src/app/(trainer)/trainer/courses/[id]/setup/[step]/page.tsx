import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ContentStep } from "@/components/trainer-courses/wizard/ContentStep";
import { ContentProgressCard } from "@/components/trainer-courses/content/ContentReadiness";
import { ModeStep } from "@/components/trainer-courses/wizard/ModeStep";
import { HoursCard, HoursEditor, PricingStep } from "@/components/trainer-courses/wizard/PricingStep";
import { ReviewStep, type SummaryRow } from "@/components/trainer-courses/wizard/ReviewStep";
import { ScheduleStep } from "@/components/trainer-courses/wizard/ScheduleStep";
import { WizardShell } from "@/components/trainer-courses/wizard/WizardShell";
import { requireTrainer } from "@/lib/auth";
import { getCourseHeader, getTrainerBusySlots, getTrainerContent, versionLabel } from "@/lib/data/trainer-courses";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { formatDuration, formatNumber, formatPrice, pluralAr } from "@/lib/format";
import { MODE_TITLES, isSetupStep, netOf, scheduleLabel, stepNumber, type SetupStep } from "@/lib/trainer-courses";

export const metadata: Metadata = { title: "إعداد الدورة", description: "أكمل إعداد الدورة وانشرها" };

const HEADINGS: Record<SetupStep, (mode: string) => { heading: string; description: string; subtitle: string }> = {
  mode: () => ({ heading: "نمط تقديم الدورة", description: "اختر كيف سيحصل المتدرب على هذا البرنامج.", subtitle: "" }),
  schedule: (mode) =>
    mode === "recorded"
      ? { heading: "محتوى الدورة", description: "ابنِ الوحدات والدروس وارفع المواد. المحتوى هنا هو المنتج نفسه.", subtitle: "مسجَّلة" }
      : mode === "live_remote"
        ? { heading: "منصة البث والمواعيد", description: "حدّد أين ومتى ستلتقي بمتدربيك مباشرة.", subtitle: "مباشرة أونلاين" }
        : { heading: "الجدولة", description: "حدّد المكان والتواريخ — نولّد الجلسات ونفحص التعارض تلقائيًا.", subtitle: "حضورية" },
  pricing: (mode) =>
    mode === "recorded"
      ? { heading: "تسعير الدورة", description: "بيع مفتوح دائم — بلا مقاعد ولا حد أدنى للانعقاد.", subtitle: "تسعير الدورة المسجَّلة" }
      : { heading: "المقاعد والسعر", description: "حدّد المقاعد وسعر هذه الدورة والساعات المعتمدة.", subtitle: "المقاعد والسعر" },
  review: () => ({ heading: "المراجعة والنشر", description: "", subtitle: "المراجعة والنشر" }),
};

/** TRR-CRS-02 steps ٢–٥ for an existing draft (or the review of a published course). */
export default async function CourseSetupPage({ params }: PageProps<"/trainer/courses/[id]/setup/[step]">) {
  const { id, step } = await params;
  const user = await requireTrainer(`/trainer/courses/${id}/setup/${step}`);
  if (!isSetupStep(step)) notFound();
  const course = await getCourseHeader(id);
  if (!course) notFound();
  // Published: the review, and the recorded course's pricing/access (Figma 396:17986 «تابع للتسعير»); the RPC keeps
  // only the published-safe fields editable and the price locked once sold (BR-L3).
  if (course.status !== "draft" && step !== "review" && !(step === "pricing" && course.mode === "recorded")) redirect(course.mode === "recorded" ? `/trainer/courses/${id}/dashboard` : `/trainer/courses/${id}`);

  const content = await getTrainerContent(id);
  const supabase = await createClient();
  const [{ data: commissionData }, { data: blockerRows }, { data: priv }] = await Promise.all([
    supabase.rpc("platform_commission_percent"),
    course.status === "draft" ? supabase.rpc("course_publish_blockers", { p_course: id }) : Promise.resolve({ data: [] as { code: string; detail: string | null }[] }),
    supabase.from("courses").select("updated_at").eq("id", id).maybeSingle(),
  ]);
  const commission = Number(commissionData ?? 10);
  const h = HEADINGS[step](course.mode);
  const sessionsLive = course.sessions.filter((s) => s.status !== "cancelled");
  const sessionHours = sessionsLive.reduce((sum, s) => sum + (Date.parse(s.endsAt) - Date.parse(s.startsAt)) / 3_600_000, 0);
  const actual =
    course.mode === "recorded"
      ? formatDuration(content.totals.seconds)
      : `${pluralAr(sessionsLive.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])} · ${pluralAr(Math.round(sessionHours), ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"])}`;
  const program = {
    title: course.program.title,
    version: versionLabel(course.program.version),
    latest: course.program.version === course.program.currentVersion,
    changeHref: course.status === "draft" ? "/trainer/programs" : null,
  };
  const stepHrefs: Record<number, string> = { 2: `/trainer/courses/${id}/setup/mode`, 3: `/trainer/courses/${id}/setup/schedule`, 4: `/trainer/courses/${id}/setup/pricing` };

  let body: React.ReactNode = null;
  let beforeStepper: React.ReactNode = null;
  let description = h.description;
  if (step === "mode") {
    body = <ModeStep programVersionId="" initialMode={course.mode} />;
  } else if (step === "schedule") {
    if (course.mode === "recorded") {
      body = <ContentStep courseId={id} content={content} />;
    } else {
      const busy = await getTrainerBusySlots(user.id, id);
      body = (
        <ScheduleStep
          courseId={id}
          mode={course.mode}
          modules={content.modules.map((m) => ({ id: m.id, title: m.title }))}
          sessions={sessionsLive.map((s) => ({ title: s.title, startsAt: s.startsAt, endsAt: s.endsAt, moduleId: s.moduleId }))}
          busy={busy}
          venue={course.venue ?? ""}
          city={course.city ?? ""}
          meetingPlatform={course.meetingPlatform}
          meetingUrl={course.meetingUrl ?? ""}
          flags={{ recordSessions: course.flags.recordSessions, liveQuestions: course.flags.liveQuestions, autoAttendance: course.flags.autoAttendance }}
        />
      );
    }
  } else if (step === "pricing") {
    beforeStepper = <HoursEditor initial={course.durationHours ?? 5} actual={actual} actualLabel={course.mode === "recorded" ? "مدة المحتوى الفعلية" : "مدة الجلسات الفعلية"} />;
    body = (
      <PricingStep
        courseId={id}
        mode={course.mode}
        commission={commission}
        price={course.price}
        pricingSet={course.pricingSet}
        priceLocked={course.priceLocked}
        buyers={course.buyers}
        capacity={course.capacity ?? 20}
        minCapacity={course.minCapacity}
        waitlistEnabled={course.flags.waitlistEnabled}
        flags={{ lifetimeAccess: course.flags.lifetimeAccess, allowDownloads: course.flags.allowDownloads, certificateOnCompletion: course.flags.certificateOnCompletion }}
      />
    );
  } else {
    const blockers = (blockerRows ?? []).map((b) => ({ code: b.code, detail: b.detail }));
    const draft = course.status === "draft";
    description = draft ? (blockers.length ? "أكمل الشروط الناقصة قبل النشر." : "راجع كل شيء قبل النشر — بعده تصبح متاحة للشراء.") : "دورتك منشورة ومتاحة للشراء.";
    const previews = content.lessons.filter((l) => l.isPreview);
    const rows: SummaryRow[] = [
      { icon: course.mode === "recorded" ? "mode" : `mode_${course.mode}`, label: "النمط", value: course.mode === "recorded" ? "دورة مسجَّلة · بيع مفتوح دائم" : MODE_TITLES[course.mode] },
      { icon: "program", label: "البرنامج المصدر", value: `${course.program.title} · ${versionLabel(course.program.version)} مجمَّدة` },
      course.mode === "recorded"
        ? { icon: "content", label: "المحتوى", value: `${pluralAr(content.totals.modules, ["وحدة واحدة", "وحدتان", "وحدات", "وحدة"])} · ${pluralAr(content.totals.lessons, ["درس واحد", "درسان", "دروس", "درسًا"])} · ${formatDuration(content.totals.seconds)}` }
        : { icon: "schedule", label: "الجدول", value: sessionsLive.length ? `${actual} · ${scheduleLabel(course.startsAt, course.endsAt, sessionsLive[0])}` : "لم يُحدَّد", missing: sessionsLive.length === 0 },
      course.mode === "recorded"
        ? { icon: "preview", label: "المعاينة المجانية", value: previews.length ? `${pluralAr(previews.length, ["درس واحد", "درسان", "دروس", "درسًا"])} · «${previews[0].title}»` : "لم تُحدَّد", missing: previews.length === 0 }
        : course.mode === "in_person"
          ? { icon: "venue", label: "المكان", value: [course.venue, course.city].filter(Boolean).join(" · ") || "لم يُحدَّد", missing: !course.venue }
          : { icon: "stream", label: "منصة البث", value: course.meetingUrl ? `${course.meetingPlatform === "google_meet" ? "Google Meet" : course.meetingPlatform === "other" ? "منصة أخرى" : "Zoom"} · الرابط مرفوع` : "الرابط لم يُرفع", missing: !course.meetingUrl },
      {
        icon: "price",
        label: "السعر",
        value: !course.pricingSet ? "لم يُحدَّد" : course.price === 0 ? "مجانية" : `${formatPrice(course.price)} · صافيك ${formatNumber(netOf(course.price, commission))}`,
        missing: !course.pricingSet,
      },
      { icon: "certificate", label: "الشهادة", value: course.mode === "recorded" ? "تصدر آليًا بإكمال ١٠٠٪ من الدروس" : "بشرط حضور ٨٠٪ من الجلسات" },
      { icon: "refund", label: "الاسترداد", value: "السياسة الموحّدة · ١٤ يومًا من الشراء" },
    ];
    const published = draft
      ? null
      : {
          title: course.title,
          slug: course.slug,
          url: `${env.siteUrl}/courses/${course.slug}`,
          views: course.pageViews,
          sales: course.buyers,
          revenue: netOf(course.revenue, commission),
          paused: Boolean(course.salesPausedAt),
          manageHref: course.mode === "recorded" ? `/trainer/courses/${id}/dashboard` : `/trainer/courses/${id}`,
        };
    if (course.mode !== "recorded") {
      beforeStepper = (
        <HoursCard hours={course.durationHours ?? 0} actual={actual} actualLabel="مدة الجلسات الفعلية" readOnly />
      );
    }
    body = (
      <ReviewStep
        courseId={id}
        status={course.status}
        blockers={blockers}
        rows={rows}
        published={published}
        side={
          course.mode !== "recorded" ? null : course.status !== "draft" ? (
            <ContentProgressCard content={content} action={{ label: "تابع للتسعير", href: `/trainer/courses/${id}/setup/pricing` }} />
          ) : blockers.length > 0 ? (
            <ContentProgressCard content={content} />
          ) : null
        }
      />
    );
  }

  return (
    <>
      <TopBar title="دورة جديدة" subtitle={step === "mode" ? course.program.title : h.subtitle} />
      <PageBody className="gap-0 lg:px-14">
        <WizardShell
          courseId={id}
          heading={h.heading}
          description={description}
          breadcrumb={course.status === "draft" ? "دورة جديدة" : course.title}
          step={stepNumber(step)}
          stepHrefs={course.status === "draft" ? stepHrefs : undefined}
          program={step === "mode" || (step === "schedule" && course.mode !== "recorded") ? program : null}
          initialSavedAt={priv?.updated_at ?? null}
          beforeStepper={beforeStepper}
        >
          {body}
        </WizardShell>
      </PageBody>
    </>
  );
}
