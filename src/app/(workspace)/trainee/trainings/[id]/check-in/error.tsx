"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function CheckInError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="تسجيل الحضور" error={error} retry={retry} />;
}
