"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Breadcrumb, Tabs } from "@/components/ui/Navigation";

/*
 * TRR-CRS-05 صفحة الدورة — the shared chrome of the nine course tabs: top bar («صفحة الدورة» + per-tab
 * subtitle), breadcrumb, course hero and the «COURSE TABS» bar. Routes that are not a tab (setup wizard,
 * recorded dashboard, sales, preview, publish-new-content, grading sub-pages …) render their own chrome.
 */
export const COURSE_TABS: { segment: string | null; label: string; subtitle: string | null }[] = [
  { segment: null, label: "نظرة عامة", subtitle: null },
  { segment: "content", label: "المحاور والمحتوى", subtitle: "المحاور والجلسات" },
  { segment: "files", label: "الملفات", subtitle: "مواد الدورة" },
  { segment: "assignments", label: "الواجبات", subtitle: "الواجبات والتقييم" },
  { segment: "trainees", label: "المتدربون", subtitle: "المتدربون" },
  { segment: "attendance", label: "الحضور", subtitle: "الحضور" },
  { segment: "results", label: "النتائج", subtitle: "النتائج" },
  { segment: "certificates", label: "الشهادات", subtitle: "الشهادات" },
  { segment: "ratings", label: "التقييمات", subtitle: "التقييمات" },
];

export function CourseChrome({
  courseId,
  courseTitle,
  hero,
  intro,
  lead,
  children,
}: {
  courseId: string;
  courseTitle: string;
  hero: ReactNode;
  /** Overview only: block above the breadcrumb (live variant 4236:743 «عرض تقرير الحضور»). */
  lead?: ReactNode;
  /** Overview only: blocks between the breadcrumb and the hero (live variant 4236:743). */
  intro?: ReactNode;
  children: ReactNode;
}) {
  const segments = useSelectedLayoutSegments().filter((s) => !s.startsWith("__") && !s.startsWith("("));
  const tab = segments.length === 0 ? COURSE_TABS[0] : segments.length === 1 ? COURSE_TABS.find((t) => t.segment === segments[0]) : undefined;
  if (!tab) return <>{children}</>;

  const base = `/trainer/courses/${courseId}`;
  const href = (s: string | null) => (s ? `${base}/${s}` : base);
  return (
    <>
      <TopBar title="صفحة الدورة" subtitle={tab.subtitle ?? courseTitle} />
      <PageBody className="gap-6">
        {tab.segment === null && lead}
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: courseTitle }]} />
        {tab.segment === null && intro}
        {hero}
        <Tabs label="أقسام الدورة" active={href(tab.segment)} tabs={COURSE_TABS.map((t) => ({ href: href(t.segment), label: t.label }))} />
        {children}
      </PageBody>
    </>
  );
}
