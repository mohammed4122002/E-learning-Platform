"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function QueueError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="بانتظار إجرائي" error={error} retry={retry} backHref="/trainee" backLabel="العودة إلى الرئيسية" />;
}
