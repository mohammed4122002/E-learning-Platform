"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function NewDisputeError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="فتح نزاع مالي" error={error} retry={retry} backHref="/trainee/queue" backLabel="العودة إلى بانتظار إجرائي" />;
}
