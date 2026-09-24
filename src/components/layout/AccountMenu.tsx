"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, ChevronDown, ChevronLeft, ChevronsUpDown, CircleUserRound, Eye, Languages, LogOut, Settings, Shield, Star, Users } from "lucide-react";
import { formatRating, toArabicDigits } from "@/lib/format";
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
      {user.trainerCard ? (
        /* Figma TRR-DSH-01 sidebar divider + «profile-card» (I256:877;285:3029): 12px side padding, 14/6 top/bottom. */
        <div className="flex flex-col">
          <div className="h-px w-full bg-border-sidebar" />
          <div className="px-3 pt-3.5 pb-1.5">
            <div className="flex flex-col gap-2.5 rounded-16 border-[1.5px] border-action-primary bg-bg-brand-tint p-3.5">
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-controls="account-menu"
                aria-label="قائمة الحساب"
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-8 text-start focus-ring"
              >
                <Avatar name={user.fullName} src={user.avatarUrl} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate type-small text-text-primary">{user.fullName}</span>
                  {user.trainerCard.accredited ? (
                    <span className="flex items-center gap-[5px] type-caption text-state-success">
                      مدرب معتمد
                      <Glyph icon={BadgeCheck} size={16} />
                    </span>
                  ) : (
                    <span className="type-caption text-text-muted">{user.roleLabel}</span>
                  )}
                </span>
                <Glyph icon={ChevronDown} size={16} className="text-text-secondary" />
              </button>
              <Link
                href={WORKSPACE_SHELL[user.workspace].profile}
                className="flex h-11 items-center justify-center gap-2 rounded-8 bg-action-primary type-subtitle text-text-on-brand hover:bg-action-primary-hover focus-ring"
              >
                ملفي المهني
                <Glyph icon={ChevronLeft} size={16} />
              </Link>
              <p className="flex items-center justify-center gap-2.5 type-caption text-text-secondary">
                <span className="flex items-center gap-1">
                  <Glyph icon={Eye} size={16} />
                  {toArabicDigits(user.trainerCard.views)}
                  <span className="sr-only">مشاهدة للملف</span>
                </span>
                <span className="flex items-center gap-1">
                  <Glyph icon={Users} size={16} />
                  {toArabicDigits(user.trainerCard.learners)}
                  <span className="sr-only">متدربًا نشطًا</span>
                </span>
                <span className="flex items-center gap-1">
                  <Glyph icon={Star} size={16} />
                  {user.trainerCard.rating === null ? "—" : formatRating(user.trainerCard.rating)}
                  <span className="sr-only">متوسط التقييم</span>
                </span>
              </p>
            </div>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
