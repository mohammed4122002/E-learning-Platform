import Link from "next/link";
import type { CourseHeader } from "@/lib/data/trainer-courses";
import { formatDayMonth, formatTime, pluralAr, toArabicDigits } from "@/lib/format";
import { InfoPanel, type InfoRow } from "./InfoPanel";

/* TRR-CRS-05 · نظرة عامة · مباشر (4236:743): «عرض تقرير الحضور» + نمط التقديم / مواعيد الجلسات / الحضور. */

export const PLATFORM_LABEL: Record<string, string> = { zoom: "Zoom", google_meet: "Google Meet", other: "منصة أخرى" };

export function sessionTimeLabel(startsAt: string, endsAt: string): string {
  return `${formatDayMonth(startsAt)} · ${formatTime(startsAt).replace(/\s?[صم]$/, "")} – ${formatTime(endsAt)}`;
}

export function LiveOverviewIntro({ course }: { course: CourseHeader }) {
  const platform = course.meetingPlatform ? (PLATFORM_LABEL[course.meetingPlatform] ?? "منصة أخرى") : null;
  const sessions = course.sessions.filter((s) => s.status !== "cancelled");
  const hours = Math.round(sessions.reduce((sum, s) => sum + (Date.parse(s.endsAt) - Date.parse(s.startsAt)) / 3_600_000, 0));
  const modeRows: InfoRow[] = [
    { label: "مزود الجلسة", value: platform ?? "لم يُحدَّد" },
    { label: "رابط الانضمام", value: course.meetingUrl ? "مرفوع وجاهز" : "لم يُرفع بعد", tone: course.meetingUrl ? "success" : "primary" },
    { label: "المقاعد والسعة", value: `${toArabicDigits(course.seatsTaken)} من ${toArabicDigits(course.capacity ?? 0)}` },
  ];
  const sessionRows: InfoRow[] = [
    ...sessions.map((s, i) => ({ label: `الجلسة ${toArabicDigits(i + 1)}`, value: sessionTimeLabel(s.startsAt, s.endsAt) })),
    {
      label: "إجمالي الجلسات",
      value: `${pluralAr(sessions.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])} · ${pluralAr(hours, ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"])}`,
    },
  ];
  return (
    <>
      <div className="flex justify-start">
        <Link
          href={`/trainer/courses/${course.id}/attendance`}
          className="rounded-[10px] bg-action-primary px-7 py-[15px] text-[16px] font-bold text-text-on-brand focus-ring hover:bg-action-primary-hover"
        >
          عرض تقرير الحضور
        </Link>
      </div>
      <InfoPanel title="نمط التقديم: مباشر" description="جلسات مباشرة عبر الإنترنت — بلا موقع حضوري." rows={modeRows} highlight />
      <InfoPanel title="مواعيد الجلسات" rows={sessionRows} />
      <InfoPanel
        title="الحضور"
        description={course.flags.autoAttendance ? "يُلتقط الحضور آليًا من تقرير الجلسة — لا رصد يدوي ولا رمز حضور." : "يرصد المدرب حضور كل جلسة من صفحة الحضور."}
        rows={[{ label: "طريقة الرصد", value: course.flags.autoAttendance ? `آلي من تقرير ${platform ?? "المنصة"}` : "يدوي", tone: "brand" }]}
      />
    </>
  );
}
