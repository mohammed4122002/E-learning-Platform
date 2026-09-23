import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DataCard, Notice, type NoticeTone } from "@/components/trainings/ui";
import { ScheduledLayout } from "@/components/trainings/EnrollmentLayouts";
import { messagesHref } from "@/components/trainings/EnrollmentSections";
import { DeviceCheckButton, JoinSessionButton, RefreshStatus } from "@/components/trainings/LiveSessionControls";
import { requireTrainee } from "@/lib/auth";
import { getEnrollmentDetail } from "@/lib/data/trainings";
import { formatDayMonth, formatSessionTime, formatTime, toArabicDigits } from "@/lib/format";
import type { LiveSessionState } from "@/lib/trainings";

export const metadata: Metadata = { title: "الجلسة المباشرة", description: "تفاصيل الجلسة المباشرة والدخول إليها" };

type View = { tone: NoticeTone; title: string; lines: string[]; status: { value: string; tone?: "success" | "error" | "brand" | "warning" } };

const VIEWS: Record<LiveSessionState, View> = {
  scheduled: { tone: "brand", title: "الجلسة غير متاحة بعد", lines: ["سيظهر زر الدخول عند فتح الجلسة قبل موعدها بعشر دقائق.", "ستصلك تذكرة في الإشعارات قبل الموعد."], status: { value: "مجدولة" } },
  join: { tone: "success", title: "الجلسة متاحة الآن", lines: ["ادخل الآن. يُسجَّل حضورك تلقائيًا عند الدخول."], status: { value: "متاحة الآن", tone: "success" } },
  waiting_host: { tone: "brand", title: "بانتظار انضمام المدرب", lines: ["حان موعد الجلسة ولم يبدأها المدرب بعد. ابقَ في هذه الصفحة — ستتحدّث الحالة تلقائيًا فور بدئها."], status: { value: "بانتظار المضيف", tone: "warning" } },
  ended: { tone: "neutral", title: "انتهت الجلسة", lines: [], status: { value: "منتهية" } },
  cancelled: { tone: "error", title: "أُلغيت الجلسة", lines: ["أُلغيت هذه الجلسة. سيُعلَن موعد بديل من الجهة التدريبية."], status: { value: "ملغاة", tone: "error" } },
  error: { tone: "error", title: "تعذّر الاتصال بالجلسة", lines: ["لم نتمكن من فتح الجلسة. تحقّق من اتصالك ثم أعد المحاولة."], status: { value: "تعذّر الدخول", tone: "error" } },
};

/**
 * TRN-MYE-02 · الجلسة المباشرة — مجدولة (4141:2), الانضمام متاح (4141:573), بانتظار المدرب (4141:1098),
 * انتهت (4141:1615), ملغاة (4141:2136), خطأ في الاتصال (4141:2649). State is derived from course_sessions.
 */
export default async function LiveSessionPage(props: PageProps<"/trainee/trainings/[id]/session">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await requireTrainee(`/trainee/trainings/${id}/session`);
  const d = await getEnrollmentDetail(user.id, id);
  if (!d) notFound();
  if (d.course.mode !== "live_remote") redirect(`/trainee/trainings/${id}`);

  const s = (typeof sp.session === "string" && d.sessions.find((x) => x.id === sp.session)) || d.liveSession;
  if (!s) redirect(`/trainee/trainings/${id}`);

  const errorCode = typeof sp.error === "string" ? sp.error : null;
  let state: LiveSessionState = s.live;
  if (errorCode === "session_closed") state = s.state === "cancelled" ? "cancelled" : "ended";
  else if (errorCode === "session_not_live") state = "waiting_host";
  else if (errorCode) state = "error";

  const view = VIEWS[state];
  const attended = s.state === "attended";
  const lines = state === "ended" ? [attended ? "شكرًا لحضورك. سُجِّل حضورك لهذه الجلسة." : "لم يُسجَّل حضورك في هذه الجلسة. إن حضرتها تواصل مع المدرب خلال ٤٨ ساعة."] : view.lines;
  const minutes = Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000);
  const back = `/trainee/trainings/${d.id}`;
  const selfHref = `/trainee/trainings/${d.id}/session?session=${s.id}`;
  const canJoin = ["confirmed", "in_progress"].includes(d.status);

  const rows: { label: string; value: string; tone?: "success" | "error" | "brand" | "warning" }[] = [{ label: "الجلسة", value: s.title }];
  if (state === "ended") {
    rows.push({ label: "وقت الانتهاء", value: `${formatTime(s.endsAt)} · ${formatDayMonth(s.endsAt)}` });
    rows.push({ label: "حالة الحضور", value: attended ? "حاضر" : "غائب", tone: attended ? "success" : "error" });
  } else if (state !== "cancelled" && state !== "error") {
    if (d.course.trainer) rows.push({ label: "المدرب", value: d.course.trainer });
    if (state !== "waiting_host") {
      rows.push({ label: "التاريخ والوقت", value: formatSessionTime(s.startsAt) });
      if (state === "scheduled") rows.push({ label: "المنطقة الزمنية", value: "توقيت الرياض GMT+3" });
      rows.push({ label: "المدة", value: `${toArabicDigits(minutes)} دقيقة` });
    }
  }
  rows.push({ label: "حالة الجلسة", ...view.status });

  // Visual order of the frames (right → left) inside a justify-end row.
  const actions = {
    scheduled: (
      <>
        <a href={`/trainee/trainings/${d.id}/calendar`} download className="inline-flex h-12 items-center justify-center rounded-12 px-6 type-button text-text-brand inner-stroke istroke-w-[1.5px] istroke-c-action-primary hover:bg-bg-brand-tint focus-ring">
          أضف للتقويم
        </a>
        <Button disabled>الدخول إلى الجلسة</Button>
      </>
    ),
    join: (
      <>
        <DeviceCheckButton />
        {canJoin ? <JoinSessionButton enrollmentId={d.id} sessionId={s.id} /> : <Button disabled>الدخول إلى الجلسة</Button>}
      </>
    ),
    waiting_host: (
      <>
        <ButtonLink href={back} variant="secondary">
          مغادرة الجلسة
        </ButtonLink>
        <RefreshStatus label="حدّث الحالة" every={30} href={selfHref} />
      </>
    ),
    ended: <ButtonLink href={back}>عد إلى تفاصيل التسجيل</ButtonLink>,
    cancelled: (
      <>
        <ButtonLink href={messagesHref(d)} variant="secondary">
          تواصل مع الجهة
        </ButtonLink>
        <ButtonLink href={back}>عد إلى تفاصيل التسجيل</ButtonLink>
      </>
    ),
    error: (
      <>
        <ButtonLink href={back} variant="secondary">
          عد إلى تفاصيل التسجيل
        </ButtonLink>
        <RefreshStatus label="أعد المحاولة" href={selfHref} />
      </>
    ),
  }[state];

  return (
    <>
      <TopBar title="تفاصيل تسجيلي" subtitle={d.course.startsAt ? `${d.course.title} · دورة ${formatDayMonth(d.course.startsAt)}` : d.course.title} />
      <PageBody className="gap-6">
        <ScheduledLayout
          d={d}
          top={
            <>
              <Notice tone={view.tone} title={view.title}>
                {lines.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </Notice>
              <DataCard title="تفاصيل الجلسة" rows={rows} />
              <div className="flex flex-wrap justify-end gap-3">{actions}</div>
            </>
          }
        />
      </PageBody>
    </>
  );
}
