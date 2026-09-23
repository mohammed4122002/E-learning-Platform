import { Star } from "lucide-react";
import { formatRating } from "@/lib/format";

/* Figma "Data / Rating Stars" (89:754): stars only, filled state/rating (#ffc400). S = 18px, M = 22px. */
export function RatingStars({ value, size = "s", className }: { value: number; size?: "s" | "m"; className?: string }) {
  const px = size === "s" ? 18 : 22;
  const rounded = Math.round(value);
  return (
    <span role="img" aria-label={`التقييم ${formatRating(value)} من ٥`} className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          size={px}
          strokeWidth={1.25}
          absoluteStrokeWidth
          className={i < rounded ? "fill-state-rating text-state-rating" : "text-border-default"}
        />
      ))}
    </span>
  );
}
