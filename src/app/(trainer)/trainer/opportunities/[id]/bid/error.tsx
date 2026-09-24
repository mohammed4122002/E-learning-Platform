"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function BidError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل الطلب" backHref="/trainer/opportunities" backLabel="العودة إلى الفرص" />;
}
