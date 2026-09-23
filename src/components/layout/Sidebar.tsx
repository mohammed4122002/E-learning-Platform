"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, PanelRight } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";
import { AccountMenu } from "./AccountMenu";
import { useShell } from "./ShellContext";
import { TRAINEE_NAV, isActive } from "./nav";

/** Figma "Nav / Sidebar — Trainee" (115:2492). */
export function Sidebar({ onCollapse }: { onCollapse?: () => void }) {
  const pathname = usePathname();
  const { data } = useShell();
  return (
    <div className="flex min-h-full flex-col gap-2 bg-bg-sidebar px-4 py-6">
      <div className="flex w-full items-center gap-3 pb-2.5">
        <Link href="/trainee" className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-action-primary text-text-on-brand focus-ring" aria-label="بوابة التدريب — الرئيسية">
          <Glyph icon={GraduationCap} size={20} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="type-title text-text-primary">بوابة التدريب</p>
          <p className="type-caption text-text-muted">مساحة المتدرب</p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="طي القائمة الجانبية"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-sidebar-hover text-text-secondary focus-ring lg:hidden"
        >
          <Glyph icon={PanelRight} size={20} />
        </button>
      </div>

      <div className="h-px w-full shrink-0 bg-border-sidebar" />

      <nav aria-label="القائمة الرئيسية" className="flex w-full flex-col gap-1.5">
        {TRAINEE_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const badge = item.badgeKey ? data[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex w-full items-center gap-3 rounded-12 px-3.5 py-3 type-body focus-ring ${
                active ? "bg-bg-sidebar-active text-text-brand" : "text-text-muted transition-colors hover:bg-bg-sidebar-hover hover:text-text-primary"
              }`}
            >
              <Glyph icon={item.icon} size={20} />
              <span className="min-w-0 flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="flex min-w-6 items-center justify-center rounded-full bg-action-primary px-1.5 type-caption text-text-on-brand">
                  {toArabicDigits(badge)}
                  <span className="sr-only"> بانتظار إجراء</span>
                </span>
              )}
              {active && <span aria-hidden className="absolute start-0 top-1/2 h-[22px] w-[3px] -translate-y-1/2 rounded-full bg-action-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="min-h-px flex-1" />
      <AccountMenu />
    </div>
  );
}
