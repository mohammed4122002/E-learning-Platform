import type { CourseLevel, EnrollmentStatus, Tone } from "@/types/views";

export const LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

/** Enrollment status copy + tone, as used by the status pills across TRN-MYE / TRN-DSH screens. */
export const ENROLLMENT_STATUS: Record<EnrollmentStatus, { label: string; tone: Tone }> = {
  pending_payment: { label: "بانتظار الدفع", tone: "warning" },
  pending_provider: { label: "بانتظار الجهة", tone: "info" },
  confirmed: { label: "مسجَّل", tone: "brand" },
  in_progress: { label: "جارية", tone: "brand" },
  completed: { label: "مكتملة", tone: "success" },
  withdrawn: { label: "منسحب", tone: "neutral" },
  cancelled: { label: "ملغاة", tone: "error" },
  access_revoked: { label: "سُحب الوصول", tone: "error" },
};

export const FUNDING_LABELS: Record<string, string> = {
  self: "مموّلة ذاتيًا",
  employer: "مموّلة من جهة العمل",
  sponsored: "منحة",
};
