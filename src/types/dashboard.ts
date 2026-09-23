export type NavItem = {
  label: string;
  icon: string;
  href: string;
  active?: boolean;
};

export type CourseMode = "in-person" | "live-remote" | "recorded";

/** Figma "Data / Course Source": Provider (institute) or Independent (trainer). */
export type CourseSource = { kind: "provider" | "independent"; name: string };

export type Tone = "brand" | "info" | "accent" | "success" | "warning";

/** Position/size of the cropped image inside the cover, in % (from Figma CROP transform). */
export type CoverCrop = { top: number; left: number; width: number; height: number };

type CourseBase = {
  id: string;
  title: string;
  category: string;
  status: { label: string; tone: Tone };
  mode: CourseMode;
  /** Mode badge position inside the cover (px), as placed in Figma. */
  modeBadge: { top: number; right: number };
  cover: { src: string; crop: CoverCrop };
  source: CourseSource;
  cta: string;
};

export type EnrolledCourse = CourseBase & {
  variant: "enrolled";
  attendance: { label: string; percentLabel: string; percent: number };
  nextSession: string;
  funding: string;
};

export type RecommendedCourse = CourseBase & {
  variant: "recommended";
  meta: { rating: string; duration: string; level: string; learners: string };
  price: string;
  /** Figma places the price opposite the button on the first two cards, and at the start (bold) on the third. */
  priceAtStart?: boolean;
};

export type Course = EnrolledCourse | RecommendedCourse;

export type Activity = {
  id: string;
  time: string;
  title: string;
  description: string;
  icon: string;
};

export type Milestone = {
  id: string;
  value: string;
  label: string;
  description: string;
  icon: string;
  tone: "brand" | "success" | "info";
  progress?: number;
};

export type Certificate = {
  id: string;
  title: string;
  meta: string;
  ribbon: "accent" | "warning";
  status: { label: string; tone: "success" | "warning" };
  link: { label: string; available: boolean };
};

export type Achievement = {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
  /** Fixed frame height from Figma (the frame clips its label). */
  height: number;
};
