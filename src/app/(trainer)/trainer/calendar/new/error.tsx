"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function NewEventError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر فتح نموذج الموعد" backHref="/trainer/calendar" backLabel="العودة إلى الجدول" />;
}
