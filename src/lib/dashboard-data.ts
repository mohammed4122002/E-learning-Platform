import type {
  Achievement,
  Activity,
  Certificate,
  EnrolledCourse,
  Milestone,
  NavItem,
  RecommendedCourse,
} from "@/types/dashboard";

/*
 * Static content of Figma frame "TRN-DSH-01 · لوحة المتدرب · الإصدار ٢" (node 102:529).
 * Every string is copied verbatim from the design. Arrays are in RTL reading order
 * (first item = right-most on screen).
 */

const icon = (name: string) => `/assets/icons/${name}.svg`;

export const trainee = {
  name: "سالم الحارثي",
  firstName: "سالم",
  initials: "ن ع",
  role: "موثَّق · متدرب",
};

export const navItems: NavItem[] = [
  { label: "الرئيسية", icon: icon("house"), href: "/", active: true },
  { label: "بانتظار إجرائي", icon: icon("hourglass"), href: "#" },
  { label: "اكتشف دورة", icon: icon("compass"), href: "#" },
  { label: "ملف التدريب", icon: icon("book-open"), href: "#" },
  { label: "الشهادات", icon: icon("award"), href: "#" },
  { label: "التقييمات", icon: icon("star"), href: "#" },
  { label: "المفضلة", icon: icon("bookmark"), href: "#" },
  { label: "المتابعات", icon: icon("tag"), href: "#" },
  { label: "مركز المساعدة", icon: icon("circle-question-mark"), href: "#" },
];

export const hero = {
  track: "مسارك: إدارة المشاريع",
  greeting: `صباح الخير ${trainee.firstName} 👋`,
  summary:
    "أنجزت ٨ دورات من ١٢ في خطتك. جلستك القادمة بعد يومين — تبقّت أربع دورات لإكمال المسار.",
  progressLabel: "٦٥٪",
  primaryCta: "ابدأ التعلم",
  secondaryCta: "اعرض خطتي",
};

export const aiAssistant = {
  title: "مساعدك الذكي للتعلم",
  description:
    "اقتراحات مبنية على تخصصاتك المتابَعة ودوراتك السابقة. كل اقتراح مسودة — القرار النهائي لك دائمًا.",
  cta: "اسأل المساعد",
  prompts: [
    "ما الذي ينقصني لإتمام المسار؟",
    "دورات تناسب مستواي",
    "اقترح لي خطة لثلاثة أشهر",
    "ماذا أتعلّم اليوم؟",
  ],
};

export const waitlistOffer = {
  title: "حجز مقعد في دورة تنتظرها",
  description:
    "«أساسيات إدارة المشاريع» — دورة ١٢ أبريل · يتبقى ٠٤:٣٢ لقبول المقعد · وأنت في انتظار دورتين أخريين.",
  cta: "اقبل المقعد",
};

const enrolledShared = {
  variant: "enrolled" as const,
  category: "إدارة أعمال",
  status: { label: "مسجَّل", tone: "brand" as const },
  mode: "in-person" as const,
  source: { kind: "provider" as const, name: "معهد المسار للتدريب" },
  attendance: { label: "الحضور · ٨ من ١٢ جلسة", percentLabel: "٦٥٪", percent: 65 },
  nextSession: "الجلسة القادمة: الأحد ١٥ مارس · ٥:٠٠ م",
  funding: "مموّلة ذاتيًا",
  cta: "تابع الدورة",
};

export const continueSection = {
  title: "أكمل دوراتك",
  subtitle: "دورتان جاريتان · أقرب جلسة بعد يومين",
  link: "عرض تسجيلاتي",
  courses: [
    {
      ...enrolledShared,
      id: "project-management-basics",
      title: "أساسيات إدارة المشاريع",
      modeBadge: { top: 12, right: 12 },
      cover: {
        src: "/assets/images/continue-project-management",
        crop: { top: -25.71, left: 0, width: 100, height: 125.68 },
      },
    },
    {
      ...enrolledShared,
      id: "business-administration-basics",
      title: "أساسيات إدارة الأعمال",
      modeBadge: { top: 11, right: 12.67 },
      cover: {
        src: "/assets/images/continue-business-administration",
        crop: { top: -25.73, left: 0, width: 100, height: 125.68 },
      },
    },
    {
      ...enrolledShared,
      id: "design-basics",
      title: "أساسيات التصميم",
      modeBadge: { top: 12, right: 12.33 },
      cover: {
        src: "/assets/images/continue-design",
        crop: { top: -25.85, left: 0, width: 100, height: 125.68 },
      },
    },
  ] satisfies EnrolledCourse[],
};

const recommendedShared = {
  variant: "recommended" as const,
  source: { kind: "independent" as const, name: "م. سالم الحارثي" },
  meta: { rating: "٤٫٨ (٣٤٢)", duration: "١٨ ساعة", level: "مبتدئ", learners: "١٬٢٥٠ متدرب" },
  price: "٢٤٠ ر.س",
};

