import type { Metadata } from "next";
import { CircleAlert, CircleCheck, Clock, FileText } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { AttendanceRegister } from "@/components/trainer-ops/AttendanceRegister";
import { ImportPanel, QrPanel } from "@/components/trainer-ops/AttendanceSources";
import { LockedRegister } from "@/components/trainer-ops/LockedRegister";
import { SideCard, SideRow, RuleRow } from "@/components/trainer-ops/parts";
import { hoursLeft, hoursWord, sessionDay } from "@/components/trainer-ops/Attendance";
import { requireTrainer } from "@/lib/auth";
import { courseLabel, getManagedCourse, runLabel } from "@/lib/data/trainer-course";
import { getRegister, type RegisterView, type SessionSummary } from "@/lib/data/trainer-attendance";
import { formatDayMonth, formatRelative, formatTime, toArabicDigits } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/trainer/courses/[id]/attendance/[sessionId]">): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `رصد الحضور · ${course.title}` };
}

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

function sideStatus(s: SessionSummary): { status: string; tone: "success" | "warning" | "error" | "neutral" } {
  if (s.approved) return { status: `${toArabicDigits(s.attended)} من ${toArabicDigits(s.roster)}`, tone: s.roster && s.attended / s.roster >= 0.9 ? "success" : "warning" };
  if (!s.started) return { status: "قادمة", tone: "neutral" };
  return { status: "لم يُرصد", tone: "error" };
}

function SessionsSide({ v, courseId }: { v: RegisterView; courseId: string }) {
  const list = [...v.overview.sessions].filter((s) => s.started).reverse();
  return (
    <>
      <SideCard title="سجل الجلسات" titleId="side-log" description="اضغط أي جلسة لمراجعة حضورها أو تعديله.">
        <ul className="flex flex-col gap-4">
          {list.map((s) => {
            const st = sideStatus(s);
            return (
              <SideRow
                key={s.id}
                href={`/trainer/courses/${courseId}/attendance/${s.id}`}
                current={s.id === v.session.id}
                tone={st.tone === "error" ? "error" : undefined}
                title={`الجلسة ${toArabicDigits(s.position)}`}
                caption={isToday(s.startsAt) ? `اليوم · ${formatDayMonth(s.startsAt)}` : formatDayMonth(s.startsAt)}
                status={st.status}
                statusTone={st.tone}
              />
            );
          })}
        </ul>
      </SideCard>
      <SideCard title="قواعد الرصد" titleId="side-rules">
        <ul className="flex flex-col gap-4">
          <RuleRow icon={Clock} tone="warning">
            يُقفل الرصد بعد ٤٨ ساعة من الجلسة
          </RuleRow>
          <RuleRow icon={CircleCheck} tone="success">
            «متأخر» يُحتسب حضورًا في نسبة الاجتياز
          </RuleRow>
          <RuleRow icon={FileText} tone="brand">
            «غائب بعذر» لا يُحتسب غيابًا
          </RuleRow>
          <RuleRow icon={CircleAlert} tone="error">
            الاجتياز يتطلب ٧٥٪ حضورًا
          </RuleRow>
        </ul>
      </SideCard>
    </>
  );
}

/**
 * TRR-ATT-01 رصد الحضور (272:4961) · locked (463:34053) · TRR-ATT-02 with the QR block while an in-person session is
 * running (4253:2) · TRR-ATT-03 with the imported report for live sessions (4253:585 / 4253:1077).
 */
