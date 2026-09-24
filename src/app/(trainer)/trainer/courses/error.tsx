"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function CoursesError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل دوراتك" backHref="/trainer" backLabel="العودة إلى الرئيسية" />;
}
