import { navItems, trainee } from "@/lib/dashboard-data";
import { Icon } from "@/components/ui/Icon";
import { SidebarNavItem } from "./SidebarNavItem";

/** Figma "Nav / Sidebar — Trainee" (115:2492). */
export function Sidebar({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <div className="flex min-h-full flex-col gap-2 bg-bg-sidebar px-4 py-6">
      <div className="flex w-full items-center gap-3 pb-2.5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-action-primary">
          <Icon src="/assets/icons/graduation-cap-white.svg" size={20} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="type-title text-text-primary">بوابة التدريب</p>
          <p className="type-caption text-text-muted">مساحة المتدرب</p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="طي القائمة الجانبية"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-sidebar-hover"
        >
          <Icon src="/assets/icons/collapse-chevron.svg" size={20} />
        </button>
      </div>

      <div className="h-px w-full shrink-0 bg-border-sidebar" />

      <nav aria-label="القائمة الرئيسية" className="flex w-full flex-col gap-1.5">
        {navItems.map((item) => (
          <SidebarNavItem key={item.label} item={item} />
        ))}
      </nav>

      <div className="min-h-px flex-1" />

      <button
        type="button"
        aria-label="قائمة الحساب"
        className="flex w-full cursor-pointer items-center gap-3 rounded-12 bg-bg-surface p-3 text-start"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="type-subtitle text-text-primary">{trainee.name}</span>
          <span className="type-caption text-text-muted">{trainee.role}</span>
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action-primary type-small text-text-on-brand">
          {trainee.initials}
        </span>
        <Icon src="/assets/icons/account-caret.svg" size={16} />
      </button>
    </div>
  );
}
