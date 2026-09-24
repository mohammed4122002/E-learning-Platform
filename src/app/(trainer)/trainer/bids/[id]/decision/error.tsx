"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function DecisionError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل قرار العرض" backHref="/trainer/bids" backLabel="العودة إلى عروضي" />;
}
