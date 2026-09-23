"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { toggleFavorite } from "@/lib/actions/favorites";

/**
 * Reusable «احفظ في المفضلة» toggle (TRN-FAV-01). Optimistic; confirms with a toast that explains the outcome (BR-U2).
 * `variant="overlay"` sits on a course cover (40px white disc); `variant="button"` is a 44px outline button with a label.
 */
export function FavoriteButton({
  courseId,
  courseTitle,
  initialSaved,
  variant = "overlay",
  className,
}: {
  courseId: string;
  courseTitle: string;
  initialSaved: boolean;
  variant?: "overlay" | "button";
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const onClick = () => {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await toggleFavorite(courseId, next);
      if (!res.ok) {
        setSaved(!next);
        toast("error", res.message);
      } else toast("success", next ? `حُفظت «${courseTitle}» في المفضلة — سننبّهك بأي جديد فيها.` : `أُزيلت «${courseTitle}» من المفضلة.`);
    });
  };

  const label = saved ? `إزالة «${courseTitle}» من المفضلة` : `حفظ «${courseTitle}» في المفضلة`;
  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={saved}
        aria-label={label}
        className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-12 px-[18px] type-small text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-brand-tint focus-ring disabled:cursor-progress ${className ?? ""}`}
      >
        <Bookmark aria-hidden size={20} strokeWidth={1.4} absoluteStrokeWidth className={saved ? "fill-action-primary text-text-brand" : ""} />
        {saved ? "محفوظة في المفضلة" : "احفظ في المفضلة"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "إزالة من المفضلة" : "حفظ في المفضلة"}
      className={`flex size-10 cursor-pointer items-center justify-center rounded-full bg-bg-surface text-text-brand shadow-card hover:bg-bg-brand-tint focus-ring disabled:cursor-progress ${className ?? ""}`}
    >
      <Bookmark aria-hidden size={20} strokeWidth={1.4} absoluteStrokeWidth className={saved ? "fill-action-primary" : ""} />
    </button>
  );
}
