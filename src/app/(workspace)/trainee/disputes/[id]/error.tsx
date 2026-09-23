"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function DisputeError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="النزاع المالي" error={error} retry={retry} backHref="/trainee/queue" backLabel="العودة إلى بانتظار إجرائي" />;
}