export default async function RegisterPage(props: PageProps<"/trainer/courses/[id]/attendance/[sessionId]">) {
  const { id, sessionId } = await props.params;
  await requireTrainer(`/trainer/courses/${id}/attendance/${sessionId}`);
  const course = await getManagedCourse(id);
  const v = await getRegister(course, sessionId);
  const s = v.session;
  const base = `/trainer/courses/${course.id}`;
  const sessionLabel = `الجلسة ${toArabicDigits(s.position)} من ${toArabicDigits(v.total)} · ${sessionDay(s.startsAt)}`;
  const approved = v.sheet?.status === "approved";
  const now = new Date().getTime();
  const cancelled = s.status === "cancelled" || course.status === "cancelled";
  const canEdit = s.started && !s.locked && !cancelled;
  const qrWindow = course.mode === "in_person" && !cancelled && now >= new Date(s.startsAt).getTime() - 30 * 60_000 && now <= new Date(s.endsAt).getTime() + 30 * 60_000;
  const liveRemote = course.mode === "live_remote" && s.started && !s.locked && !cancelled;
  const markedPresent = v.rows.filter((r) => r.mark === "present" || r.mark === "late").length;

  const heroTitle = isToday(s.startsAt) ? "رصد حضور جلسة اليوم" : `رصد حضور الجلسة ${toArabicDigits(s.position)}`;
  const heroBody = !s.started
    ? `تبدأ الجلسة ${formatRelative(s.startsAt)} — يُفتح الرصد عند بدايتها.`
    : approved
      ? `اعتُمد الحضور ${formatRelative(v.sheet?.approvedAt ?? s.endsAt)}. التعديل يتطلب سببًا مسجَّلًا، ويُقفل الرصد بعد ${hoursWord(hoursLeft(s.lockAt))}.`
      : s.ended
        ? `الجلسة ${toArabicDigits(s.position)} انتهت ${formatRelative(s.endsAt)} ولم تُرصد. يُقفل الرصد تلقائيًا بعد ٤٨ ساعة من انتهاء الجلسة — بعدها تحتاج طلب فتح من الإدارة.`
        : "الجلسة جارية الآن. يُقفل الرصد تلقائيًا بعد ٤٨ ساعة من انتهاء الجلسة — بعدها تحتاج طلب فتح من الإدارة.";

  const subtitle = `الجلسة ${toArabicDigits(s.position)} · ${sessionDay(s.startsAt)}`;

  if (s.locked) {
    const open = v.overview.sessions.filter((x) => x.started && !x.locked && !x.approved);
    return (
      <>
        <TopBar title="رصد الحضور" subtitle={`الجلسة ${toArabicDigits(s.position)} · مقفلة`} />
        <PageBody className="gap-6">
          <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel(course), href: `${base}/attendance` }, { label: "الحضور" }]} />
          <LockedRegister
            courseId={course.id}
            sessionId={s.id}
            body={`مضت ٤٨ ساعة على انتهاء الجلسة ${toArabicDigits(s.position)} (${formatDayMonth(s.endsAt)} · ${formatTime(s.endsAt)}). سجل الحضور مُغلق ولا يقبل التعديل.`}
            rows={v.rows}
            approved={approved}
            unlockRequestedAt={v.sheet?.unlockRequestedAt ?? null}
            open={open.map((x) => ({ id: x.id, label: `الجلسة ${toArabicDigits(x.position)} · ${x.title}`, left: `يتبقى ${hoursWord(hoursLeft(x.lockAt))}` }))}
          />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <TopBar title="رصد الحضور" subtitle={subtitle} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel(course), href: `${base}/attendance` }, { label: "رصد الحضور" }]} />
        <AttendanceRegister
          courseId={course.id}
          sessionId={s.id}
          rows={v.rows}
          approved={approved}
          canEdit={canEdit}
          hero={{
            title: heroTitle,
            body: heroBody,
            chips: [
              { icon: "calendar", label: `الجلسة ${toArabicDigits(s.position)} من ${toArabicDigits(v.total)}`, tone: "secondary" },
              approved ? { icon: "check", label: "مرصود", tone: "success" } : { icon: "alert", label: "لم يُرصد بعد", tone: "warning" },
            ],
          }}
          top={
            qrWindow ? (
              <QrPanel
                courseId={course.id}
                sessionId={s.id}
                courseLabel={courseLabel(course)}
                sessionLabel={sessionLabel}
                present={v.rows.filter((r) => r.checkedIn).length}
                roster={v.rows.length}
                initial={v.code}
                backHref={`${base}/attendance`}
              />
            ) : liveRemote ? (
              <ImportPanel
                courseId={course.id}
                sessionId={s.id}
                courseLabel={courseLabel(course)}
                sessionLabel={sessionLabel}
                status={v.sheet?.importStatus ?? null}
                provider={v.sheet?.importProvider ?? null}
                present={markedPresent}
                absent={v.rows.length - markedPresent}
                backHref={`${base}/attendance`}
              />
            ) : undefined
          }
          aside={<SessionsSide v={v} courseId={course.id} />}
        />
      </PageBody>
    </>
  );
}
