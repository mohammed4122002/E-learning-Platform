"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronsUpDown, CircleUserRound, Languages, LogOut, Settings, Shield } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { signOut } from "@/app/(auth)/actions";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useShell } from "./ShellContext";
import { WORKSPACE_SHELL } from "./nav";

const ITEMS: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
  { href: "@profile", label: "ملفي المهني", hint: "نبذتك ومؤهلاتك وتوفّرك", icon: CircleUserRound },
  { href: "/account", label: "إعدادات الحساب", hint: "البريد · الهاتف · كلمة المرور · الأمان", icon: Settings },
  { href: "/account#language", label: "اللغة", hint: "العربية", icon: Languages },
  { href: "/account/privacy", label: "الخصوصية", hint: "بياناتك وتنزيلها", icon: Shield },
];

/** Figma "Nav / Account Menu" (214:2166) opened from the sidebar account card. */
export function AccountMenu() {
  const { user } = useShell();
  const { open, toggle, setOpen, ref } = useDisclosure();
  return (
    <div ref={ref} className="relative">
      {open && (
        <div id="account-menu" className="absolute bottom-[calc(100%+8px)] start-0 z-50 w-[300px] max-w-[calc(100vw-32px)] overflow-hidden rounded-16 border border-border-default bg-bg-surface shadow-float">
          <div className="flex items-center gap-3 bg-bg-page p-4">
            <Avatar name={user.fullName} src={user.avatarUrl} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate type-subtitle text-text-primary">{user.fullName}</p>
              <p className={`type-caption ${user.verified ? "text-state-success" : "text-text-muted"}`}>{user.roleLabel}</p>
            </div>
          </div>
          <ul className="flex flex-col gap-0.5 px-2.5 pt-2.5 pb-1.5">
            {ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href === "@profile" ? WORKSPACE_SHELL[user.workspace].profile : item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-8 px-3 py-[11px] hover:bg-bg-page focus-ring"
                >
                  <span className="flex size-8 items-center justify-center rounded-8 bg-bg-page text-text-secondary">
                    <Glyph icon={item.icon} size={16} />
                  </span>
                  <span className="flex flex-1 flex-col gap-px">
                    <span className="type-small text-text-primary">{item.label}</span>
                    <span className="type-caption text-text-muted">{item.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="h-px bg-border-divider" />
          <form action={signOut}>
            <button type="submit" className="flex w-full cursor-pointer items-center gap-3 px-[22px] pt-3.5 pb-4 text-start type-subtitle text-state-error hover:bg-state-error-bg focus-ring">
              <span className="flex-1">تسجيل الخروج</span>
              <Glyph icon={LogOut} size={20} />
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label="قائمة الحساب"
        className="flex w-full cursor-pointer items-center gap-3 rounded-12 bg-bg-surface p-3 text-start focus-ring"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate type-subtitle text-text-primary">{user.fullName}</span>
          <span className="type-caption text-text-muted">{user.roleLabel}</span>
        </span>
        <Avatar name={user.fullName} src={user.avatarUrl} />
        <Glyph icon={ChevronsUpDown} size={16} className="text-text-muted" />
      </button>
    </div>
  );
}
