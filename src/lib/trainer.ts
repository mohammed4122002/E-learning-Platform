import type { LucideIcon } from "lucide-react";
import {
  Banknote, Compass, Hourglass, Landmark, LayoutDashboard, MapPin, Puzzle, Shield, Signpost, Star, TrendingUp, Trophy, Tv, User, Users, Video, Zap,
} from "lucide-react";

/*
 * Enumerations of TRR-ONB-01 (copy from Figma 255:706 … 255:1010). Arrays are in the visual reading order of the
 * frames (right → left, row by row), so the first item renders at the inline start in RTL. Icons are the rendered TG
 * components (e.g. TG/Status/Pending = hourglass, TG/Training Modes/Opportunities = compass), not the instance names.
 */
export type TrainerOption = { value: string; title: string; hint?: string; icon: LucideIcon };

export const TRAINER_FIELDS: TrainerOption[] = [
  { value: "design", title: "التصميم والإبداع", icon: LayoutDashboard },
  { value: "marketing", title: "التسويق والمبيعات", icon: TrendingUp },
  { value: "technology", title: "التقنية والبرمجة", icon: Tv },
  { value: "management", title: "الإدارة والقيادة", icon: Compass },
  { value: "soft-skills", title: "المهارات الشخصية", icon: Zap },
  { value: "safety", title: "السلامة والجودة", icon: Shield },
  { value: "hr", title: "الموارد البشرية", icon: Users },
  { value: "finance", title: "المال والمحاسبة", icon: Banknote },
];

export const EXPERIENCE_BANDS: TrainerOption[] = [
  { value: "gt10", title: "أكثر من ١٠", hint: "خبير معتمد", icon: Trophy },
  { value: "6to10", title: "٦ – ١٠ سنوات", hint: "خبرة راسخة", icon: TrendingUp },
  { value: "2to5", title: "٢ – ٥ سنوات", hint: "خبرة متوسطة", icon: TrendingUp },
  { value: "lt2", title: "أقل من سنتين", hint: "بداية المسار", icon: Hourglass },
];

export const DELIVERY_MODES: TrainerOption[] = [
  { value: "recorded", title: "كورس مسجَّل جاهز", hint: "ترفعه وتبيعه — تسجيله يتم خارج المنصة", icon: Tv },
  { value: "live_remote", title: "عن بُعد مباشر", hint: "جلسات حيّة عبر الإنترنت", icon: Video },
  { value: "in_person", title: "حضوري", hint: "في قاعة مع متدربين", icon: MapPin },
];

export const AUDIENCES: TrainerOption[] = [
  { value: "both", title: "كلاهما", hint: "أوسع فرصة للدخل", icon: Puzzle },
  { value: "organizations", title: "جهات تدريبية", hint: "أرتبط بجهة وتنفّذ دوراتي", icon: Landmark },
  { value: "individuals", title: "أفراد مباشرة", hint: "أنشر برامجي ويشتريها المتدربون", icon: User },
];

export const TRAINER_GOALS: TrainerOption[] = [
  { value: "full_time", title: "التفرّغ للتدريب", hint: "مصدر دخلي الأساسي", icon: Signpost },
  { value: "reputation", title: "بناء سمعة مهنية", hint: "ملف موثَّق وتقييمات", icon: Star },
  { value: "org_opportunities", title: "فرص مع الجهات", hint: "عقود تدريب مؤسسية", icon: Compass },
  { value: "extra_income", title: "دخل إضافي", hint: "من بيع برامجي", icon: Hourglass },
];

/** TRR-ONB-02 «هدفك» card. */
export const GOAL_SUMMARY: Record<string, string> = {
  extra_income: "دخل إضافي من بيع البرامج",
  org_opportunities: "فرص تدريب مؤسسية مع الجهات",
  reputation: "بناء سمعة مهنية موثّقة",
  full_time: "التفرّغ للتدريب كمصدر دخل أساسي",
};

/** Short mode names ("حضوري ومسجَّل"). */
export const MODE_SHORT: Record<string, string> = { in_person: "حضوري", live_remote: "مباشر", recorded: "مسجَّل" };

export const TRAINER_ONBOARDING_STEPS = 5;

export const LANGUAGE_OPTIONS = ["العربية", "الإنجليزية", "الفرنسية", "الأردية", "الهندية"];

export function joinArabic(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join("، ")} و${parts[parts.length - 1]}`;
}

export function fieldTitle(slug: string): string {
  return TRAINER_FIELDS.find((f) => f.value === slug)?.title ?? slug;
}

/** Riyadh-time greeting (Figma «صباح الخير»). */
export function greeting(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Riyadh" }).format(now));
  return hour >= 4 && hour < 12 ? "صباح الخير" : "مساء الخير";
}

export function firstName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts[0] && /^(م\.|د\.|أ\.)$/.test(parts[0]) && parts[1]) return `${parts[0]} ${parts[1]}`;
  return parts[0] ?? "";
}
