"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function CourseTabError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل بيانات الدورة" backHref="/trainer/courses" backLabel="العودة إلى دوراتي" />;
}
