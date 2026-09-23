"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function ReportError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل صفحة البلاغ" backHref="/trainee/help" backLabel="عد إلى مركز المساعدة" />;
}
