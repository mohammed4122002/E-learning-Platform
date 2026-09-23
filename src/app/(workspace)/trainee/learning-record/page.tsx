import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { CompletedRow, NextSteps, RecordCard, RecordTabs, SkillsCard, StatTiles, Timeline, TrackCard } from "@/components/learning/RecordParts";
import { requireTrainee } from "@/lib/auth";
import { getLearningRecord } from "@/lib/data/learning-record";

export const metadata: Metadata = { title: "سجل التعلم", description: "ساعاتك ودوراتك ومهاراتك وشهاداتك في سجل واحد قابل للمشاركة." };

const MONTH_YEAR = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { month: "long", year: "numeric", timeZone: "Asia/Riyadh" });

/** TRN-LRN-01 · سجل التعلم — Figma 211:11937 (نظرة عامة) + المهارات / السجل الزمني tabs. */
export default async function LearningRecordPage(props: PageProps<"/trainee/learning-record">) {
  const user = await requireTrainee("/trainee/learning-record");
  const search = await props.searchParams;
  const tab = search.tab === "skills" ? "skills" : search.tab === "timeline" ? "timeline" : "overview";
  const record = await getLearningRecord(user.id);
  const empty = record.events.length === 0 && record.completed.length === 0;

  return (
    <>
      <TopBar title="سجل التعلم" subtitle="ماذا أنجزت منذ انضمامك" />
      <PageBody className="gap-7">
        <header className="flex flex-col gap-2">
          <h2 className="text-[30px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">سجل التعلم</h2>
          <p className="type-body text-text-secondary">
            كل ما أنجزته منذ {MONTH_YEAR.format(new Date(record.memberSince))} — الساعات والمهارات والشهادات في سجل واحد قابل للمشاركة مهنيًا.
          </p>
        </header>
        <StatTiles stats={record.stats} />
        <RecordTabs active={tab} />

        {empty ? (
          <EmptyState
            icon={GraduationCap}
            title="سجلّك فارغ حتى الآن"
            description="ابدأ أول درس أو احضر أول جلسة، وسيُبنى سجلّك تلقائيًا بساعاتك ومهاراتك وشهاداتك."
            action={<ButtonLink href="/trainee/discover">اكتشف دورة</ButtonLink>}
          />
        ) : tab === "skills" ? (
          <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <SkillsCard skills={record.skills} large />
            </div>
            <aside aria-label="الخطوة القادمة" className="flex w-full flex-col gap-6 lg:w-[380px] lg:shrink-0">
              <NextSteps record={record} />
            </aside>
          </div>
        ) : tab === "timeline" ? (
          <RecordCard title="السجل الزمني" id="timeline-title">
            <Timeline events={record.events.slice(0, 200)} />
          </RecordCard>
        ) : (
          <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              {record.track && <TrackCard track={record.track} />}
              <RecordCard
                title="آخر ما أنجزت"
                id="recent-title"
                action={
                  <Link href="/trainee/learning-record?tab=timeline" className="rounded-8 type-small text-text-brand hover:underline focus-ring">
                    عرض السجل الكامل
                  </Link>
                }
              >
                {record.completed.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {record.completed.slice(0, 5).map((c) => (
                      <CompletedRow key={c.enrollmentId} course={c} />
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-12 bg-bg-page px-4 py-4 type-small text-text-secondary">لم تُكمل دورة بعد — دوراتك المكتملة ستظهر هنا بنتائجها وساعاتها.</p>
                )}
              </RecordCard>
            </div>
            <aside aria-label="مهاراتك والخطوة القادمة" className="flex w-full flex-col gap-6 lg:w-[380px] lg:shrink-0">
              <SkillsCard skills={record.skills} />
              <NextSteps record={record} />
            </aside>
          </div>
        )}
      </PageBody>
    </>
  );
}
