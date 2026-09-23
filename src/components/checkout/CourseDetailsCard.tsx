import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarDays, Clock, MapPin, Presentation, User } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { MODES } from "@/components/course/CourseCover";
import { formatDate, formatDayMonth, formatTime } from "@/lib/format";
import type { CheckoutCourse } from "@/lib/data/checkout";

/** "تفاصيل الدورة" card (TRN-ENR-01/05): label (17 Regular, icon 16) ↔ value (16 Medium), course reference at the end. */
export function CourseDetailsCard({ course }: { course: CheckoutCourse }) {
  const rows: { icon: LucideIcon; label: string; value: string }[] = [{ icon: BookOpen, label: "البرنامج", value: course.programTitle }];
  if (course.mode !== "recorded" && course.startsAt) {
    rows.push({
      icon: CalendarDays,
      label: "الدورة",
      value: course.endsAt ? `${formatDayMonth(course.startsAt)} – ${formatDate(course.endsAt)}` : formatDate(course.startsAt),
    });
  }
  if (course.firstSession) {
    rows.push({ icon: Clock, label: "التوقيت", value: `${formatTime(course.firstSession.startsAt)} – ${formatTime(course.firstSession.endsAt)}` });
  }
  if (course.mode === "in_person") rows.push({ icon: MapPin, label: "المكان", value: [course.city, course.venue].filter(Boolean).join(" · ") });
  rows.push({ icon: User, label: "المدرب", value: course.trainerName });
  rows.push({ icon: Presentation, label: "نمط التقديم", value: MODES[course.mode].label });

  return (
    <section aria-labelledby="course-details-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-surface p-6">
      <h2 id="course-details-title" className="type-h3 text-text-primary">
        تفاصيل الدورة
      </h2>
      <dl className="flex flex-col gap-4">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-center gap-3">
            <dt className="flex flex-1 items-center gap-2 type-body text-text-secondary">
              <Glyph icon={r.icon} size={16} />
              {r.label}
            </dt>
            <dd className="type-subtitle text-text-primary">{r.value}</dd>
          </div>
        ))}
        <div className="flex items-center gap-2.5 type-caption text-text-muted">
          <dt className="flex-1">معرّف الدورة</dt>
          <dd dir="ltr">{course.code}</dd>
        </div>
      </dl>
    </section>
  );
}

export function refundNoteFor(course: Pick<CheckoutCourse, "mode" | "price">): string | null {
  if (course.price === 0) return null;
  return course.mode === "recorded" ? "استرداد كامل خلال ١٤ يومًا من الشراء." : "استرداد كامل حتى ٧ أيام قبل بدء الدورة.";
}
