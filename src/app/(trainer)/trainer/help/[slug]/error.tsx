"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function TrainerGuideError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل الدليل" backHref="/trainer/help" backLabel="العودة إلى مركز المساعدة" />;
}
