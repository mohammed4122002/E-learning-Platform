"use client";

import { TopBar } from "@/components/layout/TopBar";
import { RouteError } from "@/components/ui/RouteError";

export default function SetupError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <>
      <TopBar title="دورة جديدة" subtitle="إعداد الدورة" />
      <RouteError error={error} retry={retry} title="تعذّر تحميل إعداد الدورة" backHref="/trainer/courses" backLabel="العودة إلى دوراتي" />
    </>
  );
}