export const recommendedSection = {
  title: "مقترحة لك",
  subtitle: "بناءً على تخصصاتك المتابَعة ومستواك الحالي",
  link: "استكشف الكل",
  courses: [
    {
      ...recommendedShared,
      id: "modern-web-development",
      title: "أساسيات تطوير الويب الحديث",
      category: "برمجة",
      status: { label: "جديد", tone: "accent" },
      mode: "recorded",
      modeBadge: { top: 12, right: 16 },
      cover: {
        src: "/assets/images/recommended-web-development",
        crop: { top: -22.64, left: -0.11, width: 100, height: 125.68 },
      },
      cta: "سجّل الآن",
      priceAtStart: true,
    },
    {
      ...recommendedShared,
      id: "effective-leadership",
      title: "القيادة الإدارية الفعّالة",
      category: "قيادة",
      status: { label: "مقترح لك", tone: "info" },
      mode: "live-remote",
      modeBadge: { top: 13, right: 27.67 },
      cover: {
        src: "/assets/images/recommended-effective-leadership",
        crop: { top: -33.13, left: -4.91, width: 109.73, height: 137.91 },
      },
      cta: "اعرض التفاصيل",
    },
    {
      ...recommendedShared,
      id: "financial-leadership",
      title: "القيادة الإدارية المالية",
      category: "قيادة",
      status: { label: "مقترح لك", tone: "info" },
      mode: "live-remote",
      modeBadge: { top: 12, right: 14.33 },
      cover: {
        src: "/assets/images/recommended-financial-leadership",
        crop: { top: -19.15, left: 0, width: 100, height: 125.68 },
      },
      cta: "اعرض التفاصيل",
    },
  ] satisfies RecommendedCourse[],
};

export const activitySection = {
  title: "آخر نشاطك",
  subtitle: "كل ما جرى في حسابك خلال الأيام الماضية",
  link: "سجل النشاط الكامل",
  items: [
    {
      id: "lesson",
      time: "قبل ٣ ساعات",
      title: "أنهيت الدرس الثاني",
      description: "الجدولة وتوزيع الموارد · إدارة المشاريع الاحترافية PMP",
      icon: icon("activity-circle-check"),
    },
    {
      id: "quiz",
      time: "أمس",
      title: "اجتزت اختبار الفصل الثالث",
      description: "بنسبة ٨٠٪ من المحاولة الأولى — فُتح الفصل الرابع",
      icon: icon("activity-trophy"),
    },
    {
      id: "session",
      time: "قبل يومين",
      title: "حضرت جلسة",
      description: "الجلسة الثامنة · أساسيات إدارة المشاريع · فرع الخوير",
      icon: icon("activity-calendar-days"),
    },
    {
      id: "refund",
      time: "قبل ٣ أيام",
      title: "اعتُمد استردادك",
      description: "١١٠٫٤٠٠ ر.س — في طريقها لبطاقتك",
      icon: icon("activity-banknote"),
    },
    {
      id: "certificate",
      time: "قبل أسبوع",
      title: "صدرت شهادتك",
      description: "تحليل البيانات للمبتدئين — قابلة للتحقق",
      icon: icon("activity-award"),
    },
  ] satisfies Activity[],
};

export const progressSection = {
  title: "رحلتك التعليمية",
  link: "التفاصيل",
  milestones: [
    {
      id: "hours",
      value: "٥",
      label: "ساعات هذا الأسبوع",
      description: "بزيادة ساعتين عن الأسبوع الماضي.",
      icon: icon("milestone-clock"),
      tone: "info",
    },
    {
      id: "certificates",
      value: "٣",
      label: "شهادات موثّقة",
      description: "كلها قابلة للتحقق برابط عام.",
      icon: icon("milestone-award"),
      tone: "success",
    },
    {
      id: "plan",
      value: "٦٥٪",
      label: "من خطتك التعليمية",
      description: "أنجزت ٨ دورات من ١٢ في مسار إدارة المشاريع.",
      icon: icon("milestone-gauge"),
      tone: "brand",
      progress: 65,
    },
  ] satisfies Milestone[],
};

export const certificatesSection = {
  title: "شهاداتك وإنجازاتك",
  link: "أرشيف الشهادات",
  achievementsTitle: "الوسائم",
  certificates: [
    {
      id: "uploaded",
      title: "أساسيات إدارة المشاريع",
      meta: "معهد المسار للتدريب · ١٢ / ٠٣ / ٢٠٢٦",
      ribbon: "warning",
      status: { label: "مرفوعة من صاحبها — لم تتحقق منها المنصة", tone: "warning" },
      link: { label: "لا يوجد رابط تحقق", available: false },
    },
    {
      id: "platform",
      title: "أساسيات إدارة المشاريع",
      meta: "معهد المسار للتدريب · ١٢ / ٠٣ / ٢٠٢٦",
      ribbon: "accent",
      status: { label: "صادرة عن المنصة", tone: "success" },
      link: { label: "رابط التحقق العام", available: true },
    },
  ] satisfies Certificate[],
  // RTL order: the first row shows (right → left) مسار مكتمل · خمس دورات · أول شهادة; the 4th wraps and is clipped, as in Figma.
  achievements: [
    { id: "path-complete", label: "مسار مكتمل", icon: icon("badge-brain"), earned: false, height: 94 },
    { id: "five-courses", label: "خمس دورات", icon: icon("badge-target"), earned: true, height: 85 },
    { id: "first-certificate", label: "أول شهادة", icon: icon("badge-trophy"), earned: true, height: 94 },
    { id: "ten-courses", label: "عشر دورات", icon: icon("badge-milestone"), earned: false, height: 10 },
  ] satisfies Achievement[],
};
