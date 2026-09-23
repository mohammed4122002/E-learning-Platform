"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function RefundStatusError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="متابعة طلب الاسترداد" error={error} retry={retry} backHref="/trainee/queue" backLabel="العودة إلى بانتظار إجرائي" />;
}
