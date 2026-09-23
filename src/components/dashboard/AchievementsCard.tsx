import type { Achievement } from "@/types/dashboard";
import { Icon } from "@/components/ui/Icon";

type AchievementsCardProps = {
  title: string;
  achievements: Achievement[];
};

/**
 * "الوسائم" card. The badge row reproduces the Figma frame exactly: a 94px high,
 * clipped flex-wrap row whose content is vertically centred, so the fourth badge wraps
 * out of view and the first row is partially cropped — as in the design.
 */
export function AchievementsCard({ title, achievements }: AchievementsCardProps) {
  return (
    <article className="flex h-[177px] w-full shrink-0 flex-col items-start gap-3.5 overflow-hidden rounded-16 bg-bg-card px-[22px] pt-5 pb-[22px] shadow-card inner-stroke xl:w-[360px]">
      <h3 className="w-full type-title text-text-primary">{title}</h3>
      <ul className="flex h-[94px] w-full flex-wrap content-center items-center justify-center gap-4 overflow-hidden">
        {achievements.map(({ id, label, icon, earned, height }) => (
          <li
            key={id}
            className="flex w-[70px] shrink-0 flex-col items-center gap-2 overflow-hidden"
            style={{ height }}
          >
            <span
              className={`flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full ${
                earned ? "bg-state-warning-bg" : "bg-bg-disabled"
              }`}
            >
              <Icon src={icon} size={20} />
            </span>
            <span className={`w-full text-center type-caption ${earned ? "text-text-primary" : "text-text-disabled"}`}>
              {label}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
