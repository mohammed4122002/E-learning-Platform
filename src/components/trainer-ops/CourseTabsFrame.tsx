"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Breadcrumb, Tabs } from "@/components/ui/Navigation";

/*
 * STAND-IN for the course header + tab bar of TRR-CRS-05 (owned by the course-page work, replaced on merge).
 * Tab roots (/trainer/courses/[id], /content, …, /ratings) get the top bar, breadcrumb, title and tabs;
 * deeper routes (seats, attendance register, grading, …) render their own page chrome.
 */
const TABS = [
  { seg: "", label: "نظرة عامة", subtitle: "نظرة عامة" },
  { seg: "content", label: "المحاور والمحتوى", subtitle: "المحاور والمحتوى" },
  { seg: "files", label: "الملفات", subtitle: "الملفات" },
  { seg: "assignments", label: "الواجبات", subtitle: "الواجبات" },
  { seg: "trainees", label: "المتدربون", subtitle: "المتدربون المسجّلون" },
  { seg: "attendance", label: "الحضور", subtitle: "سجل الحضور" },
  { seg: "results", label: "النتائج", subtitle: "رصد النتائج" },
  { seg: "certificates", label: "الشهادات", subtitle: "إصدار الشهادات" },
  { seg: "ratings", label: "التقييمات", subtitle: "تقييمات المتدربين" },
];

export function CourseTabsFrame({ courseId, title, runLabel, children }: { courseId: string; title: string; runLabel: string; children: ReactNode }) {
  const segments = useSelectedLayoutSegments().filter((s) => !s.startsWith("("));
  const active = segments.length <= 1 ? TABS.find((t) => t.seg === (segments[0] ?? "")) : undefined;
  if (!active) return <>{children}</>;
  const base = `/trainer/courses/${courseId}`;
  return (
    <>
      <TopBar title="صفحة الدورة" subtitle={active.subtitle} />
      <PageBody className="gap-[26px]">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: runLabel }]} />
        <h2 className="text-[28px] leading-[1.15] font-bold text-text-primary sm:text-[38px]">{title}</h2>
        <Tabs
          label="أقسام الدورة"
          active={active.seg ? `${base}/${active.seg}` : base}
          tabs={TABS.map((t) => ({ href: t.seg ? `${base}/${t.seg}` : base, label: t.label }))}
        />
        {children}
      </PageBody>
    </>
  );
}
