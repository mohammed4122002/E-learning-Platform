import Image from "next/image";
import type { Course, CourseMode } from "@/types/dashboard";
import { resolvePublicImage } from "@/lib/assets";
import { Icon } from "@/components/ui/Icon";

/** Figma "Data / Course Mode" (162:1934). */
const modes: Record<CourseMode, { label: string; icon: string; className: string }> = {
  "in-person": { label: "حضورية", icon: "map-pin", className: "bg-state-success-bg text-state-success" },
  "live-remote": { label: "عن بُعد مباشرة", icon: "video", className: "bg-state-info-bg text-state-info" },
  recorded: { label: "مسجَّلة", icon: "monitor-play", className: "bg-bg-brand-tint text-text-brand" },
};

type CourseCoverProps = Pick<Course, "cover" | "mode" | "modeBadge">;

/**
 * Figma "Media / Image Placeholder" (80:689): brand-tint frame with a 1.5px dashed
 * focus-colour stroke (dash 8 / gap 6, radius 16) and the cropped cover image.
 */
export function CourseCover({ cover, mode, modeBadge }: CourseCoverProps) {
  const src = resolvePublicImage(cover.src);
  const badge = modes[mode];
  const { crop } = cover;

  return (
    <div className="relative h-[180px] w-full shrink-0">
      <div className="absolute inset-0 overflow-hidden rounded-16 bg-bg-brand-tint">
        {src && (
          <div
            className="absolute"
            style={{ top: `${crop.top}%`, left: `${crop.left}%`, width: `${crop.width}%`, height: `${crop.height}%` }}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="(min-width: 1280px) 342px, (min-width: 768px) 50vw, 100vw"
              className="object-fill"
            />
          </div>
        )}
      </div>
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" fill="none">
        <rect
          x="0.75"
          y="0.75"
          rx="15.25"
          style={{ width: "calc(100% - 1.5px)", height: "calc(100% - 1.5px)" }}
          stroke="var(--color-border-focus)"
          strokeWidth="1.5"
          strokeDasharray="8 6"
        />
      </svg>
      <span
        className={`absolute flex items-center gap-[5px] rounded-full px-[9px] py-1 whitespace-nowrap type-caption ${badge.className}`}
        style={{ top: modeBadge.top, right: modeBadge.right }}
      >
        <Icon src={`/assets/icons/${badge.icon}.svg`} size={16} />
        {badge.label}
      </span>
    </div>
  );
}
