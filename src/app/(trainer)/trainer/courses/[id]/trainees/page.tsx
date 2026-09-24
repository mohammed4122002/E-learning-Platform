import type { Metadata } from "next";
import { Banknote, CircleAlert, CircleCheck, Hourglass, MessageSquare, TrendingUp, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { ListControls } from "@/components/trainer-ops/ListControls";
import { BroadcastDialog } from "@/components/trainer-ops/BroadcastDialog";
import { DataPanel, StatCard, StatGrid } from "@/components/trainer-ops/parts";
import {
  AtRiskCard,
  BuyerQuestionsCard,
  BuyersCard,
  PublishedMaterialsCard,
  RosterCard,
  SeatsSummaryCard,
  SensitiveActionsCard,
  WaitlistCard,
  moneyWhole,
} from "@/components/trainer-ops/Roster";
import { requireTrainer } from "@/lib/auth";
import { getManagedCourse } from "@/lib/data/trainer-course";
import { getLastOperation, getRecordedView, getRoster, sortRoster, type RosterSort } from "@/lib/data/trainer-roster";
import { formatDayMonth, formatRelative, formatTime, toArabicDigits } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/trainer/courses/[id]/trainees">): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `المتدربون · ${course.title}` };
}

const SORTS = [
  { value: "attendance", label: "الأقل حضورًا أولًا" },
  { value: "recent", label: "الأحدث تسجيلًا" },
  { value: "name", label: "حسب الاسم" },
];

