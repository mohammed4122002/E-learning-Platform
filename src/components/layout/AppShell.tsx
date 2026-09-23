"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { ShellProvider, type ShellUser } from "./ShellContext";
import type { ShellData } from "@/lib/data/shell";

/**
 * Workspace frame: sidebar (280px) on the start/right side and the main column.
 * Desktop (lg+) matches Figma; below lg the sidebar becomes an off-canvas drawer.
 * Pages render their own <TopBar /> (title/subtitle differ per screen) — it reads counts from context.
 */
export function AppShell({ user, data, children }: { user: ShellUser; data: ShellData; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  // Close the drawer on navigation (derived during render, no effect needed).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  return (
    <ShellProvider value={{ user, data, openMenu: () => setMenuOpen(true) }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-12 focus:bg-bg-surface focus:p-3">
        تخطَّ إلى المحتوى
      </a>
      <div className="flex min-h-dvh bg-bg-surface">
        <aside
          aria-label="القائمة الجانبية"
          className={`fixed inset-y-0 start-0 z-40 w-[280px] shrink-0 overflow-y-auto border-e border-border-sidebar bg-bg-sidebar transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${
            menuOpen ? "translate-x-0" : "translate-x-full max-lg:invisible"
          }`}
        >
          <Sidebar onCollapse={() => setMenuOpen(false)} />
        </aside>
        {menuOpen && <div aria-hidden className="fixed inset-0 z-30 bg-scrim lg:hidden" onClick={() => setMenuOpen(false)} />}
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </ShellProvider>
  );
}
