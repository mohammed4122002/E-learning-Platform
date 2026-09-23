import { Icon } from "@/components/ui/Icon";

type IconButtonProps = {
  icon: string;
  label: string;
  badge?: { count: string; tone: "error" | "brand" };
};

function IconButton({ icon, label, badge }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-12 bg-bg-page"
    >
      <Icon src={icon} size={20} />
      {badge && (
        <span
          className={`absolute top-1 left-1 flex size-[18px] items-center justify-center overflow-hidden rounded-full type-caption text-text-on-brand ${
            badge.tone === "error" ? "bg-state-error" : "bg-action-primary"
          }`}
        >
          {badge.count}
        </span>
      )}
    </button>
  );
}

type TopBarProps = {
  title: string;
  subtitle: string;
  onOpenMenu: () => void;
};

/** Figma "Nav / Top Bar" (135:1826), State=Default. */
export function TopBar({ title, subtitle, onOpenMenu }: TopBarProps) {
  return (
    <header className="flex h-[86px] w-full shrink-0 items-center gap-3 bg-bg-surface px-4 inner-stroke istroke-c-border-divider sm:gap-5 sm:px-8">
      {/* Mobile/tablet only: opens the sidebar drawer (the sidebar is always visible on desktop). */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="فتح القائمة الجانبية"
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-sidebar-hover lg:hidden"
      >
        <Icon src="/assets/icons/collapse-chevron.svg" size={20} />
      </button>

      <div className="flex h-12 min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <h1 className="truncate type-h3 text-text-primary">{title}</h1>
        <p className="truncate type-caption text-text-muted">{subtitle}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-12 bg-bg-brand-tint px-3 type-subtitle text-text-brand"
        >
          <span className="sr-only whitespace-nowrap sm:not-sr-only">المساعد</span>
          <Icon src="/assets/icons/lightbulb-brand.svg" size={20} />
        </button>
        <IconButton icon="/assets/icons/search.svg" label="بحث" />
        <IconButton icon="/assets/icons/message-square.svg" label="الرسائل" badge={{ count: "٢", tone: "brand" }} />
        <IconButton icon="/assets/icons/bell.svg" label="الإشعارات" badge={{ count: "٣", tone: "error" }} />
      </div>
    </header>
  );
}
