"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function WithdrawError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل طلبات السحب" backHref="/trainer/finance" backLabel="العودة إلى الرصيد" />;
}
