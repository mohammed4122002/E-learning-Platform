import type { LucideIcon } from "lucide-react";
import { Award, BookOpen, Bookmark, CalendarDays, CircleQuestionMark, Compass, Hourglass, House, LibraryBig, Star, Tag, Wallet } from "lucide-react";

/** `also`: other route prefixes that belong to the item (e.g. program pages under "اكتشف دورة"). */
export type NavItem = { label: string; href: string; icon: LucideIcon; badgeKey?: "pendingActions"; also?: string[] };

/** Figma "Nav / Sidebar — Trainee" (115:2492) — items and order. */
export const TRAINEE_NAV: NavItem[] = [
  { label: "الرئيسية", href: "/trainee", icon: House },
  { label: "بانتظار إجرائي", href: "/trainee/queue", icon: Hourglass, badgeKey: "pendingActions" },
  { label: "اكتشف دورة", href: "/trainee/discover", icon: Compass, also: ["/trainee/programs", "/trainee/compare"] },
  { label: "ملف التدريب", href: "/trainee/trainings", icon: BookOpen, also: ["/trainee/learn", "/trainee/assignments", "/trainee/learning-record", "/trainee/receipts"] },
  { label: "الشهادات", href: "/trainee/certificates", icon: Award },
  { label: "التقييمات", href: "/trainee/ratings", icon: Star },
  { label: "المفضلة", href: "/trainee/favorites", icon: Bookmark },
  { label: "المتابعات", href: "/trainee/following", icon: Tag },
  { label: "مركز المساعدة", href: "/trainee/help", icon: CircleQuestionMark },
];

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Figma "Nav / Sidebar — Trainer" (TRR-DSH-01 · 256:848) — items and order. */
export const TRAINER_NAV: NavItem[] = [
  { label: "الرئيسية", href: "/trainer", icon: House, also: ["/trainer/queue", "/trainer/onboarding", "/trainer/journey"] },
  { label: "برامجي", href: "/trainer/programs", icon: BookOpen },
  { label: "دوراتي", href: "/trainer/courses", icon: LibraryBig },
  { label: "تصفّح الفرص", href: "/trainer/opportunities", icon: Compass, also: ["/trainer/bids"] },
  { label: "الجدول", href: "/trainer/calendar", icon: CalendarDays },
  { label: "الرصيد", href: "/trainer/finance", icon: Wallet },
  { label: "مركز المساعدة", href: "/trainer/help", icon: CircleQuestionMark },
];

export type ShellWorkspace = "trainee" | "trainer";

/** Per-workspace shell wiring (sidebar, account menu, top bar shortcuts). */
export const WORKSPACE_SHELL: Record<ShellWorkspace, { label: string; home: string; nav: NavItem[]; profile: string; search: string; assistant: string; role: string }> = {
  trainee: {
    label: "مساحة المتدرب",
    home: "/trainee",
    nav: TRAINEE_NAV,
    profile: "/trainee/profile",
    search: "/trainee/discover?focus=search",
    assistant: "/trainee?assistant=1#assistant",
    role: "متدرب",
  },
  trainer: {
    label: "مساحة المدرب",
    home: "/trainer",
    nav: TRAINER_NAV,
    profile: "/trainer/profile",
    search: "/trainer/courses?focus=search",
    assistant: "/trainer?assistant=1#assistant",
    role: "مدرب",
  },
};

export function isActive(pathname: string, item: Pick<NavItem, "href" | "also">) {
  // Workspace homes match exactly (plus their `also` prefixes); other items match their whole subtree.
  if (item.href === "/trainee" || item.href === "/trainer") return pathname === item.href || (item.also ?? []).some((p) => under(pathname, p));
  return [item.href, ...(item.also ?? [])].some((p) => under(pathname, p));
}
