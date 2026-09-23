import type { LucideIcon } from "lucide-react";
import { Award, BookOpen, Bookmark, CircleQuestionMark, Compass, Hourglass, House, Star, Tag } from "lucide-react";

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

export function isActive(pathname: string, item: Pick<NavItem, "href" | "also">) {
  if (item.href === "/trainee") return pathname === "/trainee";
  return [item.href, ...(item.also ?? [])].some((p) => under(pathname, p));
}
