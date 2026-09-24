"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function IncomeError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل حاسبة الدخل" backHref="/trainer/journey" backLabel="العودة إلى مسار الاعتماد" />;
}
