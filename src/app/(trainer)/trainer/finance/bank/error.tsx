"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function BankError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل بيانات التحويل" backHref="/trainer/finance" backLabel="العودة إلى الرصيد" />;
}
