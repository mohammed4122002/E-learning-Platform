"use client";

import { PageBody, TopBar } from "@/components/layout/TopBar";
import { RouteError } from "@/components/ui/RouteError";

export default function PublishError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <>
      <TopBar title="إدارة المحتوى" subtitle="تعذّر التحميل" />
      <PageBody>
        <RouteError error={error} retry={retry} title="تعذّر تحميل المحتوى الجديد" backHref="/trainer/courses" backLabel="العودة إلى دوراتي" />
      </PageBody>
    </>
  );
}
