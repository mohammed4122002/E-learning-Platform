import type { NavItem } from "@/types/dashboard";
import { Icon } from "@/components/ui/Icon";

export function SidebarNavItem({ item }: { item: NavItem }) {
  const { label, icon, href, active } = item;
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex w-full items-center gap-3 rounded-12 px-3.5 py-3 type-body ${
        active
          ? "bg-bg-sidebar-active text-text-brand"
          : "text-text-muted transition-colors hover:bg-bg-sidebar-hover"
      }`}
    >
      <Icon src={icon} size={20} />
      <span className="min-w-0 flex-1">{label}</span>
      {active && (
        <span aria-hidden className="absolute start-0 top-1/2 h-[22px] w-[3px] -translate-y-1/2 rounded-full bg-action-primary" />
      )}
    </a>
  );
}
