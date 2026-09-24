import Image from "next/image";
import { MapPin, Tv, Video } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import type { CourseCardView, CourseMode } from "@/types/views";

/** Figma "Data / Course Mode" (162:1934). */
export const MODES: Record<CourseMode, { label: string; icon: typeof MapPin; className: string }> = {
  in_person: { label: "حضورية", icon: MapPin, className: "bg-state-success-bg text-state-success" },
  live_remote: { label: "عن بُعد مباشرة", icon: Video, className: "bg-state-info-bg text-state-info" },
  // The TG icon «monitor-play» used by this component draws Lucide «tv».
  recorded: { label: "مسجَّلة", icon: Tv, className: "bg-bg-brand-tint text-text-brand" },
};

export function ModeBadge({ mode, className, label }: { mode: CourseMode; className?: string; label?: string }) {
  const m = MODES[mode];
  return (
    <span className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-[9px] py-1 type-caption ${m.className} ${className ?? ""}`}>
      <Glyph icon={m.icon} size={16} />
      {label ?? m.label}
    </span>
  );
}

/**
 * Figma "Media / Image Placeholder" (80:689): brand-tint frame with a 1.5px dashed focus-colour stroke
 * (dash 8 / gap 6, radius 16) and the cropped cover image.
 */
export function CourseCover({
  cover,
  mode,
  height = 180,
  priority = false,
}: Pick<CourseCardView, "cover"> & { mode: CourseMode | null; height?: number; priority?: boolean }) {
  const crop = cover.crop ?? { top: 0, left: 0, width: 100, height: 100 };
  return (
    <div className="relative w-full shrink-0" style={{ height }}>
      <div className="absolute inset-0 overflow-hidden rounded-16 bg-bg-brand-tint">
        {cover.src && (
          <div className="absolute" style={{ top: `${crop.top}%`, left: `${crop.left}%`, width: `${crop.width}%`, height: `${crop.height}%` }}>
            <Image
              src={cover.src}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1280px) 342px, (min-width: 768px) 50vw, 100vw"
              className={cover.crop ? "object-fill" : "object-cover"}
            />
          </div>
        )}
      </div>
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" fill="none">
        <rect x="0.75" y="0.75" rx="15.25" style={{ width: "calc(100% - 1.5px)", height: "calc(100% - 1.5px)" }} stroke="var(--color-border-focus)" strokeWidth="1.5" strokeDasharray="8 6" />
      </svg>
      {mode && <ModeBadge mode={mode} className="absolute top-3 right-3" />}
    </div>
  );
}
