"use client";

import { PageBody, TopBar } from "@/components/layout/TopBar";
import { RouteError } from "@/components/ui/RouteError";

export default function SalesRouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <>
      <TopBar title="المبيعات" subtitle="تعذّر التحميل" />
      <PageBody>
        <RouteError error={error} retry={retry} title="تعذّر تحميل سجل المبيعات" backHref="/trainer/courses" backLabel="العودة إلى دوراتي" />
      </PageBody>
    </>
  );
}
