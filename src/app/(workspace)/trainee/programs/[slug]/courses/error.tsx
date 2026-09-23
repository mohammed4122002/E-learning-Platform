"use client";

import { RouteError } from "@/components/discover/RouteError";

export default function ProgramCoursesError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="الدورات المتاحة" subtitle="تعذّر التحميل" />;
}
