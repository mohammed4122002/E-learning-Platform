"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function PreviewError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-page">
      <RouteError error={error} retry={retry} title="تعذّر تحميل المعاينة" backHref="/trainer/courses" backLabel="العودة إلى دوراتي" />
    </div>
  );
}
