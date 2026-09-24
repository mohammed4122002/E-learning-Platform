import Image from "next/image";
import { CalendarCheck, CalendarDays, CircleCheckBig, CircleAlert, Hourglass, Pencil, Star, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ModeBadge } from "@/components/course/CourseCover";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import type { CourseHeader } from "@/lib/data/trainer-courses";
import { versionLabel } from "@/lib/data/trainer-courses";
import type { HeroState } from "@/lib/data/trainer-course-page";
import { formatNumber, formatPercent, formatRating, toArabicDigits } from "@/lib/format";

/* TRR-CRS-05 «COURSE HERO» (334:12613): cover (image 168 · brand gradient 120), state/mode/session pills,
   40 Bold title, program line, stats row, and the preview / edit buttons. */

const STATE_PILL: Record<HeroState, { label: string; icon: LucideIcon; className: string }> = {
  running: { label: "جارية الآن", icon: CalendarCheck, className: "bg-state-success-bg text-state-success" },
  upcoming: { label: "قادمة", icon: CalendarDays, className: "bg-bg-brand-tint text-text-brand" },
  full: { label: "اكتملت المقاعد", icon: Users, className: "bg-state-warning-bg text-state-warning" },
  ended: { label: "منتهية", icon: CircleCheckBig, className: "bg-bg-disabled text-text-secondary" },
  cancelled: { label: "ملغاة", icon: CircleAlert, className: "bg-state-error-bg text-state-error" },
  draft: { label: "مسودة", icon: Pencil, className: "bg-state-warning-bg text-state-warning" },
};

function Pill({ icon, className, children }: { icon: LucideIcon; className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-[7px] whitespace-nowrap rounded-full px-3.5 py-[9px] type-subtitle ${className}`}>
      <Glyph icon={icon} size={20} />
      {children}
    </span>
  );
}

function Stat({ icon, tone, children }: { icon: LucideIcon; tone: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[7px] whitespace-nowrap type-subtitle text-text-primary">
      <Glyph icon={icon} size={20} className={tone} />
      {children}
    </span>
  );
}

export function courseLine(c: CourseHeader): string {
  const place =
    c.mode === "recorded"
      ? ["دورة مسجَّلة"]
      : c.mode === "live_remote"
        ? [c.venue, "جلسات مباشرة عبر الإنترنت"]
        : [c.venue, c.city];
  return [`من برنامج «${c.program.title}» ${versionLabel(c.program.version)}`, ...place.filter(Boolean)].join(" · ");
}

export function CourseHero({
  course,
  state,
  session,
  editHref,
}: {
  course: CourseHeader;
  state: HeroState;
  session: { index: number; total: number } | null;
  editHref: string;
}) {
  const pill = STATE_PILL[state];
  return (
    <section className="overflow-hidden rounded-22 border border-border-default bg-bg-card shadow-card">
      {course.cover ? (
        <div className="relative h-[120px] w-full sm:h-[168px]">
          <Image src={course.cover} alt="" fill priority sizes="(min-width: 1280px) 1064px, 100vw" className="object-cover" />
        </div>
      ) : (
        <div aria-hidden className="h-[88px] w-full bg-linear-to-r from-action-primary to-[#8b67f6] sm:h-[120px]" />
      )}
      <div className="flex flex-col gap-5 px-5 pt-5 pb-6 sm:px-[30px] sm:pt-6 sm:pb-[26px] lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {session && session.total > 0 && (
              <Pill icon={CalendarDays} className="bg-bg-brand-tint text-text-brand">
                الجلسة {toArabicDigits(session.index)} من {toArabicDigits(session.total)}
              </Pill>
            )}
            <ModeBadge mode={course.mode} label={course.mode === "live_remote" ? "مباشر" : undefined} />
            <Pill icon={pill.icon} className={pill.className}>
              {pill.label}
            </Pill>
          </div>
          <h2 className="text-[28px] leading-[1.15] font-bold text-text-primary sm:text-[40px]">{course.title}</h2>
          <p className="type-body-lg text-text-secondary">{courseLine(course)}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <Stat icon={Hourglass} tone="text-state-success">
              {formatNumber(Math.round(course.revenue))} ر.س إيراد
            </Stat>
            {course.mode !== "recorded" && course.attendanceAvg !== null && (
              <Stat icon={CircleCheckBig} tone="text-state-success">
                {formatPercent(course.attendanceAvg)} متوسط الحضور
              </Stat>
            )}
            <Stat icon={Star} tone="text-action-accent">
              {course.ratingCount > 0 ? `${formatRating(course.ratingAvg)} من ${toArabicDigits(course.ratingCount)} تقييمًا` : "لا تقييمات بعد"}
            </Stat>
            <Stat icon={Users} tone="text-text-brand">
              {course.mode === "recorded"
                ? `${toArabicDigits(course.buyers)} مشترٍ`
                : `${toArabicDigits(course.seatsTaken)} من ${toArabicDigits(course.capacity ?? 0)} مقعدًا`}
            </Stat>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row lg:w-[197px] lg:flex-col">
          <ButtonLink href={`/trainer/courses/${course.id}/preview`} fullWidth>
            عاين كما يراها المتدرب
          </ButtonLink>
          <ButtonLink href={editHref} variant="outline" fullWidth>
            حرّر الدورة
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
