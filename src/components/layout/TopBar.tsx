"use client";

import Link from "next/link";
import { useTransition, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, Bell, ChevronLeft, CircleAlert, Info, Lightbulb, MessageSquare, PanelRight, Search, Users, Wallet } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { useDisclosure } from "@/hooks/useDisclosure";
import { formatRelative, toArabicDigits } from "@/lib/format";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { useShell } from "./ShellContext";
import { WORKSPACE_SHELL } from "./nav";

/* Notification kinds → icon + tint (GEN-NOT-01 / Nav / Notifications Popup). */
export const NOTIFICATION_STYLE: Record<string, { icon: LucideIcon; tint: string }> = {
  payment_succeeded: { icon: Wallet, tint: "bg-state-success-bg text-state-success" },
  enrollment_confirmed: { icon: Award, tint: "bg-state-success-bg text-state-success" },
  enrollment_pending_provider: { icon: Info, tint: "bg-state-info-bg text-state-info" },
  waitlist_invite: { icon: Users, tint: "bg-state-success-bg text-state-success" },
  certificate_issued: { icon: Award, tint: "bg-state-warning-bg text-state-warning" },
  message: { icon: MessageSquare, tint: "bg-state-info-bg text-state-info" },
  action_required: { icon: CircleAlert, tint: "bg-state-error-bg text-state-error" },
};
const fallbackStyle = { icon: Bell, tint: "bg-bg-brand-tint text-text-brand" };

function CountBadge({ count, tone }: { count: number; tone: "error" | "brand" }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className={`absolute top-1 left-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 type-caption leading-none text-text-on-brand ${
        tone === "error" ? "bg-state-error" : "bg-action-primary"
      }`}
    >
      {count > 9 ? "+٩" : toArabicDigits(count)}
    </span>
  );
}

function NotificationsPopup() {
  const { data } = useShell();
  const { open, toggle, setOpen, ref } = useDisclosure();
  const [pending, startTransition] = useTransition();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="notifications-popup"
        aria-label={`الإشعارات${data.unreadNotifications ? ` — ${toArabicDigits(data.unreadNotifications)} غير مقروءة` : ""}`}
        className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-12 bg-bg-page text-text-primary focus-ring"
      >
        <Glyph icon={Bell} size={20} />
        <CountBadge count={data.unreadNotifications} tone="error" />
      </button>
      {open && (
        <div
          id="notifications-popup"
          className="fixed inset-x-4 top-[92px] z-50 overflow-hidden rounded-22 border border-border-default bg-bg-surface shadow-float sm:absolute sm:inset-x-auto sm:end-0 sm:top-[calc(100%+8px)] sm:w-[420px]"
        >
          <div className="flex items-center gap-3 bg-bg-page px-5 py-4">
            <span className="flex size-10 items-center justify-center rounded-12 bg-bg-brand-tint text-text-brand">
              <Glyph icon={Bell} size={20} />
            </span>
            <div className="flex flex-1 flex-col gap-px">
              <p className="type-title text-text-primary">الإشعارات</p>
              <p className="type-caption text-text-muted">
                {toArabicDigits(data.unreadNotifications)} غير مقروءة من {toArabicDigits(data.totalNotifications)}
              </p>
            </div>
            {data.unreadNotifications > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => markAllNotificationsRead())}
                className="cursor-pointer rounded-8 bg-bg-surface px-2.5 py-1.5 type-caption text-text-brand focus-ring disabled:text-text-disabled"
              >
                تعليم الكل كمقروء
              </button>
            )}
          </div>
          <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-3.5">
            {data.latestNotifications.length === 0 && <li className="px-3 py-8 text-center type-small text-text-muted">لا توجد إشعارات بعد.</li>}
            {data.latestNotifications.map((n) => {
              const style = NOTIFICATION_STYLE[n.kind] ?? fallbackStyle;
              const unread = !n.readAt;
              const content = (
                <>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 ${style.tint}`}>
                    <Glyph icon={style.icon} size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="flex-1 type-subtitle text-text-primary">{n.title}</span>
                      <span className="shrink-0 type-caption text-text-muted">{formatRelative(n.createdAt)}</span>
                    </span>
                    {n.body && <span className="type-caption text-text-muted">{n.body}</span>}
                  </span>
                  {unread && <span aria-label="غير مقروء" className="mt-2 size-2 shrink-0 rounded-full bg-action-primary" />}
                </>
              );
              const cls = `flex items-start gap-3 rounded-12 p-3 ${unread ? "bg-bg-brand-tint" : "bg-bg-surface"} hover:ring-1 hover:ring-border-default focus-ring`;
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link
                      href={n.link}
                      className={cls}
                      onClick={() => {
                        setOpen(false);
                        if (unread) void markNotificationRead(n.id);
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={cls}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <Link href="/notifications" onClick={() => setOpen(false)} className="flex items-center gap-2.5 bg-bg-page px-5 pt-3.5 pb-4 type-subtitle text-text-brand focus-ring">
            عرض جميع الإشعارات
            <Glyph icon={ChevronLeft} size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}

type TopBarProps = { title: string; subtitle?: string; actions?: ReactNode };

/** Figma "Nav / Top Bar" (135:1826): 86px, surface, bottom divider, title 20 Medium + 14 caption. */
export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const { data, openMenu, user } = useShell();
  return (
    <header className="sticky top-0 z-20 flex h-[86px] w-full shrink-0 items-center gap-3 border-b border-border-divider bg-bg-surface px-4 sm:gap-5 sm:px-8">
      <button
        type="button"
        onClick={openMenu}
        aria-label="فتح القائمة الجانبية"
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-sidebar-hover text-text-secondary focus-ring lg:hidden"
      >
        <Glyph icon={PanelRight} size={20} />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="truncate type-h3 text-text-primary">{title}</h1>
        {subtitle && <p className="truncate type-caption text-text-muted">{subtitle}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {actions}
        <Link
          href={WORKSPACE_SHELL[user.workspace].assistant}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-12 bg-bg-brand-tint px-3 type-subtitle text-text-brand focus-ring"
        >
          <span className="sr-only whitespace-nowrap sm:not-sr-only">المساعد</span>
          <Glyph icon={Lightbulb} size={20} />
        </Link>
        <Link href={WORKSPACE_SHELL[user.workspace].search} aria-label="بحث" className="hidden size-11 items-center justify-center rounded-12 bg-bg-page text-text-primary focus-ring sm:flex">
          <Glyph icon={Search} size={20} />
        </Link>
        <Link
          href="/messages"
          aria-label={`الرسائل${data.unreadMessages ? ` — ${toArabicDigits(data.unreadMessages)} غير مقروءة` : ""}`}
          className="relative flex size-11 items-center justify-center rounded-12 bg-bg-page text-text-primary focus-ring"
        >
          <Glyph icon={MessageSquare} size={20} />
          <CountBadge count={data.unreadMessages} tone="brand" />
        </Link>
        <NotificationsPopup />
      </div>
    </header>
  );
}

/** Standard page body container (Figma CONTENT: px 48, pt 32, pb 56, gap 36). */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main id="main" tabIndex={-1} className={`flex flex-col gap-9 px-4 pt-8 pb-14 outline-none sm:px-6 lg:px-12 ${className ?? ""}`}>
      {children}
    </main>
  );
}
