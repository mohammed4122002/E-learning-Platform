import type { Course, CourseSource, EnrolledCourse, RecommendedCourse } from "@/types/dashboard";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CourseCover } from "./CourseCover";

/** Figma "Data / Course Source" (195:2080): institute (Provider) or independent trainer. */
function SourceChip({ source }: { source: CourseSource }) {
  const provider = source.kind === "provider";
  const badge = (
    <span
      className={`flex size-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full ${
        provider ? "bg-state-success-bg" : "bg-bg-brand-tint"
      }`}
    >
      <Icon src={provider ? "/assets/icons/building-2.svg" : "/assets/icons/user.svg"} size={16} />
    </span>
  );
  const name = <span className="whitespace-nowrap type-caption text-text-primary">{source.name}</span>;

  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-bg-page py-[5px] ps-2.5 pe-2">
      {provider ? (
        <>
          {badge}
          {name}
        </>
      ) : (
        <>
          {name}
          {badge}
        </>
      )}
    </p>
  );
}

function Divider() {
  return <div className="h-px w-full shrink-0 bg-border-divider" />;
}

function EnrolledDetails({ course }: { course: EnrolledCourse }) {
  return (
    <>
      <div className="flex w-full flex-col items-start gap-2">
        <div className="flex w-full items-center justify-between">
          <span className="shrink-0 whitespace-nowrap type-subtitle text-text-brand">{course.attendance.percentLabel}</span>
          <span className="min-w-0 flex-1 type-caption text-text-secondary">{course.attendance.label}</span>
        </div>
        <ProgressBar percent={course.attendance.percent} width={300} label={course.attendance.label} />
      </div>
      <p className="flex w-full items-center gap-2 rounded-8 bg-bg-page px-3 py-2">
        <span className="min-w-0 flex-1 type-caption text-text-primary">{course.nextSession}</span>
        <Icon src="/assets/icons/calendar-days-brand.svg" size={16} />
      </p>
      <Divider />
      <div className="flex w-full items-center justify-between">
        <span className="w-[74px] shrink-0 type-subtitle text-text-muted">{course.funding}</span>
        <Button variant="primary">{course.cta}</Button>
      </div>
    </>
  );
}

function RecommendedDetails({ course }: { course: RecommendedCourse }) {
  const meta = [
    { icon: "meta-gauge", text: course.meta.level },
    { icon: "meta-clock", text: course.meta.duration },
    { icon: "meta-star", text: course.meta.rating },
    { icon: "meta-users", text: course.meta.learners },
  ];
  return (
    <>
      <ul className="flex w-full flex-wrap content-center items-center gap-x-3.5 gap-y-2">
        {meta.map(({ icon, text }) => (
          <li key={icon} className="flex items-center gap-1.5">
            <span className="whitespace-nowrap type-caption text-text-secondary">{text}</span>
            <Icon src={`/assets/icons/${icon}.svg`} size={16} />
          </li>
        ))}
      </ul>
      <Divider />
      <div className="flex w-full items-center justify-between">
        {course.priceAtStart ? (
          <>
            <span className="min-w-0 flex-1 text-[16px] leading-[1.5] font-extrabold text-text-primary">{course.price}</span>
            <Button variant="primary">{course.cta}</Button>
          </>
        ) : (
          <>
            <Button variant="primary">{course.cta}</Button>
            <span className="min-w-0 flex-1 text-end type-subtitle text-text-primary">{course.price}</span>
          </>
        )}
      </div>
    </>
  );
}

/** Figma "Card / Course Premium" — enrolled ("أكمل دوراتك") and recommended ("مقترحة لك") variants. */
export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="flex w-full flex-col overflow-hidden rounded-16 bg-bg-card shadow-card inner-stroke">
      <CourseCover cover={course.cover} mode={course.mode} modeBadge={course.modeBadge} />
      <div className="flex w-full flex-col items-start justify-center gap-3 px-[18px] pt-4 pb-[18px]">
        <div className="flex w-full items-center gap-2">
          <Pill tone={course.status.tone}>{course.status.label}</Pill>
          <span className="whitespace-nowrap type-caption text-text-muted">{course.category}</span>
        </div>
        <h3 className="w-full type-title text-text-primary">{course.title}</h3>
        <SourceChip source={course.source} />
        {course.variant === "enrolled" ? <EnrolledDetails course={course} /> : <RecommendedDetails course={course} />}
      </div>
    </article>
  );
}
