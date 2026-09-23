"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type AppShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

/**
 * Page frame: sidebar (280px) on the start/right side and the main column.
 * Desktop (lg+) matches Figma exactly; below lg the sidebar becomes an off-canvas drawer.
 */
export function AppShell({ title, subtitle, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-bg-surface">
      <aside
        className={`fixed inset-y-0 start-0 z-40 w-[280px] shrink-0 overflow-y-auto bg-bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0 lg:overflow-visible ${
          menuOpen ? "translate-x-0" : "translate-x-full max-lg:invisible"
        }`}
      >
        <Sidebar onCollapse={closeMenu} />
      </aside>

      {menuOpen && (
        <div aria-hidden className="fixed inset-0 z-30 bg-[#111111]/24 lg:hidden" onClick={closeMenu} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} subtitle={subtitle} onOpenMenu={() => setMenuOpen(true)} />
        {children}
      </div>
    </div>
  );
}
