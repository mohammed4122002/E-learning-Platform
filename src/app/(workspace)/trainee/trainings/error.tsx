"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function TrainingsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="ملف التدريب" error={error} retry={retry} backHref="/trainee" backLabel="العودة إلى الرئيسية" />;
}
