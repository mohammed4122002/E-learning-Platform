import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { RecordedPricingCard } from "@/components/trainer-courses/wizard/PricingStep";
import { DashboardActions } from "@/components/trainer-courses/dashboard/DashboardClient";
import {
  ContentCompletion, DashboardError, DashboardHero, EmptyDashboard, LearnersProgress, NeedsAction, RevenueCard, SourceProgramCard,
  StaleProgram, StatsRow,
} from "@/components/trainer-courses/dashboard/DashboardView";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import {
  getCategoryAveragePrice, getCourseSales, getProgramDrift, getRecordedDashboard, salesTotals, type RecordedDashboard, type SaleRow,
} from "@/lib/data/trainer-course-page";
import { getCourseHeader, getTrainerContent, snapshotList } from "@/lib/data/trainer-courses";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "لوحة الدورة", description: "مبيعات الدورة المسجَّلة وتقدّم مشتريها" };

/**
 * TRR-CRS-07 · لوحة الدورة المسجَّلة — الحالة الافتراضية (411:18526), فارغة (413:18821), تحميل (413:19101 →
 * loading.tsx), خطأ (413:19321, ERR-DASH-503) and قديمة (413:19550, when the source program has a newer version).
 */
export default async function RecordedDashboardPage({ params, searchParams }: PageProps<"/trainer/courses/[id]/dashboard">) {
  const { id } = await params;
  const sp = await searchParams;
  await requireTrainer(`/trainer/courses/${id}/dashboard`);
  const course = await getCourseHeader(id);
  if (!course) notFound();
  if (course.status === "draft") redirect(`/trainer/courses/${id}/setup/review`);
  if (course.mode !== "recorded") redirect(`/trainer/courses/${id}`);

  const saleUrl = `${env.siteUrl}/courses/${course.slug}`;
  let data: RecordedDashboard | null = null;
  let sales: SaleRow[] = [];
  try {
    [data, sales] = await Promise.all([getRecordedDashboard(id), getCourseSales(id)]);
  } catch {
    data = null;
  }
  const drift = await getProgramDrift(course.program.id, course.program.version, course.program.currentVersion);
  const paused = Boolean(course.salesPausedAt);
  const buyers = data?.learners.length ?? course.buyers;
  const view = !data ? "error" : drift && sp.stale !== "hide" ? "stale" : buyers === 0 ? "empty" : "default";
  const subtitle = { error: "تعذّر التحميل", stale: "البرنامج المصدر حُدِّث", empty: "لا مبيعات بعد", default: course.title }[view];

  let body: React.ReactNode;
  if (view === "error") {
    body = <DashboardError course={course} />;
  } else if (view === "stale" && drift && data) {
    const content = await getTrainerContent(id);
    body = (
      <StaleProgram
        course={course}
        drift={drift}
        buyers={buyers}
        current={{ modules: content.totals.modules, lessons: content.totals.lessons, objectives: snapshotList(course.snapshot, "objectives").length }}
        hideHref={`/trainer/courses/${id}/dashboard?stale=hide`}
      />
    );
  } else if (view === "empty") {
    const supabase = await createClient();
    const [{ data: previewRows }, categoryAvg] = await Promise.all([
      supabase.from("lessons").select("duration_seconds").eq("course_id", id).eq("is_preview", true).not("published_at", "is", null).limit(1),
      getCategoryAveragePrice(id, course.program.id),
    ]);
    const preview = previewRows?.[0] ? { seconds: previewRows[0].duration_seconds ?? 0 } : null;
    body = <EmptyDashboard course={course} saleUrl={saleUrl} preview={preview} categoryAvg={categoryAvg} />;
  } else {
    const d = data!;
    const totals = salesTotals(sales);
    const supabase = await createClient();
    const { data: commissionData } = await supabase.rpc("platform_commission_percent");
    body = (
      <>
        <StatsRow course={course} data={d} totals={totals} />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <NeedsAction course={course} data={d} />
            <SourceProgramCard course={course} drift={drift} />
            <ContentCompletion course={course} data={d} />
            <LearnersProgress course={course} data={d} />
          </div>
          <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[400px]">
            <RevenueCard courseId={id} totals={totals} />
            <RecordedPricingCard price={course.price} free={course.price === 0} commission={Number(commissionData ?? totals.pct)} locked={course.priceLocked} buyers={buyers} />
            <DashboardActions courseId={id} buyers={buyers} paused={paused} />
          </aside>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="لوحة الدورة" subtitle={subtitle} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: course.title }]} />
        <DashboardHero course={course} saleUrl={saleUrl} state={paused ? "paused" : buyers === 0 ? "unsold" : "selling"} />
        {body}
      </PageBody>
    </>
  );
}
