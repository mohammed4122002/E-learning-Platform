import { Avatar } from "@/components/ui/Data";
import { RatingStars } from "@/components/ui/Rating";
import type { RatingItem } from "@/lib/data/trainer-ratings";
import { formatRating } from "@/lib/format";
import { RowMenu } from "./RowMenu";

/* Rating rows of TRR-RTG-01 (280:6049), the course tab (438:20952) and the reply preview (291:8261). */

export function ReplyBox({ author, body }: { author: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="type-small text-text-muted">{author}</span>
      <p className="rounded-12 bg-bg-page px-4 py-3 type-small text-text-brand">{body}</p>
    </div>
  );
}

export function RatingCard({ r, replyLabel, menu, compact }: { r: RatingItem; replyLabel: string; menu?: boolean; compact?: boolean }) {
  const reply = r.reply?.status === "published" && r.reply.body ? r.reply.body : null;
  return (
    <li className={`flex flex-col gap-3.5 rounded-16 border border-border-default bg-bg-card drop-shadow-milestone ${compact ? "p-4" : "p-[18px]"}`}>
      <div className="flex items-center gap-2.5">
        <Avatar name={r.name} size="m" />
        <span className="min-w-0 flex-1 type-body text-text-primary">{r.name}</span>
        <RatingStars value={r.score} size="xs" />
        {menu && (
          <RowMenu
            label={`إجراءات تقييم ${r.name}`}
            items={[
              ...(r.reply?.status === "published" ? [] : [{ href: `/trainer/ratings/${r.id}/reply`, label: "ردّ على التقييم" }]),
              { href: `/trainer/ratings/${r.id}/review`, label: "اطلب مراجعة التقييم" },
            ]}
          />
        )}
      </div>
      {r.comment && <p className="type-small text-text-secondary">{r.comment}</p>}
      {reply && <ReplyBox author={replyLabel} body={reply} />}
    </li>
  );
}

export function AxisRow({ label, value }: { label: string; value: number }) {
  return (
    // 438:21160: value (20 Medium, toned) at the start, then the 18 text/secondary label.
    <li className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3">
      <span className={`type-h3 ${value >= 4.7 ? "text-state-success" : value >= 4 ? "text-state-warning" : "text-state-error"}`}>{formatRating(value)}</span>
      <span className="min-w-0 flex-1 type-body-lg text-text-secondary">{label}</span>
    </li>
  );
}
