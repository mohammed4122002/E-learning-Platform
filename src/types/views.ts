import type { Database } from "@/types/database";

export type CourseMode = Database["public"]["Enums"]["course_mode"];
export type CourseLevel = Database["public"]["Enums"]["course_level"];
export type EnrollmentStatus = Database["public"]["Enums"]["enrollment_status"];
export type Tone = "brand" | "info" | "accent" | "success" | "warning" | "error" | "neutral";

/** Position/size of the cropped image inside the cover, in % (from the Figma CROP transform). */
export type CoverCrop = { top: number; left: number; width: number; height: number };

export type CourseSource = { kind: "provider" | "independent"; name: string };

/** View model of Figma "Card / Course · Unified" (101:1206). */
export type CourseCardView = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  mode: CourseMode;
  cover: { src: string | null; crop: CoverCrop | null };
  source: CourseSource;
  status: { label: string; tone: Tone } | null;
  href: string;
  cta: string;
} & (
  | {
      variant: "enrolled";
      progress: { label: string; percent: number };
      nextSession: string | null;
      funding: string;
    }
  | {
      variant: "catalog";
      rating: number;
      ratingCount: number;
      durationHours: number | null;
      level: CourseLevel;
      learners: number;
      price: number;
      currency: string;
    }
);
