import Link from "next/link";
import { Building2, CalendarDays, Clock, Gauge, Star, User, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { formatHours, formatNumber, formatPercent, formatPrice, formatRating, toArabicDigits } from "@/lib/format";
import { LEVEL_LABELS } from "@/lib/labels";
import type { CourseCardView, CourseSource } from "@/types/views";
import { CourseCover } from "./CourseCover";

/** Figma "Data / Course Source" (195:2080): institute (provider) or independent trainer. */
export function SourceChip({ source }: { source: CourseSource }) {
  const provider = source.kind === "provider";
  return (
    <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-bg-page py-[5px] ps-2.5 pe-2">
      <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-full ${provider ? "bg-state-success-bg text-state-success" : "bg-bg-brand-tint text-text-brand"}`}>
        <Glyph icon={provider ? Building2 : User} size={16} />
      </span>
      <span className="truncate type-caption text-text-primary">
        <span className="sr-only">{provider ? "الجهة: " : "المدرب: "}</span>
        {source.name}
      </span>
    </p>
  );
}

/** Accent fill on a border/default track, filled from the start (right) side. */
export function AccentProgress({ percent, label }: { percent: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="flex h-2.5 w-full overflow-hidden rounded-full bg-border-default">
      <div className="h-full rounded-full bg-action-accent" style={{ width: `${v}%` }} />
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full shrink-0 bg-border-divider" />;
}

/** Figma "Card / Course · Unified" (101:1206) — enrolled ("أكمل دوراتك") and catalog ("مقترحة لك") variants. */
export function CourseCard({ course, priority }: { course: CourseCardView; priority?: boolean }) {
  return (
    <article className="relative flex w-full flex-col overflow-hidden rounded-16 bg-bg-card shadow-card inner-stroke">
      <CourseCover cover={course.cover} mode={course.mode} priority={priority} />
      <div className="flex w-full flex-1 flex-col items-start gap-3 px-[18px] pt-4 pb-[18px]">
        <div className="flex w-full flex-wrap items-center gap-2">
          {course.status && (
            <Badge tone={course.status.tone} className="px-2.5 py-1">
              {course.status.label}
            </Badge>
          )}
          {course.category && <span className="whitespace-nowrap type-caption text-text-muted">{course.category}</span>}
        </div>
        <h3 className="w-full type-title text-text-primary">
          <Link href={course.href} className="rounded-8 hover:text-text-brand focus-ring">
            {course.title}
          </Link>
        </h3>
        <SourceChip source={course.source} />

        {course.variant === "enrolled" ? (
          <>
            <div className="flex w-full flex-col gap-2">
              <div className="flex w-full items-center justify-between gap-2">
                <span className="min-w-0 flex-1 type-caption text-text-secondary">{course.progress.label}</span>
                <span className="shrink-0 type-subtitle text-text-brand">{formatPercent(course.progress.percent)}</span>
              </div>
              <AccentProgress percent={course.progress.percent} label={course.progress.label} />
            </div>
            {course.nextSession && (
              <p className="flex w-full items-center gap-2 rounded-8 bg-bg-page px-3 py-2 text-text-brand">
                <Glyph icon={CalendarDays} size={16} />
                <span className="min-w-0 flex-1 type-caption text-text-primary">{course.nextSession}</span>
              </p>
            )}
            <div className="mt-auto flex w-full flex-col gap-3">
              <Divider />
              <div className="flex w-full items-center justify-between gap-3">
                <span className="type-subtitle text-text-muted">{course.funding}</span>
                <ButtonLink href={course.href}>{course.cta}</ButtonLink>
              </div>
            </div>
          </>
        ) : (
          <>
            <ul className="flex w-full flex-wrap items-center gap-x-3.5 gap-y-2 text-text-secondary">
              <li className="flex items-center gap-1.5">
                <Glyph icon={Gauge} size={16} />
                <span className="type-caption">{LEVEL_LABELS[course.level]}</span>
              </li>
              {course.durationHours ? (
                <li className="flex items-center gap-1.5">
                  <Glyph icon={Clock} size={16} />
                  <span className="type-caption">{formatHours(course.durationHours)}</span>
                </li>
              ) : null}
              <li className="flex items-center gap-1.5">
                <Glyph icon={Star} size={16} className={course.ratingCount > 0 ? "fill-state-rating text-state-rating" : ""} />
                <span className="type-caption">
                  {course.ratingCount > 0 ? `${formatRating(course.rating)} (${toArabicDigits(course.ratingCount)})` : "لا تقييمات بعد"}
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <Glyph icon={Users} size={16} />
                <span className="type-caption">{course.learners > 0 ? `${formatNumber(course.learners)} متدرب` : "كن أول المسجّلين"}</span>
              </li>
            </ul>
            <div className="mt-auto flex w-full flex-col gap-3">
              <Divider />
              <div className="flex w-full items-center justify-between gap-3">
                <span className="min-w-0 flex-1 type-subtitle text-text-primary">{course.price === 0 ? "مجانية" : formatPrice(course.price, course.currency)}</span>
                <ButtonLink href={course.href}>{course.cta}</ButtonLink>
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