const plural = (n: number, one: string, two: string, few: string, many: string) =>
  n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${toArabicDigits(n)} ${few}` : `${toArabicDigits(n)} ${many}`;

/** TRR-CRS-05 · ٥ المتدربون (436:19902) · recorded courses: TRR-CRS-03 مسجَّلة (327:11674) · cancelled: 4236:1195. */
export default async function TraineesTab(props: PageProps<"/trainer/courses/[id]/trainees">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await requireTrainer(`/trainer/courses/${id}/trainees`);
  const course = await getManagedCourse(id);
  const base = `/trainer/courses/${course.id}`;

  if (course.mode === "recorded") {
    const v = await getRecordedView(course, user.id);
    return (
      <div className="flex flex-col gap-6">
        <StatGrid label="ملخّص الكورس المسجَّل">
          <StatCard valueSize="h2" icon={MessageSquare} iconTone="error" label="أسئلة بانتظار ردك" value={toArabicDigits(v.pendingQuestions)} caption={v.oldestQuestionAt ? `أقدمها ${formatRelative(v.oldestQuestionAt)}` : "لا أسئلة معلّقة"} captionTone={v.pendingQuestions ? "error" : "muted"} />
          <StatCard valueSize="h2" icon={Banknote} label="ر.س إيراد" value={moneyWhole(v.revenue)} caption={`${toArabicDigits(v.buyers.length)} × ${moneyWhole(course.price)} ر.س`} captionTone="muted" />
          <StatCard valueSize="h2" icon={TrendingUp} label="متوسط الإكمال" value={`${toArabicDigits(v.avgCompletion)}٪`} caption={`${toArabicDigits(v.completedCount)} أكملوا الكورس`} captionTone="muted" />
          <StatCard valueSize="h2" icon={Users} label="مشتريًا" value={toArabicDigits(v.buyers.length)} caption={`+${toArabicDigits(v.thisMonth)} هذا الشهر`} captionTone="success" />
        </StatGrid>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <BuyersCard buyers={v.buyers} modules={v.modules.length} courseId={course.id} />
          </div>
          <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
            <PublishedMaterialsCard modules={v.modules} />
            <BuyerQuestionsCard pending={v.pendingQuestions} />
          </div>
        </div>
      </div>
    );
  }

  const roster = await getRoster(course);
  const cancelled = course.status === "cancelled";
  const cancelOp = cancelled ? await getLastOperation(course.id, "cancel") : null;
  const sort = (["attendance", "recent", "name"].includes(String(sp.sort)) ? sp.sort : "attendance") as RosterSort;
  const q = typeof sp.q === "string" ? sp.q : "";
  const rows = sortRoster(roster.rows, sort, q);
  const regular = roster.rows.filter((r) => r.band === "regular").length;
  const struggling = roster.rows.filter((r) => r.band === "below" || r.band === "at_risk").length;
  const atRisk = roster.rows.filter((r) => r.band === "at_risk");
  const capacity = course.capacity ?? 0;
  const started = course.status === "in_progress" || (course.startsAt ? new Date(course.startsAt).getTime() <= new Date().getTime() : false);
  const editable = !cancelled && course.status !== "completed";

  return (
    <div className="flex flex-col gap-6">
      {sp.postponed !== undefined && (
        <Alert tone="success" title="أُجّلت الدورة ونُقلت كل الجلسات">
          وصل إشعار التأجيل إلى {plural(Number(sp.postponed) || 0, "متدرب واحد", "متدربين اثنين", "متدربين", "متدربًا")} مع خيار الانسحاب باسترداد كامل خلال ٧ أيام.
        </Alert>
      )}
      {cancelled && (
        <>
          <DataPanel
            tone="error"
            title="تم إلغاء الدورة"
            intro={
              <>
                <p>أُلغيت هذه الدورة نهائيًا ولم تعد متاحة للتسجيل.</p>
                <p className="mt-2.5">أُبلغ المسجّلون بالإلغاء.</p>
              </>
            }
            rows={[
              { label: "حالة الدورة", value: "ملغاة", tone: "error" },
              ...(cancelOp ? [{ label: "تاريخ الإلغاء", value: `${formatDayMonth(cancelOp.created_at)} · ${formatTime(cancelOp.created_at)}` }] : []),
              { label: "المسجّلون وقت الإلغاء", value: plural(cancelOp?.affected ?? roster.rows.length, "متدرب واحد", "متدربان", "متدربين", "متدربًا") },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/trainer/courses">العودة إلى دوراتي</ButtonLink>
            <BroadcastDialog variant="secondary" courseId={course.id} audience="enrolled" recipientsLabel="المسجّلين وقت الإلغاء" title="رسالة إلى المسجّلين" label="راسل المسجّلين" />
            <ButtonLink href={`${base}/seats`} variant="outline" disabled>
              عدّل عدد المقاعد
            </ButtonLink>
            <ButtonLink href={`${base}/postpone`} variant="outline" disabled>
              أجّل الدورة
            </ButtonLink>
          </div>
        </>
      )}

      <StatGrid label="ملخّص المتدربين">
        <StatCard icon={Hourglass} iconTone="info" label="على قائمة الانتظار" value={toArabicDigits(roster.waitlist.length)} caption="يُدعون عند أي انسحاب" captionTone="info" />
        <StatCard icon={CircleAlert} iconTone="warning" label={struggling === 2 ? "متعثّران" : "متعثّرون"} value={toArabicDigits(struggling)} caption="حضور أقل من ٧٥٪" captionTone="warning" />
        <StatCard icon={CircleCheck} iconTone="success" label="منتظمون" value={toArabicDigits(regular)} caption="حضور ٧٥٪ فأكثر" captionTone="success" />
        <StatCard icon={Users} label="مسجَّلًا" value={toArabicDigits(roster.rows.length)} caption={capacity ? `من ${toArabicDigits(capacity)} مقعدًا` : undefined} />
      </StatGrid>

      <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[26px]">
          <ListControls sortOptions={SORTS} sort={sort} q={q} searchLabel="ابحث باسم المتدرب" />
          <RosterCard rows={rows} courseId={course.id} total={roster.rows.length} disabled={false} />
        </div>
        <div className="flex w-full shrink-0 flex-col gap-[22px] lg:w-[380px]">
          <WaitlistCard rows={roster.waitlist} />
          {!cancelled && <AtRiskCard rows={atRisk} remaining={roster.remainingSessions} courseId={course.id} />}
          <SeatsSummaryCard
            taken={roster.seatsTaken}
            capacity={capacity}
            waitlist={roster.waitlist.length}
            withdrawn={roster.withdrawn}
            href={`${base}/seats`}
            disabled={!editable}
          />
          <SensitiveActionsCard
            count={roster.rows.length}
            postponeHref={`${base}/postpone`}
            cancelHref={`${base}/cancel`}
            canPostpone={editable && !started}
            canCancel={editable}
          />
        </div>
      </div>
    </div>
  );
}
