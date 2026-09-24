"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function TrainerQueueError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل بانتظار إجرائي" backHref="/trainer" />;
}
