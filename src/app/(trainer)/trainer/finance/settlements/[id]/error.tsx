"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function SettlementError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل التسوية" backHref="/trainer/finance" backLabel="العودة إلى الرصيد" />;
}
