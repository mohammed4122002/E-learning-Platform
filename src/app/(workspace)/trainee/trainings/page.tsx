import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Countdown } from "@/components/ui/Countdown";
import { CourseCard } from "@/components/course/CourseCard";
import { DataCard, FilterChip, Notice } from "@/components/trainings/ui";
import { DismissibleAlert } from "@/components/trainings/DismissibleAlert";
import { JourneyStrip, LearningProfileHeader, ModeExplainer, TAB_LABELS, TrainingsTabs } from "@/components/trainings/TrainingsProfile";
import { WaitlistEntryCard } from "@/components/trainings/WaitlistEntryCard";
import { WaitlistHowItWorks } from "@/components/trainings/WaitlistHowItWorks";
import { requireTrainee } from "@/lib/auth";
import { getTrainingsFile, type ModeFilter, type TrainingsTab } from "@/lib/data/trainings";
import { formatSessionTime, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "ملف التدريب", description: "كل رحلتك التدريبية في مكان واحد" };

const TABS: TrainingsTab[] = ["active", "waitlist", "completed", "withdrawn", "cancelled"];
const MODES: ModeFilter[] = ["all", "in_person", "recorded", "live_remote"];

const EMPTY: Record<TrainingsTab, { title: string; description: string }> = {
  active: { title: "لم تسجّل في أي دورة بعد", description: "ابدأ بتصفّح البرامج المقترحة واختر ما يناسب مسارك المهني. التسجيل يستغرق أقل من دقيقتين." },
  waitlist: { title: "لست في قائمة انتظار أي دورة", description: "عندما تكتمل مقاعد دورة تريدها ستجد زر «انضم لقائمة الانتظار» في صفحتها — وسنتولّى الباقي." },
  completed: { title: "لا دورات مكتملة بعد", description: "ستظهر هنا الدورات التي أتممتها مع شهاداتها القابلة للتحقق." },
  withdrawn: { title: "لا دورات منسحبة", description: "الدورات التي تنسحب منها تظهر هنا مع حالة الاسترداد إن وُجد." },
  cancelled: { title: "لا دورات ملغاة", description: "إن ألغت الجهة دورة سجّلت فيها ستظهر هنا مع استرداد كامل تلقائي." },
};

/**
 * TRN-MYE-01 · ملف التدريب — نشطة (177:7591), نشطة · مباشر (4173:2), قائمة الانتظار (177:7881),
 * فارغ (177:8160), ملغاة (4136:549). Tab and mode live in the URL (?tab=…&mode=…).
 */
