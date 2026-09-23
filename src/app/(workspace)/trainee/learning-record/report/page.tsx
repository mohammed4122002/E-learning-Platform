import type { Metadata } from "next";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { RecordTabs } from "@/components/learning/RecordParts";
import { ReportView, type ReportCourse } from "@/components/learning/ReportView";
import { requireTrainee } from "@/lib/auth";
import { getLearningRecord, type RecordCourse } from "@/lib/data/learning-record";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "تقرير سجل التعلم", description: "مستند مهني قابل للمشاركة يجمع ساعاتك ومهاراتك وشهاداتك." };

const MONTH_YEAR = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { month: "long", year: "numeric", timeZone: "Asia/Riyadh" });

function toReport(c: RecordCourse): ReportCourse {
  const at = c.completedAt ?? c.endedAt;
  return { id: c.enrollmentId, title: c.title, source: c.source, monthYear: at ? MONTH_YEAR.format(new Date(at)) : null, hours: c.hours, result: c.result };
}

/** TRN-LRN-02 · تقرير قابل للمشاركة — Figma 211:12284. Sharing honours account_settings.show_learning_record. */
export default async function LearningReportPage() {
  const user = await requireTrainee("/trainee/learning-record/report");
  const record = await getLearningRecord(user.id);
  const from = record.period.from ?? record.memberSince;
  const to = record.period.to ?? new Date().toISOString();
  const period = `${MONTH_YEAR.format(new Date(from))} - ${MONTH_YEAR.format(new Date(to))}`;

  return (
    <>
      <TopBar title="تقرير سجل التعلم" subtitle="مستند مهني قابل للمشاركة" />
      <PageBody className="gap-7">
        <header className="flex flex-col gap-2 print:hidden">
          <h2 className="text-[30px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">تقرير سجل التعلم</h2>
          <p className="type-body text-text-secondary">مستند واحد يجمع ساعاتك ومهاراتك وشهاداتك — للمشاركة مع جهة توظيف أو إرفاقه بسيرتك الذاتية.</p>
        </header>
        <div className="print:hidden">
          <RecordTabs active="report" />
        </div>
        <ReportView
          data={{
            fullName: record.fullName || user.fullName || user.email,
            verified: user.identityStatus === "verified",
            period,
            stats: record.stats,
            skills: record.skills,
            completed: record.completed.map(toReport),
            withdrawn: record.withdrawn.map(toReport),
            verifyLinks: record.certificates.map((c) => ({ title: c.title, url: `${env.siteUrl}/verify/${c.code}` })),
            shareable: record.showLearningRecord,
          }}
        />
      </PageBody>
    </>
  );
}
