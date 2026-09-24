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
    <li className={`flex flex-col gap-3 rounded-16 border border-border-default bg-bg-card ${compact ? "px-4 py-4" : "px-5 py-5"}`}>
      <div className="flex items-center gap-3">
        <Avatar name={r.name} size="m" />
        <span className="min-w-0 flex-1 type-subtitle text-text-primary">{r.name}</span>
        <RatingStars value={r.score} />
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
      {r.comment && <p className="type-body text-text-secondary">{r.comment}</p>}
      {reply && <ReplyBox author={replyLabel} body={reply} />}
    </li>
  );
}

export function AxisRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-12 bg-bg-page px-4 py-3.5">
      <span className="type-body text-text-primary">{label}</span>
      <span className="type-subtitle text-state-success">{formatRating(value)}</span>
    </li>
  );
}