export default async function TrainingsPage(props: PageProps<"/trainee/trainings">) {
  const user = await requireTrainee("/trainee/trainings");
  const sp = await props.searchParams;
  const tab = (TABS.find((t) => t === sp.tab) ?? "active") as TrainingsTab;
  const mode = (MODES.find((m) => m === sp.mode) ?? "all") as ModeFilter;
  const view = await getTrainingsFile(user.id, tab, mode);

  const href = (t: TrainingsTab, m: ModeFilter = mode) => {
    const q = new URLSearchParams();
    if (t !== "active") q.set("tab", t);
    if (m !== "all") q.set("mode", m);
    const s = q.toString();
    return `/trainee/trainings${s ? `?${s}` : ""}`;
  };
  const empty = tab === "waitlist" ? view.waitlist.length === 0 : view.cards.length === 0;

  return (
    <>
      <TopBar title="ملف التدريب" subtitle="كل رحلتك التدريبية في مكان واحد" />
      <PageBody className="gap-6">
        {view.cancelled && (
          <Notice tone="error" title="دورة ملغاة في تسجيلاتك">
            <p>
              {view.cancelled.courseTitle}
              {view.cancelled.meta ? ` — ${view.cancelled.meta}` : ""} — أُلغيت من الجهة التدريبية لعدم اكتمال الحد الأدنى للمتدربين.
            </p>
            <p>
              يحق لك استرداد كامل المبلغ. تبويب «ملغاة» مستقل عن «منسحب منها».{" "}
              <Link href={view.cancelled.refundHref} className="text-state-error underline-offset-4 hover:underline">
                اطلب الاسترداد
              </Link>
            </p>
          </Notice>
        )}

        {view.live && tab === "active" && (
          <>
            <Notice tone="brand" title="لديك دورة بنمط مباشر">
              <p>«{view.live.courseTitle}» تُقدَّم في جلسات مباشرة مجدولة.</p>
              <p>افتح تفاصيل التسجيل لعرض موعد الجلسة القادمة والدخول إليها.</p>
            </Notice>
            <DataCard
              title="دورة مباشرة"
              rows={[
                { label: "الدورة", value: view.live.courseTitle },
                { label: "النمط", value: "مباشر · جلسات مجدولة", tone: "brand" },
                { label: "الجهة المقدِّمة", value: view.live.provider },
                ...(view.live.nextSession ? [{ label: "الجلسة القادمة", value: formatSessionTime(view.live.nextSession) }] : []),
                { label: "حالة التسجيل", value: "نشط", tone: "success" as const },
              ]}
            />
            <div className="flex justify-end">
              <ButtonLink href={`/trainee/trainings/${view.live.enrollmentId}`}>افتح تفاصيل التسجيل</ButtonLink>
            </div>
          </>
        )}

        <LearningProfileHeader view={view} />
        <JourneyStrip view={view} />

        {view.invite && (
          <DismissibleAlert tone="success" title="شغر مقعد في دورة تنتظرها">
            «{view.invite.courseTitle}» — {view.invite.meta}. لديك مهلة <Countdown until={view.invite.expiresAt} /> لقبول المقعد قبل أن ينتقل للتالي في الترتيب.{" "}
            <Link href={`/trainee/waitlist/${view.invite.entryId}`} className="text-state-success underline-offset-4 hover:underline">
              اقبل المقعد
            </Link>
          </DismissibleAlert>
        )}

        <nav aria-label="عرض حسب النمط" className="flex flex-wrap items-center gap-2.5">
          <FilterChip href={href(tab, "live_remote")} active={mode === "live_remote"}>
            عن بُعد · {toArabicDigits(view.modeCounts.live_remote)}
          </FilterChip>
          <FilterChip href={href(tab, "recorded")} active={mode === "recorded"}>
            مسجَّلة · {toArabicDigits(view.modeCounts.recorded)}
          </FilterChip>
          <FilterChip href={href(tab, "in_person")} active={mode === "in_person"}>
            حضورية · {toArabicDigits(view.modeCounts.in_person)}
          </FilterChip>
          <FilterChip href={href(tab, "all")} active={mode === "all"}>
            كل الأنماط
          </FilterChip>
          <span aria-hidden className="type-caption text-text-muted">
            عرض:
          </span>
        </nav>
        <ModeExplainer />

        <TrainingsTabs view={view} tab={tab} hrefFor={(t) => href(t)} />

        <section aria-label={TAB_LABELS[tab]} className="flex flex-col gap-4">
          {empty ? (
            <EmptyState
              icon={BookOpen}
              title={mode === "all" ? EMPTY[tab].title : "لا دورات بهذا النمط هنا"}
              description={mode === "all" ? EMPTY[tab].description : "جرّب «كل الأنماط» لعرض جميع دوراتك في هذا التبويب."}
              action={mode === "all" && tab === "active" ? <ButtonLink href="/trainee/discover">استكشف البرامج</ButtonLink> : undefined}
              className="border-dashed"
            />
          ) : tab === "waitlist" ? (
            view.waitlist.map((w) => <WaitlistEntryCard key={w.id} entry={w} />)
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {view.cards.map((c, i) => (
                <CourseCard key={c.href} course={c} priority={i < 3} />
              ))}
            </div>
          )}
        </section>

        {tab === "waitlist" && <WaitlistHowItWorks />}

        {view.recommended.length > 0 && (
          <section aria-labelledby="start-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-4 shadow-card sm:p-6">
            <h2 id="start-title" className="type-h3 text-text-primary">
              مقترحة لك للبدء
            </h2>
            <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {view.recommended.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </section>
        )}
      </PageBody>
    </>
  );
}
