import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Banknote, CalendarDays, CircleCheck, Clock, Lock, MapPin, Pencil, RefreshCw, Users } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { PLATFORM_LABEL } from "@/components/trainer-courses/course/LiveOverviewIntro";
import { OverviewActions } from "@/components/trainer-courses/course/OverviewActions";
import { requireTrainer } from "@/lib/auth";
import { getAssignmentsBoard, sessionState } from "@/lib/data/trainer-course-page";
import { getCourseHeader, snapshotList } from "@/lib/data/trainer-courses";
import { formatDate, formatDayMonth, formatPrice, formatTime, toArabicDigits } from "@/lib/format";
import { riyadhParts, weekdaysLabel } from "@/lib/trainer-courses";

export const metadata: Metadata = { title: "صفحة الدورة", description: "نظرة عامة على الدورة وإجراءاتها" };

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={`flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px] ${className ?? ""}`}>{children}</section>;
}

function DataRow({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-16 bg-bg-page px-[18px] py-[15px] sm:flex-row sm:items-center sm:gap-3.5">
      <div className="flex min-w-0 items-center gap-3 sm:flex-1">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
          <Glyph icon={icon} size={20} />
        </span>
        <span className="type-body-lg text-text-secondary">{label}</span>
      </div>
      <span className="min-w-0 type-subtitle break-words text-text-primary sm:max-w-[60%] sm:text-end">{value}</span>
    </div>
  );
}

function dateRange(start: string | null, end: string | null): string {
  if (!start) return "لم تُحدَّد";
  if (!end || riyadhParts(start).date === riyadhParts(end).date) return formatDate(start);
  const sameMonth = riyadhParts(start).date.slice(0, 7) === riyadhParts(end).date.slice(0, 7);
  return sameMonth ? `${formatDayMonth(start).split(" ")[0]} – ${formatDate(end)}` : `${formatDayMonth(start)} – ${formatDate(end)}`;
}

/** TRR-CRS-05 · صفحة الدورة · ١ نظرة عامة (334:12476; live 4236:743 adds the intro cards in the layout). */
export default async function CourseOverviewPage({ params }: PageProps<"/trainer/courses/[id]">) {
  const { id } = await params;
  await requireTrainer(`/trainer/courses/${id}`);
  const course = await getCourseHeader(id);
  if (!course) notFound();
  if (course.mode === "recorded" && course.status !== "draft") redirect(`/trainer/courses/${id}/dashboard`);

  const board = await getAssignmentsBoard(id, course.sessions);
  const now = new Date();
  const today = course.sessions.find((s) => sessionState(s, now) === "today");
  const live = course.sessions.filter((s) => s.status !== "cancelled");
  const days = [...new Set(live.map((s) => riyadhParts(s.startsAt).weekday))];
  const first = live[0];
  const description = (typeof course.snapshot.summary === "string" && course.snapshot.summary) || course.summary || "";
  const objectives = snapshotList(course.snapshot, "objectives");
  const pass = [
    "حضور ٨٠٪",
    ...(board.quizzes.count && board.quizzes.passPercent !== null ? [`درجة ${toArabicDigits(board.quizzes.passPercent)}٪`] : []),
    ...(board.items.length ? ["قبول الواجبات"] : []),
  ].join(" + ");
  const place =
    course.mode === "live_remote"
      ? [course.venue, "عبر الإنترنت", course.meetingPlatform ? PLATFORM_LABEL[course.meetingPlatform] : null]
      : [course.venue, course.city];
  const sensitive = course.status !== "draft" && course.status !== "cancelled" && course.status !== "completed";

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Card>
          <h2 className="type-h2 text-text-primary">وصف الدورة</h2>
          <p className="flex items-start gap-2.5 rounded-12 bg-state-info-bg px-4 pt-[13px] pb-3.5 type-body text-state-info">
            <Glyph icon={Lock} size={20} className="mt-1" />
            <span className="flex-1">الوصف والأهداف والمحاور موروثة من البرنامج المعتمد — تُعدَّل من البرنامج لا من الدورة.</span>
          </p>
          <p className="type-body-lg text-text-secondary">{description || "لا وصف في البرنامج بعد."}</p>
        </Card>
        {objectives.length > 0 && (
          <Card>
            <h2 className="type-h2 text-text-primary">الأهداف التعليمية</h2>
            <ul className="flex flex-col gap-[18px]">
              {objectives.map((o) => (
                <li key={o} className="flex items-center gap-3.5 rounded-16 bg-state-success-bg px-[18px] py-[15px]">
                  <Glyph icon={CircleCheck} size={20} className="text-state-success" />
                  <span className="flex-1 type-body-lg text-text-primary">{o}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="min-w-[12rem] flex-1 type-h2 text-text-primary">بيانات هذه الدورة</h2>
            <span className="inline-flex items-center gap-[7px] rounded-full bg-state-success-bg px-3.5 py-[9px] type-subtitle text-state-success">
              <Glyph icon={Pencil} size={20} />
              قابلة للتعديل
            </span>
          </div>
          <DataRow icon={CalendarDays} label="التواريخ" value={dateRange(course.startsAt, course.endsAt)} />
          <DataRow
            icon={Clock}
            label="التوقيت"
            value={first ? `${weekdaysLabel(days)} · ${formatTime(first.startsAt).replace(/\s?[صم]$/, "")} – ${formatTime(first.endsAt)}` : "لم يُحدَّد"}
          />
          <DataRow icon={MapPin} label="المكان" value={place.filter(Boolean).join(" · ") || "لم يُحدَّد"} />
          <DataRow
            icon={Users}
            label="المقاعد"
            value={course.capacity ? `${toArabicDigits(course.capacity)} مقعدًا${course.minCapacity ? ` · الحد الأدنى ${toArabicDigits(course.minCapacity)}` : ""}` : "لم تُحدَّد"}
          />
          <DataRow icon={Banknote} label="السعر" value={!course.pricingSet ? "لم يُحدَّد" : course.price === 0 ? "مجانية" : `${formatPrice(course.price, course.currency)} للمتدرب`} />
          <DataRow icon={RefreshCw} label="سياسة الاسترداد" value="السياسة الموحّدة للمنصة" />
          <DataRow icon={CircleCheck} label="شرط الاجتياز" value={pass} />
        </Card>
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
        <OverviewActions
          courseId={id}
          today={today ? { label: `الجلسة ${toArabicDigits(live.indexOf(today) + 1)} · ${formatTime(today.startsAt)}` } : null}
          trainees={course.buyers}
          sensitive={sensitive}
        />
      </aside>
    </div>
  );
}
