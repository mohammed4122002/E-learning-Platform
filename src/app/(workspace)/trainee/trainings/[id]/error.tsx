"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function EnrollmentError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="تفاصيل تسجيلي" error={error} retry={retry} />;
}
