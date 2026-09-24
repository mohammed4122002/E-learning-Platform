"use client";

import { PageBody, TopBar } from "@/components/layout/TopBar";
import { RouteError } from "@/components/ui/RouteError";

export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <>
      <TopBar title="لوحة الدورة" subtitle="تعذّر التحميل" />
      <PageBody>
        <RouteError error={error} retry={retry} title="تعذّر تحميل بيانات الدورة" backHref="/trainer/courses" backLabel="العودة إلى دوراتي" />
      </PageBody>
    </>
  );
}
