import type { LucideIcon } from "lucide-react";
import {
  Award, BookOpen, Brain, Briefcase, CircleDot, Clock, Coins, Gauge, Layers, LayoutGrid, Lightbulb, MapPin, Monitor,
  Palette, Route, Target, TrendingUp, Trophy, Users,
} from "lucide-react";

/** Enumerations of TRN-ONB-01 (copy from Figma). Learning fields themselves come from `learning_fields`. */
export const FIELD_ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase, monitor: Monitor, "trending-up": TrendingUp, palette: Palette, coins: Coins, users: Users,
  brain: Brain, "layout-grid": LayoutGrid,
};

export type Option = { value: string; title: string; hint?: string; icon: LucideIcon };

export const GOALS: Option[] = [
  { value: "career_growth", title: "تطوير مساري الوظيفي", hint: "ترقية أو مسؤولية أكبر", icon: TrendingUp },
  { value: "certificate", title: "الحصول على شهادة", hint: "شهادة معتمدة موثّقة", icon: Award },
  { value: "career_change", title: "تغيير المجال المهني", hint: "الانتقال لتخصص جديد", icon: Route },
  { value: "work_skills", title: "تطوير مهارات العمل", hint: "أداء أفضل في وظيفتي", icon: Target },
  { value: "entrepreneurship", title: "بدء مشروع خاص", hint: "مهارات ريادة الأعمال", icon: Lightbulb },
  { value: "hobby", title: "التعلّم كهواية", hint: "فضول ومتعة التعلّم", icon: BookOpen },
];

export const LEVELS: Option[] = [
  { value: "none", title: "مبتدئ", hint: "أبدأ من الصفر", icon: CircleDot },
  { value: "basic", title: "لدي معرفة بسيطة", hint: "أعرف الأساسيات", icon: Gauge },
  { value: "intermediate", title: "متوسط", hint: "أطبّق عمليًا", icon: TrendingUp },
  { value: "advanced", title: "متقدم", hint: "أبحث عن التخصص", icon: Trophy },
];

/** Stored as course_mode[]: remote → live_remote + recorded, in-person → in_person, both → all. */
export const MODES: Option[] = [
  { value: "remote", title: "دورات عن بعد", hint: "أتعلّم في أي وقت وبإيقاعي", icon: Monitor },
  { value: "in_person", title: "دورات حضورية", hint: "مع مدرب وزملاء في قاعة", icon: MapPin },
  { value: "both", title: "كلاهما", hint: "أرِني كل الخيارات", icon: Layers },
];

export const HOURS: Option[] = [
  { value: "lt2", title: "أقل من ساعتين", hint: "برامج قصيرة ومركّزة", icon: Clock },
  { value: "2to5", title: "٢ – ٥ ساعات", hint: "الإيقاع الأنسب لأغلب المتدربين", icon: Clock },
  { value: "5to10", title: "٥ – ١٠ ساعات", hint: "برامج متوسطة الكثافة", icon: Clock },
  { value: "gt10", title: "أكثر من ١٠ ساعات", hint: "مسارات مكثّفة", icon: Clock },
];

export const EXPERIENCE_YEARS = [
  { value: "lt1", label: "أقل من سنة" },
  { value: "1to3", label: "١ – ٣ سنوات" },
  { value: "3to5", label: "٣ – ٥ سنوات" },
  { value: "5to10", label: "٥ – ١٠ سنوات" },
  { value: "gt10", label: "أكثر من ١٠ سنوات" },
];

export const SUGGESTED_SKILLS = ["إدارة المشاريع", "التخطيط", "العمل الجماعي", "تحليل البيانات", "التفاوض"];

export const MODE_TO_COURSE_MODES: Record<string, ("in_person" | "live_remote" | "recorded")[]> = {
  remote: ["live_remote", "recorded"],
  in_person: ["in_person"],
  both: ["in_person", "live_remote", "recorded"],
};

export function modeValueFrom(modes: string[]): string | null {
  if (modes.length === 0) return null;
  const set = new Set(modes);
  if (set.has("in_person") && (set.has("live_remote") || set.has("recorded"))) return "both";
  return set.has("in_person") ? "in_person" : "remote";
}

export const LEVEL_TO_COURSE_LEVEL: Record<string, "beginner" | "intermediate" | "advanced"> = {
  none: "beginner",
  basic: "beginner",
  intermediate: "intermediate",
  advanced: "advanced",
};

export const STEPS = 6;
