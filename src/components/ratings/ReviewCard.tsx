import { Avatar } from "@/components/ui/Data";
import { RatingStars } from "@/components/ui/Rating";
import { formatDate, formatRating, toArabicDigits } from "@/lib/format";
import type { SentRating } from "@/lib/data/ratings";

/** Figma "Platform / Review" (63:271): r16 card, p18, gap14 — avatar, name, stars; comment 15 text/secondary; axis breakdown. */
export function ReviewCard({ rating, authorName }: { rating: SentRating; authorName: string }) {
  const axes = [
    { label: "المحتوى", v: rating.content },
    { label: "أداء المدرب", v: rating.trainer },
    ...(rating.organization ? [{ label: "التنظيم", v: rating.organization }] : []),
  ];
  return (
    <article className="flex w-full flex-col gap-3.5 rounded-16 border border-border-default bg-bg-card p-[18px] drop-shadow-milestone">
      <div className="flex w-full flex-wrap items-center gap-2.5">
        <Avatar name={authorName} size="m" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="type-body text-text-primary">{authorName}</p>
          <p className="type-caption text-text-muted">
            {rating.courseTitle} · {formatDate(rating.createdAt)}
          </p>
        </div>
        <RatingStars value={rating.average} />
      </div>
      {rating.comment && <p className="type-small whitespace-pre-line text-text-secondary">{rating.comment}</p>}
      {rating.reply && (
        /* Figma TRN-RTG-02 reply box: bg/page, r12, p 12/14, gap 6; title 14 brand, body 14 secondary. */
        <div className="flex flex-col gap-1.5 rounded-12 bg-bg-page px-3.5 py-3">
          <p className="type-caption text-text-brand">رد المقدّم — {rating.sourceName}</p>
          <p className="type-caption whitespace-pre-line text-text-secondary">{rating.reply}</p>
        </div>
      )}
      <ul className="flex flex-wrap gap-2" aria-label="محاور التقييم">
        {axes.map((a) => (
          <li key={a.label} className="rounded-full bg-bg-page px-2.5 py-1 type-caption text-text-secondary">
            {a.label} <span className="text-state-warning">{toArabicDigits(a.v)} / ٥</span>
          </li>
        ))}
        <li className="rounded-full bg-bg-page px-2.5 py-1 type-caption text-text-secondary">
          المتوسط <span className="text-state-warning">{formatRating(rating.average)}</span>
        </li>
      </ul>
    </article>
  );
}
